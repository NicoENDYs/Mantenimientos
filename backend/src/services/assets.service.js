'use strict'

const pool = require('../db/pool')
const logger = require('pino')()

function httpError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

async function searchByCode(code) {
  // 1. Intentar API externa
  const apiUrl = process.env.API_ACTIVOS_URL
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}?code=${encodeURIComponent(code)}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        // Guardar/actualizar en cache local
        await upsertAsset(code, data)
        return { ...data, pendiente_sync: false }
      }
    } catch (err) {
      logger.warn({ err }, 'API activos no disponible — usando cache local')
    }
  }

  // 2. Fallback: buscar en cache local
  const { rows } = await pool.query('SELECT * FROM assets WHERE codigo = $1', [code])
  if (rows.length > 0) {
    return { ...rows[0], pendiente_sync: false }
  }

  // 3. Activo no conocido — el flag pendiente_sync se registra en el
  //    maintenance al crearlo; el asset se creará en ese momento
  return { codigo: code, nombre: null, tipo: null, ubicacion: null, pendiente_sync: true }
}

async function upsertAsset(code, data) {
  await pool.query(
    `INSERT INTO assets (codigo, nombre, tipo, ubicacion, datos_api)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (codigo) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           tipo = EXCLUDED.tipo,
           ubicacion = EXCLUDED.ubicacion,
           datos_api = EXCLUDED.datos_api,
           updated_at = NOW()`,
    [code, data.nombre || null, data.tipo || null, data.ubicacion || null, JSON.stringify(data)]
  )
}

async function findAll(query = {}) {
  const conditions = []
  const values = []
  let i = 1

  if (query.q) {
    conditions.push(`(a.codigo ILIKE $${i} OR a.nombre ILIKE $${i} OR a.ubicacion ILIKE $${i})`)
    values.push(`%${query.q}%`)
    i++
  }
  if (query.estado) {
    conditions.push(`a.estado = $${i++}`)
    values.push(query.estado)
  }
  if (query.criticidad) {
    conditions.push(`a.criticidad = $${i++}`)
    values.push(query.criticidad)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const page   = Math.max(1, parseInt(query.page,  10) || 1)
  const limit  = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20))
  const offset = (page - 1) * limit

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM assets a ${where}`, values),
    pool.query(`
      SELECT a.*,
             (SELECT COUNT(*)::int FROM maintenances m WHERE m.asset_id = a.id) AS total_mantenimientos,
             (SELECT COUNT(*)::int FROM maintenances m
              WHERE m.asset_id = a.id AND m.estado IN ('abierta', 'en_progreso')) AS ordenes_abiertas,
             (SELECT MAX(m.created_at) FROM maintenances m WHERE m.asset_id = a.id) AS ultimo_mantenimiento
      FROM assets a
      ${where}
      ORDER BY a.codigo ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, limit, offset]),
  ])

  const total = parseInt(countRes.rows[0].count, 10)
  return { data: dataRes.rows, total, page, limit, totalPages: Math.ceil(total / limit) }
}

/** Ficha del activo: datos + indicadores + historial de mantenimientos. */
async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM assets WHERE id = $1', [id])
  if (!rows[0]) return null
  const asset = rows[0]

  const [historial, kpis, costo] = await Promise.all([
    pool.query(`
      SELECT m.id, m.estado, m.tipo, m.prioridad, m.motivo, m.fecha_programada,
             m.fecha_inicio, m.fecha_fin, m.created_at,
             u.nombre AS tecnico_nombre,
             asig.nombre AS asignado_nombre
      FROM maintenances m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN users asig ON asig.id = m.assigned_to
      WHERE m.asset_id = $1
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [id]),
    pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE tipo = 'correctivo')::int AS correctivos,
             COUNT(*) FILTER (WHERE estado IN ('abierta', 'en_progreso'))::int AS abiertas,
             ROUND(AVG(EXTRACT(EPOCH FROM (fecha_fin - fecha_inicio)) / 3600)
                   FILTER (WHERE fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL)::numeric, 1) AS mttr_horas,
             COALESCE(SUM(tiempo_parada_horas), 0) AS horas_parada
      FROM maintenances
      WHERE asset_id = $1
    `, [id]),
    pool.query(`
      SELECT COALESCE(SUM(mp.cantidad * mp.costo_unitario), 0) AS costo
      FROM maintenance_parts mp
      JOIN maintenances m ON m.id = mp.maintenance_id
      WHERE m.asset_id = $1
    `, [id]),
  ])

  asset.mantenimientos = historial.rows
  asset.indicadores = {
    ...kpis.rows[0],
    mttr_horas: kpis.rows[0].mttr_horas !== null ? parseFloat(kpis.rows[0].mttr_horas) : null,
    horas_parada: parseFloat(kpis.rows[0].horas_parada),
    costo_repuestos: parseFloat(costo.rows[0].costo),
  }
  return asset
}

async function update(id, data) {
  const { rows: existing } = await pool.query('SELECT id FROM assets WHERE id = $1', [id])
  if (!existing[0]) throw httpError('Activo no encontrado', 404)

  const { rows } = await pool.query(
    `UPDATE assets
     SET nombre=$1, tipo=$2, ubicacion=$3, estado=$4, criticidad=$5, notas=$6, updated_at=NOW()
     WHERE id=$7
     RETURNING *`,
    [
      data.nombre || null, data.tipo || null, data.ubicacion || null,
      data.estado || 'operativo', data.criticidad || 'media',
      data.notas || null, id,
    ]
  )
  return rows[0]
}

module.exports = { searchByCode, findAll, findById, update }

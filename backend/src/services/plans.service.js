'use strict'

const pool = require('../db/pool')
const { logHistory, resolveAssetId } = require('./maintenances.service')

function httpError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

async function findAll(query = {}) {
  const conditions = []
  const values = []
  let i = 1

  if (query.activo !== undefined) {
    conditions.push(`p.activo = $${i++}`)
    values.push(query.activo)
  }
  if (query.asset_id) {
    conditions.push(`p.asset_id = $${i++}`)
    values.push(query.asset_id)
  }
  if (query.proximos_dias) {
    conditions.push(`p.activo AND p.proxima_fecha <= CURRENT_DATE + $${i++}::int`)
    values.push(query.proximos_dias)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await pool.query(`
    SELECT p.*,
           a.codigo AS asset_codigo, a.nombre AS asset_nombre,
           u.nombre AS asignado_nombre,
           (p.activo AND p.proxima_fecha <= CURRENT_DATE) AS vencido
    FROM maintenance_plans p
    JOIN assets a ON a.id = p.asset_id
    LEFT JOIN users u ON u.id = p.assigned_to
    ${where}
    ORDER BY p.proxima_fecha ASC, p.id ASC
  `, values)
  return rows
}

async function create(data, userId) {
  const assetId = await resolveAssetId(pool, data.assetCode)
  const { rows } = await pool.query(
    `INSERT INTO maintenance_plans
       (asset_id, titulo, descripcion, tipo, prioridad, frecuencia_dias, proxima_fecha, assigned_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      assetId, data.titulo, data.descripcion || '',
      data.tipo || 'preventivo', data.prioridad || 'media',
      data.frecuencia_dias, data.proxima_fecha,
      data.assigned_to || null, userId,
    ]
  )
  return rows[0]
}

async function update(id, data) {
  const { rows: existing } = await pool.query('SELECT id FROM maintenance_plans WHERE id = $1', [id])
  if (!existing[0]) throw httpError('Plan no encontrado', 404)

  const { rows } = await pool.query(
    `UPDATE maintenance_plans
     SET titulo=$1, descripcion=$2, tipo=$3, prioridad=$4,
         frecuencia_dias=$5, proxima_fecha=$6, assigned_to=$7, updated_at=NOW()
     WHERE id=$8
     RETURNING *`,
    [
      data.titulo, data.descripcion || '', data.tipo || 'preventivo',
      data.prioridad || 'media', data.frecuencia_dias, data.proxima_fecha,
      data.assigned_to || null, id,
    ]
  )
  return rows[0]
}

async function toggle(id) {
  const { rows } = await pool.query(
    'UPDATE maintenance_plans SET activo = NOT activo, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id]
  )
  if (!rows[0]) throw httpError('Plan no encontrado', 404)
  return rows[0]
}

/**
 * Genera órdenes de trabajo para los planes vencidos que no tengan ya
 * una orden abierta, y reprograma la próxima fecha del plan.
 * Se ejecuta al arrancar el servidor, periódicamente, y bajo demanda.
 */
async function generateDueOrders() {
  const { rows: due } = await pool.query(`
    SELECT p.*
    FROM maintenance_plans p
    WHERE p.activo
      AND p.proxima_fecha <= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM maintenances m
        WHERE m.plan_id = p.id AND m.estado IN ('abierta', 'en_progreso')
      )
    ORDER BY p.proxima_fecha ASC
  `)

  const generadas = []
  for (const plan of due) {
    const creatorId = plan.created_by || plan.assigned_to
    if (!creatorId) continue

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows } = await client.query(
        `INSERT INTO maintenances
           (asset_id, user_id, assigned_to, plan_id, tipo, prioridad,
            motivo, descripcion_problema, solucion, estado, fecha_programada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '', 'abierta', $9)
         RETURNING id`,
        [
          plan.asset_id, creatorId, plan.assigned_to, plan.id,
          plan.tipo, plan.prioridad, plan.titulo,
          plan.descripcion || plan.titulo, plan.proxima_fecha,
        ]
      )
      await logHistory(
        client, rows[0].id, plan.created_by, 'orden_creada', null, 'abierta',
        `Generada automáticamente por el plan "${plan.titulo}"`
      )
      await client.query(
        'UPDATE maintenance_plans SET proxima_fecha = CURRENT_DATE + frecuencia_dias, updated_at = NOW() WHERE id = $1',
        [plan.id]
      )

      await client.query('COMMIT')
      generadas.push({ maintenance_id: rows[0].id, plan_id: plan.id, titulo: plan.titulo })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  return generadas
}

module.exports = { findAll, create, update, toggle, generateDueOrders }

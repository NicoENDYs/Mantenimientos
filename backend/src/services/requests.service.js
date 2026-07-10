'use strict'

const pool = require('../db/pool')
const maintenancesSvc = require('./maintenances.service')

function httpError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

async function findAll(query, userRol, userId) {
  const conditions = []
  const values = []
  let i = 1

  if (userRol === 'tecnico') {
    conditions.push(`r.created_by = $${i++}`)
    values.push(userId)
  }
  if (query.estado) {
    conditions.push(`r.estado = $${i++}`)
    values.push(query.estado)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await pool.query(`
    SELECT r.*,
           a.codigo AS asset_codigo, a.nombre AS asset_nombre, a.ubicacion AS asset_ubicacion,
           u.nombre AS solicitante_nombre,
           res.nombre AS resuelto_por_nombre
    FROM maintenance_requests r
    JOIN assets a ON a.id = r.asset_id
    JOIN users u ON u.id = r.created_by
    LEFT JOIN users res ON res.id = r.resuelto_por
    ${where}
    ORDER BY (r.estado = 'pendiente') DESC, r.created_at DESC
  `, values)
  return rows
}

async function create(data, userId) {
  const assetId = await maintenancesSvc.resolveAssetId(pool, data.assetCode)
  const { rows } = await pool.query(
    `INSERT INTO maintenance_requests (asset_id, descripcion, prioridad, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [assetId, data.descripcion, data.prioridad || 'media', userId]
  )
  return rows[0]
}

/** Convierte una solicitud pendiente en una orden de trabajo abierta. */
async function convert(id, data, user) {
  const { rows } = await pool.query(
    `SELECT r.*, a.codigo AS asset_codigo
     FROM maintenance_requests r
     JOIN assets a ON a.id = r.asset_id
     WHERE r.id = $1`,
    [id]
  )
  if (!rows[0]) throw httpError('Solicitud no encontrada', 404)
  const req = rows[0]
  if (req.estado !== 'pendiente') throw httpError('La solicitud ya fue atendida', 409)

  const maintenance = await maintenancesSvc.create(
    {
      asset_id: req.asset_id,
      motivo: data.motivo || `Solicitud #${req.id}: ${req.descripcion.slice(0, 120)}`,
      descripcion_problema: req.descripcion,
      es_orden: true,
      tipo: data.tipo || 'correctivo',
      prioridad: data.prioridad || req.prioridad,
      assigned_to: data.assigned_to,
      fecha_programada: data.fecha_programada,
    },
    user,
    { detalle: `Creada a partir de la solicitud #${req.id}` }
  )

  await pool.query(
    `UPDATE maintenance_requests
     SET estado='convertida', maintenance_id=$1, resuelto_por=$2, updated_at=NOW()
     WHERE id=$3`,
    [maintenance.id, user.id, id]
  )

  return { ...req, estado: 'convertida', maintenance_id: maintenance.id }
}

async function discard(id, comentario, userId) {
  const { rows } = await pool.query('SELECT estado FROM maintenance_requests WHERE id = $1', [id])
  if (!rows[0]) throw httpError('Solicitud no encontrada', 404)
  if (rows[0].estado !== 'pendiente') throw httpError('La solicitud ya fue atendida', 409)

  const { rows: updated } = await pool.query(
    `UPDATE maintenance_requests
     SET estado='descartada', comentario_resolucion=$1, resuelto_por=$2, updated_at=NOW()
     WHERE id=$3
     RETURNING *`,
    [comentario, userId, id]
  )
  return updated[0]
}

module.exports = { findAll, create, convert, discard }

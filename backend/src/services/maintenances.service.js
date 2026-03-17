'use strict'

const fs   = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db/pool')
const { validateMimeBuffer } = require('../middlewares/validateMime')

const PHOTOS_DIR = process.env.PHOTOS_DIR || path.join(__dirname, '../../private/photos')

function buildFilters(query, userRol, userId) {
  const conditions = []
  const values = []
  let i = 1

  if (userRol === 'tecnico') {
    conditions.push(`m.user_id = $${i++}`)
    values.push(userId)
  }
  if (query.asset_code) {
    conditions.push(`a.codigo ILIKE $${i++}`)
    values.push(`%${query.asset_code}%`)
  }
  if (query.user_id) {
    conditions.push(`m.user_id = $${i++}`)
    values.push(query.user_id)
  }
  if (query.estado) {
    conditions.push(`m.estado = $${i++}`)
    values.push(query.estado)
  }
  if (query.fecha_desde) {
    conditions.push(`m.created_at >= $${i++}`)
    values.push(query.fecha_desde)
  }
  if (query.fecha_hasta) {
    conditions.push(`m.created_at <= $${i++}`)
    values.push(query.fecha_hasta)
  }

  return { conditions, values }
}

async function findAll(query, userRol, userId) {
  const { conditions, values } = buildFilters(query, userRol, userId)
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const page   = Math.max(1, parseInt(query.page,  10) || 1)
  const limit  = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20))
  const offset = (page - 1) * limit

  const baseFrom = `
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    JOIN users  u ON u.id = m.user_id
    ${where}
  `

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) ${baseFrom}`, values),
    pool.query(`
      SELECT m.id, m.estado, m.motivo, m.hubo_cambio, m.pendiente_sync,
             m.created_at, m.updated_at,
             a.codigo AS asset_codigo, a.nombre AS asset_nombre,
             u.nombre AS tecnico_nombre, u.email AS tecnico_email
      ${baseFrom}
      ORDER BY m.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, limit, offset]),
  ])

  const total = parseInt(countRes.rows[0].count, 10)
  return {
    data: dataRes.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

async function findById(id) {
  const { rows } = await pool.query(`
    SELECT m.*,
           a.codigo AS asset_codigo, a.nombre AS asset_nombre,
           a.tipo AS asset_tipo, a.ubicacion AS asset_ubicacion,
           u.nombre AS tecnico_nombre,
           s.nombre AS supervisor_nombre
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    JOIN users  u ON u.id = m.user_id
    LEFT JOIN users s ON s.id = m.supervisor_id
    WHERE m.id = $1
  `, [id])

  if (!rows[0]) return null

  const maintenance = rows[0]

  // Partes
  const parts = await pool.query(
    'SELECT * FROM maintenance_parts WHERE maintenance_id = $1',
    [id]
  )
  maintenance.partes = parts.rows

  // Fotos
  const photos = await pool.query(
    'SELECT id, nombre_original, created_at FROM maintenance_photos WHERE maintenance_id = $1',
    [id]
  )
  maintenance.fotos = photos.rows

  return maintenance
}

async function create({ assetCode, motivo, descripcion_problema, solucion, hubo_cambio, partes }, userId) {
  // Resolver o crear asset
  let assetRow = await pool.query('SELECT id FROM assets WHERE codigo = $1', [assetCode])
  let assetId
  if (assetRow.rows.length > 0) {
    assetId = assetRow.rows[0].id
  } else {
    const inserted = await pool.query(
      'INSERT INTO assets (codigo) VALUES ($1) RETURNING id',
      [assetCode]
    )
    assetId = inserted.rows[0].id
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO maintenances (asset_id, user_id, motivo, descripcion_problema, solucion, hubo_cambio)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [assetId, userId, motivo, descripcion_problema, solucion, !!hubo_cambio]
    )
    const maintenance = rows[0]

    if (hubo_cambio && Array.isArray(partes) && partes.length > 0) {
      for (const p of partes) {
        await client.query(
          'INSERT INTO maintenance_parts (maintenance_id, descripcion, cantidad) VALUES ($1, $2, $3)',
          [maintenance.id, p.descripcion, p.cantidad]
        )
      }
    }

    await client.query('COMMIT')
    return maintenance
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function update(id, data, userId, userRol) {
  const { rows } = await pool.query('SELECT estado, user_id FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) {
    const err = new Error('Mantenimiento no encontrado')
    err.statusCode = 404
    throw err
  }
  const m = rows[0]

  if (!['borrador', 'rechazado'].includes(m.estado)) {
    const err = new Error('Solo se pueden editar mantenimientos en estado borrador o rechazado')
    err.statusCode = 409
    throw err
  }
  if (userRol === 'tecnico' && m.user_id !== userId) {
    const err = new Error('No tienes permiso para editar este mantenimiento')
    err.statusCode = 403
    throw err
  }

  const { motivo, descripcion_problema, solucion, hubo_cambio, partes } = data

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Si venía rechazado, al editarlo vuelve a pendiente de aprobación
    const nuevoEstado = m.estado === 'rechazado' ? 'pendiente_aprobacion' : m.estado

    await client.query(
      `UPDATE maintenances
       SET motivo=$1, descripcion_problema=$2, solucion=$3, hubo_cambio=$4,
           estado=$5, comentario_supervisor=NULL, supervisor_id=NULL, updated_at=NOW()
       WHERE id=$6`,
      [motivo, descripcion_problema, solucion, !!hubo_cambio, nuevoEstado, id]
    )

    // Reemplazar partes
    await client.query('DELETE FROM maintenance_parts WHERE maintenance_id = $1', [id])
    if (hubo_cambio && Array.isArray(partes) && partes.length > 0) {
      for (const p of partes) {
        await client.query(
          'INSERT INTO maintenance_parts (maintenance_id, descripcion, cantidad) VALUES ($1, $2, $3)',
          [id, p.descripcion, p.cantidad]
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return findById(id)
}

async function approve(id, supervisorId) {
  const { rows } = await pool.query('SELECT estado FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) {
    const err = new Error('Mantenimiento no encontrado')
    err.statusCode = 404
    throw err
  }
  await pool.query(
    `UPDATE maintenances SET estado='aprobado', supervisor_id=$1, updated_at=NOW() WHERE id=$2`,
    [supervisorId, id]
  )
  return findById(id)
}

async function reject(id, supervisorId, comentario) {
  const { rows } = await pool.query('SELECT estado FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) {
    const err = new Error('Mantenimiento no encontrado')
    err.statusCode = 404
    throw err
  }
  await pool.query(
    `UPDATE maintenances SET estado='rechazado', supervisor_id=$1, comentario_supervisor=$2, updated_at=NOW() WHERE id=$3`,
    [supervisorId, comentario, id]
  )
  return findById(id)
}

const MIME_FROM_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

async function getPhotoFile(maintenanceId, photoId, user) {
  const { rows } = await pool.query(
    `SELECT mp.ruta_archivo, mp.nombre_original, m.user_id
     FROM maintenance_photos mp
     JOIN maintenances m ON m.id = mp.maintenance_id
     WHERE mp.id = $1 AND mp.maintenance_id = $2`,
    [photoId, maintenanceId]
  )
  if (!rows[0]) {
    const err = new Error('Foto no encontrada')
    err.statusCode = 404
    throw err
  }
  if (user.rol === 'tecnico' && rows[0].user_id !== user.id) {
    const err = new Error('Sin acceso')
    err.statusCode = 403
    throw err
  }
  const filePath = rows[0].ruta_archivo
  if (!require('fs').existsSync(filePath)) {
    const err = new Error('Archivo no encontrado en disco')
    err.statusCode = 404
    throw err
  }
  const ext = filePath.split('.').pop().toLowerCase()
  const mime = MIME_FROM_EXT[ext] || 'application/octet-stream'
  return { filePath, mime }
}

async function addPhotos(maintenanceId, files) {
  // Verificar que no esté aprobado
  const { rows } = await pool.query('SELECT estado FROM maintenances WHERE id = $1', [maintenanceId])
  if (!rows[0]) {
    const err = new Error('Mantenimiento no encontrado')
    err.statusCode = 404
    throw err
  }

  // Contar fotos existentes
  const countRes = await pool.query(
    'SELECT COUNT(*) FROM maintenance_photos WHERE maintenance_id = $1',
    [maintenanceId]
  )
  const current = parseInt(countRes.rows[0].count, 10)
  if (current + files.length > 5) {
    const err = new Error(`Se pueden adjuntar máximo 5 fotos. Ya tiene ${current}.`)
    err.statusCode = 400
    throw err
  }

  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true })
  }

  const saved = []
  for (const file of files) {
    const detected = validateMimeBuffer(file.buffer, file.fieldname)
    const ext = detected.split('/')[1].replace('jpeg', 'jpg')
    const filename = `${uuidv4()}.${ext}`
    const fullPath = path.join(PHOTOS_DIR, filename)
    fs.writeFileSync(fullPath, file.buffer)

    const { rows: photoRows } = await pool.query(
      `INSERT INTO maintenance_photos (maintenance_id, ruta_archivo, nombre_original)
       VALUES ($1, $2, $3) RETURNING id, nombre_original, created_at`,
      [maintenanceId, fullPath, file.originalname]
    )
    saved.push(photoRows[0])
  }
  return saved
}

async function deletePhoto(maintenanceId, photoId) {
  const { rows: mRows } = await pool.query(
    'SELECT estado FROM maintenances WHERE id = $1',
    [maintenanceId]
  )
  if (!mRows[0] || mRows[0].estado === 'aprobado') {
    const err = new Error('No se puede eliminar fotos de un mantenimiento aprobado')
    err.statusCode = 409
    throw err
  }

  const { rows } = await pool.query(
    'SELECT ruta_archivo FROM maintenance_photos WHERE id = $1 AND maintenance_id = $2',
    [photoId, maintenanceId]
  )
  if (!rows[0]) {
    const err = new Error('Foto no encontrada')
    err.statusCode = 404
    throw err
  }

  if (fs.existsSync(rows[0].ruta_archivo)) {
    fs.unlinkSync(rows[0].ruta_archivo)
  }

  await pool.query('DELETE FROM maintenance_photos WHERE id = $1', [photoId])
}

async function getNotifications(userId) {
  const { rows } = await pool.query(`
    SELECT m.id, m.estado, m.motivo, m.updated_at, m.comentario_supervisor,
           a.codigo AS asset_codigo, a.nombre AS asset_nombre,
           s.nombre AS supervisor_nombre
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    LEFT JOIN users s ON s.id = m.supervisor_id
    WHERE m.user_id = $1
      AND m.estado IN ('aprobado', 'rechazado')
      AND m.updated_at >= NOW() - INTERVAL '7 days'
    ORDER BY m.updated_at DESC
    LIMIT 2
  `, [userId])
  return rows
}

module.exports = { findAll, findById, create, update, approve, reject, getPhotoFile, addPhotos, deletePhoto, getNotifications }

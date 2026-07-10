'use strict'

const fs   = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db/pool')
const { validateMimeBuffer } = require('../middlewares/validateMime')
const { MAX_FOTOS, MAX_ITEMS_POR_PAGINA } = require('../constants')

const PHOTOS_DIR = process.env.PHOTOS_DIR || path.join(__dirname, '../../private/photos')

const ESTADOS_ABIERTOS = ['abierta', 'en_progreso']

function httpError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/** Registra una entrada de trazabilidad. `executor` puede ser el pool o un client en transacción. */
async function logHistory(executor, maintenanceId, userId, accion, estadoAnterior, estadoNuevo, detalle) {
  await executor.query(
    `INSERT INTO maintenance_history (maintenance_id, user_id, accion, estado_anterior, estado_nuevo, detalle)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [maintenanceId, userId, accion, estadoAnterior || null, estadoNuevo || null, detalle || null]
  )
}

/** Resuelve un asset por código; lo crea si no existe. Devuelve su id. */
async function resolveAssetId(executor, assetCode) {
  const found = await executor.query('SELECT id FROM assets WHERE codigo = $1', [assetCode])
  if (found.rows.length > 0) return found.rows[0].id
  const inserted = await executor.query(
    'INSERT INTO assets (codigo) VALUES ($1) RETURNING id',
    [assetCode]
  )
  return inserted.rows[0].id
}

/**
 * Inserta las piezas usadas. Las que referencian el catálogo (part_id)
 * descuentan stock y guardan el costo unitario vigente como snapshot.
 */
async function insertPartes(client, maintenanceId, partes) {
  for (const p of partes) {
    let descripcion = (p.descripcion || '').trim()
    let costoUnitario = 0
    let partId = null

    if (p.part_id) {
      const { rows } = await client.query(
        'SELECT id, nombre, stock, costo_unitario FROM parts WHERE id = $1 AND activo FOR UPDATE',
        [p.part_id]
      )
      if (!rows[0]) throw httpError(`Repuesto de catálogo no encontrado (id ${p.part_id})`, 404)
      if (rows[0].stock < p.cantidad) {
        throw httpError(`Stock insuficiente de "${rows[0].nombre}": disponible ${rows[0].stock}, solicitado ${p.cantidad}`, 409)
      }
      await client.query(
        'UPDATE parts SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [p.cantidad, p.part_id]
      )
      partId = rows[0].id
      costoUnitario = rows[0].costo_unitario
      if (!descripcion) descripcion = rows[0].nombre
    }

    if (!descripcion) throw httpError('Cada pieza debe tener descripción o repuesto de catálogo', 400)

    await client.query(
      `INSERT INTO maintenance_parts (maintenance_id, part_id, descripcion, cantidad, costo_unitario)
       VALUES ($1, $2, $3, $4, $5)`,
      [maintenanceId, partId, descripcion, p.cantidad, costoUnitario]
    )
  }
}

/** Elimina las piezas registradas devolviendo al stock las que venían del catálogo. */
async function removePartes(client, maintenanceId) {
  const { rows } = await client.query(
    'SELECT part_id, cantidad FROM maintenance_parts WHERE maintenance_id = $1 AND part_id IS NOT NULL',
    [maintenanceId]
  )
  for (const r of rows) {
    await client.query(
      'UPDATE parts SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
      [r.cantidad, r.part_id]
    )
  }
  await client.query('DELETE FROM maintenance_parts WHERE maintenance_id = $1', [maintenanceId])
}

function buildFilters(query, userRol, userId) {
  const conditions = []
  const values = []
  let i = 1

  if (userRol === 'tecnico') {
    conditions.push(`(m.user_id = $${i} OR m.assigned_to = $${i})`)
    values.push(userId)
    i++
  }
  if (query.asset_code) {
    conditions.push(`a.codigo ILIKE $${i++}`)
    values.push(`%${query.asset_code}%`)
  }
  if (query.user_id) {
    conditions.push(`m.user_id = $${i++}`)
    values.push(query.user_id)
  }
  if (query.assigned_to) {
    conditions.push(`m.assigned_to = $${i++}`)
    values.push(query.assigned_to)
  }
  if (query.estado) {
    conditions.push(`m.estado = $${i++}`)
    values.push(query.estado)
  }
  if (query.tipo) {
    conditions.push(`m.tipo = $${i++}`)
    values.push(query.tipo)
  }
  if (query.prioridad) {
    conditions.push(`m.prioridad = $${i++}`)
    values.push(query.prioridad)
  }
  if (query.vencidas) {
    conditions.push(`m.estado IN ('abierta', 'en_progreso') AND m.fecha_programada < CURRENT_DATE`)
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
  const limit  = Math.min(MAX_ITEMS_POR_PAGINA, Math.max(1, parseInt(query.limit, 10) || 20))
  const offset = (page - 1) * limit

  const baseFrom = `
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    JOIN users  u ON u.id = m.user_id
    LEFT JOIN users asig ON asig.id = m.assigned_to
    ${where}
  `

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) ${baseFrom}`, values),
    pool.query(`
      SELECT m.id, m.estado, m.tipo, m.prioridad, m.motivo, m.hubo_cambio, m.pendiente_sync,
             m.fecha_programada, m.fecha_inicio, m.fecha_fin,
             m.created_at, m.updated_at,
             (m.estado IN ('abierta', 'en_progreso') AND m.fecha_programada < CURRENT_DATE) AS vencida,
             a.codigo AS asset_codigo, a.nombre AS asset_nombre,
             u.nombre AS tecnico_nombre, u.email AS tecnico_email,
             asig.nombre AS asignado_nombre
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
           s.nombre AS supervisor_nombre,
           asig.nombre AS asignado_nombre,
           pl.titulo AS plan_titulo
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    JOIN users  u ON u.id = m.user_id
    LEFT JOIN users s ON s.id = m.supervisor_id
    LEFT JOIN users asig ON asig.id = m.assigned_to
    LEFT JOIN maintenance_plans pl ON pl.id = m.plan_id
    WHERE m.id = $1
  `, [id])

  if (!rows[0]) return null

  const maintenance = rows[0]

  const [parts, photos, history] = await Promise.all([
    pool.query('SELECT * FROM maintenance_parts WHERE maintenance_id = $1 ORDER BY id', [id]),
    pool.query('SELECT id, nombre_original, created_at FROM maintenance_photos WHERE maintenance_id = $1', [id]),
    pool.query(`
      SELECT h.id, h.accion, h.estado_anterior, h.estado_nuevo, h.detalle, h.created_at,
             u.nombre AS usuario_nombre
      FROM maintenance_history h
      LEFT JOIN users u ON u.id = h.user_id
      WHERE h.maintenance_id = $1
      ORDER BY h.created_at ASC, h.id ASC
    `, [id]),
  ])

  maintenance.partes    = parts.rows
  maintenance.fotos     = photos.rows
  maintenance.historial = history.rows
  maintenance.costo_repuestos = parts.rows.reduce(
    (sum, p) => sum + p.cantidad * parseFloat(p.costo_unitario || 0), 0
  )

  return maintenance
}

/**
 * Crea un mantenimiento.
 * - Registro directo (por defecto): el trabajo ya se hizo → 'pendiente_aprobacion', requiere solución.
 * - Orden de trabajo (es_orden=true): trabajo por hacer → 'abierta', la solución se completa al cerrar.
 */
async function create(data, user, opts = {}) {
  const {
    assetCode, asset_id, motivo, descripcion_problema,
    solucion, hubo_cambio, partes,
    tipo, prioridad, es_orden, assigned_to, fecha_programada,
  } = data

  const esOrden = !!es_orden
  if (!esOrden && !(solucion || '').trim()) {
    throw httpError('La solución aplicada es requerida al registrar un trabajo realizado', 400)
  }

  // Solo supervisor/admin pueden asignar a otro usuario
  let assignedTo = null
  if (assigned_to) {
    if (['supervisor', 'admin'].includes(user.rol) || assigned_to === user.id) {
      assignedTo = assigned_to
    } else {
      throw httpError('Solo un supervisor puede asignar la orden a otro técnico', 403)
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const assetId = asset_id || await resolveAssetId(client, assetCode)
    const estadoInicial = esOrden ? 'abierta' : 'pendiente_aprobacion'

    const { rows } = await client.query(
      `INSERT INTO maintenances
         (asset_id, user_id, assigned_to, plan_id, tipo, prioridad, motivo,
          descripcion_problema, solucion, hubo_cambio, estado, fecha_programada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        assetId, user.id, assignedTo, opts.planId || null,
        tipo || 'correctivo', prioridad || 'media', motivo,
        descripcion_problema, esOrden ? '' : solucion, !!hubo_cambio,
        estadoInicial, fecha_programada || null,
      ]
    )
    const maintenance = rows[0]

    if (hubo_cambio && Array.isArray(partes) && partes.length > 0) {
      await insertPartes(client, maintenance.id, partes)
    }

    await logHistory(
      client, maintenance.id, user.id,
      esOrden ? 'orden_creada' : 'registrada',
      null, estadoInicial, opts.detalle || null
    )
    if (assignedTo) {
      await logHistory(client, maintenance.id, user.id, 'asignada', null, null, `Asignada al usuario #${assignedTo}`)
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
  const { rows } = await pool.query('SELECT estado, user_id, assigned_to FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) throw httpError('Mantenimiento no encontrado', 404)
  const m = rows[0]

  if (!['borrador', 'rechazado'].includes(m.estado)) {
    throw httpError('Solo se pueden editar mantenimientos en estado borrador o rechazado', 409)
  }
  if (userRol === 'tecnico' && m.user_id !== userId && m.assigned_to !== userId) {
    throw httpError('No tienes permiso para editar este mantenimiento', 403)
  }

  const { motivo, descripcion_problema, solucion, hubo_cambio, partes, tipo, prioridad } = data

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Si venía rechazado, al editarlo vuelve a pendiente de aprobación
    const nuevoEstado = m.estado === 'rechazado' ? 'pendiente_aprobacion' : m.estado

    await client.query(
      `UPDATE maintenances
       SET motivo=$1, descripcion_problema=$2, solucion=$3, hubo_cambio=$4,
           tipo=COALESCE($5, tipo), prioridad=COALESCE($6, prioridad),
           estado=$7, comentario_supervisor=NULL, supervisor_id=NULL, updated_at=NOW()
       WHERE id=$8`,
      [motivo, descripcion_problema, solucion, !!hubo_cambio, tipo || null, prioridad || null, nuevoEstado, id]
    )

    // Reemplazar piezas devolviendo stock de las anteriores
    await removePartes(client, id)
    if (hubo_cambio && Array.isArray(partes) && partes.length > 0) {
      await insertPartes(client, id, partes)
    }

    await logHistory(client, id, userId, 'editada', m.estado, nuevoEstado, null)

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return findById(id)
}

/** Asigna (o reasigna) la orden a un técnico. Solo supervisor/admin. */
async function assign(id, targetUserId, actorId) {
  const { rows } = await pool.query('SELECT estado FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) throw httpError('Mantenimiento no encontrado', 404)
  if (!ESTADOS_ABIERTOS.includes(rows[0].estado)) {
    throw httpError('Solo se pueden asignar órdenes abiertas o en progreso', 409)
  }

  const target = await pool.query('SELECT id, nombre, activo FROM users WHERE id = $1', [targetUserId])
  if (!target.rows[0] || !target.rows[0].activo) throw httpError('Usuario destino no válido', 400)

  await pool.query(
    'UPDATE maintenances SET assigned_to = $1, updated_at = NOW() WHERE id = $2',
    [targetUserId, id]
  )
  await logHistory(pool, id, actorId, 'asignada', null, null, `Asignada a ${target.rows[0].nombre}`)
  return findById(id)
}

function canWorkOn(m, user) {
  if (['supervisor', 'admin'].includes(user.rol)) return true
  return m.user_id === user.id || m.assigned_to === user.id
}

/** El técnico inicia el trabajo de una orden abierta. */
async function start(id, user) {
  const { rows } = await pool.query('SELECT estado, user_id, assigned_to, asset_id FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) throw httpError('Mantenimiento no encontrado', 404)
  const m = rows[0]

  if (m.estado !== 'abierta') throw httpError('Solo se puede iniciar una orden en estado abierta', 409)
  if (!canWorkOn(m, user) && m.assigned_to) {
    throw httpError('La orden está asignada a otro técnico', 403)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Si nadie la tenía asignada, queda asignada a quien la inicia
    await client.query(
      `UPDATE maintenances
       SET estado='en_progreso', fecha_inicio=COALESCE(fecha_inicio, NOW()),
           assigned_to=COALESCE(assigned_to, $1), updated_at=NOW()
       WHERE id=$2`,
      [user.id, id]
    )
    await client.query(
      `UPDATE assets SET estado='en_reparacion', updated_at=NOW() WHERE id=$1 AND estado='operativo'`,
      [m.asset_id]
    )
    await logHistory(client, id, user.id, 'iniciada', 'abierta', 'en_progreso', null)

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return findById(id)
}

/** El técnico completa el trabajo: registra solución, tiempos y piezas, y envía a aprobación. */
async function complete(id, data, user) {
  const { rows } = await pool.query('SELECT estado, user_id, assigned_to, asset_id FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) throw httpError('Mantenimiento no encontrado', 404)
  const m = rows[0]

  if (!ESTADOS_ABIERTOS.includes(m.estado)) {
    throw httpError('Solo se pueden completar órdenes abiertas o en progreso', 409)
  }
  if (!canWorkOn(m, user)) throw httpError('No tienes permiso sobre esta orden', 403)

  const { solucion, horas_trabajo, tiempo_parada_horas, hubo_cambio, partes } = data
  if (!(solucion || '').trim()) throw httpError('La solución aplicada es requerida para completar la orden', 400)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE maintenances
       SET estado='pendiente_aprobacion', solucion=$1,
           horas_trabajo=$2, tiempo_parada_horas=$3, hubo_cambio=$4,
           fecha_inicio=COALESCE(fecha_inicio, NOW()), fecha_fin=NOW(),
           assigned_to=COALESCE(assigned_to, $5), updated_at=NOW()
       WHERE id=$6`,
      [solucion, horas_trabajo ?? null, tiempo_parada_horas ?? null, !!hubo_cambio, user.id, id]
    )

    await removePartes(client, id)
    if (hubo_cambio && Array.isArray(partes) && partes.length > 0) {
      await insertPartes(client, id, partes)
    }

    await client.query(
      `UPDATE assets SET estado='operativo', updated_at=NOW() WHERE id=$1 AND estado='en_reparacion'`,
      [m.asset_id]
    )
    await logHistory(client, id, user.id, 'completada', m.estado, 'pendiente_aprobacion', null)

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
  if (!rows[0]) throw httpError('Mantenimiento no encontrado', 404)
  if (rows[0].estado !== 'pendiente_aprobacion') {
    throw httpError('Solo se pueden aprobar mantenimientos pendientes de aprobación', 409)
  }
  await pool.query(
    `UPDATE maintenances SET estado='aprobado', supervisor_id=$1, updated_at=NOW() WHERE id=$2`,
    [supervisorId, id]
  )
  await logHistory(pool, id, supervisorId, 'aprobada', 'pendiente_aprobacion', 'aprobado', null)
  return findById(id)
}

async function reject(id, supervisorId, comentario) {
  const { rows } = await pool.query('SELECT estado FROM maintenances WHERE id = $1', [id])
  if (!rows[0]) throw httpError('Mantenimiento no encontrado', 404)
  if (rows[0].estado !== 'pendiente_aprobacion') {
    throw httpError('Solo se pueden rechazar mantenimientos pendientes de aprobación', 409)
  }
  await pool.query(
    `UPDATE maintenances SET estado='rechazado', supervisor_id=$1, comentario_supervisor=$2, updated_at=NOW() WHERE id=$3`,
    [supervisorId, comentario, id]
  )
  await logHistory(pool, id, supervisorId, 'rechazada', 'pendiente_aprobacion', 'rechazado', comentario)
  return findById(id)
}

const MIME_FROM_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

async function getPhotoFile(maintenanceId, photoId, user) {
  const { rows } = await pool.query(
    `SELECT mp.ruta_archivo, mp.nombre_original, m.user_id, m.assigned_to
     FROM maintenance_photos mp
     JOIN maintenances m ON m.id = mp.maintenance_id
     WHERE mp.id = $1 AND mp.maintenance_id = $2`,
    [photoId, maintenanceId]
  )
  if (!rows[0]) throw httpError('Foto no encontrada', 404)
  if (user.rol === 'tecnico' && rows[0].user_id !== user.id && rows[0].assigned_to !== user.id) {
    throw httpError('Sin acceso', 403)
  }
  const filePath = rows[0].ruta_archivo
  // Protección path traversal: verificar que el archivo esté dentro de PHOTOS_DIR
  const resolvedPath = path.resolve(filePath)
  const resolvedDir  = path.resolve(PHOTOS_DIR)
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    throw httpError('Acceso denegado', 403)
  }
  if (!fs.existsSync(resolvedPath)) {
    throw httpError('Archivo no encontrado en disco', 404)
  }
  const dotParts = resolvedPath.split('.')
  const ext  = dotParts.length > 1 ? dotParts.pop().toLowerCase() : ''
  const mime = MIME_FROM_EXT[ext] || 'application/octet-stream'
  return { filePath: resolvedPath, mime }
}

async function addPhotos(maintenanceId, files) {
  const { rows } = await pool.query('SELECT estado FROM maintenances WHERE id = $1', [maintenanceId])
  if (!rows[0]) throw httpError('Mantenimiento no encontrado', 404)
  if (rows[0].estado === 'aprobado') {
    throw httpError('No se pueden agregar fotos a un mantenimiento aprobado', 409)
  }

  const countRes = await pool.query(
    'SELECT COUNT(*) FROM maintenance_photos WHERE maintenance_id = $1',
    [maintenanceId]
  )
  const current = parseInt(countRes.rows[0].count, 10)
  if (current + files.length > MAX_FOTOS) {
    throw httpError(`Se pueden adjuntar máximo ${MAX_FOTOS} fotos. Ya tiene ${current}.`, 400)
  }

  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true })
  }

  const saved = []
  for (const file of files) {
    const detected = await validateMimeBuffer(file.buffer, file.fieldname)
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
    throw httpError('No se puede eliminar fotos de un mantenimiento aprobado', 409)
  }

  const { rows } = await pool.query(
    'SELECT ruta_archivo FROM maintenance_photos WHERE id = $1 AND maintenance_id = $2',
    [photoId, maintenanceId]
  )
  if (!rows[0]) throw httpError('Foto no encontrada', 404)

  if (fs.existsSync(rows[0].ruta_archivo)) {
    fs.unlinkSync(rows[0].ruta_archivo)
  }

  await pool.query('DELETE FROM maintenance_photos WHERE id = $1', [photoId])
}

/**
 * Novedades para el dashboard:
 * - técnicos: resoluciones recientes de sus registros + órdenes recién asignadas
 * - supervisores/admins: además, pendientes de aprobación y solicitudes sin atender
 */
async function getNotifications(user) {
  const items = []

  const resueltos = await pool.query(`
    SELECT m.id, m.estado, m.motivo, m.updated_at, m.comentario_supervisor,
           a.codigo AS asset_codigo, a.nombre AS asset_nombre,
           s.nombre AS supervisor_nombre
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    LEFT JOIN users s ON s.id = m.supervisor_id
    WHERE (m.user_id = $1 OR m.assigned_to = $1)
      AND m.estado IN ('aprobado', 'rechazado')
      AND m.updated_at >= NOW() - INTERVAL '7 days'
    ORDER BY m.updated_at DESC
    LIMIT 3
  `, [user.id])
  items.push(...resueltos.rows.map(r => ({ ...r, novedad: r.estado })))

  const asignadas = await pool.query(`
    SELECT m.id, m.estado, m.motivo, m.prioridad, m.fecha_programada, m.updated_at,
           a.codigo AS asset_codigo, a.nombre AS asset_nombre
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    WHERE m.assigned_to = $1
      AND m.estado = 'abierta'
    ORDER BY m.prioridad DESC, m.fecha_programada ASC NULLS LAST
    LIMIT 3
  `, [user.id])
  items.push(...asignadas.rows.map(r => ({ ...r, novedad: 'asignada' })))

  if (['supervisor', 'admin'].includes(user.rol)) {
    const pendientes = await pool.query(`
      SELECT m.id, m.estado, m.motivo, m.updated_at,
             a.codigo AS asset_codigo, a.nombre AS asset_nombre
      FROM maintenances m
      JOIN assets a ON a.id = m.asset_id
      WHERE m.estado = 'pendiente_aprobacion'
      ORDER BY m.updated_at ASC
      LIMIT 3
    `)
    items.push(...pendientes.rows.map(r => ({ ...r, novedad: 'por_aprobar' })))

    const solicitudes = await pool.query(`
      SELECT r.id, r.descripcion AS motivo, r.prioridad, r.created_at AS updated_at,
             a.codigo AS asset_codigo, a.nombre AS asset_nombre
      FROM maintenance_requests r
      JOIN assets a ON a.id = r.asset_id
      WHERE r.estado = 'pendiente'
      ORDER BY r.created_at ASC
      LIMIT 3
    `)
    items.push(...solicitudes.rows.map(r => ({ ...r, novedad: 'solicitud' })))
  }

  return items
}

/** KPIs del dashboard. Los indicadores globales solo se calculan para supervisor/admin. */
async function getStats(userId, userRol) {
  const isSupervisor = ['supervisor', 'admin'].includes(userRol)
  const scope  = isSupervisor ? '' : 'WHERE (user_id = $1 OR assigned_to = $1)'
  const params = isSupervisor ? [] : [userId]

  const { rows } = await pool.query(`
    SELECT estado, COUNT(*)::int AS total
    FROM maintenances
    ${scope}
    GROUP BY estado
  `, params)

  const base = {
    borrador: 0, abierta: 0, en_progreso: 0,
    pendiente_aprobacion: 0, aprobado: 0, rechazado: 0,
  }
  rows.forEach(r => { base[r.estado] = r.total })
  base.total = Object.values(base).reduce((a, b) => a + b, 0)

  const vencidasRes = await pool.query(`
    SELECT COUNT(*)::int AS total
    FROM maintenances
    WHERE estado IN ('abierta', 'en_progreso')
      AND fecha_programada < CURRENT_DATE
      ${isSupervisor ? '' : 'AND (user_id = $1 OR assigned_to = $1)'}
  `, params)
  base.vencidas = vencidasRes.rows[0].total

  if (!isSupervisor) return base

  const [mttr, costoMes, porTipo, topActivos, cumplimiento] = await Promise.all([
    // MTTR: promedio de horas entre inicio y fin de trabajos aprobados en los últimos 90 días
    pool.query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (fecha_fin - fecha_inicio)) / 3600)::numeric, 1) AS horas
      FROM maintenances
      WHERE estado = 'aprobado'
        AND fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL
        AND fecha_fin >= NOW() - INTERVAL '90 days'
    `),
    // Costo de repuestos del mes en curso
    pool.query(`
      SELECT COALESCE(SUM(mp.cantidad * mp.costo_unitario), 0) AS costo
      FROM maintenance_parts mp
      JOIN maintenances m ON m.id = mp.maintenance_id
      WHERE m.created_at >= date_trunc('month', NOW())
    `),
    pool.query(`
      SELECT tipo, COUNT(*)::int AS total
      FROM maintenances
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY tipo
    `),
    // Activos con más correctivos en 90 días (candidatos a revisión)
    pool.query(`
      SELECT a.id, a.codigo, a.nombre, COUNT(*)::int AS fallas
      FROM maintenances m
      JOIN assets a ON a.id = m.asset_id
      WHERE m.tipo = 'correctivo'
        AND m.created_at >= NOW() - INTERVAL '90 days'
      GROUP BY a.id, a.codigo, a.nombre
      ORDER BY fallas DESC
      LIMIT 5
    `),
    // Cumplimiento preventivo: % de preventivos con vencimiento en 30 días completados a tiempo
    pool.query(`
      SELECT COUNT(*) FILTER (WHERE fecha_fin IS NOT NULL AND fecha_fin::date <= fecha_programada)::int AS a_tiempo,
             COUNT(*)::int AS total
      FROM maintenances
      WHERE tipo = 'preventivo'
        AND fecha_programada IS NOT NULL
        AND fecha_programada BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE
    `),
  ])

  base.mttr_horas = mttr.rows[0].horas !== null ? parseFloat(mttr.rows[0].horas) : null
  base.costo_mes  = parseFloat(costoMes.rows[0].costo)
  base.por_tipo   = { correctivo: 0, preventivo: 0, predictivo: 0, mejora: 0 }
  porTipo.rows.forEach(r => { base.por_tipo[r.tipo] = r.total })
  base.top_activos = topActivos.rows

  const c = cumplimiento.rows[0]
  base.cumplimiento_preventivo = c.total > 0 ? Math.round((c.a_tiempo / c.total) * 100) : null

  return base
}

module.exports = {
  findAll, findById, create, update, assign, start, complete,
  approve, reject, getPhotoFile, addPhotos, deletePhoto,
  getNotifications, getStats, logHistory, resolveAssetId,
}

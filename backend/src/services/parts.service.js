'use strict'

const pool = require('../db/pool')

function httpError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

async function findAll(query = {}) {
  const conditions = []
  const values = []
  let i = 1

  if (query.q) {
    conditions.push(`(p.codigo ILIKE $${i} OR p.nombre ILIKE $${i})`)
    values.push(`%${query.q}%`)
    i++
  }
  if (query.activo !== undefined) {
    conditions.push(`p.activo = $${i++}`)
    values.push(query.activo)
  }
  if (query.bajo_stock) {
    conditions.push('p.activo AND p.stock <= p.stock_minimo')
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await pool.query(`
    SELECT p.*, (p.stock <= p.stock_minimo) AS bajo_stock
    FROM parts p
    ${where}
    ORDER BY p.nombre ASC
  `, values)
  return rows
}

async function create(data) {
  const dup = await pool.query('SELECT id FROM parts WHERE codigo = $1', [data.codigo])
  if (dup.rows[0]) throw httpError(`Ya existe un repuesto con el código ${data.codigo}`, 409)

  const { rows } = await pool.query(
    `INSERT INTO parts (codigo, nombre, descripcion, stock, stock_minimo, costo_unitario, ubicacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.codigo, data.nombre, data.descripcion || null,
      data.stock ?? 0, data.stock_minimo ?? 0,
      data.costo_unitario ?? 0, data.ubicacion || null,
    ]
  )
  return rows[0]
}

async function update(id, data) {
  const { rows: existing } = await pool.query('SELECT id, codigo FROM parts WHERE id = $1', [id])
  if (!existing[0]) throw httpError('Repuesto no encontrado', 404)

  if (data.codigo && data.codigo !== existing[0].codigo) {
    const dup = await pool.query('SELECT id FROM parts WHERE codigo = $1 AND id <> $2', [data.codigo, id])
    if (dup.rows[0]) throw httpError(`Ya existe un repuesto con el código ${data.codigo}`, 409)
  }

  const { rows } = await pool.query(
    `UPDATE parts
     SET codigo=$1, nombre=$2, descripcion=$3, stock_minimo=$4, costo_unitario=$5, ubicacion=$6, updated_at=NOW()
     WHERE id=$7
     RETURNING *`,
    [
      data.codigo, data.nombre, data.descripcion || null,
      data.stock_minimo ?? 0, data.costo_unitario ?? 0,
      data.ubicacion || null, id,
    ]
  )
  return rows[0]
}

/** Ajuste manual de stock (entrada positiva o salida negativa). */
async function adjustStock(id, ajuste) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT id, nombre, stock FROM parts WHERE id = $1 FOR UPDATE', [id])
    if (!rows[0]) throw httpError('Repuesto no encontrado', 404)
    if (rows[0].stock + ajuste < 0) {
      throw httpError(`El ajuste dejaría el stock en negativo (actual: ${rows[0].stock})`, 409)
    }
    const { rows: updated } = await client.query(
      'UPDATE parts SET stock = stock + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [ajuste, id]
    )
    await client.query('COMMIT')
    return updated[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function toggle(id) {
  const { rows } = await pool.query(
    'UPDATE parts SET activo = NOT activo, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id]
  )
  if (!rows[0]) throw httpError('Repuesto no encontrado', 404)
  return rows[0]
}

module.exports = { findAll, create, update, adjustStock, toggle }

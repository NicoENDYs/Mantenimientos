'use strict'

const bcryptjs = require('bcryptjs')
const pool = require('../db/pool')

const SALT_ROUNDS = 12

async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, nombre, email, rol, activo, login_intentos, created_at FROM users ORDER BY created_at DESC'
  )
  return rows
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, nombre, email, rol, activo, login_intentos, created_at FROM users WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

async function create({ nombre, email, password, rol }) {
  // Verificar email único
  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (exists.rows.length > 0) {
    const err = new Error('El email ya está registrado')
    err.statusCode = 409
    throw err
  }

  const password_hash = await bcryptjs.hash(password, SALT_ROUNDS)
  const { rows } = await pool.query(
    `INSERT INTO users (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, email, rol, activo, created_at`,
    [nombre, email, password_hash, rol || 'tecnico']
  )
  return rows[0]
}

async function update(id, { nombre, email, password, rol }) {
  const fields = []
  const values = []
  let i = 1

  if (nombre !== undefined)   { fields.push(`nombre = $${i++}`);        values.push(nombre) }
  if (email !== undefined)    { fields.push(`email = $${i++}`);         values.push(email) }
  if (password !== undefined) {
    const hash = await bcryptjs.hash(password, SALT_ROUNDS)
    fields.push(`password_hash = $${i++}`)
    values.push(hash)
  }
  if (rol !== undefined)      { fields.push(`rol = $${i++}`);           values.push(rol) }

  if (fields.length === 0) {
    const err = new Error('No hay campos para actualizar')
    err.statusCode = 400
    throw err
  }

  values.push(id)
  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, nombre, email, rol, activo`,
    values
  )
  return rows[0] || null
}

async function toggle(id) {
  const { rows } = await pool.query(
    'UPDATE users SET activo = NOT activo, login_intentos = 0 WHERE id = $1 RETURNING id, nombre, activo',
    [id]
  )
  return rows[0] || null
}

async function unlock(id) {
  const { rows } = await pool.query(
    'UPDATE users SET login_intentos = 0 WHERE id = $1 RETURNING id, nombre, activo, login_intentos',
    [id]
  )
  return rows[0] || null
}

module.exports = { findAll, findById, create, update, toggle, unlock }

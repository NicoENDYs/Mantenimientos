'use strict'

const bcryptjs = require('bcryptjs')
const pool = require('../db/pool')
const { MAX_INTENTOS_LOGIN: MAX_INTENTOS } = require('../constants')

async function logAcceso(userId, ip, accion, resultado) {
  await pool.query(
    'INSERT INTO access_logs (user_id, ip, accion, resultado) VALUES ($1, $2, $3, $4)',
    [userId || null, ip, accion, resultado]
  )
}

async function login(email, password, ip) {
  // Buscar usuario
  const { rows } = await pool.query(
    'SELECT id, nombre, email, password_hash, rol, activo, login_intentos FROM users WHERE email = $1',
    [email]
  )

  if (rows.length === 0) {
    await logAcceso(null, ip, 'login', 'fallido')
    const err = new Error('Credenciales incorrectas')
    err.statusCode = 401
    throw err
  }

  const user = rows[0]

  if (!user.activo) {
    await logAcceso(user.id, ip, 'login', 'cuenta_inactiva')
    const err = new Error('Cuenta inactiva')
    err.statusCode = 403
    throw err
  }

  if (user.login_intentos >= MAX_INTENTOS) {
    await logAcceso(user.id, ip, 'login', 'cuenta_bloqueada')
    const err = new Error('Cuenta bloqueada por demasiados intentos fallidos. Contacta al administrador.')
    err.statusCode = 403
    throw err
  }

  const valid = await bcryptjs.compare(password, user.password_hash)

  if (!valid) {
    await pool.query(
      'UPDATE users SET login_intentos = login_intentos + 1 WHERE id = $1',
      [user.id]
    )
    await logAcceso(user.id, ip, 'login', 'fallido')
    const err = new Error('Credenciales incorrectas')
    err.statusCode = 401
    throw err
  }

  // Reset intentos en login exitoso
  await pool.query('UPDATE users SET login_intentos = 0 WHERE id = $1', [user.id])
  await logAcceso(user.id, ip, 'login', 'exitoso')

  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
}

async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1 AND activo = true',
    [userId]
  )
  if (!rows[0]) {
    const err = new Error('Usuario no encontrado')
    err.statusCode = 404
    throw err
  }

  const valid = await bcryptjs.compare(currentPassword, rows[0].password_hash)
  if (!valid) {
    const err = new Error('La contraseña actual es incorrecta')
    err.statusCode = 400
    throw err
  }

  const newHash = await bcryptjs.hash(newPassword, 12)
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId])
}

async function recoverPassword(email) {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1 AND activo = true', [email])
  if (rows.length === 0) return // No revelar si el email existe

  // En producción: generar token temporal y enviar email
  // Por ahora retorna un indicador (implementar envío de email según infraestructura)
  return { enviado: true }
}

module.exports = { login, recoverPassword }

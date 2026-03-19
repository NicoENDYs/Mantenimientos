'use strict'

const authService = require('../services/auth.service')

const IS_PROD = process.env.NODE_ENV === 'production'

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   IS_PROD,          // solo HTTPS en producción
  sameSite: 'strict',
  path:     '/',
  // maxAge en segundos — debe coincidir con JWT_EXPIRES_IN
  maxAge:   8 * 60 * 60,      // 8 horas
}

async function login(request, reply) {
  const { email, password } = request.body
  const ip = request.ip

  const user  = await authService.login(email, password, ip)
  const token = request.server.jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre })

  // Setear cookie httpOnly — persiste en recargas sin exponer el token a JS
  reply.setCookie('token', token, COOKIE_OPTS)

  return reply.send({ user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } })
}

async function me(request, reply) {
  // El middleware authenticate ya validó el token y adjuntó request.user
  const { rows } = await require('../db/pool').query(
    'SELECT id, nombre, email, rol FROM users WHERE id = $1 AND activo = true',
    [request.user.id]
  )
  if (!rows[0]) {
    reply.clearCookie('token', { path: '/' })
    return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Sesión inválida' })
  }
  return reply.send({ user: rows[0] })
}

async function logout(request, reply) {
  reply.clearCookie('token', { path: '/' })
  return reply.send({ message: 'Sesión cerrada' })
}

async function recoverPassword(request, reply) {
  const { email } = request.body
  await authService.recoverPassword(email)
  return reply.send({ message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.' })
}

async function changePassword(request, reply) {
  const { currentPassword, newPassword } = request.body
  await authService.changePassword(request.user.id, currentPassword, newPassword)
  return reply.send({ message: 'Contraseña actualizada correctamente' })
}

module.exports = { login, me, logout, recoverPassword, changePassword }

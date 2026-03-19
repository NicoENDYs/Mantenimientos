'use strict'

async function authenticate(request, reply) {
  // Intentar desde cookie httpOnly primero, luego Authorization header
  const cookieToken = request.cookies && request.cookies.token

  if (cookieToken) {
    try {
      request.user = request.server.jwt.verify(cookieToken)
      return
    } catch {
      // cookie inválida — probar con header
    }
  }

  try {
    await request.jwtVerify() // verifica Authorization: Bearer <token>
  } catch {
    return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Token inválido o expirado' })
  }
}

module.exports = authenticate

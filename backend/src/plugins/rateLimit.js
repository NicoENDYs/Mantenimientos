'use strict'

const fp = require('fastify-plugin')
const rateLimit = require('@fastify/rate-limit')

module.exports = fp(async function (fastify) {
  fastify.register(rateLimit, {
    global: false, // Solo aplicar donde se indique explícitamente
    max: 5,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Demasiados intentos. Intenta de nuevo en 1 minuto.',
    }),
  })
})

'use strict'

require('dotenv').config()

const Fastify = require('fastify')

function buildApp(opts = {}) {
  const fastify = Fastify({
    logger: opts.logger !== undefined ? opts.logger : true,
    ajv: {
      customOptions: {
        allErrors: true,
        coerceTypes: 'array',
        useDefaults: true,
        removeAdditional: 'all',
      },
    },
  })

  // — Swagger (solo en desarrollo) —
  if (process.env.NODE_ENV !== 'production') {
    fastify.register(require('@fastify/swagger'), {
      openapi: {
        info: { title: 'SIGMAN API', version: '1.0.0', description: 'API del sistema de gestión de mantenimiento' },
        components: {
          securitySchemes: {
            cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
          },
        },
        security: [{ cookieAuth: [] }],
      },
    })
    fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list' },
    })
  }

  // — Plugins de seguridad y utilidades —
  fastify.register(require('./plugins/cookie'))
  fastify.register(require('./plugins/helmet'))
  fastify.register(require('./plugins/cors'))
  fastify.register(require('./plugins/rateLimit'))
  fastify.register(require('./plugins/jwt'))
  fastify.register(require('./plugins/multipart'))

  // — Manejador global de errores —
  fastify.setErrorHandler(function (error, request, reply) {
    const statusCode = error.statusCode || error.status || 500
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled error')
    }
    reply.code(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message: error.message || 'Error interno del servidor',
      requestId: request.id,
    })
  })

  // — Rutas —
  fastify.register(require('./routes/auth.routes'),          { prefix: '/api/auth' })
  fastify.register(require('./routes/users.routes'),         { prefix: '/api/users' })
  fastify.register(require('./routes/assets.routes'),        { prefix: '/api/assets' })
  fastify.register(require('./routes/maintenances.routes'),  { prefix: '/api/maintenances' })
  fastify.register(require('./routes/reports.routes'),       { prefix: '/api/reports' })

  // Health check
  fastify.get('/health', async () => ({ status: 'ok' }))

  return fastify
}

module.exports = buildApp

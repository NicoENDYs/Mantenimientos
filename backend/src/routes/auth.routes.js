'use strict'

const authController = require('../controllers/auth.controller')
const authenticate   = require('../middlewares/authenticate')

async function authRoutes(fastify) {
  // POST /api/auth/login — rate limited
  fastify.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
    handler: authController.login,
  })

  // GET /api/auth/me — restaura sesión desde cookie
  fastify.get('/me', { preHandler: authenticate, handler: authController.me })

  // POST /api/auth/logout
  fastify.post('/logout', { handler: authController.logout })

  // POST /api/auth/recover-password
  fastify.post('/recover-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    handler: authController.recoverPassword,
  })
}

module.exports = authRoutes

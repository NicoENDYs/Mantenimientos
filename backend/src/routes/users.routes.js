'use strict'

const authenticate = require('../middlewares/authenticate')
const authorize    = require('../middlewares/authorize')
const usersCtrl    = require('../controllers/users.controller')

async function usersRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', authorize(['admin']))

  // GET /api/users
  fastify.get('/', { handler: usersCtrl.list })

  // POST /api/users
  fastify.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['nombre', 'email', 'password'],
        properties: {
          nombre:   { type: 'string', minLength: 1 },
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          rol:      { type: 'string', enum: ['tecnico', 'supervisor', 'admin'] },
        },
      },
    },
    handler: usersCtrl.create,
  })

  // PUT /api/users/:id
  fastify.put('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['nombre', 'email'],
        properties: {
          nombre:   { type: 'string', minLength: 1, maxLength: 100 },
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          rol:      { type: 'string', enum: ['tecnico', 'supervisor', 'admin'] },
        },
      },
    },
    handler: usersCtrl.update,
  })

  // PATCH /api/users/:id/toggle
  fastify.patch('/:id/toggle', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: usersCtrl.toggle,
  })

  // PATCH /api/users/:id/unlock
  fastify.patch('/:id/unlock', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    handler: usersCtrl.unlock,
  })
}

module.exports = usersRoutes

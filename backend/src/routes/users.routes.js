'use strict'

const authenticate = require('../middlewares/authenticate')
const authorize    = require('../middlewares/authorize')
const usersCtrl    = require('../controllers/users.controller')

const soloAdmin = authorize(['admin'])

async function usersRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/users/assignables — técnicos/supervisores activos, para asignar órdenes
  fastify.get('/assignables', {
    preHandler: authorize(['supervisor', 'admin']),
    handler: usersCtrl.assignables,
  })

  // GET /api/users — solo Admin
  fastify.get('/', { preHandler: soloAdmin, handler: usersCtrl.list })

  // POST /api/users — solo Admin
  fastify.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    preHandler: soloAdmin,
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

  // PUT /api/users/:id — solo Admin
  fastify.put('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: soloAdmin,
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

  // PATCH /api/users/:id/toggle — solo Admin
  fastify.patch('/:id/toggle', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: soloAdmin,
    handler: usersCtrl.toggle,
  })

  // PATCH /api/users/:id/unlock — solo Admin
  fastify.patch('/:id/unlock', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    preHandler: soloAdmin,
    handler: usersCtrl.unlock,
  })
}

module.exports = usersRoutes

'use strict'

const authenticate = require('../middlewares/authenticate')
const authorize    = require('../middlewares/authorize')
const svc          = require('../services/requests.service')

const TIPOS       = ['correctivo', 'preventivo', 'predictivo', 'mejora']
const PRIORIDADES = ['baja', 'media', 'alta', 'critica']

async function requestsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/requests — técnico ve las suyas; supervisor/admin todas
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          estado: { type: 'string', enum: ['pendiente', 'convertida', 'descartada'] },
        },
      },
    },
    handler: async (request, reply) => {
      const rows = await svc.findAll(request.query, request.user.rol, request.user.id)
      return reply.send(rows)
    },
  })

  // POST /api/requests — cualquier usuario reporta una falla
  fastify.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['assetCode', 'descripcion'],
        properties: {
          assetCode:   { type: 'string', minLength: 1 },
          descripcion: { type: 'string', minLength: 1, maxLength: 5000 },
          prioridad:   { type: 'string', enum: PRIORIDADES },
        },
      },
    },
    handler: async (request, reply) => {
      const req = await svc.create(request.body, request.user.id)
      return reply.code(201).send(req)
    },
  })

  // PATCH /api/requests/:id/convert — convertir en orden de trabajo
  fastify.patch('/:id/convert', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: {
      body: {
        type: 'object',
        properties: {
          motivo:           { type: 'string', minLength: 1, maxLength: 500 },
          tipo:             { type: 'string', enum: TIPOS },
          prioridad:        { type: 'string', enum: PRIORIDADES },
          assigned_to:      { type: 'integer', minimum: 1 },
          fecha_programada: { type: 'string', format: 'date' },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await svc.convert(parseInt(request.params.id, 10), request.body || {}, request.user)
      return reply.send(result)
    },
  })

  // PATCH /api/requests/:id/discard — descartar con comentario
  fastify.patch('/:id/discard', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: {
      body: {
        type: 'object',
        required: ['comentario'],
        properties: {
          comentario: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
    },
    handler: async (request, reply) => {
      const req = await svc.discard(parseInt(request.params.id, 10), request.body.comentario, request.user.id)
      return reply.send(req)
    },
  })
}

module.exports = requestsRoutes

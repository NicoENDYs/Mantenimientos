'use strict'

const authenticate = require('../middlewares/authenticate')
const authorize    = require('../middlewares/authorize')
const svc          = require('../services/parts.service')

const PART_BODY = {
  type: 'object',
  required: ['codigo', 'nombre'],
  properties: {
    codigo:         { type: 'string', minLength: 1, maxLength: 100 },
    nombre:         { type: 'string', minLength: 1, maxLength: 200 },
    descripcion:    { type: 'string', maxLength: 5000 },
    stock:          { type: 'integer', minimum: 0 },
    stock_minimo:   { type: 'integer', minimum: 0 },
    costo_unitario: { type: 'number', minimum: 0 },
    ubicacion:      { type: 'string', maxLength: 200 },
  },
}

async function partsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/parts — catálogo (todos los roles: el técnico elige repuestos)
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q:          { type: 'string' },
          activo:     { type: 'boolean' },
          bajo_stock: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      const rows = await svc.findAll(request.query)
      return reply.send(rows)
    },
  })

  // POST /api/parts — solo Supervisor/Admin
  fastify.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: { body: PART_BODY },
    handler: async (request, reply) => {
      const part = await svc.create(request.body)
      return reply.code(201).send(part)
    },
  })

  // PUT /api/parts/:id — solo Supervisor/Admin (el stock se ajusta por /stock)
  fastify.put('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: { body: PART_BODY },
    handler: async (request, reply) => {
      const part = await svc.update(parseInt(request.params.id, 10), request.body)
      return reply.send(part)
    },
  })

  // PATCH /api/parts/:id/stock — entrada/salida manual de inventario
  fastify.patch('/:id/stock', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: {
      body: {
        type: 'object',
        required: ['ajuste'],
        properties: {
          ajuste: { type: 'integer' },
        },
      },
    },
    handler: async (request, reply) => {
      const part = await svc.adjustStock(parseInt(request.params.id, 10), request.body.ajuste)
      return reply.send(part)
    },
  })

  // PATCH /api/parts/:id/toggle — activar/desactivar del catálogo
  fastify.patch('/:id/toggle', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    handler: async (request, reply) => {
      const part = await svc.toggle(parseInt(request.params.id, 10))
      return reply.send(part)
    },
  })
}

module.exports = partsRoutes

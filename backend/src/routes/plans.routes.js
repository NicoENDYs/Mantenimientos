'use strict'

const authenticate = require('../middlewares/authenticate')
const authorize    = require('../middlewares/authorize')
const svc          = require('../services/plans.service')

const TIPOS       = ['correctivo', 'preventivo', 'predictivo', 'mejora']
const PRIORIDADES = ['baja', 'media', 'alta', 'critica']

const PLAN_BODY = {
  type: 'object',
  required: ['titulo', 'frecuencia_dias', 'proxima_fecha'],
  properties: {
    assetCode:       { type: 'string', minLength: 1 },
    titulo:          { type: 'string', minLength: 1, maxLength: 200 },
    descripcion:     { type: 'string', maxLength: 5000 },
    tipo:            { type: 'string', enum: TIPOS },
    prioridad:       { type: 'string', enum: PRIORIDADES },
    frecuencia_dias: { type: 'integer', minimum: 1, maximum: 3650 },
    proxima_fecha:   { type: 'string', format: 'date' },
    assigned_to:     { type: 'integer', minimum: 1 },
  },
}

async function plansRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/plans — visible para todos los roles
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          activo:        { type: 'boolean' },
          asset_id:      { type: 'integer' },
          proximos_dias: { type: 'integer', minimum: 1, maximum: 365 },
        },
      },
    },
    handler: async (request, reply) => {
      const rows = await svc.findAll(request.query)
      return reply.send(rows)
    },
  })

  // POST /api/plans — solo Supervisor/Admin
  fastify.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: { body: { ...PLAN_BODY, required: [...PLAN_BODY.required, 'assetCode'] } },
    handler: async (request, reply) => {
      const plan = await svc.create(request.body, request.user.id)
      return reply.code(201).send(plan)
    },
  })

  // PUT /api/plans/:id — solo Supervisor/Admin
  fastify.put('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: { body: PLAN_BODY },
    handler: async (request, reply) => {
      const plan = await svc.update(parseInt(request.params.id, 10), request.body)
      return reply.send(plan)
    },
  })

  // PATCH /api/plans/:id/toggle — activar/pausar plan
  fastify.patch('/:id/toggle', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    handler: async (request, reply) => {
      const plan = await svc.toggle(parseInt(request.params.id, 10))
      return reply.send(plan)
    },
  })

  // POST /api/plans/generate — generar órdenes de planes vencidos ahora
  fastify.post('/generate', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    handler: async (request, reply) => {
      const generadas = await svc.generateDueOrders()
      return reply.send({ generadas: generadas.length, ordenes: generadas })
    },
  })
}

module.exports = plansRoutes

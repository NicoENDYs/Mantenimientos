'use strict'

const authenticate   = require('../middlewares/authenticate')
const authorize      = require('../middlewares/authorize')
const assetsService  = require('../services/assets.service')

async function assetsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/assets — listado con indicadores por activo
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q:          { type: 'string' },
          estado:     { type: 'string', enum: ['operativo', 'en_reparacion', 'fuera_de_servicio'] },
          criticidad: { type: 'string', enum: ['baja', 'media', 'alta', 'critica'] },
          page:       { type: 'integer', minimum: 1, default: 1 },
          limit:      { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await assetsService.findAll(request.query)
      return reply.send(result)
    },
  })

  // GET /api/assets/search?code=XXX
  fastify.get('/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: async (request, reply) => {
      const asset = await assetsService.searchByCode(request.query.code)
      return reply.send(asset)
    },
  })

  // GET /api/assets/:id — ficha con historial e indicadores
  fastify.get('/:id', {
    handler: async (request, reply) => {
      const asset = await assetsService.findById(parseInt(request.params.id, 10))
      if (!asset) {
        return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Activo no encontrado' })
      }
      return reply.send(asset)
    },
  })

  // PUT /api/assets/:id — solo Supervisor/Admin
  fastify.put('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: {
      body: {
        type: 'object',
        properties: {
          nombre:     { type: 'string', maxLength: 200 },
          tipo:       { type: 'string', maxLength: 100 },
          ubicacion:  { type: 'string', maxLength: 200 },
          estado:     { type: 'string', enum: ['operativo', 'en_reparacion', 'fuera_de_servicio'] },
          criticidad: { type: 'string', enum: ['baja', 'media', 'alta', 'critica'] },
          notas:      { type: 'string', maxLength: 5000 },
        },
      },
    },
    handler: async (request, reply) => {
      const asset = await assetsService.update(parseInt(request.params.id, 10), request.body)
      return reply.send(asset)
    },
  })
}

module.exports = assetsRoutes

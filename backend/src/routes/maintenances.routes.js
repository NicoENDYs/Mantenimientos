'use strict'

const authenticate = require('../middlewares/authenticate')
const authorize    = require('../middlewares/authorize')
const ctrl         = require('../controllers/maintenances.controller')

async function maintenancesRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/maintenances
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          asset_code:  { type: 'string' },
          user_id:     { type: 'integer' },
          estado:      { type: 'string', enum: ['borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado'] },
          fecha_desde: { type: 'string' },
          fecha_hasta: { type: 'string' },
          page:        { type: 'integer', minimum: 1, default: 1 },
          limit:       { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    handler: ctrl.list,
  })

  // GET /api/maintenances/notifications
  fastify.get('/notifications', { handler: ctrl.notifications })

  // GET /api/maintenances/:id
  fastify.get('/:id', { handler: ctrl.detail })

  // POST /api/maintenances
  fastify.post('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['assetCode', 'motivo', 'descripcion_problema', 'solucion'],
        properties: {
          assetCode:            { type: 'string', minLength: 1 },
          motivo:               { type: 'string', minLength: 1 },
          descripcion_problema: { type: 'string', minLength: 1 },
          solucion:             { type: 'string', minLength: 1 },
          hubo_cambio:          { type: 'boolean' },
          partes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['descripcion', 'cantidad'],
              properties: {
                descripcion: { type: 'string' },
                cantidad:    { type: 'integer', minimum: 1 },
              },
            },
          },
        },
      },
    },
    handler: ctrl.create,
  })

  // PUT /api/maintenances/:id
  fastify.put('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: ctrl.update,
  })

  // PATCH /api/maintenances/:id/approve — solo Supervisor/Admin
  fastify.patch('/:id/approve', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    handler: ctrl.approve,
  })

  // PATCH /api/maintenances/:id/reject — solo Supervisor/Admin
  fastify.patch('/:id/reject', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: {
      body: {
        type: 'object',
        required: ['comentario'],
        properties: {
          comentario: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: ctrl.reject,
  })

  // GET /api/maintenances/:id/photos/:photoId  — sirve el archivo con autenticación
  fastify.get('/:id/photos/:photoId', { handler: ctrl.servePhoto })

  // POST /api/maintenances/:id/photos
  fastify.post('/:id/photos', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    handler: ctrl.uploadPhotos,
  })

  // DELETE /api/maintenances/:id/photos/:photoId
  fastify.delete('/:id/photos/:photoId', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: ctrl.deletePhoto,
  })
}

module.exports = maintenancesRoutes

'use strict'

const authenticate = require('../middlewares/authenticate')
const authorize    = require('../middlewares/authorize')
const ctrl         = require('../controllers/maintenances.controller')

const ESTADOS    = ['borrador', 'abierta', 'en_progreso', 'pendiente_aprobacion', 'aprobado', 'rechazado']
const TIPOS      = ['correctivo', 'preventivo', 'predictivo', 'mejora']
const PRIORIDADES = ['baja', 'media', 'alta', 'critica']

const PARTE_SCHEMA = {
  type: 'object',
  required: ['cantidad'],
  properties: {
    part_id:     { type: 'integer', minimum: 1 },
    descripcion: { type: 'string' },
    cantidad:    { type: 'integer', minimum: 1 },
  },
}

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
          assigned_to: { type: 'integer' },
          estado:      { type: 'string', enum: ESTADOS },
          tipo:        { type: 'string', enum: TIPOS },
          prioridad:   { type: 'string', enum: PRIORIDADES },
          vencidas:    { type: 'boolean' },
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

  // GET /api/maintenances/stats
  fastify.get('/stats', { handler: ctrl.stats })

  // GET /api/maintenances/:id
  fastify.get('/:id', { handler: ctrl.detail })

  // POST /api/maintenances
  // es_orden=true crea una orden de trabajo (estado abierta, sin solución aún);
  // por defecto registra un trabajo ya realizado (pendiente de aprobación).
  fastify.post('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['assetCode', 'motivo', 'descripcion_problema'],
        properties: {
          assetCode:            { type: 'string', minLength: 1 },
          motivo:               { type: 'string', minLength: 1, maxLength: 500 },
          descripcion_problema: { type: 'string', minLength: 1, maxLength: 5000 },
          solucion:             { type: 'string', maxLength: 5000 },
          hubo_cambio:          { type: 'boolean' },
          tipo:                 { type: 'string', enum: TIPOS },
          prioridad:            { type: 'string', enum: PRIORIDADES },
          es_orden:             { type: 'boolean' },
          assigned_to:          { type: 'integer', minimum: 1 },
          fecha_programada:     { type: 'string', format: 'date' },
          partes:               { type: 'array', items: PARTE_SCHEMA },
        },
      },
    },
    handler: ctrl.create,
  })

  // PUT /api/maintenances/:id
  fastify.put('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['motivo', 'descripcion_problema', 'solucion'],
        properties: {
          motivo:               { type: 'string', minLength: 1, maxLength: 500 },
          descripcion_problema: { type: 'string', minLength: 1, maxLength: 5000 },
          solucion:             { type: 'string', minLength: 1, maxLength: 5000 },
          hubo_cambio:          { type: 'boolean' },
          tipo:                 { type: 'string', enum: TIPOS },
          prioridad:            { type: 'string', enum: PRIORIDADES },
          partes:               { type: 'array', items: PARTE_SCHEMA },
        },
      },
    },
    handler: ctrl.update,
  })

  // PATCH /api/maintenances/:id/assign — solo Supervisor/Admin
  fastify.patch('/:id/assign', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: authorize(['supervisor', 'admin']),
    schema: {
      body: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'integer', minimum: 1 },
        },
      },
    },
    handler: ctrl.assign,
  })

  // PATCH /api/maintenances/:id/start — el técnico inicia el trabajo
  fastify.patch('/:id/start', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: ctrl.start,
  })

  // PATCH /api/maintenances/:id/complete — registra solución y tiempos, envía a aprobación
  fastify.patch('/:id/complete', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['solucion'],
        properties: {
          solucion:            { type: 'string', minLength: 1, maxLength: 5000 },
          horas_trabajo:       { type: 'number', minimum: 0 },
          tiempo_parada_horas: { type: 'number', minimum: 0 },
          hubo_cambio:         { type: 'boolean' },
          partes:              { type: 'array', items: PARTE_SCHEMA },
        },
      },
    },
    handler: ctrl.complete,
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

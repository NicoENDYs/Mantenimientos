'use strict'

const authenticate   = require('../middlewares/authenticate')
const authorize      = require('../middlewares/authorize')
const reportsSvc     = require('../services/reports.service')

async function reportsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', authorize(['supervisor', 'admin']))

  // GET /api/reports/excel
  fastify.get('/excel', async (request, reply) => {
    const buffer = await reportsSvc.generateExcel(request.query, request.user.rol, request.user.id)
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="mantenimientos.xlsx"')
      .send(buffer)
  })

  // GET /api/reports/pdf
  fastify.get('/pdf', async (request, reply) => {
    const buffer = await reportsSvc.generatePdf(request.query, request.user.rol, request.user.id)
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'attachment; filename="mantenimientos.pdf"')
      .send(buffer)
  })

  // GET /api/reports/history/:assetCode
  fastify.get('/history/:assetCode', async (request, reply) => {
    const rows = await reportsSvc.historyByAsset(request.params.assetCode)
    return reply.send(rows)
  })
}

module.exports = reportsRoutes

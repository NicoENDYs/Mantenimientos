'use strict'

const authenticate   = require('../middlewares/authenticate')
const assetsService  = require('../services/assets.service')

async function assetsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

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
}

module.exports = assetsRoutes

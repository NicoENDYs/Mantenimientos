'use strict'

const fp = require('fastify-plugin')
const cors = require('@fastify/cors')

module.exports = fp(async function (fastify) {
  fastify.register(cors, {
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
})

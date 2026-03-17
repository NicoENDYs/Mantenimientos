'use strict'

const fp = require('fastify-plugin')
const cookie = require('@fastify/cookie')

module.exports = fp(async function (fastify) {
  fastify.register(cookie)
})

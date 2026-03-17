'use strict'

const fp = require('fastify-plugin')
const multipart = require('@fastify/multipart')

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

module.exports = fp(async function (fastify) {
  fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 5,
    },
  })
})

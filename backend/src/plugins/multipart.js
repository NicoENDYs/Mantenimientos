'use strict'

const fp = require('fastify-plugin')
const multipart = require('@fastify/multipart')
const { MAX_FILE_SIZE, MAX_FOTOS } = require('../constants')

module.exports = fp(async function (fastify) {
  fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: MAX_FOTOS,
    },
  })
})

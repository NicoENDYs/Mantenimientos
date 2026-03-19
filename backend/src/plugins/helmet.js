'use strict'

const fp = require('fastify-plugin')
const helmet = require('@fastify/helmet')

const IS_PROD = process.env.NODE_ENV === 'production'

module.exports = fp(async function (fastify) {
  fastify.register(helmet, {
    hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true } : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"], // Tailwind genera estilos inline
        imgSrc:     ["'self'", "data:", "blob:"],  // data: previews, blob: QR scanner
        connectSrc: ["'self'"],
        fontSrc:    ["'self'"],
        objectSrc:  ["'none'"],
        mediaSrc:   ["'self'"],
        frameSrc:   ["'none'"],
        workerSrc:  ["'self'", "blob:"],           // html5-qrcode usa workers blob
      },
    },
  })
})

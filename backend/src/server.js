'use strict'

require('dotenv').config()

const buildApp = require('./app')

const PORT = parseInt(process.env.PORT, 10) || 3000
const HOST = '0.0.0.0'

const app = buildApp({ logger: true })

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`SIGMAN backend running at ${address}`)
})

'use strict'

require('dotenv').config()

const path = require('path')
const buildApp = require('./app')

const PORT    = parseInt(process.env.PORT, 10) || 3000
const HOST    = '0.0.0.0'
const LOG_DIR = path.join(__dirname, '../private/logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')

const isDev = process.env.NODE_ENV !== 'production'

const loggerConfig = {
  level: 'info',
  transport: {
    targets: [
      ...(isDev ? [{ target: 'pino-pretty', level: 'info', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }] : []),
      { target: 'pino/file', level: 'info', options: { destination: LOG_FILE, mkdir: true } },
    ],
  },
}

const app = buildApp({ logger: loggerConfig })

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`SIGMAN backend running at ${address}`)
})

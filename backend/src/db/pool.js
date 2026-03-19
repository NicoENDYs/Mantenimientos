'use strict'

const { Pool } = require('pg')
const logger   = require('pino')()

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
})

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client')
  process.exit(1)
})

module.exports = pool

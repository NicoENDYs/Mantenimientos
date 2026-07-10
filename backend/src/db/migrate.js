'use strict'

require('dotenv').config()

const fs   = require('fs')
const path = require('path')
const pool = require('./pool')

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(sql)
  console.log('Schema base aplicado correctamente.')

  // Migraciones incrementales (idempotentes), en orden alfabético
  const migrationsDir = path.join(__dirname, 'migrations')
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      await pool.query(migrationSql)
      console.log(`Migración aplicada: ${file}`)
    }
  }

  await pool.end()
}

migrate().catch(err => { console.error(err); process.exit(1) })

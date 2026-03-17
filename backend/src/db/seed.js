'use strict'

require('dotenv').config()

const bcryptjs = require('bcryptjs')
const pool = require('./pool')

async function seed() {
  const email    = process.env.SEED_EMAIL    || 'nico@sigman.com'
  const password = process.env.SEED_PASSWORD || 'Nicolas$12'
  const nombre   = process.env.SEED_NOMBRE   || 'Administrador'

  const hash = await bcryptjs.hash(password, 12)

  await pool.query(
    `INSERT INTO users (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [nombre, email, hash]
  )

  console.log(`Usuario admin creado: ${email} / ${password}`)
  console.log('CAMBIA LA CONTRASEÑA después del primer login.')
  await pool.end()
}

seed().catch(err => { console.error(err); process.exit(1) })

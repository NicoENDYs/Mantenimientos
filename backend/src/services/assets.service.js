'use strict'

const pool = require('../db/pool')
const logger = require('pino')()

async function searchByCode(code) {
  // 1. Intentar API externa
  const apiUrl = process.env.API_ACTIVOS_URL
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}?code=${encodeURIComponent(code)}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        // Guardar/actualizar en cache local
        await upsertAsset(code, data)
        return { ...data, pendiente_sync: false }
      }
    } catch (err) {
      logger.warn({ err }, 'API activos no disponible — usando cache local')
    }
  }

  // 2. Fallback: buscar en cache local
  const { rows } = await pool.query('SELECT * FROM assets WHERE codigo = $1', [code])
  if (rows.length > 0) {
    return { ...rows[0], pendiente_sync: false }
  }

  // 3. Activo no conocido — crear entrada mínima, marcar pendiente_sync
  const inserted = await pool.query(
    `INSERT INTO assets (codigo, pendiente_sync)
     VALUES ($1, true)
     ON CONFLICT (codigo) DO UPDATE SET pendiente_sync = true
     RETURNING *`,
    [code]
  )
  // Nota: la tabla assets no tiene columna pendiente_sync según el schema,
  // el flag se registra en el maintenance al crearlo
  return { codigo: code, nombre: null, tipo: null, ubicacion: null, pendiente_sync: true }
}

async function upsertAsset(code, data) {
  await pool.query(
    `INSERT INTO assets (codigo, nombre, tipo, ubicacion, datos_api)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (codigo) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           tipo = EXCLUDED.tipo,
           ubicacion = EXCLUDED.ubicacion,
           datos_api = EXCLUDED.datos_api`,
    [code, data.nombre || null, data.tipo || null, data.ubicacion || null, JSON.stringify(data)]
  )
}

module.exports = { searchByCode }

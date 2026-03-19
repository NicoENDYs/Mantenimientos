'use strict'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Recibe un Buffer y lanza un error si no corresponde a una imagen permitida.
 * Usa file-type (ESM) para detectar el tipo real por magic bytes.
 */
async function validateMimeBuffer(buffer, fieldname) {
  const { fileTypeFromBuffer } = await import('file-type')
  const result = await fileTypeFromBuffer(buffer)
  const detected = result?.mime ?? null

  if (!detected || !ALLOWED_MIME.has(detected)) {
    const err = new Error(`Tipo de archivo no permitido en el campo "${fieldname}". Solo JPG, PNG o WEBP.`)
    err.statusCode = 400
    throw err
  }
  return detected
}

module.exports = { validateMimeBuffer }

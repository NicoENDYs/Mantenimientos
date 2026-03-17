'use strict'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Firmas de bytes (magic bytes) para validar el tipo real del archivo
const MAGIC = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: null, check: (buf) => buf.length >= 12 && buf.slice(8, 12).toString('ascii') === 'WEBP' },
]

function detectMime(buffer) {
  for (const { mime, bytes, check } of MAGIC) {
    if (check) {
      if (check(buffer)) return mime
    } else {
      if (bytes.every((b, i) => buffer[i] === b)) return mime
    }
  }
  return null
}

/**
 * Recibe un Buffer y lanza un error si no corresponde a una imagen permitida.
 */
function validateMimeBuffer(buffer, fieldname) {
  const detected = detectMime(buffer)
  if (!detected || !ALLOWED_MIME.has(detected)) {
    const err = new Error(`Tipo de archivo no permitido en el campo "${fieldname}". Solo JPG, PNG o WEBP.`)
    err.statusCode = 400
    throw err
  }
  return detected
}

module.exports = { validateMimeBuffer }

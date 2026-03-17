'use strict'

const fs       = require('fs')
const path     = require('path')
const ExcelJS  = require('exceljs')
const PDFDocument = require('pdfkit')
const sharp    = require('sharp')
const pool     = require('../db/pool')

async function toJpegBuffer(filePath) {
  const ext = filePath.split('.').pop().toLowerCase()
  if (ext === 'webp') {
    return sharp(filePath).jpeg({ quality: 85 }).toBuffer()
  }
  return fs.readFileSync(filePath)
}

function buildReportQuery(filters, userRol, userId) {
  const conditions = []
  const values = []
  let i = 1

  if (userRol === 'tecnico') {
    conditions.push(`m.user_id = $${i++}`)
    values.push(userId)
  }
  if (filters.fecha_desde) { conditions.push(`m.created_at >= $${i++}`); values.push(filters.fecha_desde) }
  if (filters.fecha_hasta) { conditions.push(`m.created_at <= $${i++}`); values.push(filters.fecha_hasta) }
  if (filters.user_id)     { conditions.push(`m.user_id = $${i++}`);     values.push(filters.user_id) }
  if (filters.asset_code)  { conditions.push(`a.codigo ILIKE $${i++}`);  values.push(`%${filters.asset_code}%`) }
  if (filters.estado)      { conditions.push(`m.estado = $${i++}`);      values.push(filters.estado) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return { where, values }
}

async function getReportRows(filters, userRol, userId) {
  const { where, values } = buildReportQuery(filters, userRol, userId)
  const sql = `
    SELECT m.id, m.estado, m.motivo, m.descripcion_problema, m.solucion,
           m.hubo_cambio, m.comentario_supervisor, m.created_at, m.updated_at,
           a.codigo AS asset_codigo, a.nombre AS asset_nombre,
           a.tipo AS asset_tipo, a.ubicacion AS asset_ubicacion,
           u.nombre AS tecnico_nombre, u.email AS tecnico_email,
           s.nombre AS supervisor_nombre
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    JOIN users  u ON u.id = m.user_id
    LEFT JOIN users s ON s.id = m.supervisor_id
    ${where}
    ORDER BY m.created_at DESC
  `
  const { rows } = await pool.query(sql, values)
  return rows
}

async function generateExcel(filters, userRol, userId) {
  const rows = await getReportRows(filters, userRol, userId)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SIGMAN'
  const sheet = workbook.addWorksheet('Mantenimientos')

  sheet.columns = [
    { header: 'ID',           key: 'id',                width: 8 },
    { header: 'Estado',       key: 'estado',            width: 18 },
    { header: 'Código Activo',key: 'asset_codigo',      width: 16 },
    { header: 'Activo',       key: 'asset_nombre',      width: 25 },
    { header: 'Tipo',         key: 'asset_tipo',        width: 16 },
    { header: 'Ubicación',    key: 'asset_ubicacion',   width: 20 },
    { header: 'Técnico',      key: 'tecnico_nombre',    width: 20 },
    { header: 'Motivo',       key: 'motivo',            width: 30 },
    { header: 'Descripción',  key: 'descripcion_problema', width: 40 },
    { header: 'Solución',     key: 'solucion',          width: 40 },
    { header: 'Hubo Cambio',  key: 'hubo_cambio',       width: 12 },
    { header: 'Supervisor',   key: 'supervisor_nombre', width: 20 },
    { header: 'Comentario',   key: 'comentario_supervisor', width: 35 },
    { header: 'Fecha',        key: 'created_at',        width: 20 },
  ]

  // Cabecera en negrita
  sheet.getRow(1).font = { bold: true }

  for (const r of rows) {
    sheet.addRow({
      ...r,
      hubo_cambio: r.hubo_cambio ? 'Sí' : 'No',
      created_at: new Date(r.created_at).toLocaleString('es-CO'),
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

async function generatePdf(filters, userRol, userId) {
  const rows = await getReportRows(filters, userRol, userId)

  // Pre-cargar y convertir fotos (async, antes de entrar al Promise)
  const photoBuffersMap = {}
  for (const r of rows) {
    const { rows: photoRows } = await pool.query(
      'SELECT ruta_archivo FROM maintenance_photos WHERE maintenance_id = $1 ORDER BY id',
      [r.id]
    )
    const buffers = []
    for (const { ruta_archivo } of photoRows) {
      if (!fs.existsSync(ruta_archivo)) continue
      try {
        buffers.push(await toJpegBuffer(ruta_archivo))
      } catch {
        // Imagen corrupta o formato no soportado — ignorar
      }
    }
    photoBuffersMap[r.id] = buffers
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(16).text('Reporte de Mantenimientos — SIGMAN', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-CO')}`)
    doc.moveDown(1.5)

    for (const r of rows) {
      // Verificar si cabe en la página actual; si no, nueva página
      if (doc.y > 680) doc.addPage()

      doc.fontSize(12).fillColor('black').text(`#${r.id} — ${r.asset_codigo} | ${r.estado}`, { underline: true })
      doc.fontSize(9)
      doc.text(`Activo: ${r.asset_nombre || '-'}  |  Tipo: ${r.asset_tipo || '-'}  |  Ubicación: ${r.asset_ubicacion || '-'}`)
      doc.text(`Técnico: ${r.tecnico_nombre}  |  Fecha: ${new Date(r.created_at).toLocaleString('es-CO')}`)
      doc.text(`Motivo: ${r.motivo}`)
      doc.text(`Descripción: ${r.descripcion_problema}`)
      doc.text(`Solución: ${r.solucion}`)
      if (r.hubo_cambio) doc.text('Hubo cambio de piezas: Sí')
      if (r.supervisor_nombre) doc.text(`Supervisor: ${r.supervisor_nombre}`)
      if (r.comentario_supervisor) doc.text(`Comentario: ${r.comentario_supervisor}`)

      // Fotos embebidas
      const buffers = photoBuffersMap[r.id] || []
      if (buffers.length > 0) {
        doc.moveDown(0.5)
        doc.fontSize(8).fillColor('gray').text('Fotos:')
        let xOffset = 40
        const IMG_W = 120
        const IMG_H = 90
        const GAP   = 8

        for (const imgBuffer of buffers) {
          if (xOffset + IMG_W > 555) {
            xOffset = 40
            doc.moveDown(IMG_H / doc.currentLineHeight() + 1)
          }
          if (doc.y + IMG_H > 750) {
            doc.addPage()
            xOffset = 40
          }
          doc.image(imgBuffer, xOffset, doc.y, { width: IMG_W, height: IMG_H, fit: [IMG_W, IMG_H] })
          xOffset += IMG_W + GAP
        }
        doc.moveDown(IMG_H / doc.currentLineHeight() + 1)
      }

      doc.moveDown(0.5)
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke()
      doc.moveDown(0.5)
    }

    doc.end()
  })
}

async function historyByAsset(assetCode) {
  const { rows } = await pool.query(`
    SELECT m.id, m.estado, m.motivo, m.descripcion_problema, m.solucion,
           m.hubo_cambio, m.created_at,
           u.nombre AS tecnico_nombre
    FROM maintenances m
    JOIN assets a ON a.id = m.asset_id
    JOIN users  u ON u.id = m.user_id
    WHERE a.codigo = $1
    ORDER BY m.created_at DESC
  `, [assetCode])
  return rows
}

module.exports = { generateExcel, generatePdf, historyByAsset }

'use strict'

const svc = require('../services/maintenances.service')

async function list(request, reply) {
  const items = await svc.findAll(request.query, request.user.rol, request.user.id)
  return reply.send(items)
}

async function detail(request, reply) {
  const item = await svc.findById(parseInt(request.params.id, 10))
  if (!item) return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Mantenimiento no encontrado' })

  // Técnico solo puede ver los suyos
  if (request.user.rol === 'tecnico' && item.user_id !== request.user.id) {
    return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'No tienes acceso a este mantenimiento' })
  }
  return reply.send(item)
}

async function create(request, reply) {
  const item = await svc.create(request.body, request.user.id)
  return reply.code(201).send(item)
}

async function update(request, reply) {
  const item = await svc.update(
    parseInt(request.params.id, 10),
    request.body,
    request.user.id,
    request.user.rol
  )
  return reply.send(item)
}

async function approve(request, reply) {
  const item = await svc.approve(parseInt(request.params.id, 10), request.user.id)
  return reply.send(item)
}

async function reject(request, reply) {
  const { comentario } = request.body
  const item = await svc.reject(parseInt(request.params.id, 10), request.user.id, comentario)
  return reply.send(item)
}

async function uploadPhotos(request, reply) {
  const files = []
  const parts = request.parts()

  for await (const part of parts) {
    if (part.type === 'file') {
      const chunks = []
      for await (const chunk of part.file) chunks.push(chunk)
      files.push({
        buffer: Buffer.concat(chunks),
        originalname: part.filename,
        fieldname: part.fieldname,
      })
    }
  }

  if (files.length === 0) {
    return reply.code(400).send({ message: 'No se recibieron archivos' })
  }

  const saved = await svc.addPhotos(parseInt(request.params.id, 10), files)
  return reply.code(201).send(saved)
}

async function servePhoto(request, reply) {
  const { filePath, mime } = await svc.getPhotoFile(
    parseInt(request.params.id, 10),
    parseInt(request.params.photoId, 10),
    request.user
  )
  reply.header('Content-Type', mime)
  reply.header('Cache-Control', 'private, max-age=3600')
  return reply.send(require('fs').createReadStream(filePath))
}

async function deletePhoto(request, reply) {
  await svc.deletePhoto(
    parseInt(request.params.id, 10),
    parseInt(request.params.photoId, 10)
  )
  return reply.code(204).send()
}

async function notifications(request, reply) {
  const items = await svc.getNotifications(request.user.id)
  return reply.send(items)
}

async function stats(request, reply) {
  const data = await svc.getStats(request.user.id, request.user.rol)
  return reply.send(data)
}

module.exports = { list, detail, create, update, approve, reject, uploadPhotos, servePhoto, deletePhoto, notifications, stats }

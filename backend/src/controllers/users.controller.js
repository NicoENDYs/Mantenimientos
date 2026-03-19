'use strict'

const usersService = require('../services/users.service')

async function list(request, reply) {
  const users = await usersService.findAll()
  return reply.send(users)
}

async function create(request, reply) {
  const user = await usersService.create(request.body)
  return reply.code(201).send(user)
}

async function update(request, reply) {
  const user = await usersService.update(parseInt(request.params.id, 10), request.body)
  if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' })
  return reply.send(user)
}

async function toggle(request, reply) {
  const user = await usersService.toggle(parseInt(request.params.id, 10))
  if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' })
  return reply.send(user)
}

async function unlock(request, reply) {
  const user = await usersService.unlock(parseInt(request.params.id, 10))
  if (!user) return reply.code(404).send({ message: 'Usuario no encontrado' })
  return reply.send(user)
}

module.exports = { list, create, update, toggle, unlock }

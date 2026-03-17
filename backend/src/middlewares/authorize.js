'use strict'

/**
 * Factory que retorna un preHandler que verifica si el usuario tiene uno de los roles permitidos.
 * @param {string[]} roles - Ej: ['supervisor', 'admin']
 */
function authorize(roles) {
  return async function (request, reply) {
    const userRol = request.user && request.user.rol
    if (!userRol || !roles.includes(userRol)) {
      reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'No tienes permisos para realizar esta acción',
      })
    }
  }
}

module.exports = authorize

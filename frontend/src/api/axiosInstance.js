import axios from 'axios'

// Se crea una instancia base; el token se inyecta en cada request via interceptor
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // envía la cookie httpOnly en cada request
})

// El token viaja automáticamente en la cookie httpOnly (withCredentials: true).
// No se necesita interceptor manual de Authorization.

export default api

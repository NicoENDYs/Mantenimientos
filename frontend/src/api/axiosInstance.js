import axios from 'axios'

// Se crea una instancia base; el token se inyecta en cada request via interceptor
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // envía la cookie httpOnly en cada request
})

// El token viaja automáticamente en la cookie httpOnly (withCredentials: true).
// No se necesita interceptor manual de Authorization.

export default api

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch { /* ignorar */ }
    logout()
    navigate('/login')
  }

  const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', admin: 'Administrador' }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-blue-700 text-white px-4 py-3 shadow">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-wide">SIGMAN</Link>

          {/* Nav escritorio */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <Link to="/maintenances" className="hover:underline">Mantenimientos</Link>
            {['supervisor', 'admin'].includes(user?.rol) && (
              <Link to="/reports" className="hover:underline">Reportes</Link>
            )}
            {user?.rol === 'admin' && (
              <Link to="/users" className="hover:underline">Usuarios</Link>
            )}
            <span className="opacity-75">{user?.nombre} ({ROL_LABEL[user?.rol]})</span>
            <button onClick={handleLogout} className="bg-white text-blue-700 px-3 py-1 rounded-lg font-semibold hover:bg-blue-50 transition">
              Salir
            </button>
          </div>

          {/* Botón hamburguesa — móvil */}
          <button
            className="md:hidden flex flex-col justify-center gap-1 p-2 rounded-lg hover:bg-blue-600 transition"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Abrir menú"
          >
            <span className="block w-5 h-0.5 bg-white"></span>
            <span className="block w-5 h-0.5 bg-white"></span>
            <span className="block w-5 h-0.5 bg-white"></span>
          </button>
        </div>

        {/* Menú desplegable — móvil */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-blue-600 flex flex-col gap-1 text-sm">
            <Link to="/maintenances" onClick={() => setMenuOpen(false)}
              className="py-2 px-1 hover:bg-blue-600 rounded-lg transition">
              Mantenimientos
            </Link>
            {['supervisor', 'admin'].includes(user?.rol) && (
              <Link to="/reports" onClick={() => setMenuOpen(false)}
                className="py-2 px-1 hover:bg-blue-600 rounded-lg transition">
                Reportes
              </Link>
            )}
            {user?.rol === 'admin' && (
              <Link to="/users" onClick={() => setMenuOpen(false)}
                className="py-2 px-1 hover:bg-blue-600 rounded-lg transition">
                Usuarios
              </Link>
            )}
            <p className="py-2 px-1 opacity-75 text-xs">{user?.nombre} — {ROL_LABEL[user?.rol]}</p>
            <button onClick={handleLogout}
              className="mt-1 mb-1 bg-white text-blue-700 px-3 py-2 rounded-lg font-semibold hover:bg-blue-50 transition text-left">
              Salir
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}

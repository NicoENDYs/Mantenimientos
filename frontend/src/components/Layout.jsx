import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import {
  Wrench, BarChart2, Users, LogOut, Menu, X, ChevronRight, Settings
} from 'lucide-react'

const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', admin: 'Administrador' }

const ROL_COLOR = {
  tecnico:    'bg-blue-100 text-blue-700',
  supervisor: 'bg-purple-100 text-purple-700',
  admin:      'bg-orange-100 text-orange-700',
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch { /* ignorar */ }
    logout()
    navigate('/login')
  }

  const navLinks = [
    { to: '/maintenances', label: 'Mantenimientos', Icon: Wrench, roles: null },
    { to: '/reports',      label: 'Reportes',        Icon: BarChart2, roles: ['supervisor', 'admin'] },
    { to: '/users',        label: 'Usuarios',         Icon: Users,    roles: ['admin'] },
  ].filter(l => !l.roles || l.roles.includes(user?.rol))

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-wide">
              <Settings size={20} className="text-blue-200" />
              <span>SIGMAN</span>
            </Link>

            {/* Nav escritorio */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive(to)
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-600'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>

            {/* Usuario + Salir escritorio */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
                <span className="text-sm text-blue-100">{user?.nombre}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLOR[user?.rol]}`}>
                  {ROL_LABEL[user?.rol]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
              >
                <LogOut size={14} />
                Salir
              </button>
            </div>

            {/* Hamburguesa móvil */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-blue-600 transition"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Abrir menú"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <div className="md:hidden border-t border-blue-600 bg-blue-800">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive(to)
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {label}
                  </span>
                  <ChevronRight size={14} className="opacity-50" />
                </Link>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-blue-700 flex items-center justify-between">
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="hover:opacity-80 transition">
                <p className="text-sm text-white font-medium">{user?.nombre}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLOR[user?.rol]}`}>
                  {ROL_LABEL[user?.rol]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
              >
                <LogOut size={14} />
                Salir
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
      
      <footer className="bg-blue-700 text-blue-100 text-xs text-center py-3 mt-auto">
        <p>
          Desarrollado por <span className="font-semibold text-white">Nicolas</span> &mdash;{' '}
          <span className="font-semibold text-white">ENDYs</span>
        </p>
        <p>
          <a href="mailto:guarinmolinan@gmail.com" className="hover:text-white transition underline">
            guarinmolinan@gmail.com
          </a>
        </p>
      </footer>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import ThemeToggle from './ThemeToggle'
import Button from './Button'
import { Wrench, BarChart2, Users, LogOut, Menu, X, ChevronRight } from 'lucide-react'

const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', admin: 'Administrador' }

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
    { to: '/maintenances', label: 'Mantenimientos', Icon: Wrench,    roles: null },
    { to: '/reports',      label: 'Reportes',       Icon: BarChart2, roles: ['supervisor', 'admin'] },
    { to: '/users',        label: 'Usuarios',       Icon: Users,     roles: ['admin'] },
  ].filter(l => !l.roles || l.roles.includes(user?.rol))

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-40 bg-surface border-b border-border">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Marca */}
            <Link
              to="/"
              className="flex items-center gap-2.5 rounded-md py-1 pr-2"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-fg">
                <Wrench size={18} aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
                SIGMAN
              </span>
            </Link>

            {/* Navegación — escritorio */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={isActive(to) ? 'page' : undefined}
                  className={`flex h-10 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors ${
                    isActive(to)
                      ? 'bg-accent-soft text-accent-soft-fg'
                      : 'text-muted hover:bg-surface-2 hover:text-foreground'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Acciones — escritorio */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              <Link
                to="/profile"
                className="flex items-center gap-2.5 rounded-md py-1.5 pl-2 pr-1 transition-colors hover:bg-surface-2"
              >
                <span className="text-right leading-tight">
                  <span className="block text-sm font-medium text-foreground">{user?.nombre}</span>
                  <span className="block text-xs text-muted">{ROL_LABEL[user?.rol]}</span>
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted">
                  {user?.nombre?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </Link>
              <Button variant="secondary" size="md" icon={LogOut} onClick={handleLogout}>
                Salir
              </Button>
            </div>

            {/* Acciones — móvil */}
            <div className="flex items-center gap-1 md:hidden">
              <ThemeToggle />
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                onClick={() => setMenuOpen(o => !o)}
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-surface">
            <div className="mx-auto max-w-6xl px-4 py-3">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface-2"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted">
                  {user?.nombre?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-medium text-foreground">{user?.nombre}</span>
                  <span className="block text-xs text-muted">{ROL_LABEL[user?.rol]}</span>
                </span>
              </Link>

              <nav className="mt-2 flex flex-col gap-1">
                {navLinks.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(to) ? 'page' : undefined}
                    className={`flex h-12 items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive(to)
                        ? 'bg-accent-soft text-accent-soft-fg'
                        : 'text-foreground hover:bg-surface-2'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </span>
                    <ChevronRight size={16} className="text-faint" aria-hidden="true" />
                  </Link>
                ))}
              </nav>

              <div className="mt-3 border-t border-border pt-3">
                <Button
                  variant="secondary"
                  size="lg"
                  icon={LogOut}
                  onClick={handleLogout}
                  className="w-full"
                >
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Desarrollado por{' '}
            <span className="font-medium text-foreground">Nicolás</span> ·{' '}
            <span className="font-medium text-foreground">ENDYs</span>
          </p>
          <a
            href="mailto:guarinmolinan@gmail.com"
            className="rounded-sm text-accent hover:underline"
          >
              guarinmolinan@gmail.com
          </a>
        </div>
      </footer>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import { buttonClasses } from '../components/Button'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import {
  Plus, ClipboardList, BarChart2, Users, Bell, ChevronRight,
} from 'lucide-react'

const ESTADO_ROWS = [
  { key: 'pendiente_aprobacion', label: 'Pendientes de aprobación', dot: 'bg-warning' },
  { key: 'aprobado',             label: 'Aprobados',                dot: 'bg-success' },
  { key: 'rechazado',            label: 'Rechazados',               dot: 'bg-danger'  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [novedades, setNovedades] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/maintenances/notifications').then(res => setNovedades(res.data)).catch(() => {})
    api.get('/maintenances/stats').then(res => setStats(res.data)).catch(() => {})
  }, [])

  const accesos = [
    { to: '/maintenances', label: 'Mis mantenimientos', desc: 'Consultar y gestionar registros', Icon: ClipboardList },
    ['supervisor', 'admin'].includes(user?.rol) &&
      { to: '/reports', label: 'Reportes', desc: 'Exportar a Excel o PDF', Icon: BarChart2 },
    user?.rol === 'admin' &&
      { to: '/users', label: 'Usuarios', desc: 'Administrar cuentas y accesos', Icon: Users },
  ].filter(Boolean)

  const primerNombre = user?.nombre?.split(' ')[0] || ''

  return (
    <Layout>
      {/* Saludo */}
      <header className="mb-8">
        <h1 className="text-xl font-bold text-foreground">Hola, {primerNombre}</h1>
        <p className="mt-1 text-sm text-muted">
          Este es el resumen de la actividad de mantenimientos.
        </p>
      </header>

      {/* Bloque principal — asimétrico 2 + 1 */}
      <section className="mb-12 grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between gap-6 p-6 lg:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Registrar un mantenimiento</h2>
            <p className="mt-1.5 max-w-md text-sm text-muted">
              Documenta una intervención completa: activo, problema detectado,
              solución aplicada, repuestos usados y evidencia fotográfica.
            </p>
          </div>
          <Link to="/maintenances/new" className={buttonClasses('primary', 'lg', 'self-start')}>
            <Plus size={18} aria-hidden="true" />
            Nuevo mantenimiento
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Estado general
            </h2>
            <span className="text-xs text-muted">
              {stats ? `${stats.total} en total` : ''}
            </span>
          </div>

          <ul className="mt-3 flex flex-col">
            {ESTADO_ROWS.map(({ key, label, dot }) => (
              <li key={key}>
                <Link
                  to={`/maintenances?estado=${key}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                  <span className="flex-1 text-sm text-foreground">{label}</span>
                  {stats
                    ? <span className="text-base font-semibold text-foreground">{stats[key]}</span>
                    : <Skeleton className="h-5 w-6" />}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Accesos */}
      <section className="mb-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Accesos</h2>
        <Card className="divide-y divide-border overflow-hidden">
          {accesos.map(({ to, label, desc, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3.5 p-4 transition-colors hover:bg-surface-2"
            >
              <Icon size={20} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="block text-xs text-muted">{desc}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-faint" aria-hidden="true" />
            </Link>
          ))}
        </Card>
      </section>

      {/* Novedades */}
      {novedades.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
            <Bell size={13} aria-hidden="true" />
            Novedades recientes
          </h2>
          <div className="flex flex-col gap-2">
            {novedades.map(n => (
              <Link
                key={n.id}
                to={`/maintenances/${n.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4
                  transition-colors hover:bg-surface-2 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <StatusBadge estado={n.estado} />
                  <span className="truncate text-sm font-medium text-foreground">
                    #{n.id} · {n.asset_codigo}{n.asset_nombre ? ` — ${n.asset_nombre}` : ''}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  {n.estado === 'rechazado' && n.comentario_supervisor && (
                    <span className="max-w-[180px] truncate text-danger-fg">
                      {n.comentario_supervisor}
                    </span>
                  )}
                  {n.supervisor_nombre && <span>{n.supervisor_nombre}</span>}
                  <span>{new Date(n.updated_at).toLocaleDateString('es-CO')}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  )
}

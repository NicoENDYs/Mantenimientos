import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import { buttonClasses } from '../components/Button'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import {
  Plus, ClipboardList, BarChart2, Users, Bell, ChevronRight,
  CalendarClock, Package, Inbox, HardDrive, AlertTriangle,
} from 'lucide-react'

const ESTADO_ROWS = [
  { key: 'abierta',              label: 'Órdenes abiertas',         dot: 'bg-accent'  },
  { key: 'en_progreso',          label: 'En progreso',              dot: 'bg-accent'  },
  { key: 'pendiente_aprobacion', label: 'Pendientes de aprobación', dot: 'bg-warning' },
  { key: 'aprobado',             label: 'Aprobados',                dot: 'bg-success' },
  { key: 'rechazado',            label: 'Rechazados',               dot: 'bg-danger'  },
]

const NOVEDAD_LABEL = {
  asignada:    'Orden asignada a ti',
  por_aprobar: 'Esperando tu aprobación',
  solicitud:   'Solicitud sin atender',
}

function KpiTile({ to, label, value, alert = false }) {
  return (
    <Link
      to={to}
      className={`flex flex-col gap-1 rounded-xl border bg-surface p-4 shadow-card transition-colors hover:bg-surface-2 ${
        alert && value > 0 ? 'border-danger/40' : 'border-border'
      }`}
    >
      <span className={`text-2xl font-semibold ${alert && value > 0 ? 'text-danger-fg' : 'text-foreground'}`}>
        {value ?? '—'}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [novedades, setNovedades] = useState([])
  const [stats, setStats] = useState(null)
  const [planesProximos, setPlanesProximos] = useState([])

  const esRevisor = ['supervisor', 'admin'].includes(user?.rol)

  useEffect(() => {
    api.get('/maintenances/notifications').then(res => setNovedades(res.data)).catch(() => {})
    api.get('/maintenances/stats').then(res => setStats(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (esRevisor) {
      api.get('/plans', { params: { proximos_dias: 14 } })
        .then(res => setPlanesProximos(res.data))
        .catch(() => {})
    }
  }, [esRevisor])

  const accesos = [
    { to: '/maintenances', label: 'Mantenimientos', desc: 'Órdenes de trabajo y registros', Icon: ClipboardList },
    { to: '/requests',     label: 'Solicitudes',    desc: 'Reportar y atender fallas', Icon: Inbox },
    { to: '/assets',       label: 'Activos',        desc: 'Equipos, estado e historial', Icon: HardDrive },
    esRevisor &&
      { to: '/plans', label: 'Planes preventivos', desc: 'Programación y frecuencias', Icon: CalendarClock },
    esRevisor &&
      { to: '/parts', label: 'Inventario', desc: 'Repuestos, stock y costos', Icon: Package },
    esRevisor &&
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

      {/* Indicadores operativos */}
      <section className="mb-8">
        {stats ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile to="/maintenances?estado=abierta" label="Órdenes abiertas" value={stats.abierta} />
            <KpiTile to="/maintenances?estado=en_progreso" label="En progreso" value={stats.en_progreso} />
            <KpiTile to="/maintenances?vencidas=true" label="Órdenes vencidas" value={stats.vencidas} alert />
            <KpiTile to="/maintenances?estado=pendiente_aprobacion" label="Por aprobar" value={stats.pendiente_aprobacion} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}
      </section>

      {/* Indicadores de gestión — solo supervisión */}
      {esRevisor && stats && (
        <section className="mb-8 grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Indicadores últimos 90 días
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">MTTR (tiempo medio de reparación)</dt>
                <dd className="mt-0.5 text-xl font-semibold text-foreground">
                  {stats.mttr_horas != null ? `${stats.mttr_horas} h` : 'Sin datos'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Costo de repuestos del mes</dt>
                <dd className="mt-0.5 text-xl font-semibold text-foreground">
                  ${(stats.costo_mes ?? 0).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Cumplimiento preventivo (30 días)</dt>
                <dd className="mt-0.5 text-xl font-semibold text-foreground">
                  {stats.cumplimiento_preventivo != null ? `${stats.cumplimiento_preventivo}%` : 'Sin datos'}
                </dd>
              </div>
            </dl>
            {stats.por_tipo && (
              <p className="mt-4 text-xs text-muted">
                Correctivos: <span className="font-medium text-foreground">{stats.por_tipo.correctivo}</span> ·
                Preventivos: <span className="font-medium text-foreground"> {stats.por_tipo.preventivo}</span> ·
                Predictivos: <span className="font-medium text-foreground"> {stats.por_tipo.predictivo}</span> ·
                Mejoras: <span className="font-medium text-foreground"> {stats.por_tipo.mejora}</span>
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Activos con más fallas
            </h2>
            {stats.top_activos?.length > 0 ? (
              <ul className="mt-3 flex flex-col">
                {stats.top_activos.map(a => (
                  <li key={a.id}>
                    <Link
                      to={`/assets/${a.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {a.codigo}{a.nombre ? ` — ${a.nombre}` : ''}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{a.fallas}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Sin correctivos registrados en los últimos 90 días.
              </p>
            )}
          </Card>
        </section>
      )}

      {/* Bloque principal — asimétrico 2 + 1 */}
      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between gap-6 p-6 lg:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Registrar un mantenimiento</h2>
            <p className="mt-1.5 max-w-md text-sm text-muted">
              Documenta una intervención completa o crea una orden de trabajo
              para programarla: activo, problema, repuestos y evidencia.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/maintenances/new" className={buttonClasses('primary', 'lg')}>
              <Plus size={18} aria-hidden="true" />
              Nuevo mantenimiento
            </Link>
            <Link to="/requests" className={buttonClasses('secondary', 'lg')}>
              <Inbox size={18} aria-hidden="true" />
              Reportar una falla
            </Link>
          </div>
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

      {/* Próximos preventivos — solo supervisión */}
      {esRevisor && planesProximos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
            <CalendarClock size={13} aria-hidden="true" />
            Preventivos próximos (14 días)
          </h2>
          <Card className="divide-y divide-border overflow-hidden">
            {planesProximos.slice(0, 5).map(p => (
              <Link
                key={p.id}
                to="/plans"
                className="flex items-center gap-3.5 p-4 transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{p.titulo}</span>
                  <span className="block truncate text-xs text-muted">
                    {p.asset_codigo}{p.asset_nombre ? ` — ${p.asset_nombre}` : ''}
                  </span>
                </span>
                {p.vencido && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-fg">
                    <AlertTriangle size={11} aria-hidden="true" />
                    Vencido
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted">
                  {new Date(p.proxima_fecha).toLocaleDateString('es-CO')}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}

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
                key={`${n.novedad}-${n.id}`}
                to={n.novedad === 'solicitud' ? '/requests' : `/maintenances/${n.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4
                  transition-colors hover:bg-surface-2 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {['aprobado', 'rechazado'].includes(n.novedad)
                    ? <StatusBadge estado={n.estado} />
                    : (
                      <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-fg whitespace-nowrap">
                        {NOVEDAD_LABEL[n.novedad] || n.novedad}
                      </span>
                    )}
                  {n.prioridad && <PriorityBadge prioridad={n.prioridad} />}
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

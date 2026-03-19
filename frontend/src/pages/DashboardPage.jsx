import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import {
  Plus, ClipboardList, BarChart2, Users,
  Clock, CheckCircle, XCircle,
  ChevronRight, Bell
} from 'lucide-react'

const STAT_CONFIG = [
  { key: 'pendiente_aprobacion', label: 'Pendientes',   Icon: Clock,       color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  { key: 'aprobado',             label: 'Aprobados',    Icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200' },
  { key: 'rechazado',            label: 'Rechazados',   Icon: XCircle,     color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [novedades, setNovedades] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/maintenances/notifications')
      .then(res => setNovedades(res.data))
      .catch(() => {})

    api.get('/maintenances/stats')
      .then(res => setStats(res.data))
      .catch(() => {})
  }, [])

  const quickActions = [
    {
      to: '/maintenances/new',
      label: 'Nuevo Mantenimiento',
      desc: 'Registrar un mantenimiento',
      Icon: Plus,
      primary: true,
    },
    {
      to: '/maintenances',
      label: 'Mis Mantenimientos',
      desc: 'Ver y gestionar registros',
      Icon: ClipboardList,
      primary: false,
    },
    ['supervisor', 'admin'].includes(user?.rol) && {
      to: '/reports',
      label: 'Reportes',
      desc: 'Exportar Excel / PDF',
      Icon: BarChart2,
      primary: false,
    },
    user?.rol === 'admin' && {
      to: '/users',
      label: 'Usuarios',
      desc: 'Gestionar cuentas',
      Icon: Users,
      primary: false,
    },
  ].filter(Boolean)

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bienvenido, {user?.nombre}</h1>
        <p className="text-gray-500 text-sm mt-1">Sistema de Gestión de Mantenimientos</p>
      </div>

      {/* Stats de estado */}
      {stats && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado general</h2>
            <span className="text-xs text-gray-400">{stats.total} en total</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {STAT_CONFIG.map(({ key, label, Icon, color, bg, border }) => (
              <Link
                key={key}
                to={`/maintenances?estado=${key}`}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border ${bg} ${border} hover:shadow-sm transition text-center`}
              >
                <div className={`${color}`}>
                  <Icon size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-800 leading-none">{stats[key]}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(({ to, label, desc, Icon, primary }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-4 rounded-xl p-5 border transition hover:shadow-sm ${
                primary
                  ? 'bg-blue-600 hover:bg-blue-700 border-blue-700 text-white'
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
              }`}
            >
              <div className={`p-2 rounded-lg ${primary ? 'bg-blue-700' : 'bg-blue-50'}`}>
                <Icon size={20} className={primary ? 'text-white' : 'text-blue-600'} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{label}</p>
                <p className={`text-xs mt-0.5 ${primary ? 'text-blue-100' : 'text-gray-500'}`}>{desc}</p>
              </div>
              <ChevronRight size={16} className={primary ? 'text-blue-200' : 'text-gray-400'} />
            </Link>
          ))}
        </div>
      </div>

      {/* Novedades */}
      {novedades.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Bell size={13} />
            Novedades recientes
          </h2>
          <div className="space-y-2">
            {novedades.map(n => (
              <Link
                key={n.id}
                to={`/maintenances/${n.id}`}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl p-4 border transition hover:shadow-sm ${
                  n.estado === 'aprobado'
                    ? 'bg-green-50 border-green-200 hover:bg-green-100'
                    : 'bg-red-50 border-red-200 hover:bg-red-100'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StatusBadge estado={n.estado} />
                  <span className="font-medium text-gray-800 text-sm truncate">
                    #{n.id} — {n.asset_codigo}{n.asset_nombre ? ` · ${n.asset_nombre}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {n.estado === 'rechazado' && n.comentario_supervisor && (
                    <span className="text-xs text-red-700 truncate max-w-[160px]">{n.comentario_supervisor}</span>
                  )}
                  {n.supervisor_nombre && (
                    <span className="text-xs text-gray-400">{n.supervisor_nombre}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(n.updated_at).toLocaleDateString('es-CO')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}

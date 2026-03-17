import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'

export default function DashboardPage() {
  const { user } = useAuth()
  const [novedades, setNovedades] = useState([])

  useEffect(() => {
    api.get('/maintenances/notifications')
      .then(res => setNovedades(res.data))
      .catch(() => {/* silenciar */})
  }, [])

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido, {user?.nombre}</h1>
      <p className="text-gray-500 mb-6">Sistema de Gestión de Mantenimientos</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
        <Link
          to="/maintenances/new"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 shadow transition"
        >
          <div className="text-3xl mb-2">+</div>
          <div className="font-semibold text-lg">Nuevo Mantenimiento</div>
          <div className="text-sm opacity-80 mt-1">Registrar un mantenimiento</div>
        </Link>

        <Link
          to="/maintenances"
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl p-6 shadow transition"
        >
          <div className="text-3xl mb-2">📋</div>
          <div className="font-semibold text-lg">Mis Mantenimientos</div>
          <div className="text-sm text-gray-500 mt-1">Ver y gestionar registros</div>
        </Link>

        {['supervisor', 'admin'].includes(user?.rol) && (
          <Link
            to="/reports"
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl p-6 shadow transition"
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold text-lg">Reportes</div>
            <div className="text-sm text-gray-500 mt-1">Exportar Excel / PDF</div>
          </Link>
        )}

        {user?.rol === 'admin' && (
          <Link
            to="/users"
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl p-6 shadow transition"
          >
            <div className="text-3xl mb-2">👥</div>
            <div className="font-semibold text-lg">Usuarios</div>
            <div className="text-sm text-gray-500 mt-1">Gestionar cuentas</div>
          </Link>
        )}
      </div>

      {/* Novedades */}
      {novedades.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Novedades</h2>
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
                    #{n.id} — {n.asset_codigo} {n.asset_nombre ? `· ${n.asset_nombre}` : ''}
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

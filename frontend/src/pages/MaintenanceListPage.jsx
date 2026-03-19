import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'

const ESTADOS = ['', 'borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado']

const PAGE_LIMIT = 20

export default function MaintenanceListPage() {
  const { user } = useAuth()
  const [items, setItems]         = useState([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [filters, setFilters]     = useState({ asset_code: '', estado: '', fecha_desde: '', fecha_hasta: '' })
  const [rejectModal, setRejectModal] = useState(null) // { id }
  const [rejectComment, setRejectComment] = useState('')
  const [dateRangeError, setDateRangeError] = useState('')

  function handleFilterChange(key, value) {
    setPage(1)
    const newFilters = { ...filters, [key]: value }
    if (newFilters.fecha_desde && newFilters.fecha_hasta && newFilters.fecha_desde > newFilters.fecha_hasta) {
      setDateRangeError('La fecha "desde" no puede ser mayor que "hasta"')
    } else {
      setDateRangeError('')
    }
    setFilters(newFilters)
  }

  const fetchItems = useCallback(async () => {
    if (dateRangeError) return
    setLoading(true)
    setError('')
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      params.page  = page
      params.limit = PAGE_LIMIT
      const res = await api.get('/maintenances', { params })
      setItems(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [filters, page, dateRangeError])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function handleApprove(id) {
    try {
      await api.patch(`/maintenances/${id}/approve`)
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al aprobar')
    }
  }

  async function handleReject() {
    if (!rejectComment.trim()) return
    try {
      await api.patch(`/maintenances/${rejectModal.id}/reject`, { comentario: rejectComment })
      setRejectModal(null)
      setRejectComment('')
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al rechazar')
      setRejectModal(null)
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Mantenimientos</h1>
        <Link to="/maintenances/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
          + Nuevo
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <input
          placeholder="Código activo"
          value={filters.asset_code}
          onChange={(e) => handleFilterChange('asset_code', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
        <select
          value={filters.estado}
          onChange={(e) => handleFilterChange('estado', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          {ESTADOS.map(e => <option key={e} value={e}>{e || 'Todos los estados'}</option>)}
        </select>
        <input
          type="date"
          value={filters.fecha_desde}
          onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
        <input
          type="date"
          value={filters.fecha_hasta}
          onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {dateRangeError && (
        <p className="text-red-600 text-sm mb-2">{dateRangeError}</p>
      )}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-500 text-sm mb-4">Cargando...</p>}

      <div className="space-y-3">
        {items.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusBadge estado={m.estado} />
                {m.pendiente_sync && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Pendiente sync</span>
                )}
              </div>
              <p className="font-semibold text-gray-800 truncate">{m.asset_codigo} — {m.asset_nombre || 'Sin nombre'}</p>
              <p className="text-sm text-gray-500">{m.motivo}</p>
              <p className="text-xs text-gray-400 mt-1">
                {m.tecnico_nombre} · {new Date(m.created_at).toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {['supervisor', 'admin'].includes(user?.rol) && m.estado === 'pendiente_aprobacion' && (
                <>
                  <button onClick={() => handleApprove(m.id)} className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-lg hover:bg-green-200 transition font-medium">
                    Aprobar
                  </button>
                  <button onClick={() => { setRejectModal({ id: m.id }); setRejectComment('') }} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition font-medium">
                    Rechazar
                  </button>
                </>
              )}
              <Link to={`/maintenances/${m.id}`} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-medium">
                Ver
              </Link>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-center text-gray-400 py-12">No hay registros</p>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            {total} resultado{total !== 1 ? 's' : ''} · página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold text-lg mb-3">Rechazar mantenimiento</h2>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-28 resize-none"
              placeholder="Motivo del rechazo (requerido)"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleReject} disabled={!rejectComment.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold">
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

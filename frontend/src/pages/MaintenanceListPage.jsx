import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button, { buttonClasses } from '../components/Button'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import { Plus, Check, X, ClipboardList, RefreshCw } from 'lucide-react'

const ESTADO_OPCIONES = [
  { value: '',                     label: 'Todos los estados' },
  { value: 'borrador',             label: 'Borrador' },
  { value: 'pendiente_aprobacion', label: 'Pendiente de aprobación' },
  { value: 'aprobado',             label: 'Aprobado' },
  { value: 'rechazado',            label: 'Rechazado' },
]

const PAGE_LIMIT = 20

export default function MaintenanceListPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [filters, setFilters]       = useState({
    asset_code: '', estado: searchParams.get('estado') ?? '', fecha_desde: '', fecha_hasta: '',
  })
  const [rejectModal, setRejectModal]   = useState(null)
  const [rejectComment, setRejectComment] = useState('')
  const [dateRangeError, setDateRangeError] = useState('')

  function handleFilterChange(key, value) {
    setPage(1)
    const next = { ...filters, [key]: value }
    setDateRangeError(
      next.fecha_desde && next.fecha_hasta && next.fecha_desde > next.fecha_hasta
        ? 'La fecha "desde" no puede ser posterior a la fecha "hasta".'
        : ''
    )
    setFilters(next)
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
      setError(err.response?.data?.message || 'No se pudieron cargar los mantenimientos.')
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
      setError(err.response?.data?.message || 'No se pudo aprobar el mantenimiento.')
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
      setError(err.response?.data?.message || 'No se pudo rechazar el mantenimiento.')
      setRejectModal(null)
    }
  }

  const esRevisor = ['supervisor', 'admin'].includes(user?.rol)

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground">Mantenimientos</h1>
        <Link to="/maintenances/new" className={buttonClasses('primary', 'md')}>
          <Plus size={16} aria-hidden="true" />
          Nuevo
        </Link>
      </div>

      {/* Filtros */}
      <Card className="mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Código de activo</span>
          <input
            placeholder="Ej. ABC-001"
            value={filters.asset_code}
            onChange={(e) => handleFilterChange('asset_code', e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Estado</span>
          <select
            value={filters.estado}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            className="input"
          >
            {ESTADO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Desde</span>
          <input
            type="date"
            value={filters.fecha_desde}
            onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Hasta</span>
          <input
            type="date"
            value={filters.fecha_hasta}
            onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            className="input"
          />
        </label>
      </Card>

      {dateRangeError && <p className="mb-4 text-sm text-danger-fg">{dateRangeError}</p>}
      {error && (
        <p className="mb-4 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">{error}</p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay mantenimientos que coincidan"
          message="Ajusta los filtros o registra el primer mantenimiento del periodo."
          action={
            <Link to="/maintenances/new" className={buttonClasses('primary', 'md')}>
              <Plus size={16} aria-hidden="true" />
              Nuevo mantenimiento
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((m) => (
            <Card key={m.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge estado={m.estado} />
                  {m.pendiente_sync && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      <RefreshCw size={11} aria-hidden="true" />
                      Pendiente de sincronización
                    </span>
                  )}
                </div>
                <p className="truncate font-medium text-foreground">
                  {m.asset_codigo} — {m.asset_nombre || 'Sin nombre'}
                </p>
                <p className="truncate text-sm text-muted">{m.motivo}</p>
                <p className="mt-1 text-xs text-faint">
                  {m.tecnico_nombre} · {new Date(m.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {esRevisor && m.estado === 'pendiente_aprobacion' && (
                  <>
                    <Button icon={Check} onClick={() => handleApprove(m.id)}>
                      Aprobar
                    </Button>
                    <Button
                      variant="danger"
                      icon={X}
                      onClick={() => { setRejectModal({ id: m.id }); setRejectComment('') }}
                    >
                      Rechazar
                    </Button>
                  </>
                )}
                <Link to={`/maintenances/${m.id}`} className={buttonClasses('secondary', 'md')}>
                  Ver detalle
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {total} resultado{total !== 1 ? 's' : ''} · página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal de rechazo */}
      {rejectModal && (
        <Modal title="Rechazar mantenimiento" onClose={() => setRejectModal(null)}>
          <p className="text-sm text-muted">
            Explica al técnico qué debe corregir. Este comentario es obligatorio.
          </p>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="input mt-3 h-28 resize-none"
            placeholder="Motivo del rechazo…"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectModal(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectComment.trim()}>
              Confirmar rechazo
            </Button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

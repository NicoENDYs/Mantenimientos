import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import Button, { buttonClasses } from '../components/Button'
import api from '../api/axiosInstance'
import { ASSET_ESTADO_LABEL, PRIORIDAD_LABEL } from '../constants'
import { HardDrive, Wrench } from 'lucide-react'

const PAGE_LIMIT = 20

const ESTADO_CLS = {
  operativo:         'bg-success-soft text-success-fg',
  en_reparacion:     'bg-warning-soft text-warning-fg',
  fuera_de_servicio: 'bg-danger-soft text-danger-fg',
}

export default function AssetsPage() {
  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [q, setQ]                   = useState('')
  const [estado, setEstado]         = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: PAGE_LIMIT }
      if (q) params.q = q
      if (estado) params.estado = estado
      const res = await api.get('/assets', { params })
      setItems(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los activos.')
    } finally {
      setLoading(false)
    }
  }, [q, estado, page])

  useEffect(() => {
    const timer = setTimeout(fetchItems, q ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchItems, q])

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground">Activos</h1>
      </div>

      <Card className="mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Buscar</span>
          <input
            value={q}
            onChange={e => { setPage(1); setQ(e.target.value) }}
            placeholder="Código, nombre o ubicación…"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Estado</span>
          <select
            value={estado}
            onChange={e => { setPage(1); setEstado(e.target.value) }}
            className="input"
          >
            <option value="">Todos</option>
            {Object.entries(ASSET_ESTADO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </Card>

      {error && (
        <p className="mb-4 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">{error}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="No hay activos que coincidan"
          message="Los activos se registran automáticamente la primera vez que se les crea un mantenimiento o solicitud."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(a => (
            <Card key={a.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${ESTADO_CLS[a.estado] || 'bg-surface-2 text-muted'}`}>
                    {ASSET_ESTADO_LABEL[a.estado] || a.estado}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted whitespace-nowrap">
                    Criticidad: {PRIORIDAD_LABEL[a.criticidad] || a.criticidad}
                  </span>
                </div>
                <p className="truncate font-medium text-foreground">
                  {a.codigo} — {a.nombre || 'Sin nombre'}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-faint">
                  {a.ubicacion && <span>{a.ubicacion}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Wrench size={11} aria-hidden="true" />
                    {a.total_mantenimientos} mantenimiento{a.total_mantenimientos !== 1 ? 's' : ''}
                  </span>
                  {a.ordenes_abiertas > 0 && (
                    <span className="font-medium text-warning-fg">
                      {a.ordenes_abiertas} orden{a.ordenes_abiertas !== 1 ? 'es' : ''} abierta{a.ordenes_abiertas !== 1 ? 's' : ''}
                    </span>
                  )}
                  {a.ultimo_mantenimiento && (
                    <span>Último: {new Date(a.ultimo_mantenimiento).toLocaleDateString('es-CO')}</span>
                  )}
                </p>
              </div>
              <Link to={`/assets/${a.id}`} className={buttonClasses('secondary', 'md')}>
                Ver ficha
              </Link>
            </Card>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {total} activo{total !== 1 ? 's' : ''} · página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
              Anterior
            </Button>
            <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </Layout>
  )
}

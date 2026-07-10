import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import TypeBadge from '../components/TypeBadge'
import Modal from '../components/Modal'
import Button from '../components/Button'
import api from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import { ASSET_ESTADO_LABEL, PRIORIDAD_LABEL, PRIORIDAD_OPCIONES } from '../constants'
import { ArrowLeft, Pencil, AlertCircle, Wrench } from 'lucide-react'

const ESTADO_CLS = {
  operativo:         'bg-success-soft text-success-fg',
  en_reparacion:     'bg-warning-soft text-warning-fg',
  fuera_de_servicio: 'bg-danger-soft text-danger-fg',
}

function Indicador({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}

export default function AssetDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [editModal, setEditModal] = useState(false)
  const [form, setForm]           = useState(null)
  const [busy, setBusy]           = useState(false)
  const [modalError, setModalError] = useState('')

  const esRevisor = ['supervisor', 'admin'].includes(user?.rol)

  useEffect(() => {
    api.get(`/assets/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'No se pudo cargar el activo.'))
      .finally(() => setLoading(false))
  }, [id])

  function openEdit() {
    setForm({
      nombre: data.nombre || '',
      tipo: data.tipo || '',
      ubicacion: data.ubicacion || '',
      estado: data.estado,
      criticidad: data.criticidad,
      notas: data.notas || '',
    })
    setModalError('')
    setEditModal(true)
  }

  async function handleSave() {
    setBusy(true)
    setModalError('')
    try {
      const res = await api.put(`/assets/${id}`, form)
      setData(d => ({ ...d, ...res.data }))
      setEditModal(false)
    } catch (err) {
      setModalError(err.response?.data?.message || 'No se pudieron guardar los cambios.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <Skeleton className="mb-6 h-7 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <Link to="/assets" className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft size={15} aria-hidden="true" />
          Volver a activos
        </Link>
        <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      </Layout>
    )
  }
  if (!data) return null

  const ind = data.indicadores || {}

  return (
    <Layout>
      <Link to="/assets" className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a activos
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">{data.codigo}</h1>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${ESTADO_CLS[data.estado] || 'bg-surface-2 text-muted'}`}>
          {ASSET_ESTADO_LABEL[data.estado] || data.estado}
        </span>
        <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted whitespace-nowrap">
          Criticidad: {PRIORIDAD_LABEL[data.criticidad] || data.criticidad}
        </span>
        {esRevisor && (
          <Button variant="secondary" size="sm" icon={Pencil} onClick={openEdit} className="ml-auto">
            Editar ficha
          </Button>
        )}
      </div>

      {/* Indicadores del activo */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Indicador label="Mantenimientos" value={ind.total ?? 0} />
        <Indicador label="Correctivos" value={ind.correctivos ?? 0} />
        <Indicador label="Órdenes abiertas" value={ind.abiertas ?? 0} />
        <Indicador label="MTTR" value={ind.mttr_horas != null ? `${ind.mttr_horas} h` : '—'} />
        <Indicador label="Costo repuestos" value={`$${(ind.costo_repuestos ?? 0).toFixed(2)}`} />
      </section>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Datos del activo</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Nombre</dt>
            <dd className="mt-0.5 text-sm text-foreground">{data.nombre || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Tipo</dt>
            <dd className="mt-0.5 text-sm text-foreground">{data.tipo || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ubicación</dt>
            <dd className="mt-0.5 text-sm text-foreground">{data.ubicacion || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Horas de parada acumuladas</dt>
            <dd className="mt-0.5 text-sm text-foreground">{ind.horas_parada ?? 0} h</dd>
          </div>
          {data.notas && (
            <div className="sm:col-span-2 md:col-span-4">
              <dt className="text-xs text-muted">Notas</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{data.notas}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Historial de mantenimientos */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
          <Wrench size={13} aria-hidden="true" />
          Historial de mantenimientos
        </h2>
        {data.mantenimientos?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.mantenimientos.map(m => (
              <Link
                key={m.id}
                to={`/maintenances/${m.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4
                  transition-colors hover:bg-surface-2 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <StatusBadge estado={m.estado} />
                  <TypeBadge tipo={m.tipo} />
                  <PriorityBadge prioridad={m.prioridad} />
                  <span className="truncate text-sm font-medium text-foreground">
                    #{m.id} · {m.motivo}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  <span>{m.asignado_nombre || m.tecnico_nombre}</span>
                  <span>{new Date(m.created_at).toLocaleDateString('es-CO')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <p className="text-sm text-muted">Este activo aún no tiene mantenimientos registrados.</p>
          </Card>
        )}
      </section>

      {/* Modal edición */}
      {editModal && form && (
        <Modal title={`Editar ficha — ${data.codigo}`} onClose={() => setEditModal(false)} maxWidth="max-w-2xl">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Nombre</span>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  maxLength={200}
                  className="input"
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Tipo</span>
                <input
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  maxLength={100}
                  placeholder="Ej. Bomba centrífuga"
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Ubicación</span>
                <input
                  value={form.ubicacion}
                  onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))}
                  maxLength={200}
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Estado operativo</span>
                <select
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                  className="input"
                >
                  {Object.entries(ASSET_ESTADO_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Criticidad</span>
                <select
                  value={form.criticidad}
                  onChange={e => setForm(f => ({ ...f, criticidad: e.target.value }))}
                  className="input"
                >
                  {PRIORIDAD_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Notas</span>
              <textarea
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={3}
                maxLength={5000}
                placeholder="Observaciones, manual, garantía…"
                className="input resize-none"
              />
            </label>
            {modalError && <p className="text-sm text-danger-fg">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

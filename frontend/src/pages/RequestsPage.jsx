import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import PriorityBadge from '../components/PriorityBadge'
import Button, { buttonClasses } from '../components/Button'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import { PRIORIDAD_OPCIONES, TIPO_OPCIONES } from '../constants'
import { Plus, Inbox, Check, X, AlertCircle, ExternalLink } from 'lucide-react'

const ESTADO_CFG = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-warning-soft text-warning-fg' },
  convertida: { label: 'Convertida', cls: 'bg-success-soft text-success-fg' },
  descartada: { label: 'Descartada', cls: 'bg-surface-2 text-muted' },
}

export default function RequestsPage() {
  const { user } = useAuth()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [estado, setEstado]     = useState('pendiente')

  // Crear solicitud
  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm]   = useState({ assetCode: '', descripcion: '', prioridad: 'media' })

  // Convertir / descartar
  const [convertModal, setConvertModal] = useState(null)
  const [convertForm, setConvertForm]   = useState({ tipo: 'correctivo', prioridad: 'media', assigned_to: '', fecha_programada: '' })
  const [discardModal, setDiscardModal] = useState(null)
  const [discardComment, setDiscardComment] = useState('')
  const [assignables, setAssignables]   = useState([])
  const [busy, setBusy]                 = useState(false)
  const [modalError, setModalError]     = useState('')

  const esRevisor = ['supervisor', 'admin'].includes(user?.rol)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = estado ? { estado } : {}
      const res = await api.get('/requests', { params })
      setItems(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las solicitudes.')
    } finally {
      setLoading(false)
    }
  }, [estado])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    if (esRevisor) {
      api.get('/users/assignables').then(res => setAssignables(res.data)).catch(() => {})
    }
  }, [esRevisor])

  async function handleCreate() {
    if (!createForm.assetCode.trim() || !createForm.descripcion.trim()) {
      setModalError('El código de activo y la descripción son requeridos.')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      await api.post('/requests', createForm)
      setCreateModal(false)
      setCreateForm({ assetCode: '', descripcion: '', prioridad: 'media' })
      fetchItems()
    } catch (err) {
      setModalError(err.response?.data?.message || 'No se pudo crear la solicitud.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConvert() {
    setBusy(true)
    setModalError('')
    try {
      const payload = { tipo: convertForm.tipo, prioridad: convertForm.prioridad }
      if (convertForm.assigned_to)      payload.assigned_to = parseInt(convertForm.assigned_to, 10)
      if (convertForm.fecha_programada) payload.fecha_programada = convertForm.fecha_programada
      await api.patch(`/requests/${convertModal.id}/convert`, payload)
      setConvertModal(null)
      fetchItems()
    } catch (err) {
      setModalError(err.response?.data?.message || 'No se pudo convertir la solicitud.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDiscard() {
    if (!discardComment.trim()) return
    setBusy(true)
    setModalError('')
    try {
      await api.patch(`/requests/${discardModal.id}/discard`, { comentario: discardComment })
      setDiscardModal(null)
      setDiscardComment('')
      fetchItems()
    } catch (err) {
      setModalError(err.response?.data?.message || 'No se pudo descartar la solicitud.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground">Solicitudes de mantenimiento</h1>
        <Button icon={Plus} onClick={() => { setCreateModal(true); setModalError('') }}>
          Reportar falla
        </Button>
      </div>

      {/* Filtro por estado */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[['pendiente', 'Pendientes'], ['convertida', 'Convertidas'], ['descartada', 'Descartadas'], ['', 'Todas']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setEstado(value)}
            className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
              estado === value
                ? 'bg-accent text-accent-fg'
                : 'bg-surface text-muted border border-border hover:bg-surface-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">{error}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No hay solicitudes en esta vista"
          message="Cuando alguien detecte una falla en un equipo, repórtala aquí para que supervisión la convierta en una orden de trabajo."
          action={
            <Button icon={Plus} onClick={() => setCreateModal(true)}>
              Reportar falla
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(r => {
            const cfg = ESTADO_CFG[r.estado] || ESTADO_CFG.pendiente
            return (
              <Card key={r.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    <PriorityBadge prioridad={r.prioridad} />
                  </div>
                  <p className="truncate font-medium text-foreground">
                    {r.asset_codigo} — {r.asset_nombre || 'Sin nombre'}
                  </p>
                  <p className="line-clamp-2 text-sm text-muted">{r.descripcion}</p>
                  <p className="mt-1 text-xs text-faint">
                    {r.solicitante_nombre} · {new Date(r.created_at).toLocaleString('es-CO')}
                    {r.estado === 'descartada' && r.comentario_resolucion && ` · Motivo: ${r.comentario_resolucion}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {esRevisor && r.estado === 'pendiente' && (
                    <>
                      <Button
                        icon={Check}
                        onClick={() => {
                          setConvertModal(r)
                          setConvertForm({ tipo: 'correctivo', prioridad: r.prioridad, assigned_to: '', fecha_programada: '' })
                          setModalError('')
                        }}
                      >
                        Convertir en orden
                      </Button>
                      <Button
                        variant="danger"
                        icon={X}
                        onClick={() => { setDiscardModal(r); setDiscardComment(''); setModalError('') }}
                      >
                        Descartar
                      </Button>
                    </>
                  )}
                  {r.estado === 'convertida' && r.maintenance_id && (
                    <Link to={`/maintenances/${r.maintenance_id}`} className={buttonClasses('secondary', 'md')}>
                      <ExternalLink size={15} aria-hidden="true" />
                      Ver orden #{r.maintenance_id}
                    </Link>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal crear solicitud */}
      {createModal && (
        <Modal title="Reportar una falla" onClose={() => setCreateModal(false)}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Código del activo <span className="text-danger-fg">*</span></span>
              <input
                value={createForm.assetCode}
                onChange={e => setCreateForm(f => ({ ...f, assetCode: e.target.value }))}
                placeholder="Ej. ABC-001"
                className="input"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">¿Qué falla detectaste? <span className="text-danger-fg">*</span></span>
              <textarea
                value={createForm.descripcion}
                onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={4}
                maxLength={5000}
                placeholder="Describe el problema con el mayor detalle posible…"
                className="input resize-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Prioridad sugerida</span>
              <select
                value={createForm.prioridad}
                onChange={e => setCreateForm(f => ({ ...f, prioridad: e.target.value }))}
                className="input"
              >
                {PRIORIDAD_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            {modalError && (
              <p className="flex items-start gap-2 text-sm text-danger-fg">
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                {modalError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar solicitud'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal convertir */}
      {convertModal && (
        <Modal title={`Convertir solicitud #${convertModal.id} en orden`} onClose={() => setConvertModal(null)}>
          <div className="flex flex-col gap-3">
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-foreground">
              {convertModal.asset_codigo}: {convertModal.descripcion}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Tipo</span>
                <select
                  value={convertForm.tipo}
                  onChange={e => setConvertForm(f => ({ ...f, tipo: e.target.value }))}
                  className="input"
                >
                  {TIPO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Prioridad</span>
                <select
                  value={convertForm.prioridad}
                  onChange={e => setConvertForm(f => ({ ...f, prioridad: e.target.value }))}
                  className="input"
                >
                  {PRIORIDAD_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Asignar a</span>
                <select
                  value={convertForm.assigned_to}
                  onChange={e => setConvertForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin asignar</option>
                  {assignables.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Fecha programada</span>
                <input
                  type="date"
                  value={convertForm.fecha_programada}
                  onChange={e => setConvertForm(f => ({ ...f, fecha_programada: e.target.value }))}
                  className="input"
                />
              </label>
            </div>
            {modalError && <p className="text-sm text-danger-fg">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConvertModal(null)}>Cancelar</Button>
              <Button onClick={handleConvert} disabled={busy}>
                {busy ? 'Convirtiendo…' : 'Crear orden de trabajo'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal descartar */}
      {discardModal && (
        <Modal title={`Descartar solicitud #${discardModal.id}`} onClose={() => setDiscardModal(null)}>
          <p className="text-sm text-muted">
            Explica por qué se descarta. El solicitante podrá ver este comentario.
          </p>
          <textarea
            value={discardComment}
            onChange={e => setDiscardComment(e.target.value)}
            className="input mt-3 h-28 resize-none"
            placeholder="Motivo del descarte…"
            autoFocus
          />
          {modalError && <p className="mt-2 text-sm text-danger-fg">{modalError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDiscardModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDiscard} disabled={!discardComment.trim() || busy}>
              {busy ? 'Descartando…' : 'Confirmar descarte'}
            </Button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

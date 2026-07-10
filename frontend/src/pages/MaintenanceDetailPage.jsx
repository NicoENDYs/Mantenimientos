import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import TypeBadge from '../components/TypeBadge'
import AuthImage from '../components/AuthImage'
import Modal from '../components/Modal'
import PartsSubform, { serializeParts } from '../components/PartsSubform'
import Button, { buttonClasses } from '../components/Button'
import api from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Check, X, Pencil, AlertCircle, Play, UserPlus,
  CheckSquare, History,
} from 'lucide-react'

const ACCION_LABEL = {
  registrada:   'Registro creado',
  orden_creada: 'Orden de trabajo creada',
  asignada:     'Orden asignada',
  iniciada:     'Trabajo iniciado',
  completada:   'Trabajo completado, enviado a aprobación',
  aprobada:     'Aprobado por supervisor',
  rechazada:    'Rechazado por supervisor',
  editada:      'Registro editado',
}

function Campo({ label, children, full = false }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <section className="border-t border-border px-6 py-5 first:border-t-0">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
      {children}
    </section>
  )
}

const fecha     = (d) => d ? new Date(d).toLocaleString('es-CO') : '—'
const fechaDia  = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—'

export default function MaintenanceDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [actionError, setActionError] = useState('')
  const [rejecting, setRejecting]     = useState(false)
  const [comentario, setComentario]   = useState('')
  const [actioning, setActioning]     = useState(false)

  // Asignación
  const [assignModal, setAssignModal] = useState(false)
  const [assignables, setAssignables] = useState([])
  const [assignTo, setAssignTo]       = useState('')

  // Completar orden
  const [completeModal, setCompleteModal] = useState(false)
  const [completeForm, setCompleteForm]   = useState({
    solucion: '', horas_trabajo: '', tiempo_parada_horas: '', hubo_cambio: false,
  })
  const [completeParts, setCompleteParts] = useState([])

  const esRevisor = ['supervisor', 'admin'].includes(user?.rol)

  useEffect(() => {
    api.get(`/maintenances/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'No se pudo cargar el mantenimiento.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (esRevisor) {
      api.get('/users/assignables').then(res => setAssignables(res.data)).catch(() => {})
    }
  }, [esRevisor])

  async function runAction(fn) {
    setActionError('')
    setActioning(true)
    try {
      const res = await fn()
      setData(res.data)
      return true
    } catch (err) {
      setActionError(err.response?.data?.message || 'No se pudo completar la acción.')
      return false
    } finally {
      setActioning(false)
    }
  }

  const handleApprove = () => runAction(() => api.patch(`/maintenances/${id}/approve`))
  const handleStart   = () => runAction(() => api.patch(`/maintenances/${id}/start`))

  async function handleReject() {
    if (!comentario.trim()) {
      setActionError('El comentario es obligatorio para rechazar.')
      return
    }
    const ok = await runAction(() => api.patch(`/maintenances/${id}/reject`, { comentario }))
    if (ok) { setRejecting(false); setComentario('') }
  }

  async function handleAssign() {
    if (!assignTo) return
    const ok = await runAction(() =>
      api.patch(`/maintenances/${id}/assign`, { user_id: parseInt(assignTo, 10) })
    )
    if (ok) setAssignModal(false)
  }

  async function handleComplete() {
    if (!completeForm.solucion.trim()) {
      setActionError('Describe la solución aplicada para completar la orden.')
      return
    }
    const payload = {
      solucion: completeForm.solucion,
      hubo_cambio: completeForm.hubo_cambio,
      partes: completeForm.hubo_cambio ? serializeParts(completeParts) : [],
    }
    if (completeForm.horas_trabajo !== '')       payload.horas_trabajo = parseFloat(completeForm.horas_trabajo)
    if (completeForm.tiempo_parada_horas !== '') payload.tiempo_parada_horas = parseFloat(completeForm.tiempo_parada_horas)

    const ok = await runAction(() => api.patch(`/maintenances/${id}/complete`, payload))
    if (ok) setCompleteModal(false)
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
        <Link to="/maintenances" className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft size={15} aria-hidden="true" />
          Volver a la lista
        </Link>
        <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      </Layout>
    )
  }
  if (!data) return null

  const esOrdenActiva = ['abierta', 'en_progreso'].includes(data.estado)
  const puedeTrabajar = esRevisor || data.user_id === user?.id || data.assigned_to === user?.id
  const canEdit     = ['borrador', 'rechazado'].includes(data.estado) && puedeTrabajar
  const canApprove  = data.estado === 'pendiente_aprobacion' && esRevisor
  const canStart    = data.estado === 'abierta' && (puedeTrabajar || !data.assigned_to)
  const canComplete = esOrdenActiva && puedeTrabajar
  const canAssign   = esOrdenActiva && esRevisor
  const costoRepuestos = parseFloat(data.costo_repuestos || 0)

  return (
    <Layout>
      <Link to="/maintenances" className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a la lista
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">Mantenimiento #{data.id}</h1>
        <StatusBadge estado={data.estado} />
        <TypeBadge tipo={data.tipo} />
        <PriorityBadge prioridad={data.prioridad} />
      </div>

      {/* Acciones del flujo de trabajo */}
      {(canStart || canComplete || canAssign) && (
        <div className="mb-5 flex flex-wrap gap-3">
          {canStart && (
            <Button icon={Play} onClick={handleStart} disabled={actioning}>
              Iniciar trabajo
            </Button>
          )}
          {canComplete && (
            <Button
              icon={CheckSquare}
              variant={canStart ? 'secondary' : 'primary'}
              onClick={() => {
                setCompleteForm({
                  solucion: data.solucion || '', horas_trabajo: '', tiempo_parada_horas: '',
                  hubo_cambio: data.hubo_cambio || false,
                })
                setCompleteParts(data.partes?.map(p => ({
                  part_id: p.part_id, descripcion: p.descripcion, cantidad: p.cantidad,
                })) || [])
                setCompleteModal(true)
                setActionError('')
              }}
              disabled={actioning}
            >
              Completar orden
            </Button>
          )}
          {canAssign && (
            <Button
              variant="secondary"
              icon={UserPlus}
              onClick={() => { setAssignModal(true); setAssignTo(String(data.assigned_to || '')) }}
              disabled={actioning}
            >
              {data.assigned_to ? 'Reasignar' : 'Asignar'}
            </Button>
          )}
        </div>
      )}

      {actionError && !rejecting && !assignModal && !completeModal && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {actionError}
        </p>
      )}

      <Card>
        <Seccion titulo="Activo">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Campo label="Código">{data.asset_codigo}</Campo>
            <Campo label="Nombre">{data.asset_nombre || '—'}</Campo>
            <Campo label="Tipo">{data.asset_tipo || '—'}</Campo>
            <Campo label="Ubicación">{data.asset_ubicacion || '—'}</Campo>
          </dl>
        </Seccion>

        <Seccion titulo="Orden de trabajo">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Campo label="Creado por">{data.tecnico_nombre}</Campo>
            <Campo label="Asignado a">{data.asignado_nombre || 'Sin asignar'}</Campo>
            <Campo label="Fecha programada">{fechaDia(data.fecha_programada)}</Campo>
            <Campo label="Fecha de registro">{fecha(data.created_at)}</Campo>
            <Campo label="Inicio del trabajo">{fecha(data.fecha_inicio)}</Campo>
            <Campo label="Fin del trabajo">{fecha(data.fecha_fin)}</Campo>
            <Campo label="Horas de trabajo">{data.horas_trabajo ?? '—'}</Campo>
            <Campo label="Horas de parada del equipo">{data.tiempo_parada_horas ?? '—'}</Campo>
            {data.plan_titulo && <Campo label="Plan de origen" full>{data.plan_titulo}</Campo>}
          </dl>
        </Seccion>

        <Seccion titulo="Detalle de la intervención">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Motivo del mantenimiento" full>{data.motivo}</Campo>
            <Campo label="Descripción del problema" full>{data.descripcion_problema}</Campo>
            <Campo label="Solución aplicada" full>{data.solucion || 'Pendiente de ejecución'}</Campo>
          </dl>
        </Seccion>

        {data.hubo_cambio && data.partes?.length > 0 && (
          <Seccion titulo="Piezas cambiadas">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="pb-2 font-medium">Descripción</th>
                  <th className="w-24 pb-2 font-medium">Cantidad</th>
                  <th className="w-32 pb-2 font-medium">Costo</th>
                </tr>
              </thead>
              <tbody>
                {data.partes.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">{p.descripcion}</td>
                    <td className="py-2 text-foreground">{p.cantidad}</td>
                    <td className="py-2 text-foreground">
                      {parseFloat(p.costo_unitario) > 0
                        ? `$${(p.cantidad * parseFloat(p.costo_unitario)).toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {costoRepuestos > 0 && (
                <tfoot>
                  <tr>
                    <td className="pt-2 text-sm font-medium text-foreground" colSpan={2}>Costo total de repuestos</td>
                    <td className="pt-2 text-sm font-semibold text-foreground">${costoRepuestos.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Seccion>
        )}

        {data.fotos?.length > 0 && (
          <Seccion titulo="Evidencia fotográfica">
            <div className="flex flex-wrap gap-3">
              {data.fotos.map(f => (
                <figure key={f.id} className="flex flex-col gap-1">
                  <AuthImage
                    src={`maintenances/${data.id}/photos/${f.id}`}
                    alt={f.nombre_original}
                    className="h-28 w-36 rounded-lg border border-border object-cover"
                  />
                  <figcaption className="max-w-[9rem] truncate text-xs text-faint">
                    {f.nombre_original}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Seccion>
        )}

        {data.comentario_supervisor && (
          <Seccion titulo="Comentario del supervisor">
            <div className="rounded-lg bg-surface-2 p-4">
              <p className="text-sm text-foreground">{data.comentario_supervisor}</p>
              {data.supervisor_nombre && (
                <p className="mt-1.5 text-xs text-muted">— {data.supervisor_nombre}</p>
              )}
            </div>
          </Seccion>
        )}

        {data.historial?.length > 0 && (
          <Seccion titulo="Historial">
            <ol className="flex flex-col gap-0">
              {data.historial.map((h, i) => (
                <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className="flex flex-col items-center">
                    <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                      <History size={12} aria-hidden="true" />
                    </span>
                    {i < data.historial.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-medium text-foreground">
                      {ACCION_LABEL[h.accion] || h.accion}
                    </p>
                    <p className="text-xs text-muted">
                      {h.usuario_nombre || 'Sistema'} · {fecha(h.created_at)}
                    </p>
                    {h.detalle && <p className="mt-0.5 text-xs text-faint">{h.detalle}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Seccion>
        )}
      </Card>

      {/* Acción del técnico */}
      {canEdit && (
        <div className="mt-5">
          <Link to={`/maintenances/${id}/edit`} className={buttonClasses('primary', 'md')}>
            <Pencil size={16} aria-hidden="true" />
            Editar mantenimiento
          </Link>
        </div>
      )}

      {/* Acciones del supervisor / admin */}
      {canApprove && (
        <div className="mt-5 flex flex-col gap-3">
          {actionError && rejecting && (
            <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {actionError}
            </p>
          )}

          {!rejecting ? (
            <div className="flex flex-wrap gap-3">
              <Button icon={Check} onClick={handleApprove} disabled={actioning}>
                {actioning ? 'Procesando…' : 'Aprobar'}
              </Button>
              <Button
                variant="danger"
                icon={X}
                onClick={() => { setRejecting(true); setActionError('') }}
                disabled={actioning}
              >
                Rechazar
              </Button>
            </div>
          ) : (
            <Card className="p-4">
              <label htmlFor="motivo-rechazo" className="text-sm font-medium text-foreground">
                Motivo del rechazo
              </label>
              <textarea
                id="motivo-rechazo"
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={3}
                placeholder="Indica al técnico qué debe corregir…"
                className="input mt-2 resize-none"
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                <Button variant="danger" onClick={handleReject} disabled={actioning}>
                  {actioning ? 'Enviando…' : 'Confirmar rechazo'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setRejecting(false); setComentario(''); setActionError('') }}
                  disabled={actioning}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal de asignación */}
      {assignModal && (
        <Modal title="Asignar orden de trabajo" onClose={() => setAssignModal(false)}>
          <p className="text-sm text-muted">
            Selecciona el técnico responsable de ejecutar esta orden.
          </p>
          <select
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            className="input mt-3"
            autoFocus
          >
            <option value="">Seleccionar técnico…</option>
            {assignables.map(u => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
            ))}
          </select>
          {actionError && (
            <p className="mt-3 text-sm text-danger-fg">{actionError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={!assignTo || actioning}>
              {actioning ? 'Asignando…' : 'Asignar'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal de completar orden */}
      {completeModal && (
        <Modal title="Completar orden de trabajo" onClose={() => setCompleteModal(false)} maxWidth="max-w-2xl">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Solución aplicada <span className="text-danger-fg">*</span>
              </span>
              <textarea
                value={completeForm.solucion}
                onChange={e => setCompleteForm(f => ({ ...f, solucion: e.target.value }))}
                rows={4}
                maxLength={5000}
                placeholder="Describe el trabajo realizado…"
                className="input resize-none"
                autoFocus
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Horas de trabajo</span>
                <input
                  type="number" min="0" step="0.5"
                  value={completeForm.horas_trabajo}
                  onChange={e => setCompleteForm(f => ({ ...f, horas_trabajo: e.target.value }))}
                  className="input"
                  placeholder="Ej. 2.5"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Horas de parada del equipo</span>
                <input
                  type="number" min="0" step="0.5"
                  value={completeForm.tiempo_parada_horas}
                  onChange={e => setCompleteForm(f => ({ ...f, tiempo_parada_horas: e.target.value }))}
                  className="input"
                  placeholder="Ej. 4"
                />
              </label>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={completeForm.hubo_cambio}
                onChange={e => setCompleteForm(f => ({ ...f, hubo_cambio: e.target.checked }))}
                className="h-4 w-4 rounded accent-accent"
              />
              <span className="text-sm text-foreground">¿Se cambió alguna pieza o componente?</span>
            </label>

            {completeForm.hubo_cambio && (
              <PartsSubform parts={completeParts} onChange={setCompleteParts} />
            )}

            {actionError && (
              <p className="text-sm text-danger-fg">{actionError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCompleteModal(false)}>Cancelar</Button>
              <Button onClick={handleComplete} disabled={actioning || !completeForm.solucion.trim()}>
                {actioning ? 'Enviando…' : 'Completar y enviar a aprobación'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

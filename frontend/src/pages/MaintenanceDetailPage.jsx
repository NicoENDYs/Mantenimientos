import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import AuthImage from '../components/AuthImage'
import Button, { buttonClasses } from '../components/Button'
import api from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Check, X, Pencil, AlertCircle } from 'lucide-react'

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

  useEffect(() => {
    api.get(`/maintenances/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'No se pudo cargar el mantenimiento.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleApprove() {
    setActionError('')
    setActioning(true)
    try {
      const res = await api.patch(`/maintenances/${id}/approve`)
      setData(res.data)
    } catch (err) {
      setActionError(err.response?.data?.message || 'No se pudo aprobar.')
    } finally {
      setActioning(false)
    }
  }

  async function handleReject() {
    if (!comentario.trim()) {
      setActionError('El comentario es obligatorio para rechazar.')
      return
    }
    setActionError('')
    setActioning(true)
    try {
      const res = await api.patch(`/maintenances/${id}/reject`, { comentario })
      setData(res.data)
      setRejecting(false)
      setComentario('')
    } catch (err) {
      setActionError(err.response?.data?.message || 'No se pudo rechazar.')
    } finally {
      setActioning(false)
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

  const canEdit    = ['borrador', 'rechazado'].includes(data.estado)
  const canApprove = data.estado === 'pendiente_aprobacion' && ['supervisor', 'admin'].includes(user?.rol)

  return (
    <Layout>
      <Link to="/maintenances" className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a la lista
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">Mantenimiento #{data.id}</h1>
        <StatusBadge estado={data.estado} />
      </div>

      <Card>
        <Seccion titulo="Activo">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Campo label="Código">{data.asset_codigo}</Campo>
            <Campo label="Nombre">{data.asset_nombre || '—'}</Campo>
            <Campo label="Tipo">{data.asset_tipo || '—'}</Campo>
            <Campo label="Ubicación">{data.asset_ubicacion || '—'}</Campo>
          </dl>
        </Seccion>

        <Seccion titulo="Detalle de la intervención">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Técnico">{data.tecnico_nombre}</Campo>
            <Campo label="Fecha de registro">
              {new Date(data.created_at).toLocaleString('es-CO')}
            </Campo>
            <Campo label="Motivo del mantenimiento" full>{data.motivo}</Campo>
            <Campo label="Descripción del problema" full>{data.descripcion_problema}</Campo>
            <Campo label="Solución aplicada" full>{data.solucion}</Campo>
          </dl>
        </Seccion>

        {data.hubo_cambio && data.partes?.length > 0 && (
          <Seccion titulo="Piezas cambiadas">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="pb-2 font-medium">Descripción</th>
                  <th className="w-24 pb-2 font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {data.partes.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">{p.descripcion}</td>
                    <td className="py-2 text-foreground">{p.cantidad}</td>
                  </tr>
                ))}
              </tbody>
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
          {actionError && (
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
    </Layout>
  )
}

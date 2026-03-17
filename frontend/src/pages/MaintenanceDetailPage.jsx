import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import AuthImage from '../components/AuthImage'
import api from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'

export default function MaintenanceDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [actionError, setActionError] = useState('')
  const [rejecting, setRejecting]   = useState(false)
  const [comentario, setComentario] = useState('')
  const [actioning, setActioning]   = useState(false)

  useEffect(() => {
    api.get(`/maintenances/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleApprove() {
    setActionError('')
    setActioning(true)
    try {
      const res = await api.patch(`/maintenances/${id}/approve`)
      setData(res.data)
    } catch (err) {
      setActionError(err.response?.data?.message || 'Error al aprobar')
    } finally {
      setActioning(false)
    }
  }

  async function handleReject() {
    if (!comentario.trim()) {
      setActionError('El comentario es obligatorio para rechazar')
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
      setActionError(err.response?.data?.message || 'Error al rechazar')
    } finally {
      setActioning(false)
    }
  }

  if (loading) return <Layout><p className="text-gray-400 py-12 text-center">Cargando...</p></Layout>
  if (error)   return <Layout><p className="text-red-600 py-4">{error}</p></Layout>
  if (!data)   return <Layout><p>No encontrado</p></Layout>

  const canEdit    = ['borrador', 'rechazado'].includes(data.estado)
  const canApprove = data.estado === 'pendiente_aprobacion' && ['supervisor', 'admin'].includes(user?.rol)

  return (
    <Layout>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link to="/maintenances" className="text-blue-600 text-sm hover:underline">← Volver</Link>
        <h1 className="text-xl font-bold text-gray-800">Mantenimiento #{data.id}</h1>
        <StatusBadge estado={data.estado} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {/* Activo */}
        <section>
          <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Activo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Código:</span><br /><strong>{data.asset_codigo}</strong></div>
            <div><span className="text-gray-500">Nombre:</span><br />{data.asset_nombre || '-'}</div>
            <div><span className="text-gray-500">Tipo:</span><br />{data.asset_tipo || '-'}</div>
            <div><span className="text-gray-500">Ubicación:</span><br />{data.asset_ubicacion || '-'}</div>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Detalle */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Técnico</p>
            <p className="font-medium">{data.tecnico_nombre}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Fecha</p>
            <p className="font-medium">{new Date(data.created_at).toLocaleString('es-CO')}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500 mb-1">Motivo</p>
            <p>{data.motivo}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500 mb-1">Descripción del problema</p>
            <p>{data.descripcion_problema}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500 mb-1">Solución aplicada</p>
            <p>{data.solucion}</p>
          </div>
        </section>

        {/* Piezas */}
        {data.hubo_cambio && data.partes?.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <section>
              <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Piezas cambiadas</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-1 font-medium">Descripción</th>
                    <th className="pb-1 font-medium w-20">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {data.partes.map(p => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="py-1">{p.descripcion}</td>
                      <td className="py-1">{p.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Fotos */}
        {data.fotos?.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <section>
              <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Fotos</h2>
              <div className="flex flex-wrap gap-3">
                {data.fotos.map(f => (
                  <div key={f.id} className="flex flex-col items-center gap-1">
                    <AuthImage
                      src={`maintenances/${data.id}/photos/${f.id}`}
                      alt={f.nombre_original}
                      className="w-36 h-28 object-cover rounded-lg border border-gray-200"
                    />
                    <span className="text-xs text-gray-400 max-w-[9rem] truncate">{f.nombre_original}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Comentario supervisor */}
        {data.comentario_supervisor && (
          <>
            <hr className="border-gray-100" />
            <section>
              <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Comentario supervisor</h2>
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                {data.comentario_supervisor}
              </p>
              {data.supervisor_nombre && (
                <p className="text-xs text-gray-400 mt-1">— {data.supervisor_nombre}</p>
              )}
            </section>
          </>
        )}
      </div>

      {/* Acciones del técnico */}
      {canEdit && (
        <div className="mt-4">
          <Link
            to={`/maintenances/${id}/edit`}
            className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            Editar
          </Link>
        </div>
      )}

      {/* Acciones del supervisor / admin */}
      {canApprove && (
        <div className="mt-4 space-y-3">
          {actionError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{actionError}</p>
          )}

          {!rejecting ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApprove}
                disabled={actioning}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {actioning ? 'Procesando...' : 'Aprobar'}
              </button>
              <button
                onClick={() => { setRejecting(true); setActionError('') }}
                disabled={actioning}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Motivo del rechazo</p>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={3}
                placeholder="Indica al técnico qué debe corregir..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={actioning}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {actioning ? 'Enviando...' : 'Confirmar rechazo'}
                </button>
                <button
                  onClick={() => { setRejecting(false); setComentario(''); setActionError('') }}
                  disabled={actioning}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}

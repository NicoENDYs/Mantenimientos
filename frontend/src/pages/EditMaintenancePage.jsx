import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import PartsSubform from '../components/PartsSubform'
import PhotoUpload from '../components/PhotoUpload'
import AuthImage from '../components/AuthImage'
import api from '../api/axiosInstance'

const MAX_PHOTOS = 5

export default function EditMaintenancePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading]             = useState(true)
  const [loadError, setLoadError]         = useState('')
  const [parts, setParts]                 = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newPhotos, setNewPhotos]         = useState([])
  const [submitError, setSubmitError]     = useState('')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm()

  const hubo_cambio = watch('hubo_cambio')

  useEffect(() => {
    api.get(`/maintenances/${id}`)
      .then(res => {
        const m = res.data
        if (!['borrador', 'rechazado'].includes(m.estado)) {
          setLoadError('Este mantenimiento no se puede editar en su estado actual.')
          return
        }
        reset({
          motivo:               m.motivo,
          descripcion_problema: m.descripcion_problema,
          solucion:             m.solucion,
          hubo_cambio:          m.hubo_cambio,
        })
        setParts(m.partes || [])
        setExistingPhotos(m.fotos || [])
      })
      .catch(err => setLoadError(err.response?.data?.message || 'Error al cargar el mantenimiento'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDeleteExistingPhoto(photoId) {
    try {
      await api.delete(`/maintenances/${id}/photos/${photoId}`)
      setExistingPhotos(prev => prev.filter(f => f.id !== photoId))
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar la foto')
    }
  }

  async function onSubmit(data) {
    setSubmitError('')

    const totalPhotos = existingPhotos.length + newPhotos.length
    if (totalPhotos === 0) {
      setSubmitError('Debes adjuntar al menos 1 foto')
      return
    }
    if (data.hubo_cambio && parts.length === 0) {
      setSubmitError('Agrega al menos una pieza cambiada')
      return
    }

    try {
      await api.put(`/maintenances/${id}`, {
        motivo:               data.motivo,
        descripcion_problema: data.descripcion_problema,
        solucion:             data.solucion,
        hubo_cambio:          !!data.hubo_cambio,
        partes:               data.hubo_cambio ? parts : [],
      })

      if (newPhotos.length > 0) {
        const formData = new FormData()
        newPhotos.forEach(f => formData.append('file', f))
        await api.post(`/maintenances/${id}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      navigate(`/maintenances/${id}`)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Error al guardar')
    }
  }

  if (loading)   return <Layout><p className="text-gray-400 py-12 text-center">Cargando...</p></Layout>
  if (loadError) return <Layout><p className="text-red-600 py-4">{loadError}</p></Layout>

  const availablePhotoSlots = MAX_PHOTOS - existingPhotos.length

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-sm hover:underline">← Volver</button>
        <h1 className="text-xl font-bold text-gray-800">Editar Mantenimiento #{id}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Descripción */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Descripción</h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Motivo del mantenimiento *</label>
            <textarea
              {...register('motivo', { required: 'Requerido' })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.motivo && <p className="text-red-500 text-xs">{errors.motivo.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Descripción del problema *</label>
            <textarea
              {...register('descripcion_problema', { required: 'Requerido' })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.descripcion_problema && <p className="text-red-500 text-xs">{errors.descripcion_problema.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Solución aplicada *</label>
            <textarea
              {...register('solucion', { required: 'Requerido' })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.solucion && <p className="text-red-500 text-xs">{errors.solucion.message}</p>}
          </div>
        </section>

        {/* Cambio de piezas */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Cambio de piezas</h2>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              {...register('hubo_cambio')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700">¿Se cambió alguna pieza o componente?</span>
          </label>
          {hubo_cambio && <PartsSubform parts={parts} onChange={setParts} />}
        </section>

        {/* Fotos */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-3">
            Fotos ({existingPhotos.length + newPhotos.length}/{MAX_PHOTOS})
          </h2>

          {/* Fotos existentes */}
          {existingPhotos.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {existingPhotos.map(f => (
                <div key={f.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <AuthImage
                    src={`maintenances/${id}/photos/${f.id}`}
                    alt={f.nombre_original}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingPhoto(f.id)}
                    className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs leading-none flex items-center justify-center"
                    title="Eliminar foto"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Agregar nuevas fotos */}
          {availablePhotoSlots > 0 && (
            <PhotoUpload
              files={newPhotos}
              onChange={(files) => setNewPhotos(files.slice(0, availablePhotoSlots))}
            />
          )}
        </section>

        {submitError && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </Layout>
  )
}

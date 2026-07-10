import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Field from '../components/Field'
import Skeleton from '../components/Skeleton'
import Button from '../components/Button'
import PartsSubform, { serializeParts } from '../components/PartsSubform'
import PhotoUpload from '../components/PhotoUpload'
import AuthImage from '../components/AuthImage'
import api from '../api/axiosInstance'
import { MAX_FOTOS as MAX_PHOTOS, TIPO_OPCIONES, PRIORIDAD_OPCIONES } from '../constants'
import { ArrowLeft, X, AlertCircle } from 'lucide-react'

export default function EditMaintenancePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')
  const [parts, setParts]                   = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newPhotos, setNewPhotos]           = useState([])
  const [submitError, setSubmitError]       = useState('')

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm()
  const hubo_cambio = watch('hubo_cambio')

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    api.get(`/maintenances/${id}`, { signal: controller.signal })
      .then(res => {
        if (!mounted) return
        const m = res.data
        if (!['borrador', 'rechazado'].includes(m.estado)) {
          setLoadError('Este mantenimiento no se puede editar en su estado actual.')
          setLoading(false)
          return
        }
        reset({
          motivo:               m.motivo,
          descripcion_problema: m.descripcion_problema,
          solucion:             m.solucion,
          hubo_cambio:          m.hubo_cambio,
          tipo:                 m.tipo || 'correctivo',
          prioridad:            m.prioridad || 'media',
        })
        setParts((m.partes || []).map(p => ({
          part_id: p.part_id, descripcion: p.descripcion, cantidad: p.cantidad,
        })))
        setExistingPhotos(m.fotos || [])
        setLoading(false)
      })
      .catch(err => {
        if (!mounted || err.code === 'ERR_CANCELED') return
        setLoadError(err.response?.data?.message || 'No se pudo cargar el mantenimiento.')
        setLoading(false)
      })

    return () => { mounted = false; controller.abort() }
  }, [id, reset])

  async function handleDeleteExistingPhoto(photoId) {
    try {
      await api.delete(`/maintenances/${id}/photos/${photoId}`)
      setExistingPhotos(prev => prev.filter(f => f.id !== photoId))
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'No se pudo eliminar la foto.')
    }
  }

  async function onSubmit(data) {
    setSubmitError('')

    if (existingPhotos.length + newPhotos.length === 0) {
      setSubmitError('Debes conservar o adjuntar al menos 1 foto.')
      return
    }
    if (data.hubo_cambio && parts.length === 0) {
      setSubmitError('Marcaste cambio de piezas: agrega al menos una pieza.')
      return
    }

    try {
      await api.put(`/maintenances/${id}`, {
        motivo:               data.motivo,
        descripcion_problema: data.descripcion_problema,
        solucion:             data.solucion,
        hubo_cambio:          !!data.hubo_cambio,
        tipo:                 data.tipo,
        prioridad:            data.prioridad,
        partes:               data.hubo_cambio ? serializeParts(parts) : [],
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
      setSubmitError(err.response?.data?.message || 'No se pudieron guardar los cambios.')
    }
  }

  if (loading) {
    return (
      <Layout>
        <Skeleton className="mb-6 h-7 w-72" />
        <div className="flex flex-col gap-5">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </Layout>
    )
  }

  if (loadError) {
    return (
      <Layout>
        <Link to={`/maintenances/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft size={15} aria-hidden="true" />
          Volver al detalle
        </Link>
        <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {loadError}
        </p>
      </Layout>
    )
  }

  const availablePhotoSlots = MAX_PHOTOS - existingPhotos.length

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Volver
      </button>
      <h1 className="mb-6 text-xl font-bold text-foreground">Editar mantenimiento #{id}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Clasificación</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo de mantenimiento" htmlFor="tipo">
              <select id="tipo" className="input" {...register('tipo')}>
                {TIPO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Prioridad" htmlFor="prioridad">
              <select id="prioridad" className="input" {...register('prioridad')}>
                {PRIORIDAD_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Descripción del trabajo</h2>
          <div className="flex flex-col gap-4">
            <Field label="Motivo del mantenimiento" htmlFor="motivo" required
              error={errors.motivo?.message}>
              <textarea
                id="motivo"
                rows={2}
                maxLength={500}
                className="input resize-none"
                {...register('motivo', { required: 'Requerido', maxLength: { value: 500, message: 'Máximo 500 caracteres' } })}
              />
            </Field>
            <Field label="Descripción del problema" htmlFor="descripcion_problema" required
              error={errors.descripcion_problema?.message}>
              <textarea
                id="descripcion_problema"
                rows={3}
                maxLength={5000}
                className="input resize-none"
                {...register('descripcion_problema', { required: 'Requerido', maxLength: { value: 5000, message: 'Máximo 5000 caracteres' } })}
              />
            </Field>
            <Field label="Solución aplicada" htmlFor="solucion" required
              error={errors.solucion?.message}>
              <textarea
                id="solucion"
                rows={3}
                maxLength={5000}
                className="input resize-none"
                {...register('solucion', { required: 'Requerido', maxLength: { value: 5000, message: 'Máximo 5000 caracteres' } })}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Cambio de piezas</h2>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
            <input type="checkbox" {...register('hubo_cambio')} className="h-4 w-4 rounded accent-accent" />
            <span className="text-sm text-foreground">¿Se cambió alguna pieza o componente?</span>
          </label>
          {hubo_cambio && (
            <div className="mt-3">
              <PartsSubform parts={parts} onChange={setParts} />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Evidencia fotográfica · {existingPhotos.length + newPhotos.length}/{MAX_PHOTOS}
          </h2>

          {existingPhotos.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {existingPhotos.map(f => (
                <div key={f.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                  <AuthImage
                    src={`maintenances/${id}/photos/${f.id}`}
                    alt={f.nombre_original}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingPhoto(f.id)}
                    aria-label={`Eliminar ${f.nombre_original}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-danger text-white transition-transform hover:scale-105"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {availablePhotoSlots > 0 ? (
            <PhotoUpload
              files={newPhotos}
              onChange={(files) => setNewPhotos(files.slice(0, availablePhotoSlots))}
            />
          ) : (
            <p className="text-xs text-muted">
              Alcanzaste el máximo de fotos. Elimina alguna para agregar otra.
            </p>
          )}
        </Card>

        {submitError && (
          <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Layout>
  )
}

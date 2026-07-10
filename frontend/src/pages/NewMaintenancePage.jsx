import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Field from '../components/Field'
import Button from '../components/Button'
import QRScanner from '../components/QRScanner'
import AssetInfo from '../components/AssetInfo'
import PartsSubform, { serializeParts } from '../components/PartsSubform'
import PhotoUpload from '../components/PhotoUpload'
import api from '../api/axiosInstance'
import { useAuth } from '../context/AuthContext'
import { DRAFT_KEY, TIPO_OPCIONES, PRIORIDAD_OPCIONES } from '../constants'
import { ArrowLeft, QrCode, AlertCircle, FileClock, ClipboardCheck, CalendarClock } from 'lucide-react'

function SeccionForm({ numero, titulo, children }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        <span className="text-accent">Paso {numero}</span>
        <span className="mx-2 text-border-strong">·</span>
        {titulo}
      </h2>
      {children}
    </Card>
  )
}

export default function NewMaintenancePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      assetCode: '', motivo: '', descripcion_problema: '', solucion: '',
      hubo_cambio: false, tipo: 'correctivo', prioridad: 'media',
      es_orden: false, fecha_programada: '', assigned_to: '',
    },
  })

  const [showScanner, setShowScanner]   = useState(false)
  const [asset, setAsset]               = useState(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [parts, setParts]               = useState([])
  const [photos, setPhotos]             = useState([])
  const [submitError, setSubmitError]   = useState('')
  const [hasDraft, setHasDraft]         = useState(false)
  const [assignables, setAssignables]   = useState([])

  const formValues  = watch()
  const hubo_cambio = formValues.hubo_cambio
  const esOrden     = formValues.es_orden
  const esRevisor   = ['supervisor', 'admin'].includes(user?.rol)

  useEffect(() => {
    if (esRevisor) {
      api.get('/users/assignables').then(res => setAssignables(res.data)).catch(() => {})
    }
  }, [esRevisor])

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const hasData = parsed.assetCode || parsed.motivo || parsed.descripcion_problema || parsed.solucion
        if (hasData) setHasDraft(true)
      } catch { localStorage.removeItem(DRAFT_KEY) }
    }
  }, [])

  useEffect(() => {
    const { assetCode, motivo, descripcion_problema, solucion, hubo_cambio: hc, tipo, prioridad, es_orden, fecha_programada } = formValues
    const hasData = assetCode || motivo || descripcion_problema || solucion
    if (!hasData) return
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        assetCode, motivo, descripcion_problema, solucion,
        hubo_cambio: hc, tipo, prioridad, es_orden, fecha_programada, parts,
      }))
    }, 400)
    return () => clearTimeout(timer)
  }, [formValues, parts])

  function restoreDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY))
      setValue('assetCode',            saved.assetCode            || '')
      setValue('motivo',               saved.motivo               || '')
      setValue('descripcion_problema', saved.descripcion_problema || '')
      setValue('solucion',             saved.solucion             || '')
      setValue('hubo_cambio',          saved.hubo_cambio          || false)
      setValue('tipo',                 saved.tipo                 || 'correctivo')
      setValue('prioridad',            saved.prioridad            || 'media')
      setValue('es_orden',             saved.es_orden             || false)
      setValue('fecha_programada',     saved.fecha_programada     || '')
      if (Array.isArray(saved.parts)) setParts(saved.parts)
      if (saved.assetCode) fetchAsset(saved.assetCode)
    } catch { localStorage.removeItem(DRAFT_KEY) }
    setHasDraft(false)
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  async function fetchAsset(code) {
    if (!code.trim()) return
    setAssetLoading(true)
    setAsset(null)
    try {
      const res = await api.get('/assets/search', { params: { code } })
      setAsset(res.data)
    } catch {
      setAsset({ codigo: code, pendiente_sync: true })
    } finally {
      setAssetLoading(false)
    }
  }

  function handleScan(code) {
    setValue('assetCode', code, { shouldValidate: true })
    setShowScanner(false)
    fetchAsset(code)
  }

  async function onSubmit(data) {
    setSubmitError('')

    if (!data.es_orden && photos.length === 0) {
      setSubmitError('Debes adjuntar al menos 1 foto como evidencia.')
      return
    }
    if (!data.es_orden && !data.solucion.trim()) {
      setSubmitError('Describe la solución aplicada, o crea una orden de trabajo si el trabajo está pendiente.')
      return
    }
    if (data.hubo_cambio && parts.length === 0) {
      setSubmitError('Marcaste cambio de piezas: agrega al menos una pieza.')
      return
    }

    try {
      const payload = {
        assetCode:            data.assetCode,
        motivo:               data.motivo,
        descripcion_problema: data.descripcion_problema,
        tipo:                 data.tipo,
        prioridad:            data.prioridad,
        es_orden:             !!data.es_orden,
        hubo_cambio:          !!data.hubo_cambio,
        partes:               data.hubo_cambio ? serializeParts(parts) : [],
      }
      if (!data.es_orden) payload.solucion = data.solucion
      if (data.es_orden && data.fecha_programada) payload.fecha_programada = data.fecha_programada
      if (data.es_orden && esRevisor && data.assigned_to) payload.assigned_to = parseInt(data.assigned_to, 10)

      const res = await api.post('/maintenances', payload)
      const maintenanceId = res.data.id

      if (photos.length > 0) {
        const formData = new FormData()
        photos.forEach((f) => formData.append('file', f))
        await api.post(`/maintenances/${maintenanceId}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      localStorage.removeItem(DRAFT_KEY)
      navigate(`/maintenances/${maintenanceId}`)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'No se pudo guardar el mantenimiento.')
    }
  }

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Volver
      </button>
      <h1 className="mb-6 text-xl font-bold text-foreground">
        {esOrden ? 'Nueva orden de trabajo' : 'Nuevo mantenimiento'}
      </h1>

      {hasDraft && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <FileClock size={18} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-warning-fg">Tienes un borrador guardado</p>
              <p className="mt-0.5 text-xs text-warning-fg/80">
                Continúa donde lo dejaste o empieza un registro nuevo.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={restoreDraft}>Continuar borrador</Button>
            <Button variant="secondary" onClick={discardDraft}>Descartar</Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Modo: registro de trabajo hecho vs orden por ejecutar */}
        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <label
              className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                !esOrden ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                checked={!esOrden}
                onChange={() => setValue('es_orden', false)}
                className="mt-0.5 h-4 w-4 accent-accent"
                name="modo"
              />
              <span>
                <span className={`flex items-center gap-1.5 text-sm font-medium ${!esOrden ? 'text-accent-soft-fg' : 'text-foreground'}`}>
                  <ClipboardCheck size={15} aria-hidden="true" />
                  Registrar trabajo realizado
                </span>
                <span className={`mt-0.5 block text-xs ${!esOrden ? 'text-accent-soft-fg/80' : 'text-muted'}`}>
                  El trabajo ya se ejecutó; queda pendiente de aprobación.
                </span>
              </span>
            </label>
            <label
              className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                esOrden ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                checked={esOrden}
                onChange={() => setValue('es_orden', true)}
                className="mt-0.5 h-4 w-4 accent-accent"
                name="modo"
              />
              <span>
                <span className={`flex items-center gap-1.5 text-sm font-medium ${esOrden ? 'text-accent-soft-fg' : 'text-foreground'}`}>
                  <CalendarClock size={15} aria-hidden="true" />
                  Crear orden de trabajo
                </span>
                <span className={`mt-0.5 block text-xs ${esOrden ? 'text-accent-soft-fg/80' : 'text-muted'}`}>
                  Trabajo por ejecutar; se completa cuando se realice.
                </span>
              </span>
            </label>
          </div>
        </Card>

        <SeccionForm numero="1" titulo="Activo">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              {...register('assetCode', { required: 'El código de activo es requerido' })}
              placeholder="Código del activo"
              onBlur={(e) => fetchAsset(e.target.value)}
              className="input sm:flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              icon={QrCode}
              onClick={() => setShowScanner(true)}
            >
              Escanear QR
            </Button>
          </div>
          {errors.assetCode && <p className="mt-1.5 text-xs text-danger-fg">{errors.assetCode.message}</p>}
          <div className="mt-3">
            <AssetInfo asset={asset} loading={assetLoading} />
          </div>
        </SeccionForm>

        <SeccionForm numero="2" titulo="Clasificación">
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
            {esOrden && (
              <Field label="Fecha programada" htmlFor="fecha_programada"
                hint="Cuándo debería ejecutarse el trabajo.">
                <input id="fecha_programada" type="date" className="input" {...register('fecha_programada')} />
              </Field>
            )}
            {esOrden && esRevisor && (
              <Field label="Asignar a" htmlFor="assigned_to">
                <select id="assigned_to" className="input" {...register('assigned_to')}>
                  <option value="">Sin asignar</option>
                  {assignables.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </SeccionForm>

        <SeccionForm numero="3" titulo="Descripción del trabajo">
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
            {!esOrden && (
              <Field label="Solución aplicada" htmlFor="solucion" required
                error={errors.solucion?.message}>
                <textarea
                  id="solucion"
                  rows={3}
                  maxLength={5000}
                  className="input resize-none"
                  {...register('solucion', {
                    validate: v => esOrden || !!v.trim() || 'Requerido',
                    maxLength: { value: 5000, message: 'Máximo 5000 caracteres' },
                  })}
                />
              </Field>
            )}
          </div>
        </SeccionForm>

        {!esOrden && (
          <SeccionForm numero="4" titulo="Cambio de piezas">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input type="checkbox" {...register('hubo_cambio')} className="h-4 w-4 rounded accent-accent" />
              <span className="text-sm text-foreground">¿Se cambió alguna pieza o componente?</span>
            </label>
            {hubo_cambio && (
              <div className="mt-3">
                <PartsSubform parts={parts} onChange={setParts} />
              </div>
            )}
          </SeccionForm>
        )}

        <SeccionForm numero={esOrden ? '4' : '5'} titulo={esOrden ? 'Fotos (opcional)' : 'Evidencia fotográfica (mínimo 1)'}>
          <PhotoUpload files={photos} onChange={setPhotos} />
        </SeccionForm>

        {submitError && (
          <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : esOrden ? 'Crear orden de trabajo' : 'Registrar mantenimiento'}
        </Button>
      </form>

      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </Layout>
  )
}

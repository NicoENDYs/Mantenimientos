import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import QRScanner from '../components/QRScanner'
import AssetInfo from '../components/AssetInfo'
import PartsSubform from '../components/PartsSubform'
import PhotoUpload from '../components/PhotoUpload'
import api from '../api/axiosInstance'
import { DRAFT_KEY } from '../constants'

export default function NewMaintenancePage() {
  const navigate = useNavigate()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { assetCode: '', motivo: '', descripcion_problema: '', solucion: '', hubo_cambio: false },
  })

  const [showScanner, setShowScanner]   = useState(false)
  const [asset, setAsset]               = useState(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [parts, setParts]               = useState([])
  const [photos, setPhotos]             = useState([])
  const [submitError, setSubmitError]   = useState('')
  const [hasDraft, setHasDraft]         = useState(false)

  const formValues  = watch()
  const hubo_cambio = formValues.hubo_cambio

  // Detectar borrador al montar
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

  // Autoguardar en localStorage cuando cambia algún campo (debounced 400ms)
  useEffect(() => {
    const { assetCode, motivo, descripcion_problema, solucion, hubo_cambio: hc } = formValues
    const hasData = assetCode || motivo || descripcion_problema || solucion
    if (!hasData) return
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ assetCode, motivo, descripcion_problema, solucion, hubo_cambio: hc, parts }))
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

    if (photos.length === 0) {
      setSubmitError('Debes adjuntar al menos 1 foto')
      return
    }
    if (data.hubo_cambio && parts.length === 0) {
      setSubmitError('Agrega al menos una pieza cambiada')
      return
    }

    try {
      // Crear mantenimiento
      const payload = {
        assetCode:            data.assetCode,
        motivo:               data.motivo,
        descripcion_problema: data.descripcion_problema,
        solucion:             data.solucion,
        hubo_cambio:          !!data.hubo_cambio,
        partes:               data.hubo_cambio ? parts : [],
      }
      const res = await api.post('/maintenances', payload)
      const maintenanceId = res.data.id

      // Subir fotos
      const formData = new FormData()
      photos.forEach((f) => formData.append('file', f))
      await api.post(`/maintenances/${maintenanceId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      localStorage.removeItem(DRAFT_KEY)
      navigate(`/maintenances/${maintenanceId}`)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Error al guardar')
    }
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-sm hover:underline">← Volver</button>
        <h1 className="text-xl font-bold text-gray-800">Nuevo Mantenimiento</h1>
      </div>

      {/* Banner de borrador guardado */}
      {hasDraft && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-800">Tienes un borrador guardado</p>
            <p className="text-xs text-amber-600 mt-0.5">Puedes continuar donde lo dejaste o empezar de cero.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={restoreDraft}
              className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition font-medium"
            >
              Continuar borrador
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="text-sm border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 1. Activo */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-3">1. Activo</h2>
          <div className="flex gap-2 mb-3">
            <input
              {...register('assetCode', { required: 'El código de activo es requerido' })}
              placeholder="Código del activo"
              onBlur={(e) => fetchAsset(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Escanear QR
            </button>
          </div>
          {errors.assetCode && <p className="text-red-500 text-xs mb-2">{errors.assetCode.message}</p>}
          <AssetInfo asset={asset} loading={assetLoading} />
        </section>

        {/* 2. Descripción */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">2. Descripción</h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Motivo del mantenimiento *</label>
            <textarea
              {...register('motivo', { required: 'Requerido', maxLength: { value: 500, message: 'Máximo 500 caracteres' } })}
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.motivo && <p className="text-red-500 text-xs">{errors.motivo.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Descripción del problema *</label>
            <textarea
              {...register('descripcion_problema', { required: 'Requerido', maxLength: { value: 5000, message: 'Máximo 5000 caracteres' } })}
              rows={3}
              maxLength={5000}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.descripcion_problema && <p className="text-red-500 text-xs">{errors.descripcion_problema.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Solución aplicada *</label>
            <textarea
              {...register('solucion', { required: 'Requerido', maxLength: { value: 5000, message: 'Máximo 5000 caracteres' } })}
              rows={3}
              maxLength={5000}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.solucion && <p className="text-red-500 text-xs">{errors.solucion.message}</p>}
          </div>
        </section>

        {/* 3. Cambio de piezas */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-3">3. Cambio de piezas</h2>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              {...register('hubo_cambio')}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700">¿Se cambió alguna pieza o componente?</span>
          </label>
          {hubo_cambio && (
            <PartsSubform parts={parts} onChange={setParts} />
          )}
        </section>

        {/* 4. Fotos */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-3">4. Fotos (mín. 1)</h2>
          <PhotoUpload files={photos} onChange={setPhotos} />
        </section>

        {submitError && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Registrar Mantenimiento'}
        </button>
      </form>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </Layout>
  )
}

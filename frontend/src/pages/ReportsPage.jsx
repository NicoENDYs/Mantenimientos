import { useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axiosInstance'

const ESTADOS = ['', 'borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado']

export default function ReportsPage() {
  const [filters, setFilters] = useState({ fecha_desde: '', fecha_hasta: '', estado: '', asset_code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  function activeParams() {
    return Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  }

  async function download(type) {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/reports/${type}`, {
        params: activeParams(),
        responseType: 'blob',
      })
      const ext  = type === 'excel' ? 'xlsx' : 'pdf'
      const mime = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
      const url  = URL.createObjectURL(new Blob([res.data], { type: mime }))
      const a    = document.createElement('a')
      a.href = url
      a.download = `mantenimientos.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Reportes</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={filters.fecha_desde} onChange={e => setFilter('fecha_desde', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={filters.fecha_hasta} onChange={e => setFilter('fecha_hasta', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select value={filters.estado} onChange={e => setFilter('estado', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {ESTADOS.map(e => <option key={e} value={e}>{e || 'Todos'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código activo</label>
            <input value={filters.asset_code} onChange={e => setFilter('asset_code', e.target.value)}
              placeholder="ABC-001"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => download('excel')}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="text-xl">📊</span>
          <span>Exportar Excel (.xlsx)</span>
        </button>
        <button
          onClick={() => download('pdf')}
          disabled={loading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="text-xl">📄</span>
          <span>Exportar PDF</span>
        </button>
      </div>

      {loading && <p className="text-center text-gray-400 mt-6">Generando reporte...</p>}
    </Layout>
  )
}

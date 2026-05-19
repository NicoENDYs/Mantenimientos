import { useState } from 'react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Button from '../components/Button'
import api from '../api/axiosInstance'
import { FileSpreadsheet, FileText, AlertCircle } from 'lucide-react'

const ESTADO_OPCIONES = [
  { value: '',                     label: 'Todos' },
  { value: 'borrador',             label: 'Borrador' },
  { value: 'pendiente_aprobacion', label: 'Pendiente de aprobación' },
  { value: 'aprobado',             label: 'Aprobado' },
  { value: 'rechazado',            label: 'Rechazado' },
]

export default function ReportsPage() {
  const [filters, setFilters] = useState({ fecha_desde: '', fecha_hasta: '', estado: '', asset_code: '' })
  const [pending, setPending] = useState('') // '' | 'excel' | 'pdf'
  const [error, setError]     = useState('')

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  const dateRangeError =
    filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta
      ? 'La fecha "desde" no puede ser posterior a la fecha "hasta".'
      : ''

  async function download(type) {
    setPending(type)
    setError('')
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      const res = await api.get(`/reports/${type}`, { params, responseType: 'blob' })
      const ext  = type === 'excel' ? 'xlsx' : 'pdf'
      const mime = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = `mantenimientos.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el reporte. Inténtalo de nuevo.')
    } finally {
      setPending('')
    }
  }

  const busy = !!pending

  return (
    <Layout>
      <h1 className="mb-2 text-xl font-bold text-foreground">Reportes</h1>
      <p className="mb-6 text-sm text-muted">
        Filtra los mantenimientos y descarga el consolidado en el formato que necesites.
      </p>

      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Filtros del reporte</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Desde</span>
            <input type="date" value={filters.fecha_desde}
              onChange={e => setFilter('fecha_desde', e.target.value)} className="input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Hasta</span>
            <input type="date" value={filters.fecha_hasta}
              onChange={e => setFilter('fecha_hasta', e.target.value)} className="input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Estado</span>
            <select value={filters.estado}
              onChange={e => setFilter('estado', e.target.value)} className="input">
              {ESTADO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Código de activo</span>
            <input value={filters.asset_code} placeholder="Ej. ABC-001"
              onChange={e => setFilter('asset_code', e.target.value)} className="input" />
          </label>
        </div>
      </Card>

      {(dateRangeError || error) && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {dateRangeError || error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          icon={FileSpreadsheet}
          className="flex-1"
          disabled={busy || !!dateRangeError}
          onClick={() => download('excel')}
        >
          {pending === 'excel' ? 'Generando…' : 'Exportar a Excel (.xlsx)'}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          icon={FileText}
          className="flex-1"
          disabled={busy || !!dateRangeError}
          onClick={() => download('pdf')}
        >
          {pending === 'pdf' ? 'Generando…' : 'Exportar a PDF'}
        </Button>
      </div>
    </Layout>
  )
}

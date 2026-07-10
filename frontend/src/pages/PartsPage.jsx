import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button from '../components/Button'
import api from '../api/axiosInstance'
import {
  Plus, Package, Pencil, ArrowUpDown, AlertCircle, AlertTriangle, Power,
} from 'lucide-react'

const EMPTY_FORM = {
  codigo: '', nombre: '', descripcion: '', stock: 0,
  stock_minimo: 0, costo_unitario: 0, ubicacion: '',
}

export default function PartsPage() {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [q, setQ]                 = useState('')
  const [soloBajoStock, setSoloBajoStock] = useState(false)

  const [formModal, setFormModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [stockModal, setStockModal] = useState(null)
  const [ajuste, setAjuste]       = useState('')
  const [busy, setBusy]           = useState(false)
  const [modalError, setModalError] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (q) params.q = q
      if (soloBajoStock) params.bajo_stock = true
      const res = await api.get('/parts', { params })
      setItems(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el inventario.')
    } finally {
      setLoading(false)
    }
  }, [q, soloBajoStock])

  useEffect(() => {
    const timer = setTimeout(fetchItems, q ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchItems, q])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalError('')
    setFormModal(true)
  }

  function openEdit(part) {
    setEditing(part)
    setForm({
      codigo: part.codigo,
      nombre: part.nombre,
      descripcion: part.descripcion || '',
      stock: part.stock,
      stock_minimo: part.stock_minimo,
      costo_unitario: parseFloat(part.costo_unitario),
      ubicacion: part.ubicacion || '',
    })
    setModalError('')
    setFormModal(true)
  }

  async function handleSave() {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      setModalError('Código y nombre son requeridos.')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      const payload = {
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion,
        stock_minimo: parseInt(form.stock_minimo, 10) || 0,
        costo_unitario: parseFloat(form.costo_unitario) || 0,
        ubicacion: form.ubicacion,
      }
      if (editing) {
        await api.put(`/parts/${editing.id}`, payload)
      } else {
        await api.post('/parts', { ...payload, stock: parseInt(form.stock, 10) || 0 })
      }
      setFormModal(false)
      fetchItems()
    } catch (err) {
      setModalError(err.response?.data?.message || 'No se pudo guardar el repuesto.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdjust() {
    const n = parseInt(ajuste, 10)
    if (!n) {
      setModalError('Ingresa un número distinto de cero (positivo entra, negativo sale).')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      await api.patch(`/parts/${stockModal.id}/stock`, { ajuste: n })
      setStockModal(null)
      setAjuste('')
      fetchItems()
    } catch (err) {
      setModalError(err.response?.data?.message || 'No se pudo ajustar el stock.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(part) {
    try {
      await api.patch(`/parts/${part.id}/toggle`)
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el estado del repuesto.')
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Inventario de repuestos</h1>
        <Button icon={Plus} onClick={openCreate}>
          Nuevo repuesto
        </Button>
      </div>

      <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por código o nombre…"
          className="input sm:max-w-sm"
          aria-label="Buscar repuesto"
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={soloBajoStock}
            onChange={e => setSoloBajoStock(e.target.checked)}
            className="h-4 w-4 rounded accent-accent"
          />
          <span className="text-sm text-foreground">Solo bajo stock mínimo</span>
        </label>
      </Card>

      {error && (
        <p className="mb-4 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">{error}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay repuestos en esta vista"
          message="Registra los repuestos que usa tu operación para controlar stock, recibir alertas de mínimos y costear cada mantenimiento."
          action={<Button icon={Plus} onClick={openCreate}>Nuevo repuesto</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(p => (
            <Card key={p.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  {!p.activo && (
                    <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
                      Inactivo
                    </span>
                  )}
                  {p.activo && p.bajo_stock && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-fg">
                      <AlertTriangle size={11} aria-hidden="true" />
                      Bajo stock mínimo
                    </span>
                  )}
                </div>
                <p className="truncate font-medium text-foreground">
                  {p.codigo} — {p.nombre}
                </p>
                <p className="mt-1 text-xs text-faint">
                  Stock: <span className={`font-semibold ${p.bajo_stock ? 'text-warning-fg' : 'text-foreground'}`}>{p.stock}</span>
                  {' '}· Mínimo: {p.stock_minimo}
                  {parseFloat(p.costo_unitario) > 0 && ` · Costo unitario: $${parseFloat(p.costo_unitario).toFixed(2)}`}
                  {p.ubicacion && ` · ${p.ubicacion}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  icon={ArrowUpDown}
                  onClick={() => { setStockModal(p); setAjuste(''); setModalError('') }}
                >
                  Ajustar stock
                </Button>
                <Button variant="secondary" icon={Pencil} onClick={() => openEdit(p)}>
                  Editar
                </Button>
                <Button variant="secondary" icon={Power} onClick={() => handleToggle(p)}>
                  {p.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar repuesto */}
      {formModal && (
        <Modal
          title={editing ? `Editar ${editing.codigo}` : 'Nuevo repuesto'}
          onClose={() => setFormModal(false)}
          maxWidth="max-w-2xl"
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Código <span className="text-danger-fg">*</span></span>
                <input
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  maxLength={100}
                  placeholder="Ej. REP-0042"
                  className="input"
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Nombre <span className="text-danger-fg">*</span></span>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  maxLength={200}
                  placeholder="Ej. Rodamiento 6205-2RS"
                  className="input"
                />
              </label>
              {!editing && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Stock inicial</span>
                  <input
                    type="number" min="0"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    className="input"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Stock mínimo</span>
                <input
                  type="number" min="0"
                  value={form.stock_minimo}
                  onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Costo unitario</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.costo_unitario}
                  onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value }))}
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Ubicación en bodega</span>
                <input
                  value={form.ubicacion}
                  onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))}
                  maxLength={200}
                  placeholder="Ej. Estante B3"
                  className="input"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Descripción</span>
              <textarea
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={2}
                maxLength={5000}
                className="input resize-none"
              />
            </label>
            {modalError && (
              <p className="flex items-start gap-2 text-sm text-danger-fg">
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                {modalError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFormModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={busy}>
                {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear repuesto'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal ajuste de stock */}
      {stockModal && (
        <Modal title={`Ajustar stock — ${stockModal.nombre}`} onClose={() => setStockModal(null)}>
          <p className="text-sm text-muted">
            Stock actual: <span className="font-semibold text-foreground">{stockModal.stock}</span>.
            Usa un número positivo para entradas y negativo para salidas.
          </p>
          <input
            type="number"
            value={ajuste}
            onChange={e => setAjuste(e.target.value)}
            placeholder="Ej. 10 o -3"
            className="input mt-3"
            autoFocus
          />
          {modalError && <p className="mt-2 text-sm text-danger-fg">{modalError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStockModal(null)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={busy}>
              {busy ? 'Ajustando…' : 'Aplicar ajuste'}
            </Button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

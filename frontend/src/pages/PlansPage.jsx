import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import PriorityBadge from '../components/PriorityBadge'
import TypeBadge from '../components/TypeBadge'
import Button from '../components/Button'
import api from '../api/axiosInstance'
import { PRIORIDAD_OPCIONES, TIPO_OPCIONES } from '../constants'
import {
  Plus, CalendarClock, Pencil, Pause, Play, Zap, AlertCircle, AlertTriangle,
} from 'lucide-react'

const EMPTY_FORM = {
  assetCode: '', titulo: '', descripcion: '', tipo: 'preventivo',
  prioridad: 'media', frecuencia_dias: 30, proxima_fecha: '', assigned_to: '',
}

export default function PlansPage() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')

  const [formModal, setFormModal] = useState(false)
  const [editing, setEditing]     = useState(null) // plan en edición o null (nuevo)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [assignables, setAssignables] = useState([])
  const [busy, setBusy]           = useState(false)
  const [modalError, setModalError] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/plans')
      setItems(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los planes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    api.get('/users/assignables').then(res => setAssignables(res.data)).catch(() => {})
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalError('')
    setFormModal(true)
  }

  function openEdit(plan) {
    setEditing(plan)
    setForm({
      assetCode: plan.asset_codigo,
      titulo: plan.titulo,
      descripcion: plan.descripcion || '',
      tipo: plan.tipo,
      prioridad: plan.prioridad,
      frecuencia_dias: plan.frecuencia_dias,
      proxima_fecha: plan.proxima_fecha?.slice(0, 10) || '',
      assigned_to: plan.assigned_to ? String(plan.assigned_to) : '',
    })
    setModalError('')
    setFormModal(true)
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.proxima_fecha || !form.frecuencia_dias) {
      setModalError('Título, frecuencia y próxima fecha son requeridos.')
      return
    }
    if (!editing && !form.assetCode.trim()) {
      setModalError('El código de activo es requerido.')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion,
        tipo: form.tipo,
        prioridad: form.prioridad,
        frecuencia_dias: parseInt(form.frecuencia_dias, 10),
        proxima_fecha: form.proxima_fecha,
      }
      if (form.assigned_to) payload.assigned_to = parseInt(form.assigned_to, 10)

      if (editing) {
        await api.put(`/plans/${editing.id}`, payload)
      } else {
        await api.post('/plans', { ...payload, assetCode: form.assetCode })
      }
      setFormModal(false)
      fetchItems()
    } catch (err) {
      setModalError(err.response?.data?.message || 'No se pudo guardar el plan.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(plan) {
    try {
      await api.patch(`/plans/${plan.id}/toggle`)
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el estado del plan.')
    }
  }

  async function handleGenerate() {
    setError('')
    setNotice('')
    try {
      const res = await api.post('/plans/generate')
      setNotice(res.data.generadas > 0
        ? `Se generaron ${res.data.generadas} orden(es) de trabajo a partir de planes vencidos.`
        : 'No hay planes vencidos sin orden abierta: nada que generar.')
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron generar las órdenes.')
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Planes preventivos</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Zap} onClick={handleGenerate}>
            Generar órdenes vencidas
          </Button>
          <Button icon={Plus} onClick={openCreate}>
            Nuevo plan
          </Button>
        </div>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-muted">
        Cada plan genera automáticamente una orden de trabajo cuando llega su fecha,
        y reprograma la siguiente según la frecuencia definida.
      </p>

      {notice && (
        <p className="mb-4 rounded-md bg-success-soft px-3 py-2.5 text-sm text-success-fg">{notice}</p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">{error}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aún no hay planes preventivos"
          message="Define la primera rutina: qué activo, qué tarea y cada cuántos días. SIGMAN se encargará de abrir las órdenes a tiempo."
          action={<Button icon={Plus} onClick={openCreate}>Nuevo plan</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(p => (
            <Card key={p.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  {!p.activo && (
                    <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
                      Pausado
                    </span>
                  )}
                  {p.vencido && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-fg">
                      <AlertTriangle size={11} aria-hidden="true" />
                      Vencido
                    </span>
                  )}
                  <TypeBadge tipo={p.tipo} />
                  <PriorityBadge prioridad={p.prioridad} />
                </div>
                <p className="truncate font-medium text-foreground">{p.titulo}</p>
                <p className="truncate text-sm text-muted">
                  {p.asset_codigo} — {p.asset_nombre || 'Sin nombre'}
                </p>
                <p className="mt-1 text-xs text-faint">
                  Cada {p.frecuencia_dias} día{p.frecuencia_dias !== 1 ? 's' : ''} ·
                  Próxima: {new Date(p.proxima_fecha).toLocaleDateString('es-CO')}
                  {p.asignado_nombre && ` · Asignado a ${p.asignado_nombre}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" icon={Pencil} onClick={() => openEdit(p)}>
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  icon={p.activo ? Pause : Play}
                  onClick={() => handleToggle(p)}
                >
                  {p.activo ? 'Pausar' : 'Activar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar plan */}
      {formModal && (
        <Modal
          title={editing ? `Editar plan #${editing.id}` : 'Nuevo plan preventivo'}
          onClose={() => setFormModal(false)}
          maxWidth="max-w-2xl"
        >
          <div className="flex flex-col gap-3">
            {!editing && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Código del activo <span className="text-danger-fg">*</span></span>
                <input
                  value={form.assetCode}
                  onChange={e => setForm(f => ({ ...f, assetCode: e.target.value }))}
                  placeholder="Ej. ABC-001"
                  className="input"
                  autoFocus
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Título de la tarea <span className="text-danger-fg">*</span></span>
              <input
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                maxLength={200}
                placeholder="Ej. Lubricación general y revisión de correas"
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Descripción / checklist</span>
              <textarea
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={3}
                maxLength={5000}
                placeholder="Pasos o puntos a revisar en cada ejecución…"
                className="input resize-none"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Tipo</span>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="input"
                >
                  {TIPO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Prioridad</span>
                <select
                  value={form.prioridad}
                  onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                  className="input"
                >
                  {PRIORIDAD_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Frecuencia (días) <span className="text-danger-fg">*</span></span>
                <input
                  type="number" min="1" max="3650"
                  value={form.frecuencia_dias}
                  onChange={e => setForm(f => ({ ...f, frecuencia_dias: e.target.value }))}
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Próxima ejecución <span className="text-danger-fg">*</span></span>
                <input
                  type="date"
                  value={form.proxima_fecha}
                  onChange={e => setForm(f => ({ ...f, proxima_fecha: e.target.value }))}
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-foreground">Asignar por defecto a</span>
                <select
                  value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin asignar</option>
                  {assignables.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
                </select>
              </label>
            </div>
            {modalError && (
              <p className="flex items-start gap-2 text-sm text-danger-fg">
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                {modalError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFormModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={busy}>
                {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear plan'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

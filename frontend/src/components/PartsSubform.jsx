import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../api/axiosInstance'

/** Deja cada pieza con solo los campos que acepta la API (sin part_id nulo). */
export function serializeParts(parts) {
  return parts.map(({ part_id, descripcion, cantidad }) =>
    part_id ? { part_id, descripcion, cantidad } : { descripcion, cantidad }
  )
}

/**
 * Subformulario de piezas usadas. Cada fila puede tomarse del catálogo
 * de repuestos (descuenta stock y hereda el costo) o escribirse libre.
 */
export default function PartsSubform({ parts, onChange }) {
  const [catalog, setCatalog] = useState([])

  useEffect(() => {
    api.get('/parts', { params: { activo: true } })
      .then(res => setCatalog(res.data))
      .catch(() => setCatalog([]))
  }, [])

  function add() {
    onChange([...parts, { part_id: null, descripcion: '', cantidad: 1 }])
  }

  function remove(index) {
    onChange(parts.filter((_, i) => i !== index))
  }

  function update(index, patch) {
    onChange(parts.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function selectPart(index, value) {
    if (!value) {
      update(index, { part_id: null })
      return
    }
    const part = catalog.find(c => c.id === parseInt(value, 10))
    if (part) update(index, { part_id: part.id, descripcion: part.nombre })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {parts.map((part, i) => {
        const invalid = !part.part_id && !part.descripcion.trim()
        const catalogPart = part.part_id ? catalog.find(c => c.id === part.part_id) : null
        return (
          <div key={i} className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3">
            <div className="flex items-start gap-2">
              {catalog.length > 0 && (
                <select
                  value={part.part_id || ''}
                  onChange={(e) => selectPart(i, e.target.value)}
                  aria-label="Repuesto de catálogo"
                  className="input sm:max-w-56"
                >
                  <option value="">Texto libre…</option>
                  {catalog.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nombre}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Descripción de la pieza"
                  value={part.descripcion}
                  onChange={(e) => update(i, { descripcion: e.target.value })}
                  aria-invalid={invalid}
                  className="input"
                  style={invalid ? { borderColor: 'var(--danger)' } : undefined}
                />
                {invalid && (
                  <p className="mt-1 text-xs text-danger-fg">Descripción requerida</p>
                )}
              </div>
              <input
                type="number"
                min="1"
                aria-label="Cantidad"
                value={part.cantidad}
                onChange={(e) => update(i, { cantidad: parseInt(e.target.value, 10) || 1 })}
                className="input w-20 shrink-0"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Eliminar pieza"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted
                  transition-colors hover:bg-danger-soft hover:text-danger-fg"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {catalogPart && (
              <p className={`text-xs ${catalogPart.stock < part.cantidad ? 'text-danger-fg' : 'text-muted'}`}>
                Stock disponible: {catalogPart.stock}
                {catalogPart.costo_unitario > 0 && ` · Costo unitario: $${parseFloat(catalogPart.costo_unitario).toFixed(2)}`}
                {catalogPart.stock < part.cantidad && ' — cantidad supera el stock'}
              </p>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 self-start rounded-md py-1.5 text-sm
          font-medium text-accent transition-colors hover:underline"
      >
        <Plus size={16} aria-hidden="true" />
        Agregar pieza
      </button>
    </div>
  )
}

import { Plus, Trash2 } from 'lucide-react'

export default function PartsSubform({ parts, onChange }) {
  function add() {
    onChange([...parts, { descripcion: '', cantidad: 1 }])
  }

  function remove(index) {
    onChange(parts.filter((_, i) => i !== index))
  }

  function update(index, field, value) {
    onChange(parts.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  return (
    <div className="flex flex-col gap-2.5">
      {parts.map((part, i) => {
        const invalid = !part.descripcion.trim()
        return (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Descripción de la pieza"
                value={part.descripcion}
                onChange={(e) => update(i, 'descripcion', e.target.value)}
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
              onChange={(e) => update(i, 'cantidad', parseInt(e.target.value, 10) || 1)}
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

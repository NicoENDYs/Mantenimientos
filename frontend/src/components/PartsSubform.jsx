export default function PartsSubform({ parts, onChange }) {
  function add() {
    onChange([...parts, { descripcion: '', cantidad: 1 }])
  }

  function remove(index) {
    onChange(parts.filter((_, i) => i !== index))
  }

  function update(index, field, value) {
    onChange(parts.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  return (
    <div className="space-y-2">
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Descripción de la pieza"
            value={part.descripcion}
            onChange={(e) => update(i, 'descripcion', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min="1"
            value={part.cantidad}
            onChange={(e) => update(i, 'cantidad', parseInt(e.target.value, 10) || 1)}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-red-500 hover:text-red-700 text-lg leading-none px-1"
            title="Eliminar pieza"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Agregar pieza
      </button>
    </div>
  )
}

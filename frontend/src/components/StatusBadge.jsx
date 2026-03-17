const CONFIG = {
  borrador:             { label: 'Borrador',              className: 'bg-gray-100 text-gray-700' },
  pendiente_aprobacion: { label: 'Pendiente aprobación',  className: 'bg-yellow-100 text-yellow-800' },
  aprobado:             { label: 'Aprobado',              className: 'bg-green-100 text-green-800' },
  rechazado:            { label: 'Rechazado',             className: 'bg-red-100 text-red-800' },
}

export default function StatusBadge({ estado }) {
  const { label, className } = CONFIG[estado] || { label: estado, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

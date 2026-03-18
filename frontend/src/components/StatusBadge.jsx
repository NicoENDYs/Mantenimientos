import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react'

const CONFIG = {
  pendiente_aprobacion: { label: 'Pendiente aprobación', className: 'bg-yellow-100 text-yellow-800', Icon: Clock       },
  aprobado:             { label: 'Aprobado',             className: 'bg-green-100 text-green-800',  Icon: CheckCircle },
  rechazado:            { label: 'Rechazado',            className: 'bg-red-100 text-red-800',      Icon: XCircle     },
}

export default function StatusBadge({ estado }) {
  const { label, className, Icon } = CONFIG[estado] || { label: estado, className: 'bg-gray-100 text-gray-700', Icon: FileText }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  )
}

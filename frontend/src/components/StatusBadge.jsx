import { FileText, Clock, CheckCircle2, XCircle } from 'lucide-react'

/*
 * Los estados de mantenimiento son indicadores funcionales de dato:
 * el color codifica información (no es decoración), por lo que se
 * permite el uso de los tres colores semánticos simultáneamente.
 */
const CONFIG = {
  borrador:             { label: 'Borrador',   cls: 'bg-surface-2 text-muted',          Icon: FileText    },
  pendiente_aprobacion: { label: 'Pendiente',  cls: 'bg-warning-soft text-warning-fg',  Icon: Clock       },
  aprobado:             { label: 'Aprobado',   cls: 'bg-success-soft text-success-fg',  Icon: CheckCircle2 },
  rechazado:            { label: 'Rechazado',  cls: 'bg-danger-soft text-danger-fg',    Icon: XCircle     },
}

export default function StatusBadge({ estado }) {
  const { label, cls, Icon } =
    CONFIG[estado] || { label: estado, cls: 'bg-surface-2 text-muted', Icon: FileText }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1
        text-xs font-medium whitespace-nowrap ${cls}`}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  )
}

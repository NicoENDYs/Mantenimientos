import { PRIORIDAD_LABEL } from '../constants'

/*
 * Prioridad como punto de color + texto (indicador funcional de dato,
 * no decoración): baja/media en neutros, alta en warning, crítica en danger.
 */
const DOT = {
  baja:    'bg-faint',
  media:   'bg-accent',
  alta:    'bg-warning',
  critica: 'bg-danger',
}

export default function PriorityBadge({ prioridad }) {
  if (!prioridad) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground whitespace-nowrap">
      <span className={`h-2 w-2 rounded-full ${DOT[prioridad] || 'bg-faint'}`} aria-hidden="true" />
      {PRIORIDAD_LABEL[prioridad] || prioridad}
    </span>
  )
}

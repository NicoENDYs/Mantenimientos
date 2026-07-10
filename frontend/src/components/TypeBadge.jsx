import { TIPO_LABEL } from '../constants'

/** Tipo de mantenimiento como etiqueta de texto neutra. */
export default function TypeBadge({ tipo }) {
  if (!tipo) return null
  return (
    <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted whitespace-nowrap">
      {TIPO_LABEL[tipo] || tipo}
    </span>
  )
}

/**
 * Estado vacío: visual + mensaje cálido + acción opcional.
 * Alineado a la izquierda, coherente con el resto del contenido.
 */
export default function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-xl border border-dashed border-border
        bg-surface px-6 py-10 ${className}`}
    >
      {Icon && (
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-surface-2 text-faint">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <div className="max-w-sm">
        <p className="font-medium text-foreground">{title}</p>
        {message && <p className="mt-1 text-sm text-muted">{message}</p>}
      </div>
      {action}
    </div>
  )
}

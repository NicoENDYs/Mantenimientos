/**
 * Envoltura de campo de formulario: etiqueta + control + ayuda/error.
 * El control se pasa como children (usa la clase `.input` para inputs).
 */
export default function Field({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-danger-fg"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger-fg">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Superficie elevada para agrupar contenido.
 * La separación entre cards se logra por superficie + sombra, no por
 * bordes de acento. El padding lo define cada consumidor.
 */
export default function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag
      className={`rounded-xl border border-border bg-surface shadow-card ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

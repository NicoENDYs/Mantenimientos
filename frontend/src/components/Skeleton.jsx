/**
 * Bloque de carga con shimmer. Componer varios para construir
 * el esqueleto de una vista mientras llegan los datos.
 *
 *   <Skeleton className="h-6 w-40" />
 *   <Skeleton className="h-32 w-full rounded-xl" />
 */
export default function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

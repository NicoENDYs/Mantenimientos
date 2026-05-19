import { CloudOff } from 'lucide-react'

export default function AssetInfo({ asset, loading }) {
  if (loading) {
    return (
      <div className="rounded-lg bg-surface-2 p-4 text-sm text-muted">
        Consultando datos del activo…
      </div>
    )
  }
  if (!asset) return null

  if (asset.pendiente_sync) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg bg-warning-soft p-4 text-sm text-warning-fg">
        <CloudOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          La API de activos no respondió. El registro se creará con el código{' '}
          <strong>{asset.codigo}</strong> y se sincronizará después.
        </p>
      </div>
    )
  }

  const campos = [
    ['Código', <strong key="c">{asset.codigo}</strong>],
    ['Nombre', asset.nombre || '—'],
    ['Tipo', asset.tipo || '—'],
    ['Ubicación', asset.ubicacion || '—'],
  ]

  return (
    <div className="rounded-lg bg-surface-2 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Datos del activo · solo lectura
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {campos.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

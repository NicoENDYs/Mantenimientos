export default function AssetInfo({ asset, loading }) {
  if (loading) {
    return (
      <div className="border border-blue-100 bg-blue-50 rounded-lg p-4 text-sm text-blue-600">
        Consultando activo...
      </div>
    )
  }
  if (!asset) return null

  if (asset.pendiente_sync) {
    return (
      <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 text-sm text-orange-700">
        API de activos no disponible. El registro se creará con código <strong>{asset.codigo}</strong> y se sincronizará después.
      </div>
    )
  }

  return (
    <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Datos del activo (solo lectura)</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Código:</span> <strong>{asset.codigo}</strong></div>
        <div><span className="text-gray-500">Nombre:</span> {asset.nombre || '-'}</div>
        <div><span className="text-gray-500">Tipo:</span> {asset.tipo || '-'}</div>
        <div><span className="text-gray-500">Ubicación:</span> {asset.ubicacion || '-'}</div>
      </div>
    </div>
  )
}

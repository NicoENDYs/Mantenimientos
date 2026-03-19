import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const divId = 'qr-reader-container'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const scanner = new Html5Qrcode(divId)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scanner.stop().catch(() => {})
        onScan(decodedText)
      },
      () => {} // errores por frame (QR no detectado aún) — esperados, no mostrar
    ).catch((err) => {
      const msg = err?.message?.includes('Permission')
        ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
        : 'No se pudo acceder a la cámara. Verifica que no esté en uso por otra app.'
      setErrorMsg(msg)
    })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Escanear código</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        {errorMsg ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <p className="font-medium mb-1">Error al iniciar la cámara</p>
            <p>{errorMsg}</p>
            <button onClick={onClose} className="mt-3 text-xs underline text-red-600">Cerrar</button>
          </div>
        ) : (
          <>
            <div id={divId} className="w-full rounded-lg overflow-hidden" />
            <p className="text-xs text-gray-400 mt-3 text-center">Apunta la cámara al QR o código de barras</p>
          </>
        )}
      </div>
    </div>
  )
}

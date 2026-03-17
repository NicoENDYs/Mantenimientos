import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const divId = 'qr-reader-container'

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
      () => {} // error silencioso por frame
    ).catch((err) => {
      console.error('QR scanner error:', err)
      onClose()
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
        <div id={divId} className="w-full rounded-lg overflow-hidden" />
        <p className="text-xs text-gray-400 mt-3 text-center">Apunta la cámara al QR o código de barras</p>
      </div>
    </div>
  )
}

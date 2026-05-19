import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { AlertCircle } from 'lucide-react'
import Modal from './Modal'

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
      () => {} // errores por frame (QR aún no detectado) — esperados, no mostrar
    ).catch((err) => {
      setErrorMsg(
        err?.message?.includes('Permission')
          ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
          : 'No se pudo acceder a la cámara. Verifica que no esté en uso por otra app.'
      )
    })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <Modal title="Escanear código" onClose={onClose} maxWidth="max-w-sm">
      {errorMsg ? (
        <div className="flex items-start gap-2.5 rounded-md bg-danger-soft p-3 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">No se pudo iniciar la cámara</p>
            <p className="mt-1">{errorMsg}</p>
          </div>
        </div>
      ) : (
        <>
          <div id={divId} className="w-full overflow-hidden rounded-lg bg-surface-2" />
          <p className="mt-3 text-xs text-muted">
            Apunta la cámara al código QR o de barras del activo.
          </p>
        </>
      )}
    </Modal>
  )
}

import { useState, useEffect } from 'react'
import api from '../api/axiosInstance'

/**
 * Descarga una imagen autenticada y retorna un object URL temporal.
 * Se revoca automáticamente al desmontar.
 */
export function useAuthImage(url) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (!url) return
    let objectUrl = null

    api.get(url, { responseType: 'blob' })
      .then(res => {
        objectUrl = URL.createObjectURL(res.data)
        setSrc(objectUrl)
      })
      .catch(() => setSrc(null))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  return src
}

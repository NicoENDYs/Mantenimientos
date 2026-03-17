import { useAuthImage } from '../hooks/useAuthImage'

export default function AuthImage({ src, alt, className }) {
  const blobSrc = useAuthImage(src)

  if (!blobSrc) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-400 text-xs ${className}`}>
        Cargando...
      </div>
    )
  }

  return <img src={blobSrc} alt={alt} className={className} />
}

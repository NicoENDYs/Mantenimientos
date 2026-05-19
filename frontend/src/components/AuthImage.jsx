import { useAuthImage } from '../hooks/useAuthImage'

export default function AuthImage({ src, alt, className }) {
  const blobSrc = useAuthImage(src)

  if (!blobSrc) {
    return <div className={`skeleton ${className}`} aria-hidden="true" />
  }

  return <img src={blobSrc} alt={alt} className={className} />
}

import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { MAX_FOTOS, MAX_FILE_SIZE } from '../constants'

const MAX_FILES = MAX_FOTOS
const MAX_SIZE  = MAX_FILE_SIZE
const ALLOWED   = ['image/jpeg', 'image/png', 'image/webp']

export default function PhotoUpload({ files, onChange }) {
  const inputRef = useRef()
  const [photoErrors, setPhotoErrors] = useState([])

  function handleChange(e) {
    const selected = Array.from(e.target.files)
    const errors = []

    const valid = selected.filter(f => {
      if (!ALLOWED.includes(f.type)) { errors.push(`${f.name}: tipo de archivo no permitido`); return false }
      if (f.size > MAX_SIZE)         { errors.push(`${f.name}: supera el límite de 5 MB`);     return false }
      return true
    })

    setPhotoErrors(errors)
    onChange([...files, ...valid].slice(0, MAX_FILES))
    e.target.value = ''
  }

  function remove(index) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {files.map((f, i) => (
          <div
            key={i}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
          >
            <img
              src={URL.createObjectURL(f)}
              alt={f.name}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Quitar ${f.name}`}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full
                bg-danger text-white transition-transform hover:scale-105"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {files.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg
              border border-dashed border-border-strong text-muted transition-colors
              hover:border-accent hover:text-accent"
          >
            <ImagePlus size={20} aria-hidden="true" />
            <span className="text-xs font-medium">Foto</span>
          </button>
        )}
      </div>

      {photoErrors.length > 0 && (
        <div className="mt-2 flex flex-col gap-0.5 rounded-md bg-danger-soft p-3 text-sm text-danger-fg">
          {photoErrors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <p className="mt-1.5 text-xs text-muted">
        {files.length}/{MAX_FILES} fotos · JPG, PNG o WEBP · máximo 5 MB cada una
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}

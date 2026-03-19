import { useRef, useState } from 'react'
import { MAX_FOTOS, MAX_FILE_SIZE } from '../constants'

const MAX_FILES  = MAX_FOTOS
const MAX_SIZE   = MAX_FILE_SIZE
const ALLOWED    = ['image/jpeg', 'image/png', 'image/webp']

export default function PhotoUpload({ files, onChange }) {
  const inputRef = useRef()
  const [photoErrors, setPhotoErrors] = useState([])

  function handleChange(e) {
    const selected = Array.from(e.target.files)
    const errors = []

    const valid = selected.filter(f => {
      if (!ALLOWED.includes(f.type)) { errors.push(`${f.name}: tipo no permitido`); return false }
      if (f.size > MAX_SIZE)          { errors.push(`${f.name}: excede 5 MB`);        return false }
      return true
    })

    setPhotoErrors(errors)

    const combined = [...files, ...valid].slice(0, MAX_FILES)
    onChange(combined)
    e.target.value = ''
  }

  function remove(index) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-2">
        {files.map((f, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={URL.createObjectURL(f)}
              alt={f.name}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs leading-none flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        {files.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition text-xs"
          >
            <span className="text-2xl leading-none">+</span>
            Foto
          </button>
        )}
      </div>
      {photoErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mt-2 space-y-0.5">
          {photoErrors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">{files.length}/{MAX_FILES} fotos · JPG, PNG, WEBP · máx 5 MB c/u</p>
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

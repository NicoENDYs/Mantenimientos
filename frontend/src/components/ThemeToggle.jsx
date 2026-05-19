import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

const STORAGE_KEY = 'sigman-theme'

function getInitialTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/**
 * Alterna entre tema claro y oscuro.
 * El tema inicial lo resuelve el script de index.html (preferencia
 * guardada o `prefers-color-scheme`); aquí solo se conmuta y persiste.
 */
export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* localStorage no disponible — el cambio sigue aplicando en sesión */
    }
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-muted
        transition-colors hover:bg-surface-2 hover:text-foreground ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import Button from '../components/Button'
import Field from '../components/Field'
import ThemeToggle from '../components/ThemeToggle'
import {
  Wrench, Eye, EyeOff, AlertCircle,
  Camera, ClipboardCheck, FileSpreadsheet,
} from 'lucide-react'

const CAPACIDADES = [
  { Icon: Camera,          text: 'Registro de intervenciones con fotos y repuestos' },
  { Icon: ClipboardCheck,  text: 'Aprobación en línea: del técnico al supervisor' },
  { Icon: FileSpreadsheet, text: 'Reportes exportables en Excel y PDF' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()

  async function onSubmit(data) {
    setError('')
    try {
      const res = await api.post('/auth/login', data)
      login(res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos iniciar sesión. Verifica tus datos.')
    }
  }

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[1.05fr_minmax(0,1fr)]">
      {/* Panel de marca — escritorio */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-bg p-12 lg:flex xl:p-16">
        <div className="dot-grid absolute inset-0 opacity-70" aria-hidden="true" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-fg">
            <Wrench size={20} aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            SIGMAN
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground xl:text-4xl">
            El mantenimiento de tus equipos, registrado y aprobado sin papeles.
          </h1>
          <p className="mt-5 text-base text-muted">
            Los técnicos documentan cada intervención; los supervisores
            revisan, aprueban y exportan. Todo el historial en un solo lugar.
          </p>
        </div>

        <ul className="relative flex flex-col gap-3.5 border-t border-border pt-6">
          {CAPACIDADES.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-muted">
              <Icon size={18} className="shrink-0 text-accent" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </aside>

      {/* Panel de formulario */}
      <main className="relative flex min-h-screen flex-col px-6 py-10 sm:px-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="m-auto w-full max-w-sm">
          {/* Marca compacta — solo móvil */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-fg">
              <Wrench size={18} aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
              SIGMAN
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Iniciar sesión
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Accede con la cuenta que te asignó tu administrador.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-4">
            <Field label="Correo electrónico" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="usuario@empresa.com"
                {...register('email', { required: true })}
              />
            </Field>

            <Field label="Contraseña" htmlFor="password">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-11"
                  placeholder="••••••••"
                  {...register('password', { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted transition-colors hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

          <a
            href="/recover"
            className="mt-5 inline-block rounded-sm text-sm font-medium text-accent hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </main>
    </div>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Field from '../components/Field'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', admin: 'Administrador' }

function PasswordField({ label, id, registration, error }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} htmlFor={id} required error={error}>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="input pr-11"
          {...registration}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted transition-colors hover:text-foreground"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  async function onSubmit(data) {
    setError('')
    setSuccess('')
    if (data.newPassword !== data.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    try {
      await api.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setSuccess('Tu contraseña se actualizó correctamente.')
      reset()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar la contraseña.')
    }
  }

  return (
    <Layout>
      <div className="max-w-md">
        <h1 className="mb-6 text-xl font-bold text-foreground">Mi perfil</h1>

        <Card className="mb-5 flex items-center gap-4 p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-2 text-lg font-semibold text-muted">
            {user?.nombre?.charAt(0)?.toUpperCase() || '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">{user?.nombre}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
              {ROL_LABEL[user?.rol]}
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Cambiar contraseña</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <PasswordField
              label="Contraseña actual"
              id="currentPassword"
              registration={register('currentPassword', { required: 'Requerida' })}
              error={errors.currentPassword?.message}
            />
            <PasswordField
              label="Nueva contraseña"
              id="newPassword"
              registration={register('newPassword', {
                required: 'Requerida',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
              error={errors.newPassword?.message}
            />
            <PasswordField
              label="Confirmar nueva contraseña"
              id="confirmPassword"
              registration={register('confirmPassword', { required: 'Requerida' })}
              error={errors.confirmPassword?.message}
            />

            {error && (
              <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            {success && (
              <p className="flex items-start gap-2 rounded-md bg-success-soft px-3 py-2.5 text-sm text-success-fg">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {success}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Actualizar contraseña'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  )
}

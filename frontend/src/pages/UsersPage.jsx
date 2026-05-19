import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Field from '../components/Field'
import Skeleton from '../components/Skeleton'
import Button from '../components/Button'
import api from '../api/axiosInstance'
import { Plus, X, AlertCircle, CheckCircle2, LockOpen } from 'lucide-react'

const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', admin: 'Administrador' }

export default function UsersPage() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [pwModal, setPwModal]   = useState(null) // usuario en edición de contraseña
  const [pwError, setPwError]   = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()
  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { isSubmitting: pwSubmitting } } = useForm()

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function onCreate(data) {
    try {
      await api.post('/users', data)
      reset()
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el usuario.')
    }
  }

  async function handleToggle(id) {
    try {
      await api.patch(`/users/${id}/toggle`)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el estado del usuario.')
    }
  }

  async function handleUnlock(id) {
    try {
      await api.patch(`/users/${id}/unlock`)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo desbloquear el usuario.')
    }
  }

  function openPwPanel(u) {
    setPwModal(pwModal?.id === u.id ? null : u)
    setPwError('')
    setPwSuccess('')
    resetPw()
  }

  async function onChangePassword(data) {
    setPwError('')
    setPwSuccess('')
    try {
      await api.put(`/users/${pwModal.id}`, { nombre: pwModal.nombre, password: data.newPassword })
      setPwSuccess('Contraseña actualizada.')
      resetPw()
    } catch (err) {
      setPwError(err.response?.data?.message || 'No se pudo cambiar la contraseña.')
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground">Usuarios</h1>
        <Button
          icon={showForm ? X : Plus}
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => setShowForm(s => !s)}
        >
          {showForm ? 'Cancelar' : 'Nuevo usuario'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Crear usuario</h2>
          <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nombre" htmlFor="u-nombre" required
                error={errors.nombre && 'El nombre es requerido'}>
                <input id="u-nombre" maxLength={100} className="input"
                  {...register('nombre', { required: true, maxLength: 100 })} />
              </Field>
              <Field label="Correo electrónico" htmlFor="u-email" required>
                <input id="u-email" type="email" className="input"
                  {...register('email', { required: true })} />
              </Field>
              <Field label="Contraseña" htmlFor="u-password" required
                error={errors.password && 'Mínimo 8 caracteres'}>
                <input id="u-password" type="password" className="input"
                  {...register('password', { required: true, minLength: 8 })} />
              </Field>
              <Field label="Rol" htmlFor="u-rol">
                <select id="u-rol" className="input" {...register('rol')}>
                  <option value="tecnico">Técnico</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              </Field>
            </div>
            {error && (
              <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="self-start">
              {isSubmitting ? 'Guardando…' : 'Crear usuario'}
            </Button>
          </form>
        </Card>
      )}

      {error && !showForm && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map(u => {
            const bloqueado = u.login_intentos >= 5
            return (
              <Card key={u.id} className="flex flex-col gap-3 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{u.nombre}</p>
                    <p className="truncate text-sm text-muted">{u.email}</p>
                    <p className="mt-0.5 text-xs text-faint">{ROL_LABEL[u.rol]}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.activo ? 'bg-success-soft text-success-fg' : 'bg-surface-2 text-muted'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {bloqueado && (
                      <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger-fg">
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {bloqueado && (
                    <Button variant="secondary" icon={LockOpen} onClick={() => handleUnlock(u.id)}>
                      Desbloquear
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => openPwPanel(u)}>
                    Cambiar contraseña
                  </Button>
                  <Button variant="secondary" onClick={() => handleToggle(u.id)}>
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>

                {pwModal?.id === u.id && (
                  <form
                    onSubmit={handlePw(onChangePassword)}
                    className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-end"
                  >
                    <div className="flex-1">
                      <label htmlFor={`pw-${u.id}`} className="text-xs font-medium text-muted">
                        Nueva contraseña para {u.nombre}
                      </label>
                      <input
                        id={`pw-${u.id}`}
                        type="password"
                        className="input mt-1"
                        placeholder="Mínimo 8 caracteres"
                        {...regPw('newPassword', { required: 'Requerida', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
                      />
                      {pwError && <p className="mt-1 text-xs text-danger-fg">{pwError}</p>}
                      {pwSuccess && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-success-fg">
                          <CheckCircle2 size={13} aria-hidden="true" />
                          {pwSuccess}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={pwSubmitting}>
                        {pwSubmitting ? 'Guardando…' : 'Guardar'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setPwModal(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

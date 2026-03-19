import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import api from '../api/axiosInstance'

const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', admin: 'Administrador' }

export default function UsersPage() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar usuarios')
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
      setError(err.response?.data?.message || 'Error al crear usuario')
    }
  }

  async function handleToggle(id) {
    try {
      await api.patch(`/users/${id}/toggle`)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar estado del usuario')
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Usuarios</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onCreate)} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-700 mb-1">Crear usuario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input {...register('nombre', { required: true, maxLength: 100 })}
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              {errors.nombre && <p className="text-red-500 text-xs">Requerido</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" {...register('email', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña</label>
              <input type="password" {...register('password', { required: true, minLength: 8 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              {errors.password && <p className="text-red-500 text-xs">Mín. 8 caracteres</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol</label>
              <select {...register('rol')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="tecnico">Técnico</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={isSubmitting}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Crear usuario'}
          </button>
        </form>
      )}

      {error && !showForm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{error}</div>
      )}
      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-800">{u.nombre}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ROL_LABEL[u.rol]}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {u.activo ? 'Activo' : 'Inactivo'}
              </span>
              <button
                onClick={() => handleToggle(u.id)}
                className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {u.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}

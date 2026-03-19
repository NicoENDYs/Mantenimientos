import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'

const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', admin: 'Administrador' }

export default function ProfilePage() {
  const { user } = useAuth()
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()

  async function onSubmit(data) {
    setError('')
    setSuccess('')
    if (data.newPassword !== data.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    try {
      await api.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setSuccess('Contraseña actualizada correctamente')
      reset()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar la contraseña')
    }
  }

  return (
    <Layout>
      <div className="max-w-md">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Mi perfil</h1>

        {/* Info del usuario */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-gray-800 text-lg">{user?.nombre}</p>
          <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
          <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {ROL_LABEL[user?.rol]}
          </span>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Cambiar contraseña</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  {...register('currentPassword', { required: 'Requerida' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600">
                  <EyeIcon open={showCurrent} />
                </button>
              </div>
              {errors.currentPassword && <p className="text-red-500 text-xs mt-0.5">{errors.currentPassword.message}</p>}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  {...register('newPassword', { required: 'Requerida', minLength: { value: 8, message: 'Mín. 8 caracteres' } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600">
                  <EyeIcon open={showNew} />
                </button>
              </div>
              {errors.newPassword && <p className="text-red-500 text-xs mt-0.5">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirmar nueva contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirmPassword', { required: 'Requerida' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-0.5">{errors.confirmPassword.message}</p>}
            </div>

            {error   && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
            {success && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-2">{success}</p>}

            <button type="submit" disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.95 9.95 0 016.375 2.325M15 12a3 3 0 11-6 0 3 3 0 016 0zm4.5-4.5l-9 9" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

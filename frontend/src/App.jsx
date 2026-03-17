import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage              from './pages/LoginPage'
import DashboardPage          from './pages/DashboardPage'
import NewMaintenancePage     from './pages/NewMaintenancePage'
import MaintenanceListPage    from './pages/MaintenanceListPage'
import MaintenanceDetailPage  from './pages/MaintenanceDetailPage'
import EditMaintenancePage    from './pages/EditMaintenancePage'
import ReportsPage            from './pages/ReportsPage'
import UsersPage              from './pages/UsersPage'

export default function App() {
  const { loading } = useAuth()

  // Mientras se verifica la cookie, no renderizar rutas (evita flash de login)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      <Route path="/maintenances/new" element={
        <ProtectedRoute>
          <NewMaintenancePage />
        </ProtectedRoute>
      } />

      <Route path="/maintenances" element={
        <ProtectedRoute>
          <MaintenanceListPage />
        </ProtectedRoute>
      } />

      <Route path="/maintenances/:id" element={
        <ProtectedRoute>
          <MaintenanceDetailPage />
        </ProtectedRoute>
      } />

      <Route path="/maintenances/:id/edit" element={
        <ProtectedRoute>
          <EditMaintenancePage />
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute roles={['supervisor', 'admin']}>
          <ReportsPage />
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute roles={['admin']}>
          <UsersPage />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Skeleton from './components/Skeleton'

import LoginPage              from './pages/LoginPage'
import DashboardPage          from './pages/DashboardPage'
import NewMaintenancePage     from './pages/NewMaintenancePage'
import MaintenanceListPage    from './pages/MaintenanceListPage'
import MaintenanceDetailPage  from './pages/MaintenanceDetailPage'
import EditMaintenancePage    from './pages/EditMaintenancePage'
import ReportsPage            from './pages/ReportsPage'
import UsersPage              from './pages/UsersPage'
import ProfilePage            from './pages/ProfilePage'

export default function App() {
  const { loading } = useAuth()

  // Mientras se verifica la cookie, mostrar el esqueleto del shell (evita flash de login)
  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="border-b border-border bg-surface">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Skeleton className="h-9 w-32" />
            <div className="hidden gap-2 md:flex">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
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

      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

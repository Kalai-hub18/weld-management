import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Layouts
import MainLayout from '../components/layout/MainLayout'
import WorkerLayout from '../components/layout/WorkerLayout'

// Auth Pages
import LoginPage from '../pages/auth/LoginPage'

// Dashboard Pages
import DashboardPage from '../pages/dashboard/DashboardPage'
import WorkerDashboardPage from '../pages/worker/WorkerDashboardPage'

// Worker Pages
import WorkerProfilePage from '../pages/workers/WorkerProfilePage'
import WorkersPage from '../pages/workers/WorkersPage'

// Attendance Pages
import AttendanceCalendarPage from '../pages/attendance/AttendanceCalendarPage'

// Project Pages
import ProjectsPage from '../pages/projects/ProjectsPage'
import ProjectDetailsPage from '../pages/projects/ProjectDetailsPage'

// Task Pages
import TasksPage from '../pages/tasks/TasksPage'

// Salary Pages
import SalaryPage from '../pages/salary/SalaryPage'

// Settings Pages
import SettingsPage from '../pages/settings/SettingsPage'
import CompanySettingsPage from '../pages/settings/CompanySettingsPage'

// Project Invoice Pages
import ProjectInvoicesPage from '../pages/invoices/ProjectInvoicesPage'
import ProjectInvoiceDetailPage from '../pages/invoices/ProjectInvoiceDetailPage'
import ProjectInvoiceFormPage from '../pages/invoices/ProjectInvoiceFormPage'

// Salary Invoice Pages
import SalaryInvoicesPage from '../pages/invoices/SalaryInvoicesPage'
import SalaryInvoiceGeneratePage from '../pages/invoices/SalaryInvoiceGeneratePage'
import SalaryInvoiceDetailPage from '../pages/invoices/SalaryInvoiceDetailPage'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect based on role
    if (user?.role === 'Worker') {
      return <Navigate to="/worker/dashboard" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Public Route Component (redirects authenticated users)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === 'Worker') {
      return <Navigate to="/worker/dashboard" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return children
}

const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Admin/Manager Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workers" element={<WorkersPage />} />
        <Route path="workers/:id" element={<WorkerProfilePage />} />
        <Route path="attendance" element={<AttendanceCalendarPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="salary" element={<SalaryPage />} />
        
        {/* Invoice Routes */}
        <Route path="invoices/project" element={<ProjectInvoicesPage />} />
        <Route path="invoices/project/create" element={<ProjectInvoiceFormPage />} />
        <Route path="invoices/project/:id" element={<ProjectInvoiceDetailPage />} />
        <Route path="invoices/project/:id/edit" element={<ProjectInvoiceFormPage />} />
        
        <Route path="invoices/salary" element={<SalaryInvoicesPage />} />
        <Route path="invoices/salary/generate" element={<SalaryInvoiceGeneratePage />} />
        <Route path="invoices/salary/:id" element={<SalaryInvoiceDetailPage />} />
        
        {/* Legacy invoice routes - redirect to project */}
        <Route path="invoices" element={<Navigate to="/invoices/project" replace />} />
        <Route path="invoices/create" element={<Navigate to="/invoices/project/create" replace />} />
        
        {/* Add more admin/manager routes here */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/company" element={<CompanySettingsPage />} />
      </Route>

      {/* Worker Routes */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute allowedRoles={['Worker']}>
            <WorkerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/worker/dashboard" replace />} />
        <Route path="dashboard" element={<WorkerDashboardPage />} />
        {/* Add more worker routes here */}
        {/* <Route path="profile" element={<WorkerProfilePage />} /> */}
        {/* <Route path="tasks" element={<WorkerTasksPage />} /> */}
        {/* <Route path="attendance" element={<WorkerAttendancePage />} /> */}
      </Route>

      {/* Catch all - 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
              <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
                Page not found
              </p>
              <a
                href="/login"
                className="btn-primary inline-block"
              >
                Go to Login
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  )
}

export default AppRouter

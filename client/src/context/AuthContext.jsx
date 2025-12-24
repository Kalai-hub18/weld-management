import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import authService from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Role-based permission definitions
const PERMISSIONS = {
  Admin: {
    canManageWorkers: true,
    canDeleteWorkers: true,
    canManageProjects: true,
    canManageTasks: true,
    canManageSalary: true,
    canManageAttendance: true,
    canViewDashboard: true,
    canViewReports: true,
    canManageSettings: true,
    canViewAllData: true,
  },
  Manager: {
    canManageWorkers: true,
    canDeleteWorkers: false,
    canManageProjects: false,
    canManageTasks: true,
    canManageSalary: false,
    canManageAttendance: true,
    canViewDashboard: true,
    canViewReports: true,
    canManageSettings: false,
    canViewAllData: false,
    canViewSalary: true, // Read-only
    canViewProjects: true, // Read-only
  },
  Worker: {
    canManageWorkers: false,
    canDeleteWorkers: false,
    canManageProjects: false,
    canManageTasks: false,
    canManageSalary: false,
    canManageAttendance: false,
    canViewDashboard: false,
    canViewReports: false,
    canManageSettings: false,
    canViewAllData: false,
    canViewOwnProfile: true,
    canViewOwnTasks: true,
    canMarkOwnAttendance: true,
  },
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('weld-token'))
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('weld-token')
      const savedUser = localStorage.getItem('weld-user')
      
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          setUser(parsedUser)
          setToken(savedToken)
        } catch (error) {
          // Invalid stored data, clear it
          localStorage.removeItem('weld-token')
          localStorage.removeItem('weld-user')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (username, password) => {
    try {
      setLoading(true)
      const response = await authService.login(username, password)
      
      if (response.success) {
        const { user: userData, token: authToken } = response.data
        
        setUser(userData)
        setToken(authToken)
        
        localStorage.setItem('weld-token', authToken)
        localStorage.setItem('weld-user', JSON.stringify(userData))
        
        toast.success(`Welcome back, ${userData.name}!`)
        
        // Redirect based on role
        if (userData.role === 'Worker') {
          navigate('/worker/dashboard')
        } else {
          navigate('/dashboard')
        }
        
        return { success: true }
      } else {
        toast.error(response.message || 'Login failed')
        return { success: false, message: response.message }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.'
      toast.error(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('weld-token')
    localStorage.removeItem('weld-user')
    toast.success('Logged out successfully')
    navigate('/login')
  }

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user || !user.role) return false
    const rolePermissions = PERMISSIONS[user.role]
    return rolePermissions ? rolePermissions[permission] === true : false
  }

  // Check if user has any of the specified roles
  const hasRole = (...roles) => {
    if (!user || !user.role) return false
    return roles.includes(user.role)
  }

  // Get all permissions for current user
  const getPermissions = () => {
    if (!user || !user.role) return {}
    return PERMISSIONS[user.role] || {}
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    hasPermission,
    hasRole,
    getPermissions,
    permissions: user ? PERMISSIONS[user.role] : {},
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext

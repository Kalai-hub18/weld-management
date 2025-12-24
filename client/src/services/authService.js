import api from './api'

const authService = {
  login: async (username, password) => {
    // Real API call
    try {
      const response = await api.post('/auth/login', { username, password })
      // Backend responds with { success, data: { user, token } }
      return {
        success: response.data?.success === true,
        data: response.data?.data,
        message: response.data?.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      }
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      }
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me')
      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user data',
      }
    }
  },

  logout: () => {
    localStorage.removeItem('weld-token')
    localStorage.removeItem('weld-user')
  },
}

export default authService

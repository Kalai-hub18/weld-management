import api from './api'

export const attendanceService = {
  /**
   * Get attendance records for a specific month
   */
  getMonthlyAttendance: async (year, month) => {
    try {
      // Backend: GET /api/attendance?month=&year=
      const response = await api.get(`/attendance`, { params: { month, year, limit: 500 } })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch attendance',
      }
    }
  },

  /**
   * Get attendance for a specific date
   */
  getDailyAttendance: async (date) => {
    try {
      // Backend: GET /api/attendance?date=
      const response = await api.get(`/attendance`, { params: { date, limit: 500 } })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch attendance',
      }
    }
  },

  /**
   * Upsert attendance (mark or update) for a single worker on a specific date
   * Backend: POST /api/attendance (upsert by worker+date)
   */
  upsertAttendance: async (date, workerId, data) => {
    try {
      const response = await api.post(`/attendance`, { workerId, date, ...data })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update attendance',
      }
    }
  },

  /**
   * Get today's attendance summary
   */
  getTodayAttendance: async () => {
    try {
      const response = await api.get(`/attendance/today`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch today attendance',
      }
    }
  },

  /**
   * Get my attendance (Worker)
   */
  getMyAttendance: async (params = {}) => {
    try {
      const response = await api.get(`/attendance/my`, { params })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch my attendance',
      }
    }
  },

  /**
   * Get attendance summary/statistics
   */
  getAttendanceStats: async (params = {}) => {
    try {
      const response = await api.get(`/attendance/stats`, { params })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch statistics',
      }
    }
  },

  /**
   * Update attendance record by attendance id
   */
  updateAttendanceById: async (attendanceId, data) => {
    try {
      const response = await api.put(`/attendance/${attendanceId}`, data)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update attendance record',
      }
    }
  },

  /**
   * Delete attendance record by attendance id
   */
  deleteAttendanceById: async (attendanceId) => {
    try {
      const response = await api.delete(`/attendance/${attendanceId}`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete attendance record',
      }
    }
  },

  /**
   * Export attendance report
   */
  exportReport: async (params = {}) => {
    try {
      const response = await api.get(`/attendance/export`, {
        params,
        responseType: 'blob',
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to export report',
      }
    }
  },
}

export default attendanceService

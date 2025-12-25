import api from './api'

const salaryService = {
  getSalaries: async (params = {}) => {
    const response = await api.get('/salary', { params })
    return response.data
  },

  getPayrollView: async (params = {}) => {
    const response = await api.get('/salary/payroll-view', { params })
    return response.data
  },

  getSalary: async (id) => {
    const response = await api.get(`/salary/${id}`)
    return response.data
  },

  createSalary: async (salaryData) => {
    const response = await api.post('/salary', salaryData)
    return response.data
  },

  updateSalary: async (id, salaryData) => {
    const response = await api.put(`/salary/${id}`, salaryData)
    return response.data
  },

  deleteSalary: async (id) => {
    const response = await api.delete(`/salary/${id}`)
    return response.data
  },

  paySalary: async (id, paymentData) => {
    const response = await api.put(`/salary/${id}/pay`, paymentData)
    return response.data
  },

  getSalaryStats: async () => {
    const response = await api.get('/salary/stats')
    return response.data
  },

  generateMonthlySalary: async (payload) => {
    const response = await api.post('/salary/generate', payload)
    return response.data
  },

  // Advance/partial pay
  previewPayment: async (payload) => {
    const response = await api.post('/salary/preview', payload)
    return response.data
  },

  payPayment: async (payload) => {
    const response = await api.post('/salary/pay', payload)
    return response.data
  },

  getPaymentHistory: async (workerId, params = {}) => {
    const response = await api.get(`/salary/history/${workerId}`, { params })
    return response.data
  },

  updatePayment: async (paymentId, payload) => {
    const response = await api.put(`/salary/payments/${paymentId}`, payload)
    return response.data
  },

  voidPayment: async (paymentId, payload = {}) => {
    const response = await api.delete(`/salary/payments/${paymentId}`, { data: payload })
    return response.data
  },
}

export default salaryService



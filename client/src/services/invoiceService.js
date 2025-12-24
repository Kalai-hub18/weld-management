import api from './api'

const invoiceService = {
  // Project Invoice CRUD
  getProjectInvoices: async (params = {}) => {
    const response = await api.get('/invoices/project', { params })
    return response.data
  },

  getProjectInvoiceById: async (id) => {
    const response = await api.get(`/invoices/project/${id}`)
    return response.data
  },

  createProjectInvoice: async (data) => {
    const response = await api.post('/invoices/project', data)
    return response.data
  },

  updateProjectInvoice: async (id, data) => {
    const response = await api.put(`/invoices/project/${id}`, data)
    return response.data
  },

  deleteProjectInvoice: async (id) => {
    const response = await api.delete(`/invoices/project/${id}`)
    return response.data
  },

  // Salary Invoice CRUD
  getSalaryInvoices: async (params = {}) => {
    const response = await api.get('/invoices/salary', { params })
    return response.data
  },

  getSalaryInvoiceById: async (id) => {
    const response = await api.get(`/invoices/salary/${id}`)
    return response.data
  },

  calculateSalaryPreview: async (data) => {
    const response = await api.post('/invoices/salary/calculate', data)
    return response.data
  },

  generateSalaryInvoice: async (data) => {
    const response = await api.post('/invoices/salary', data)
    return response.data
  },

  updateSalaryInvoice: async (id, data) => {
    const response = await api.put(`/invoices/salary/${id}`, data)
    return response.data
  },

  deleteSalaryInvoice: async (id) => {
    const response = await api.delete(`/invoices/salary/${id}`)
    return response.data
  },

  getSalaryPeriodSuggestions: async () => {
    const response = await api.get('/invoices/salary/periods/suggestions')
    return response.data
  },

  getWorkerSalarySummary: async (workerId, params) => {
    const response = await api.get(`/invoices/salary/worker/${workerId}/summary`, { params })
    return response.data
  },

  // Legacy methods (keep for backward compatibility)
  getInvoices: async (params = {}) => {
    const response = await api.get('/invoices', { params })
    return response.data
  },

  getInvoiceById: async (id) => {
    const response = await api.get(`/invoices/${id}`)
    return response.data
  },

  createInvoice: async (data) => {
    const response = await api.post('/invoices', data)
    return response.data
  },

  updateInvoice: async (id, data) => {
    const response = await api.put(`/invoices/${id}`, data)
    return response.data
  },

  deleteInvoice: async (id) => {
    const response = await api.delete(`/invoices/${id}`)
    return response.data
  },

  // Generate invoice PDF
  generatePDF: async (invoiceId) => {
    const response = await api.post(`/invoices/${invoiceId}/generate-pdf`)
    return response.data
  },

  // Send invoice via email
  sendEmail: async (invoiceId, data) => {
    const response = await api.post(`/invoices/${invoiceId}/send-email`, data)
    return response.data
  },

  // Send invoice via WhatsApp
  sendWhatsApp: async (invoiceId, data) => {
    const response = await api.post(`/invoices/${invoiceId}/send-whatsapp`, data)
    return response.data
  },

  // Get communication history
  getCommunicationHistory: async (invoiceId) => {
    const response = await api.get(`/invoices/${invoiceId}/communications`)
    return response.data
  },

  // Upload attachment
  uploadAttachment: async (invoiceId, file, type) => {
    const formData = new FormData()
    formData.append('attachment', file)
    formData.append('type', type)
    
    const response = await api.post(`/invoices/${invoiceId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Delete attachment
  deleteAttachment: async (invoiceId, attachmentId) => {
    const response = await api.delete(`/invoices/${invoiceId}/attachments/${attachmentId}`)
    return response.data
  },
}

export default invoiceService

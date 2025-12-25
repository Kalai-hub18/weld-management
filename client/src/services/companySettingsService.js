import api from './api'

const companySettingsService = {
  // Get company settings
  getSettings: async () => {
    const response = await api.get('/company-settings')
    return response.data
  },

  // Update company settings
  updateSettings: async (data) => {
    const response = await api.put('/company-settings', data)
    return response.data
  },

  // Upload company logo
  uploadLogo: async (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    
    const response = await api.post('/company-settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Delete company logo
  deleteLogo: async () => {
    const response = await api.delete('/company-settings/logo')
    return response.data
  },
}

export default companySettingsService

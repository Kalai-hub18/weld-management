import api from './api'

const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID || 'default'

export const settingsService = {
  workspaceId: WORKSPACE_ID,

  getSettings: async (workspaceId = WORKSPACE_ID) => {
    const res = await api.get(`/settings/${workspaceId}`)
    return res.data
  },

  updateSettings: async (workspaceId = WORKSPACE_ID, payload) => {
    const res = await api.put(`/settings/${workspaceId}`, payload)
    return res.data
  },

  previewSettings: async (workspaceId = WORKSPACE_ID, payload) => {
    const res = await api.post(`/settings/${workspaceId}/preview`, payload)
    return res.data
  },
}

export default settingsService




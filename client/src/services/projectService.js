import api from './api'

const projectService = {
    // Get all projects
    getAllProjects: async (params = {}) => {
        const response = await api.get('/projects', { params })
        return response.data
    },

    // Get project stats
    getProjectStats: async () => {
        const response = await api.get('/projects/stats')
        return response.data
    },

    // Get a single project
    getProject: async (id) => {
        const response = await api.get(`/projects/${id}`)
        return response.data
    },

    // Create a new project
    createProject: async (projectData) => {
        const response = await api.post('/projects', projectData)
        return response.data
    },

    // Update a project
    updateProject: async (id, projectData) => {
        const response = await api.put(`/projects/${id}`, projectData)
        return response.data
    },

    // Delete a project
    deleteProject: async (id) => {
        const response = await api.delete(`/projects/${id}`)
        return response.data
    },

    // Update project progress
    updateProgress: async (id, progressData) => {
        const response = await api.put(`/projects/${id}/progress`, progressData)
        return response.data
    },

    // Assign workers to project
    assignWorkers: async (id, workerIds) => {
        const response = await api.put(`/projects/${id}/workers`, { workerIds })
        return response.data
    },
}

export default projectService

import api from './api'

const workerService = {
    // Get all workers
    getAllWorkers: async (params = {}) => {
        const response = await api.get('/workers', { params })
        return response.data
    },

    // Get a single worker
    getWorker: async (id) => {
        const response = await api.get(`/workers/${id}`)
        return response.data
    },

    // Create a new worker
    createWorker: async (workerData) => {
        const response = await api.post('/workers', workerData)
        return response.data
    },

    // Update a worker
    updateWorker: async (id, workerData) => {
        const response = await api.put(`/workers/${id}`, workerData)
        return response.data
    },

    // Delete a worker
    deleteWorker: async (id) => {
        const response = await api.delete(`/workers/${id}`)
        return response.data
    },

    // Get worker tasks
    getWorkerTasks: async (id) => {
        const response = await api.get(`/workers/${id}/tasks`)
        return response.data
    },

    // Get worker attendance
    getWorkerAttendance: async (id) => {
        const response = await api.get(`/workers/${id}/attendance`)
        return response.data
    },

    // Alias for getAllWorkers (for backward compatibility)
    getWorkers: async (params = {}) => {
        const response = await api.get('/workers', { params })
        return response.data
    },
}

export default workerService

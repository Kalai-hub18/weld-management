import api from './api'

const taskService = {
    // Get all tasks
    getAllTasks: async (params = {}) => {
        const response = await api.get('/tasks', { params })
        return response.data
    },

    // Get a single task
    getTask: async (id) => {
        const response = await api.get(`/tasks/${id}`)
        return response.data
    },

    // Create a new task
    createTask: async (taskData) => {
        const response = await api.post('/tasks', taskData)
        return response.data
    },

    // Update a task
    updateTask: async (id, taskData) => {
        const response = await api.put(`/tasks/${id}`, taskData)
        return response.data
    },

    // Delete a task
    deleteTask: async (id) => {
        const response = await api.delete(`/tasks/${id}`)
        return response.data
    },

    // Update task status
    updateStatus: async (id, payload) => {
        // Backward compatible: updateStatus(id, 'completed')
        const body = typeof payload === 'string' ? { status: payload } : (payload || {})
        const response = await api.put(`/tasks/${id}/status`, body)
        return response.data
    },

    // Task statistics
    getTaskStats: async () => {
        const response = await api.get('/tasks/stats')
        return response.data
    },

    // Eligible workers for a task date/time (availability-based)
    getEligibleWorkers: async (date, startTime, endTime) => {
        const params = { date }
        if (startTime && endTime) {
            params.startTime = startTime
            params.endTime = endTime
        }
        const response = await api.get('/tasks/eligible-workers', { params })
        return response.data
    },
}

export default taskService

import api from './api'

const dashboardService = {
    /**
     * Get comprehensive dashboard statistics
     * @param {Object} params - Query parameters
     * @param {string} params.startDate - Start date (YYYY-MM-DD)
     * @param {string} params.endDate - End date (YYYY-MM-DD)
     */
    async getStats(params = {}) {
        const response = await api.get('/dashboard/stats', { params })
        return response.data
    },

    /**
     * Get revenue statistics
     */
    async getRevenue(params = {}) {
        const response = await api.get('/dashboard/revenue', { params })
        return response.data
    },

    /**
     * Get expense statistics
     */
    async getExpenses(params = {}) {
        const response = await api.get('/dashboard/expenses', { params })
        return response.data
    },

    /**
     * Get revenue trend chart data (last 6 months)
     */
    async getRevenueTrend() {
        const response = await api.get('/dashboard/charts/revenue-trend')
        return response.data
    },

    /**
     * Get attendance chart data (current week)
     */
    async getAttendanceChart() {
        const response = await api.get('/dashboard/charts/attendance')
        return response.data
    },

    /**
     * Get project budget utilization data
     */
    async getProjectBudgetChart() {
        const response = await api.get('/dashboard/charts/project-budget')
        return response.data
    }
}

export default dashboardService

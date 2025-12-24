import api from './api'

// Materials
export const addMaterial = (projectId, data) => api.post(`/projects/${projectId}/materials`, data)
export const getMaterials = (projectId) => api.get(`/projects/${projectId}/materials`)
export const updateMaterial = (id, data) => api.put(`/materials/${id}`, data)
export const deleteMaterial = (id) => api.delete(`/materials/${id}`)

// Other Costs
export const addOtherCost = (projectId, data) => api.post(`/projects/${projectId}/other-costs`, data)
export const getOtherCosts = (projectId) => api.get(`/projects/${projectId}/other-costs`)
export const updateOtherCost = (id, data) => api.put(`/other-costs/${id}`, data)
export const deleteOtherCost = (id) => api.delete(`/other-costs/${id}`)

// Salaries
export const addSalary = (projectId, data) => api.post(`/projects/${projectId}/salaries`, data)
export const getSalaries = (projectId) => api.get(`/projects/${projectId}/salaries`)
export const updateSalary = (id, data) => api.put(`/salaries/${id}`, data)
export const deleteSalary = (id) => api.delete(`/salaries/${id}`)

// Derived Salary Summary (read-only)
export const getWorkerSalarySummary = (projectId) => api.get(`/projects/${projectId}/worker-salary-summary`)

// Budget Summary
export const getBudgetSummary = (projectId) => api.get(`/projects/${projectId}/budget-summary`)

const costService = {
    addMaterial,
    getMaterials,
    updateMaterial,
    deleteMaterial,
    addOtherCost,
    getOtherCosts,
    updateOtherCost,
    deleteOtherCost,
    addSalary,
    getSalaries,
    updateSalary,
    deleteSalary,
    getWorkerSalarySummary,
    getBudgetSummary,
}

export default costService

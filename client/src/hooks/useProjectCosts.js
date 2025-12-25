import { useState, useEffect, useCallback } from 'react'
import costService from '../services/costService'

export const useMaterials = (projectId) => {
    const [materials, setMaterials] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetchMaterials = useCallback(async () => {
        try {
            setLoading(true)
            const res = await costService.getMaterials(projectId)
            setMaterials(res.data.data)
            setError(null)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch materials')
        } finally {
            setLoading(false)
        }
    }, [projectId])

    const add = async (data) => {
        const res = await costService.addMaterial(projectId, data)
        setMaterials(prev => [res.data.data, ...prev])
        return res.data
    }

    const update = async (id, data) => {
        const res = await costService.updateMaterial(id, data)
        setMaterials(prev => prev.map(item => item._id === id ? res.data.data : item))
        return res.data
    }

    const remove = async (id) => {
        await costService.deleteMaterial(id)
        setMaterials(prev => prev.filter(item => item._id !== id))
    }

    useEffect(() => {
        if (projectId) fetchMaterials()
    }, [fetchMaterials, projectId])

    return { materials, loading, error, add, update, remove, refresh: fetchMaterials }
}

export const useOtherCosts = (projectId) => {
    const [costs, setCosts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetchCosts = useCallback(async () => {
        try {
            setLoading(true)
            const res = await costService.getOtherCosts(projectId)
            setCosts(res.data.data)
            setError(null)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch other costs')
        } finally {
            setLoading(false)
        }
    }, [projectId])

    const add = async (data) => {
        const res = await costService.addOtherCost(projectId, data)
        setCosts(prev => [res.data.data, ...prev])
        return res.data
    }

    const update = async (id, data) => {
        const res = await costService.updateOtherCost(id, data)
        setCosts(prev => prev.map(item => item._id === id ? res.data.data : item))
        return res.data
    }

    const remove = async (id) => {
        await costService.deleteOtherCost(id)
        setCosts(prev => prev.filter(item => item._id !== id))
    }

    useEffect(() => {
        if (projectId) fetchCosts()
    }, [fetchCosts, projectId])

    return { costs, loading, error, add, update, remove, refresh: fetchCosts }
}

export const useWorkerSalaries = (projectId) => {
    const [salaries, setSalaries] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetchSalaries = useCallback(async () => {
        try {
            setLoading(true)
            const res = await costService.getWorkerSalarySummary(projectId)
            setSalaries(res.data.data?.rows || [])
            setError(null)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch salaries')
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        if (projectId) fetchSalaries()
    }, [fetchSalaries, projectId])

    return { salaries, loading, error, refresh: fetchSalaries }
}

export const useBudgetSummary = (projectId) => {
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetchSummary = useCallback(async () => {
        try {
            setLoading(true)
            const res = await costService.getBudgetSummary(projectId)
            setSummary(res.data.data)
            setError(null)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch budget summary')
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        if (projectId) fetchSummary()
    }, [fetchSummary, projectId])

    return { summary, loading, error, refresh: fetchSummary }
}

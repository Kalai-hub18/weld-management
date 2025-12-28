import express from 'express'
import {
    getDashboardStats,
    getRevenueStats,
    getExpenseStats,
    getRevenueTrend,
    getAttendanceChart,
    getProjectBudgetChart
} from '../controllers/dashboardController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// Dashboard stats (supports date filtering via query params)
router.get('/stats', getDashboardStats)

// Financial endpoints
router.get('/revenue', getRevenueStats)
router.get('/expenses', getExpenseStats)

// Chart data endpoints
router.get('/charts/revenue-trend', getRevenueTrend)
router.get('/charts/attendance', getAttendanceChart)
router.get('/charts/project-budget', getProjectBudgetChart)

export default router

import express from 'express'
import {
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
} from '../controllers/costController.js'
import { getBudgetSummary, getWorkerSalarySummary } from '../controllers/budgetController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

// Material Routes
router.route('/projects/:id/materials')
    .post(protect, authorize('Admin', 'Manager'), addMaterial)
    .get(protect, authorize('Admin', 'Manager', 'Worker'), getMaterials)

router.route('/materials/:id')
    .put(protect, authorize('Admin', 'Manager'), updateMaterial)
    .delete(protect, authorize('Admin', 'Manager'), deleteMaterial)

// Other Cost Routes
router.route('/projects/:id/other-costs')
    .post(protect, authorize('Admin', 'Manager'), addOtherCost)
    .get(protect, authorize('Admin', 'Manager', 'Worker'), getOtherCosts)

router.route('/other-costs/:id')
    .put(protect, authorize('Admin', 'Manager'), updateOtherCost)
    .delete(protect, authorize('Admin', 'Manager'), deleteOtherCost)

// Worker Salary Routes
router.route('/projects/:id/salaries')
    .post(protect, authorize('Admin', 'Manager'), addSalary)
    .get(protect, authorize('Admin', 'Manager', 'Worker'), getSalaries)

router.route('/salaries/:id')
    .put(protect, authorize('Admin', 'Manager'), updateSalary)
    .delete(protect, authorize('Admin', 'Manager'), deleteSalary)

// Budget Summary
router.route('/projects/:id/budget-summary')
    .get(protect, authorize('Admin', 'Manager', 'Worker'), getBudgetSummary)

// Derived Worker Salary Summary (READ-ONLY)
router.route('/projects/:id/worker-salary-summary')
    .get(protect, authorize('Admin', 'Manager', 'Worker'), getWorkerSalarySummary)

export default router

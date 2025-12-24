import express from 'express'
import {
  getSalaries,
  getSalary,
  createSalary,
  updateSalary,
  deleteSalary,
  processSalaryPayment,
  getMySalary,
  getSalaryStats,
  generateMonthlySalary,
  getPayrollView,
} from '../controllers/salaryController.js'
import {
  previewSalaryPayment,
  paySalary,
  getSalaryHistory,
  updateSalaryPayment,
  voidSalaryPayment,
} from '../controllers/salaryPaymentController.js'
import { protect, authorize, hasPermission } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Special routes (must be before /:id)
router.get('/payroll-view', hasPermission('canManageSalary', 'canViewSalary'), validate(schemas.payrollView), getPayrollView)
router.get('/my', getMySalary) // Workers can view their own salary
router.get('/stats', authorize('Admin'), getSalaryStats)
router.post('/generate', authorize('Admin'), generateMonthlySalary)

// Advance/partial pay routes
router.post('/preview', hasPermission('canManageSalary', 'canViewSalary'), validate(schemas.salaryPreview), previewSalaryPayment)
router.post('/pay', hasPermission('canManageSalary'), validate(schemas.salaryPay), paySalary)
router.get('/history/:workerId', hasPermission('canManageSalary', 'canViewSalary'), validate(schemas.salaryHistoryParams), getSalaryHistory)
router.put('/payments/:id', hasPermission('canManageSalary'), validate(schemas.salaryPaymentUpdate), updateSalaryPayment)
router.delete('/payments/:id', hasPermission('canManageSalary'), validate(schemas.salaryPaymentVoid), voidSalaryPayment)

// CRUD routes
router.route('/')
  .get(hasPermission('canManageSalary', 'canViewSalary'), getSalaries)
  .post(authorize('Admin'), validate(schemas.createSalary), createSalary)

router.route('/:id')
  .get(hasPermission('canManageSalary', 'canViewSalary'), validate(schemas.mongoId), getSalary)
  .put(authorize('Admin'), validate(schemas.mongoId), validate(schemas.updateSalary), updateSalary)
  .delete(authorize('Admin'), validate(schemas.mongoId), deleteSalary)

// Payment processing
router.put('/:id/pay', authorize('Admin'), validate(schemas.mongoId), validate(schemas.processSalaryPayment), processSalaryPayment)

export default router

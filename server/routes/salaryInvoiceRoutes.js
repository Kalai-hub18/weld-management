import express from 'express'
import { protect, authorize } from '../middleware/authMiddleware.js'
import {
  getSalaryInvoices,
  getSalaryInvoiceById,
  calculateSalaryPreview,
  generateSalaryInvoice,
  updateSalaryInvoice,
  deleteSalaryInvoice,
  getSalaryPeriodSuggestions,
  getWorkerSalarySummary,
} from '../controllers/salaryInvoiceController.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// Salary invoice routes
router.route('/').get(getSalaryInvoices).post(authorize('Admin'), generateSalaryInvoice)

router.get('/periods/suggestions', getSalaryPeriodSuggestions)

router.post('/calculate', authorize('Admin'), calculateSalaryPreview)

router.get('/worker/:workerId/summary', getWorkerSalarySummary)

router
  .route('/:id')
  .get(getSalaryInvoiceById)
  .put(authorize('Admin'), updateSalaryInvoice)
  .delete(authorize('Admin'), deleteSalaryInvoice)

export default router

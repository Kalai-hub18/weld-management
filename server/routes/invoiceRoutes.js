import express from 'express'
import { protect, authorize } from '../middleware/authMiddleware.js'
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from '../controllers/invoiceController.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// Invoice CRUD routes
router.route('/')
  .get(getInvoices)
  .post(authorize('Admin'), createInvoice)

router.route('/:id')
  .get(getInvoiceById)
  .put(authorize('Admin'), updateInvoice)
  .delete(authorize('Admin'), deleteInvoice)

export default router

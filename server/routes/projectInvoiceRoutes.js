import express from 'express'
import { protect, authorize } from '../middleware/authMiddleware.js'
import {
  getProjectInvoices,
  getProjectInvoiceById,
  createProjectInvoice,
  updateProjectInvoice,
  deleteProjectInvoice,
} from '../controllers/projectInvoiceController.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// Project invoice routes
router
  .route('/')
  .get(getProjectInvoices)
  .post(authorize('Admin'), createProjectInvoice)

router
  .route('/:id')
  .get(getProjectInvoiceById)
  .put(authorize('Admin'), updateProjectInvoice)
  .delete(authorize('Admin'), deleteProjectInvoice)

export default router

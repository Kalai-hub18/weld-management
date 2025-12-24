import express from 'express'
import {
  generatePDF,
  sendEmail,
  sendWhatsApp,
  getCommunicationHistory,
  uploadAttachment,
  deleteAttachment,
} from '../controllers/invoiceCommunicationController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'
import { uploadAttachment as uploadMiddleware } from '../middleware/uploadMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// POST /api/invoices/:id/generate-pdf - Generate PDF (Admin only)
router.post('/:id/generate-pdf', authorize('Admin'), generatePDF)

// POST /api/invoices/:id/send-email - Send via email (Admin only)
router.post('/:id/send-email', authorize('Admin'), sendEmail)

// POST /api/invoices/:id/send-whatsapp - Send via WhatsApp (Admin only)
router.post('/:id/send-whatsapp', authorize('Admin'), sendWhatsApp)

// GET /api/invoices/:id/communications - Get communication history
router.get('/:id/communications', getCommunicationHistory)

// POST /api/invoices/:id/attachments - Upload attachment (Admin only)
router.post('/:id/attachments', authorize('Admin'), uploadMiddleware, uploadAttachment)

// DELETE /api/invoices/:id/attachments/:attachmentId - Delete attachment (Admin only)
router.delete('/:id/attachments/:attachmentId', authorize('Admin'), deleteAttachment)

export default router

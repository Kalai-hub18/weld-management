import express from 'express'
import {
  getCompanySettings,
  updateCompanySettings,
  uploadLogo as uploadLogoController,
  deleteLogo,
} from '../controllers/companySettingsController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'
import { uploadLogo } from '../middleware/uploadMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// GET /api/company-settings - Get company settings
router.get('/', getCompanySettings)

// PUT /api/company-settings - Update company settings (Admin only)
router.put('/', authorize('Admin'), updateCompanySettings)

// POST /api/company-settings/logo - Upload logo (Admin only)
router.post('/logo', authorize('Admin'), uploadLogo, uploadLogoController)

// DELETE /api/company-settings/logo - Delete logo (Admin only)
router.delete('/logo', authorize('Admin'), deleteLogo)

export default router

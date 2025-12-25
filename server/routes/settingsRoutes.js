import express from 'express'
import { protect, hasPermission } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'
import { getSettings, updateSettings, previewSettings } from '../controllers/settingsController.js'

const router = express.Router()

router.use(protect)

router.get('/:workspaceId', validate(schemas.settingsParams), getSettings)
router.put(
  '/:workspaceId',
  hasPermission('canManageSettings'),
  validate(schemas.settingsParams),
  validate(schemas.updateSettings),
  updateSettings
)
router.post(
  '/:workspaceId/preview',
  hasPermission('canManageSettings'),
  validate(schemas.settingsParams),
  validate(schemas.updateSettings),
  previewSettings
)

export default router




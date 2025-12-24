import express from 'express'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  updateProgress,
  assignWorkers,
  getProjectStats,
} from '../controllers/projectController.js'
import { protect, authorize, hasPermission } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Stats route
router.get('/stats', hasPermission('canManageProjects', 'canViewProjects'), getProjectStats)

// CRUD routes
router.route('/')
  .get(hasPermission('canManageProjects', 'canViewProjects'), getProjects)
  .post(authorize('Admin'), validate(schemas.createProject), createProject)

router.route('/:id')
  .get(hasPermission('canManageProjects', 'canViewProjects'), validate(schemas.mongoId), getProject)
  .put(authorize('Admin'), validate(schemas.mongoId), validate(schemas.updateProject), updateProject)
  .delete(authorize('Admin'), validate(schemas.mongoId), deleteProject)

// Project actions
router.put('/:id/progress', hasPermission('canManageProjects'), validate(schemas.mongoId), validate(schemas.updateProjectProgress), updateProgress)
router.put('/:id/workers', hasPermission('canManageProjects'), validate(schemas.mongoId), validate(schemas.assignProjectWorkers), assignWorkers)

export default router

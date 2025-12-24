import express from 'express'
import {
  getWorkers,
  getWorker,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkerTasks,
  getWorkerAttendance,
} from '../controllers/workerController.js'
import { protect, authorize, hasPermission } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// CRUD routes
router.route('/')
  .get(hasPermission('canManageWorkers'), validate(schemas.listWorkers), getWorkers)
  .post(authorize('Admin'), validate(schemas.createWorker), createWorker)

router.route('/:id')
  .get(hasPermission('canManageWorkers', 'canViewOwnProfile'), validate(schemas.mongoId), getWorker)
  .put(hasPermission('canManageWorkers'), validate(schemas.mongoId), validate(schemas.updateWorker), updateWorker)
  .delete(authorize('Admin'), validate(schemas.mongoId), deleteWorker)

// Worker sub-resources
router.get('/:id/tasks', hasPermission('canManageWorkers', 'canViewOwnTasks'), getWorkerTasks)
router.get('/:id/attendance', hasPermission('canManageWorkers', 'canMarkOwnAttendance'), getWorkerAttendance)

export default router

import express from 'express'
import {
  getTasks,
  getTask,
  createTask,
  getEligibleTaskWorkers,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addComment,
  getTaskStats,
} from '../controllers/taskController.js'
import { protect, authorize, hasPermission } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Stats route
router.get('/stats', getTaskStats)
// Eligible workers for a task date (present attendance + active-for-date)
router.get('/eligible-workers', hasPermission('canManageTasks'), validate(schemas.eligibleTaskWorkers), getEligibleTaskWorkers)

// CRUD routes
router.route('/')
  .get(getTasks) // All authenticated users can get tasks (filtered by role)
  .post(hasPermission('canManageTasks'), validate(schemas.createTask), createTask)

router.route('/:id')
  .get(validate(schemas.mongoId), getTask)
  .put(hasPermission('canManageTasks'), validate(schemas.mongoId), validate(schemas.updateTask), updateTask)
  .delete(hasPermission('canManageTasks'), validate(schemas.mongoId), deleteTask)

// Task actions
router.put('/:id/status', validate(schemas.mongoId), validate(schemas.updateTaskStatus), updateTaskStatus) // Workers can update their own task status
router.post('/:id/comments', validate(schemas.mongoId), validate(schemas.addTaskComment), addComment)

export default router

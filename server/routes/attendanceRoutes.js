import express from 'express'
import {
  getAttendance,
  getAttendanceById,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getTodayAttendance,
  getMyAttendance,
  getAttendanceStats,
} from '../controllers/attendanceController.js'
import { protect, authorize, hasPermission } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Special routes (must be before /:id)
router.get('/today', hasPermission('canManageAttendance'), getTodayAttendance)
router.get('/my', getMyAttendance) // Any authenticated user can view their own attendance
router.get('/stats', hasPermission('canManageAttendance'), getAttendanceStats)

// CRUD routes
router.route('/')
  .get(hasPermission('canManageAttendance'), getAttendance)
  .post(validate(schemas.markAttendance), markAttendance) // Workers can mark their own attendance

router.route('/:id')
  .get(validate(schemas.mongoId), getAttendanceById)
  .put(hasPermission('canManageAttendance'), validate(schemas.mongoId), validate(schemas.updateAttendance), updateAttendance)
  // Allow Admin/Manager who canManageAttendance to delete attendance entries (workers still can't)
  .delete(hasPermission('canManageAttendance'), validate(schemas.mongoId), deleteAttendance)

export default router

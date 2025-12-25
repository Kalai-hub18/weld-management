import express from 'express'
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
} from '../controllers/userController.js'
import { protect, authorize, hasPermission } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Stats route (must be before /:id to avoid conflict)
router.get('/stats', authorize('Admin'), getUserStats)

// CRUD routes
router.route('/')
  .get(authorize('Admin', 'Manager'), getUsers)
  .post(authorize('Admin'), validate(schemas.createUser), createUser)

router.route('/:id')
  .get(authorize('Admin', 'Manager'), validate(schemas.mongoId), getUser)
  .put(authorize('Admin', 'Manager'), validate(schemas.mongoId), validate(schemas.updateUser), updateUser)
  .delete(authorize('Admin'), validate(schemas.mongoId), deleteUser)

export default router

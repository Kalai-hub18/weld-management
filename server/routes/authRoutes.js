import express from 'express'
import { login, register, getMe, updatePassword, logout } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validateMiddleware.js'

const router = express.Router()

// Public routes
router.post('/login', validate(schemas.login), login)
router.post('/register', validate(schemas.register), register)

// Protected routes
router.get('/me', protect, getMe)
router.put('/password', protect, validate(schemas.updatePassword), updatePassword)
router.post('/logout', protect, logout)

export default router

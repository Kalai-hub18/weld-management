import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { PERMISSIONS } from '../config/constants.js'

// Protect routes - Verify JWT token
export const protect = async (req, res, next) => {
  let token

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1]

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password')

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        })
      }

      // Check if user is active
      if (req.user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'User account is not active',
        })
      }

      next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      })
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    })
  }
}

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      })
    }

    next()
  }
}

// Permission-based authorization
export const hasPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      })
    }

    const userPermissions = PERMISSIONS[req.user.role] || {}

    // Check if user has at least one of the required permissions
    const hasRequiredPermission = permissions.some(
      permission => userPermissions[permission] === true
    )

    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      })
    }

    next()
  }
}

// Check if user owns the resource or is admin
export const ownerOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      })
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField]
    const isOwner = req.user._id.toString() === resourceUserId
    const isAdmin = req.user.role === 'Admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource',
      })
    }

    next()
  }
}

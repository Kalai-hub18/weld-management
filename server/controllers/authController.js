import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body

  // Find user by username (include password field)
  const user = await User.findOne({ username: username.toLowerCase() }).select('+password')

  if (!user) {
    res.status(401)
    throw new Error('Invalid username or password')
  }

  // Check password
  const isMatch = await user.comparePassword(password)

  if (!isMatch) {
    res.status(401)
    throw new Error('Invalid username or password')
  }

  // Check if user is active
  if (user.status !== 'active') {
    res.status(401)
    throw new Error('Your account is not active. Please contact administrator.')
  }

  // Update last login
  user.lastLogin = new Date()
  await user.save()

  // Generate token
  const token = generateToken(user._id)

  res.json({
    success: true,
    data: {
      user: user.toPublicProfile(),
      token,
    },
    message: 'Login successful',
  })
})

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (or Admin only in production)
export const register = asyncHandler(async (req, res) => {
  const { username, password, name, email, role, phone, department, position } = req.body

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  })

  if (existingUser) {
    res.status(400)
    throw new Error(
      existingUser.email === email.toLowerCase()
        ? 'Email already registered'
        : 'Username already taken'
    )
  }

  // Create user
  const user = await User.create({
    username: username.toLowerCase(),
    password,
    name,
    email: email.toLowerCase(),
    role: role || 'Worker',
    phone,
    department,
    position,
  })

  // Generate token
  const token = generateToken(user._id)

  res.status(201).json({
    success: true,
    data: {
      user: user.toPublicProfile(),
      token,
    },
    message: 'Registration successful',
  })
})

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  res.json({
    success: true,
    data: user.toPublicProfile(),
    message: 'Profile loaded successfully',
  })
})

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  // Get user with password
  const user = await User.findById(req.user._id).select('+password')

  // Check current password
  const isMatch = await user.comparePassword(currentPassword)

  if (!isMatch) {
    res.status(401)
    throw new Error('Current password is incorrect')
  }

  // Update password
  user.password = newPassword
  await user.save()

  // Generate new token
  const token = generateToken(user._id)

  res.json({
    success: true,
    data: { token },
    message: 'Password updated successfully',
  })
})

// @desc    Logout user (client-side will remove token)
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // In a more complex setup, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully',
  })
})

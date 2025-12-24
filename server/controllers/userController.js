import User from '../models/User.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const { role, status, department, search, page = 1, limit = 10 } = req.query

  // Build query
  const query = {}

  if (role) query.role = role
  if (status) query.status = status
  if (department) query.department = department
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ]
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshToken')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
    User.countDocuments(query),
  ])

  res.json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken')

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  res.json({
    success: true,
    data: user,
  })
})

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = asyncHandler(async (req, res) => {
  const { 
    username, password, name, email, role, phone, department, position, skills, certifications,
    firstName, lastName, dateOfBirth, gender, address, aadhaar, pan, alternatePhone,
    paymentType, baseSalary, salaryMonthly, salaryDaily, hourlyRate, overtimeRate,
    workingDaysPerMonth, workingHoursPerDay, bankDetails, pfNumber, emergencyContact,
    employmentType, experience, maritalStatus, bloodGroup
  } = req.body

  // Check if user already exists (email is optional now)
  const existingUser = await User.findOne({
    $or: [
      email ? { email: email.toLowerCase() } : null,
      { username: username.toLowerCase() }
    ].filter(Boolean)
  })

  if (existingUser) {
    res.status(400)
    throw new Error(
      existingUser.email === email?.toLowerCase()
        ? 'Email already registered'
        : 'Username already taken'
    )
  }

  const user = await User.create({
    username: username.toLowerCase(),
    password,
    name,
    email: email ? email.toLowerCase() : undefined,
    role,
    phone,
    department,
    position,
    skills,
    certifications,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    address,
    aadhaar,
    pan,
    alternatePhone,
    paymentType,
    baseSalary,
    salaryMonthly,
    salaryDaily,
    hourlyRate,
    overtimeRate,
    workingDaysPerMonth,
    workingHoursPerDay,
    bankDetails,
    pfNumber,
    emergencyContact,
    employmentType,
    experience,
    maritalStatus,
    bloodGroup,
  })

  res.status(201).json({
    success: true,
    data: user.toPublicProfile(),
  })
})

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin/Manager
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  // Prevent non-admins from updating certain fields
  const allowedFields = [
    'name', 'email', 'phone', 'department', 'position', 'address', 'skills', 'certifications',
    'firstName', 'lastName', 'dateOfBirth', 'gender', 'aadhaar', 'pan', 'alternatePhone',
    'paymentType', 'baseSalary', 'salaryMonthly', 'salaryDaily', 'hourlyRate', 'overtimeRate',
    'workingDaysPerMonth', 'workingHoursPerDay', 'bankDetails', 'pfNumber', 'emergencyContact',
    'employmentType', 'experience', 'maritalStatus', 'bloodGroup', 'age'
  ]
  
  if (req.user.role === 'Admin') {
    allowedFields.push('role', 'status')
  }

  // Filter request body to only allowed fields
  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password -refreshToken')

  res.json({
    success: true,
    data: updatedUser,
  })
})

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  // Prevent deleting yourself
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400)
    throw new Error('You cannot delete your own account')
  }

  // Prevent deleting the last admin
  if (user.role === 'Admin') {
    const adminCount = await User.countDocuments({ role: 'Admin' })
    if (adminCount <= 1) {
      res.status(400)
      throw new Error('Cannot delete the last admin account')
    }
  }

  await user.deleteOne()

  res.json({
    success: true,
    message: 'User deleted successfully',
  })
})

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private/Admin
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
        admins: {
          $sum: { $cond: [{ $eq: ['$role', 'Admin'] }, 1, 0] },
        },
        managers: {
          $sum: { $cond: [{ $eq: ['$role', 'Manager'] }, 1, 0] },
        },
        workers: {
          $sum: { $cond: [{ $eq: ['$role', 'Worker'] }, 1, 0] },
        },
      },
    },
  ])

  const departmentStats = await User.aggregate([
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ])

  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        admins: 0,
        managers: 0,
        workers: 0,
      },
      byDepartment: departmentStats,
    },
  })
})

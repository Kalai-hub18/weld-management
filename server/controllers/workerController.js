import User from '../models/User.js'
import Task from '../models/Task.js'
import Attendance from '../models/Attendance.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

function normalizeEmail(email) {
  if (email === undefined || email === null) return undefined
  const s = String(email).trim().toLowerCase()
  if (s === 'undefined' || s === 'null') return undefined
  return s ? s : undefined
}

function normalizeUsername(username) {
  if (username === undefined || username === null) return ''
  return String(username).trim().toLowerCase()
}

// @desc    Get all workers
// @route   GET /api/workers
// @access  Private/Admin/Manager
export const getWorkers = asyncHandler(async (req, res) => {
  const { status, department, search, skills, page = 1, limit = 10, activeOnly, forDate } = req.query

  console.log('📊 GET /api/workers - Query params:', { status, department, search, skills, page, limit, activeOnly, forDate })

  // Build query - only get users with Worker role
  const query = { role: 'Worker' }

  // ENTERPRISE RULE: Date-based worker filtering for attendance
  // If forDate is provided, apply date-based inactive filtering
  if (forDate) {
    const targetDate = new Date(forDate)
    targetDate.setHours(0, 0, 0, 0)
    
    // Show workers who are:
    // 1. Active, OR
    // 2. Inactive but inactiveFrom > targetDate (worker was active on that date)
    query.$or = [
      { status: 'active' },
      { 
        status: 'inactive',
        inactiveFrom: { $gt: targetDate }
      }
    ]
  } else if (activeOnly === 'false') {
    // ENTERPRISE RULE: Workers page shows ALL workers (active + inactive) for history/reference
    // No status filter - show all workers regardless of status
    // Do not add any status filter to query
  } else if (status) {
    // Filter by specific status if provided
    query.status = status
  } else if (activeOnly === 'true') {
    // Default to active workers only for operational views
    query.status = 'active'
  } else {
    // Default behavior when no parameters provided - show active only
    query.status = 'active'
  }

  if (department) query.department = department
  if (skills) {
    query.skills = { $in: skills.split(',') }
  }
  if (search) {
    // Use $and to combine with existing query conditions
    const searchConditions = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ]
    
    // If query already has $or (from date filtering), wrap it properly
    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        { $or: searchConditions }
      ]
      delete query.$or
    } else {
      query.$or = searchConditions
    }
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit)

  console.log('📊 Final MongoDB query:', JSON.stringify(query, null, 2))

  const [workers, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshToken')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
    User.countDocuments(query),
  ])

  console.log(`📊 Found ${workers.length} workers (total: ${total})`)
  console.log('📊 Workers:', workers.map(w => ({ name: w.name, status: w.status })))

  res.json({
    success: true,
    data: workers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get single worker with stats
// @route   GET /api/workers/:id
// @access  Private
export const getWorker = asyncHandler(async (req, res) => {
  const worker = await User.findOne({
    _id: req.params.id,
    role: 'Worker',
  }).select('-password -refreshToken')

  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  // Get additional stats
  const [taskStats, attendanceStats] = await Promise.all([
    Task.aggregate([
      { $match: { assignedTo: worker._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Attendance.aggregate([
      { $match: { worker: worker._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$hoursWorked' },
          totalOvertime: { $sum: '$overtime' },
        },
      },
    ]),
  ])

  res.json({
    success: true,
    data: {
      worker,
      stats: {
        tasks: taskStats,
        attendance: attendanceStats,
      },
    },
  })
})

// @desc    Create worker
// @route   POST /api/workers
// @access  Private/Admin
export const createWorker = asyncHandler(async (req, res) => {
  const {
    username, password, name, firstName, lastName, email, phone, department, position, 
    skills, hourlyRate, address, employmentType, experience, dateOfBirth, gender, aadhaar, 
    bankDetails, pfNumber, emergencyContact, role, status,
    paymentType, baseSalary, salaryMonthly, salaryDaily, overtimeRate, 
    workingDaysPerMonth, workingHoursPerDay
  } = req.body

  // Username and password are now required from frontend
  if (!username || !password) {
    res.status(400)
    throw new Error('Username and password are required')
  }

  const normalizedUsername = normalizeUsername(username)
  const normalizedEmail = normalizeEmail(email)

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { username: normalizedUsername },
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
    ],
  }).select('username email')

  if (existingUser) {
    res.status(400)
    if (existingUser.username === normalizedUsername) {
      throw new Error('Username already exists. Please try a different username.')
    }
    if (normalizedEmail && existingUser.email === normalizedEmail) {
      throw new Error(`Email "${normalizedEmail}" is already used by another worker. Please use a different email.`)
    }
    throw new Error('Username or email already exists')
  }

  const worker = await User.create({
    username: normalizedUsername,
    password, // Use password from request (already validated)
    name,
    firstName,
    lastName,
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    phone,
    role: role || 'Worker',
    status: status || 'active',
    department,
    position,
    skills,
    // certifications removed
    hourlyRate,
    address,
    employmentType,
    experience,
    dateOfBirth,
    gender,
    aadhaar,
    bankDetails,
    pfNumber,
    emergencyContact,
    // Salary fields
    paymentType,
    baseSalary,
    salaryMonthly,
    salaryDaily,
    overtimeRate,
    workingDaysPerMonth,
    workingHoursPerDay,
  })

  res.status(201).json({
    success: true,
    data: worker.toPublicProfile(),
    message: `Worker created successfully. Username: ${username}, Password: ${password}`,
  })
})

// @desc    Update worker
// @route   PUT /api/workers/:id
// @access  Private/Admin/Manager
export const updateWorker = asyncHandler(async (req, res) => {
  const worker = await User.findOne({
    _id: req.params.id,
    role: 'Worker',
  })

  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  // Fields that can be updated
  const allowedFields = [
    'name', 'email', 'phone', 'department', 'position',
    'skills', 'certifications', 'address',
    'employmentType', 'experience', 'dateOfBirth', 'gender', 'aadhaar',
    'alternatePhone', 'pan', 'age', 'maritalStatus', 'bloodGroup',
    'bankDetails', 'salary', 'pfNumber', 'emergencyContact',
    // Salary config (needed for salary preview/pay UI)
    'paymentType',
    'baseSalary',
    'salaryMonthly',
    'salaryDaily',
    'hourlyRate',
    'overtimeRate',
    'workingDaysPerMonth',
    'workingHoursPerDay',
  ]

  // Admin can update additional fields
  if (req.user.role === 'Admin') {
    // ENTERPRISE: status changes are admin-only, and inactiveFrom is controlled here as well
    allowedFields.push('status', 'inactiveFrom')
  }

  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  // Normalize email updates: trim/lowercase; allow clearing via empty string -> $unset
  const unset = {}
  if ('email' in updates) {
    const normalizedEmail = normalizeEmail(updates.email)
    if (!normalizedEmail) {
      delete updates.email
      unset.email = 1
    } else {
      updates.email = normalizedEmail
    }
  }

  // ENTERPRISE RULE: Strict inactiveFrom cut-off semantics
  // - When setting status=inactive, inactiveFrom is REQUIRED and normalized to start of day.
  // - When setting status=active, inactiveFrom is cleared (reactivation).
  if (updates.status === 'inactive') {
    const incoming = req.body.inactiveFrom
    if (!incoming) {
      res.status(400)
      throw new Error('Inactive From date is required when setting status to inactive')
    }
    const inactiveFromDate = new Date(incoming)
    if (Number.isNaN(inactiveFromDate.getTime())) {
      res.status(400)
      throw new Error('Invalid inactiveFrom date')
    }
    inactiveFromDate.setHours(0, 0, 0, 0)
    updates.inactiveFrom = inactiveFromDate
  }

  if (updates.status === 'active') {
    updates.inactiveFrom = null
  }

  // If inactiveFrom is provided without status=inactive, ignore it to prevent accidental cut-offs
  if (updates.status !== 'inactive' && 'inactiveFrom' in updates) {
    delete updates.inactiveFrom
  }

  const updateDoc = {
    ...(Object.keys(updates).length ? { $set: updates } : {}),
    ...(Object.keys(unset).length ? { $unset: unset } : {}),
  }

  const updatedWorker = await User.findByIdAndUpdate(
    req.params.id,
    updateDoc,
    { new: true, runValidators: true }
  ).select('-password -refreshToken')

  res.json({
    success: true,
    data: updatedWorker,
  })
})

// @desc    Delete worker
// @route   DELETE /api/workers/:id
// @access  Private/Admin
export const deleteWorker = asyncHandler(async (req, res) => {
  const worker = await User.findOne({
    _id: req.params.id,
    role: 'Worker',
  })

  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  await worker.deleteOne()

  res.json({
    success: true,
    message: 'Worker deleted successfully',
  })
})

// @desc    Get worker tasks
// @route   GET /api/workers/:id/tasks
// @access  Private
export const getWorkerTasks = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 10 } = req.query

  const query = { assignedTo: req.params.id }
  if (status) query.status = status
  if (priority) query.priority = priority

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('project', 'name projectId')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ dueDate: 1 }),
    Task.countDocuments(query),
  ])

  res.json({
    success: true,
    data: tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get worker attendance
// @route   GET /api/workers/:id/attendance
// @access  Private
export const getWorkerAttendance = asyncHandler(async (req, res) => {
  const { month, year, page = 1, limit = 31 } = req.query

  const query = { worker: req.params.id }

  // Filter by month and year if provided
  if (month && year) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    query.date = { $gte: startDate, $lte: endDate }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [attendance, total] = await Promise.all([
    Attendance.find(query)
      .populate('project', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1 }),
    Attendance.countDocuments(query),
  ])

  res.json({
    success: true,
    data: attendance,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

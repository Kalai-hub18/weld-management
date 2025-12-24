import Attendance from '../models/Attendance.js'
import User from '../models/User.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'
import Settings from '../models/Settings.js'
import { isValidIanaTimeZone, zonedLocalToUtcDate, minutesBetween } from '../utils/dateTime.js'
import { DEFAULT_WORKSPACE_ID } from './settingsController.js'

function computeAttendanceDerived(a) {
  const checkInAt = a.checkInAt ? new Date(a.checkInAt) : null
  const checkOutAt = a.checkOutAt ? new Date(a.checkOutAt) : null
  const isActive = !!checkInAt && !checkOutAt
  const durationMinutes = checkInAt && checkOutAt ? Math.max(0, minutesBetween(checkInAt, checkOutAt)) : null
  const durationHours = durationMinutes !== null ? durationMinutes / 60 : null
  const standardHours = 8
  const overtimeHours = durationHours !== null ? Math.max(0, durationHours - standardHours) : null
  return { isActive, durationMinutes, durationHours, overtimeHours }
}

async function getWorkspaceTimeZone(req) {
  const workspaceId = req.headers['x-workspace-id'] || DEFAULT_WORKSPACE_ID
  const settings = await Settings.findOne({ workspaceId })
  const tz = settings?.dateTime?.timezone
  return isValidIanaTimeZone(tz) ? tz : 'UTC'
}

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private/Admin/Manager
export const getAttendance = asyncHandler(async (req, res) => {
  const { worker, workerId, date, month, year, status, page = 1, limit = 20, includeInactive } = req.query

  const query = {}

  // frontend may send `workerId` instead of `worker`
  if (worker || workerId) query.worker = worker || workerId
  if (status) query.status = status

  // Date filtering
  let attendanceDate = null
  if (date) {
    query.date = new Date(date)
    attendanceDate = new Date(date)
  } else if (month && year) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    query.date = { $gte: startDate, $lte: endDate }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  // Fetch attendance with worker population (include inactiveFrom)
  const [attendance, total] = await Promise.all([
    Attendance.find(query)
      .populate('worker', 'name employeeId department status inactiveFrom')
      .populate('project', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1 }),
    Attendance.countDocuments(query),
  ])

  // ENTERPRISE RULE: Date-based inactive worker filtering
  // Show worker ONLY IF:
  // - worker.status = 'active'
  // OR
  // - worker.status = 'inactive' AND attendance_date < worker.inactiveFrom
  let filteredAttendance = attendance
  if (includeInactive !== 'true') {
    filteredAttendance = attendance.filter(a => {
      if (!a.worker) return false
      
      // Active workers always visible
      if (a.worker.status === 'active') return true
      
      // Inactive workers: only show if attendance date is before inactiveFrom
      if (a.worker.status === 'inactive' && a.worker.inactiveFrom) {
        const recordDate = new Date(a.date)
        const inactiveFromDate = new Date(a.worker.inactiveFrom)
        // Set time to start of day for accurate comparison
        recordDate.setHours(0, 0, 0, 0)
        inactiveFromDate.setHours(0, 0, 0, 0)
        return recordDate < inactiveFromDate
      }

      // ENTERPRISE DATA INTEGRITY: Preserve visibility of existing historical attendance records
      // even for legacy inactive workers without an inactiveFrom date.
      // (Creation/editing is blocked elsewhere; this is only about viewing existing records.)
      if (a.worker.status === 'inactive' && !a.worker.inactiveFrom) return true

      return false
    })
  }

  res.json({
    success: true,
    data: filteredAttendance.map(a => ({ ...a.toObject(), ...computeAttendanceDerived(a) })),
    message: 'Attendance loaded successfully',
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredAttendance.length,
      pages: Math.ceil(filteredAttendance.length / parseInt(limit)),
    },
  })
})

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
export const getAttendanceById = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id)
    .populate('worker', 'name employeeId department position')
    .populate('project', 'name')
    .populate('approvedBy', 'name')

  if (!attendance) {
    res.status(404)
    throw new Error('Attendance record not found')
  }

  res.json({
    success: true,
    data: { ...attendance.toObject(), ...computeAttendanceDerived(attendance) },
    message: 'Attendance record loaded successfully',
  })
})

// @desc    Mark attendance (check-in/check-out)
// @route   POST /api/attendance
// @access  Private
export const markAttendance = asyncHandler(async (req, res) => {
  const { workerId, date, checkIn, checkOut, checkInAt, checkOutAt, timeZone, status, notes } = req.body

  // Validation: Status is required
  if (!status) {
    res.status(400)
    throw new Error('Status is required')
  }

  // Workers can only mark their own attendance
  const targetWorkerId = req.user.role === 'Worker' ? req.user._id : workerId

  // Verify worker exists
  const worker = await User.findById(targetWorkerId)
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  const attendanceDate = date ? new Date(date) : new Date()
  attendanceDate.setHours(0, 0, 0, 0)

  // ENTERPRISE RULE: Date-based attendance validation
  // Cannot mark attendance if:
  // 1. Worker is inactive AND attendance date >= inactiveFrom
  if (worker.status === 'inactive' && worker.inactiveFrom) {
    const inactiveFromDate = new Date(worker.inactiveFrom)
    inactiveFromDate.setHours(0, 0, 0, 0)
    
    if (attendanceDate >= inactiveFromDate) {
      res.status(400)
      throw new Error(`Cannot mark attendance for inactive worker on or after ${inactiveFromDate.toISOString().split('T')[0]}. Worker became inactive from this date.`)
    }
  }
  
  // 2. Worker is inactive without inactiveFrom date (legacy data)
  if (worker.status === 'inactive' && !worker.inactiveFrom) {
    res.status(400)
    throw new Error(`Cannot mark attendance for inactive worker. Please set inactive date first.`)
  }

  const tz = (timeZone && isValidIanaTimeZone(timeZone)) ? timeZone : await getWorkspaceTimeZone(req)

  // Normalize incoming timestamps:
  // - prefer explicit checkInAt/checkOutAt (ISO)
  // - fallback: date + HH:MM + timezone -> compute UTC Date
  const dateStr = attendanceDate.toISOString().split('T')[0]
  const normalizedCheckInAt = checkInAt
    ? new Date(checkInAt)
    : (checkIn ? zonedLocalToUtcDate({ dateStr, timeStr: checkIn, timeZone: tz }) : null)
  const normalizedCheckOutAt = checkOutAt
    ? new Date(checkOutAt)
    : (checkOut ? zonedLocalToUtcDate({ dateStr, timeStr: checkOut, timeZone: tz }) : null)

  // Check if attendance already exists for this date
  let attendance = await Attendance.findOne({
    worker: targetWorkerId,
    date: attendanceDate,
  })
  const isCreate = !attendance

  if (attendance) {
    // Update existing record
    if (checkIn !== undefined) attendance.checkIn = checkIn
    if (checkOut !== undefined) attendance.checkOut = checkOut
    if (normalizedCheckInAt) attendance.checkInAt = normalizedCheckInAt
    if (normalizedCheckOutAt) attendance.checkOutAt = normalizedCheckOutAt
    if (status) attendance.status = status
    if (notes !== undefined) attendance.notes = notes
    // Project field removed - no longer updated
    
    await attendance.save()
  } else {
    // Create new record
    attendance = await Attendance.create({
      worker: targetWorkerId,
      date: attendanceDate,
      checkIn,
      checkOut,
      checkInAt: normalizedCheckInAt || undefined,
      checkOutAt: normalizedCheckOutAt || undefined,
      status: status || 'present',
      notes,
      // Project field removed - no longer set
    })
  }

  const populatedAttendance = await Attendance.findById(attendance._id)
    .populate('worker', 'name employeeId')
    .populate('project', 'name')

  res.status(isCreate ? 201 : 200).json({
    success: true,
    data: { ...populatedAttendance.toObject(), ...computeAttendanceDerived(populatedAttendance) },
    message: isCreate ? 'Attendance marked successfully' : 'Attendance updated successfully',
  })
})

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin/Manager
export const updateAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id)

  if (!attendance) {
    res.status(404)
    throw new Error('Attendance record not found')
  }

  // ENTERPRISE RULE: Hard cut-off enforcement for updates
  // If worker is inactive and record date >= inactiveFrom, block edits/re-mark.
  const worker = await User.findById(attendance.worker)
  if (worker?.status === 'inactive') {
    if (!worker.inactiveFrom) {
      res.status(400)
      throw new Error('Cannot edit attendance for inactive worker. Please set inactive date first.')
    }
    const recordDate = new Date(attendance.date)
    const inactiveFromDate = new Date(worker.inactiveFrom)
    recordDate.setHours(0, 0, 0, 0)
    inactiveFromDate.setHours(0, 0, 0, 0)
    if (recordDate >= inactiveFromDate) {
      res.status(400)
      throw new Error(`Cannot edit attendance on or after ${inactiveFromDate.toISOString().split('T')[0]}. Worker became inactive from this date.`)
    }
  }

  const updatedAttendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('worker', 'name employeeId')
    .populate('project', 'name')

  res.json({
    success: true,
    data: { ...updatedAttendance.toObject(), ...computeAttendanceDerived(updatedAttendance) },
    message: 'Attendance updated successfully',
  })
})

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Admin
export const deleteAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id)

  if (!attendance) {
    res.status(404)
    throw new Error('Attendance record not found')
  }

  // ENTERPRISE RULE: Hard cut-off enforcement for deletes as well (deletion is a modification).
  const worker = await User.findById(attendance.worker)
  if (worker?.status === 'inactive') {
    if (!worker.inactiveFrom) {
      res.status(400)
      throw new Error('Cannot delete attendance for inactive worker. Please set inactive date first.')
    }
    const recordDate = new Date(attendance.date)
    const inactiveFromDate = new Date(worker.inactiveFrom)
    recordDate.setHours(0, 0, 0, 0)
    inactiveFromDate.setHours(0, 0, 0, 0)
    if (recordDate >= inactiveFromDate) {
      res.status(400)
      throw new Error(`Cannot delete attendance on or after ${inactiveFromDate.toISOString().split('T')[0]}. Worker became inactive from this date.`)
    }
  }

  await attendance.deleteOne()

  res.json({
    success: true,
    message: 'Attendance record deleted successfully',
  })
})

// @desc    Get today's attendance summary
// @route   GET /api/attendance/today
// @access  Private/Admin/Manager
export const getTodayAttendance = asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const attendance = await Attendance.find({
    date: { $gte: today, $lt: tomorrow },
  }).populate('worker', 'name employeeId department')

  // ENTERPRISE RULE: Date-based worker eligibility for today
  // totalWorkers should match who is eligible to be marked today.
  const totalWorkers = await User.countDocuments({
    role: 'Worker',
    $or: [
      { status: 'active' },
      { status: 'inactive', inactiveFrom: { $gt: today } },
    ],
  })
  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount = attendance.filter(a => a.status === 'absent').length
  const onLeaveCount = attendance.filter(a => a.status === 'on-leave').length
  const notMarked = totalWorkers - attendance.length

  res.json({
    success: true,
    data: {
      records: attendance.map(a => ({ ...a.toObject(), ...computeAttendanceDerived(a) })),
      summary: {
        total: totalWorkers,
        present: presentCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        notMarked,
      },
    },
  })
})

// @desc    Get my attendance (for workers)
// @route   GET /api/attendance/my
// @access  Private/Worker
export const getMyAttendance = asyncHandler(async (req, res) => {
  const { month, year, page = 1, limit = 31 } = req.query

  const query = { worker: req.user._id }

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

  // Calculate summary
  const summary = await Attendance.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
        },
        totalHours: { $sum: '$hoursWorked' },
        totalOvertime: { $sum: '$overtime' },
      },
    },
  ])

  res.json({
    success: true,
    data: attendance.map(a => ({ ...a.toObject(), ...computeAttendanceDerived(a) })),
    summary: summary[0] || {
      totalDays: 0,
      presentDays: 0,
      totalHours: 0,
      totalOvertime: 0,
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get attendance stats
// @route   GET /api/attendance/stats
// @access  Private/Admin/Manager
export const getAttendanceStats = asyncHandler(async (req, res) => {
  const { month, year } = req.query

  let matchQuery = {}
  if (month && year) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    matchQuery.date = { $gte: startDate, $lte: endDate }
  }

  const stats = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
        },
        onLeaveCount: {
          $sum: { $cond: [{ $eq: ['$status', 'on-leave'] }, 1, 0] },
        },
        totalHoursWorked: { $sum: '$hoursWorked' },
        totalOvertime: { $sum: '$overtime' },
      },
    },
  ])

  res.json({
    success: true,
    data: stats[0] || {
      totalRecords: 0,
      presentCount: 0,
      absentCount: 0,
      onLeaveCount: 0,
      totalHoursWorked: 0,
      totalOvertime: 0,
    },
  })
})

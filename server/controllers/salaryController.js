import Salary from '../models/Salary.js'
import User from '../models/User.js'
import Attendance from '../models/Attendance.js'
import SalaryPayment from '../models/SalaryPayment.js'
import Settings from '../models/Settings.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

function startOfLocalDayFromDate(dt) {
  const d = new Date(dt)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDateOnlyLocal(dateStr) {
  const [y, m, d] = String(dateStr || '').split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function ymd(dt) {
  const d = new Date(dt)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ym(dt) {
  const d = new Date(dt)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatDmy(dateStr) {
  const [y, m, d] = String(dateStr || '').split('-')
  if (!y || !m || !d) return dateStr
  return `${d}-${m}-${y}`
}

function getWeekRange(dateStr, weekStartDay = 'monday') {
  const d = parseDateOnlyLocal(dateStr)
  const day = d.getDay() // 0 Sunday ... 6 Saturday
  const mondayOffset = (day + 6) % 7
  const sundayOffset = day
  const offset = String(weekStartDay).toLowerCase() === 'sunday' ? sundayOffset : mondayOffset
  const start = new Date(d)
  start.setDate(start.getDate() - offset)
  start.setHours(0, 0, 0, 0)
  const endExclusive = new Date(start)
  endExclusive.setDate(endExclusive.getDate() + 7)
  return { start, endExclusive }
}

async function getWorkspaceWeekStartDay(workspaceId = 'default') {
  try {
    const s = await Settings.findOne({ workspaceId }).select('dateTime').lean()
    const v = s?.dateTime?.weekStartDay
    return v === 'sunday' ? 'sunday' : 'monday'
  } catch {
    return 'monday'
  }
}

function computeStatus({ netSalary, paidAmount }) {
  const net = Number(netSalary || 0)
  const paid = Number(paidAmount || 0)
  if (paid >= net && net > 0) return 'paid'
  if (paid > 0 && paid < net) return 'partial'
  return 'pending'
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100
}

async function buildPayrollRowsForRange({ start, endExclusive, workerId, includeMonthlySalaryOverlay = false, monthKey }) {
  const endInclusive = new Date(endExclusive)
  endInclusive.setDate(endInclusive.getDate() - 1)

  const workerQuery = {
    role: 'Worker',
    ...(workerId ? { _id: workerId } : {}),
    // overlap: joinDate <= endInclusive AND (inactiveFrom is null OR inactiveFrom > start)
    $and: [
      { joinDate: { $lte: endInclusive } },
      { $or: [{ inactiveFrom: null }, { inactiveFrom: { $gt: start } }] },
    ],
  }

  const workers = await User.find(workerQuery)
    .select('name employeeId department position paymentType salaryMonthly salaryDaily hourlyRate overtimeRate workingDaysPerMonth workingHoursPerDay joinDate inactiveFrom status')
    .lean()

  const ids = workers.map((w) => w._id)
  if (ids.length === 0) {
    return { workers: [], rows: [] }
  }

  const attAgg = await Attendance.aggregate([
    {
      $match: {
        worker: { $in: ids },
        date: { $gte: start, $lt: endExclusive },
        status: { $in: ['present', 'half-day'] },
      },
    },
    {
      $group: {
        _id: '$worker',
        presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        halfDays: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
        approvedOvertimeHours: { $sum: { $cond: ['$isApproved', '$overtime', 0] } },
      },
    },
  ])
  const byWorker = new Map(attAgg.map((r) => [String(r._id), r]))

  const payAgg = await SalaryPayment.aggregate([
    {
      $match: {
        workerId: { $in: ids },
        isVoided: false,
        type: { $in: ['full', 'partial', 'adhoc'] },
        payDate: { $gte: start, $lt: endExclusive },
      },
    },
    {
      $group: {
        _id: '$workerId',
        paidAmount: { $sum: '$netAmount' },
      },
    },
  ])
  const paidByWorker = new Map(payAgg.map((r) => [String(r._id), Number(r.paidAmount || 0)]))

  let salaryByWorker = new Map()
  if (includeMonthlySalaryOverlay && monthKey) {
    const monthly = await Salary.find({ month: monthKey, worker: { $in: ids } }).lean()
    salaryByWorker = new Map(monthly.map((s) => [String(s.worker), s]))
  }

  const rows = workers.map((w) => {
    const stats = byWorker.get(String(w._id)) || { presentDays: 0, halfDays: 0, approvedOvertimeHours: 0 }
    const daysWorked = Number(stats.presentDays || 0) + 0.5 * Number(stats.halfDays || 0)

    const paymentType = w.paymentType || 'Monthly'
    const workingDaysPerMonth = Number(w.workingDaysPerMonth || 26)
    const workingHoursPerDay = Number(w.workingHoursPerDay || 8)

    const monthly = Number(w.salaryMonthly || 0)
    const daily = Number(w.salaryDaily || 0)

    const perDayRate = paymentType === 'Monthly' && workingDaysPerMonth > 0
      ? (monthly / workingDaysPerMonth)
      : daily

    const basePayComputed = perDayRate * daysWorked
    const hourlyRate = Number(w.hourlyRate || 0) || (workingHoursPerDay > 0 ? (perDayRate / workingHoursPerDay) : 0)
    const overtimeRate = Number(w.overtimeRate || 0) || hourlyRate * 1.5
    const overtimeHours = Number(stats.approvedOvertimeHours || 0)
    const overtimePayComputed = overtimeHours * overtimeRate

    const overlay = includeMonthlySalaryOverlay ? salaryByWorker.get(String(w._id)) : null

    const bonus = overlay ? Number(overlay.bonus || 0) : 0
    const deductions = overlay ? Number(overlay.deductions || 0) : 0

    const baseSalary = overlay ? Number(overlay.baseSalary || 0) : round2(basePayComputed)
    const overtime = overlay ? Number(overlay.overtime || 0) : round2(overtimePayComputed)
    const grossSalary = round2(baseSalary + overtime + bonus)
    const netSalary = overlay ? Number(overlay.netSalary || 0) : round2(grossSalary - deductions)

    const paidAmount = overlay ? Number(overlay.paidAmount || 0) : round2(paidByWorker.get(String(w._id)) || 0)
    const status = overlay ? (overlay.status || 'pending') : computeStatus({ netSalary, paidAmount })

    return {
      worker: {
        _id: w._id,
        name: w.name,
        employeeId: w.employeeId,
        department: w.department,
        position: w.position,
        paymentType: w.paymentType,
      },
      attendance: {
        // workingDays is a UI concern; backend returns actual counts for the period
        presentDays: round2(daysWorked),
        presentFullDays: Number(stats.presentDays || 0),
        halfDays: Number(stats.halfDays || 0),
      },
      overtime: {
        hours: round2(overtimeHours),
        amount: round2(overtime),
      },
      bonus,
      deductions,
      baseSalary,
      grossSalary,
      netSalary,
      paidAmount,
      status,
      month: overlay?.month || undefined,
      paidDate: overlay?.paidDate || undefined,
      paymentMethod: overlay?.paymentMethod || undefined,
      notes: overlay?.notes || undefined,
    }
  })

  return { workers, rows }
}

// @desc    Get computed payroll view for a selected period (Daily/Weekly/Monthly/Yearly)
// @route   GET /api/salary/payroll-view?period=daily|weekly|monthly|yearly&date=...
// @access  Private (permission: canViewSalary/canManageSalary)
export const getPayrollView = asyncHandler(async (req, res) => {
  const { period = 'monthly', date, worker, workerId, status, workspaceId } = req.query

  if (!date) {
    res.status(400)
    throw new Error('date is required')
  }

  const workerFilter = worker || workerId

  const p = String(period).toLowerCase()
  let start
  let endExclusive
  let label = ''
  let monthKey = null

  if (p === 'daily') {
    start = parseDateOnlyLocal(date)
    endExclusive = new Date(start)
    endExclusive.setDate(endExclusive.getDate() + 1)
    label = `Payroll for Date: ${formatDmy(ymd(start))}`
  } else if (p === 'weekly') {
    const weekStartDay = await getWorkspaceWeekStartDay(workspaceId || 'default')
    ;({ start, endExclusive } = getWeekRange(date, weekStartDay))
    const endInclusive = new Date(endExclusive)
    endInclusive.setDate(endInclusive.getDate() - 1)
    label = `Payroll for Week: ${formatDmy(ymd(start))} to ${formatDmy(ymd(endInclusive))}`
  } else if (p === 'yearly') {
    const y = Number(String(date).slice(0, 4))
    start = new Date(y, 0, 1)
    start.setHours(0, 0, 0, 0)
    endExclusive = new Date(y + 1, 0, 1)
    endExclusive.setHours(0, 0, 0, 0)
    label = `Payroll for Year: ${y}`
  } else {
    // monthly (default)
    const [y, m] = String(date).split('-').map(Number)
    start = new Date(y, (m || 1) - 1, 1)
    start.setHours(0, 0, 0, 0)
    endExclusive = new Date(y, (m || 1), 1)
    endExclusive.setHours(0, 0, 0, 0)
    monthKey = `${y}-${String(m || 1).padStart(2, '0')}`
    label = `Payroll for Month: ${monthKey}`
  }

  const includeMonthlySalaryOverlay = p === 'monthly'

  const { rows } = await buildPayrollRowsForRange({
    start,
    endExclusive,
    workerId: workerFilter,
    includeMonthlySalaryOverlay,
    monthKey,
  })

  const filteredByStatus = status && status !== 'all'
    ? rows.filter((r) => r.status === status)
    : rows

  const totalWorkers = filteredByStatus.length
  const totalGross = round2(filteredByStatus.reduce((s, r) => s + (r.grossSalary || 0), 0))
  const totalDeductions = round2(filteredByStatus.reduce((s, r) => s + (r.deductions || 0), 0))
  const totalNet = round2(filteredByStatus.reduce((s, r) => s + (r.netSalary || 0), 0))
  const totalOTHours = round2(filteredByStatus.reduce((s, r) => s + (r.overtime?.hours || 0), 0))
  const totalOTAmount = round2(filteredByStatus.reduce((s, r) => s + (r.overtime?.amount || 0), 0))
  const totalBonus = round2(filteredByStatus.reduce((s, r) => s + (r.bonus || 0), 0))
  const avgSalary = totalWorkers ? round2(totalNet / totalWorkers) : 0
  const paid = filteredByStatus.filter((r) => r.status === 'paid').length
  const processing = filteredByStatus.filter((r) => r.status === 'partial').length
  const pending = filteredByStatus.filter((r) => r.status === 'pending').length

  let yearSummary = undefined

  if (p === 'yearly') {
    // month-wise summary for the year (attendance-driven)
    const months = []
    const year = start.getFullYear()
    for (let i = 0; i < 12; i++) {
      const ms = new Date(year, i, 1)
      ms.setHours(0, 0, 0, 0)
      const me = new Date(year, i + 1, 1)
      me.setHours(0, 0, 0, 0)

      const mk = ym(ms)
      const { rows: monthRows } = await buildPayrollRowsForRange({
        start: ms,
        endExclusive: me,
        workerId: workerFilter,
        includeMonthlySalaryOverlay: false,
        monthKey: null,
      })

      months.push({
        month: mk,
        label: mk,
        totalWorkers: monthRows.length,
        totalGross: round2(monthRows.reduce((s, r) => s + (r.grossSalary || 0), 0)),
        totalDeductions: round2(monthRows.reduce((s, r) => s + (r.deductions || 0), 0)),
        totalNet: round2(monthRows.reduce((s, r) => s + (r.netSalary || 0), 0)),
        totalOTHours: round2(monthRows.reduce((s, r) => s + (r.overtime?.hours || 0), 0)),
      })
    }
    yearSummary = months
  }

  res.json({
    success: true,
    data: {
      period: p,
      label,
      range: {
        start: ymd(start),
        endExclusive: ymd(endExclusive),
      },
      rows: filteredByStatus,
      summary: {
        totalWorkers,
        totalGross,
        totalDeductions,
        totalNet,
        totalOTHours,
        totalOTAmount,
        totalBonus,
        avgSalary,
        paid,
        processing,
        pending,
      },
      ...(yearSummary ? { yearSummary } : {}),
    },
  })
})

// @desc    Get all salary records
// @route   GET /api/salary
// @access  Private/Admin/Manager(read-only)
export const getSalaries = asyncHandler(async (req, res) => {
  const { worker, workerId, month, status, page = 1, limit = 10 } = req.query

  const query = {}

  // frontend may send `workerId` instead of `worker`
  if (worker || workerId) query.worker = worker || workerId
  if (month) query.month = month
  if (status) query.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [salaries, total] = await Promise.all([
    Salary.find(query)
      .populate('worker', 'name employeeId department position hourlyRate')
      .populate('processedBy', 'name')
      .populate('approvedBy', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ month: -1, createdAt: -1 }),
    Salary.countDocuments(query),
  ])

  res.json({
    success: true,
    data: salaries,
    message: 'Salary records loaded successfully',
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get single salary record
// @route   GET /api/salary/:id
// @access  Private/Admin
export const getSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findById(req.params.id)
    .populate('worker', 'name employeeId department position hourlyRate')
    .populate('processedBy', 'name')
    .populate('approvedBy', 'name')

  if (!salary) {
    res.status(404)
    throw new Error('Salary record not found')
  }

  res.json({
    success: true,
    data: salary,
    message: 'Salary record loaded successfully',
  })
})

// @desc    Create salary record
// @route   POST /api/salary
// @access  Private/Admin
export const createSalary = asyncHandler(async (req, res) => {
  const {
    workerId, month, baseSalary, overtime, bonus, deductions,
    deductionDetails, bonusDetails, notes,
  } = req.body

  // Verify worker exists
  const worker = await User.findById(workerId)
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  // Check if salary record already exists for this month
  const existingSalary = await Salary.findOne({ worker: workerId, month })
  if (existingSalary) {
    res.status(400)
    throw new Error(`Salary record for ${month} already exists for this worker`)
  }

  // Calculate hours from attendance (optional)
  const [year, monthNum] = month.split('-')
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0)

  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        worker: worker._id,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hoursWorked' },
        totalOvertime: { $sum: '$overtime' },
      },
    },
  ])

  const salary = await Salary.create({
    worker: workerId,
    month,
    baseSalary,
    overtime: overtime || 0,
    bonus: bonus || 0,
    deductions: deductions || 0,
    deductionDetails,
    bonusDetails,
    notes,
    hoursWorked: attendanceStats[0]?.totalHours || 0,
    overtimeHours: attendanceStats[0]?.totalOvertime || 0,
    processedBy: req.user._id,
  })

  const populatedSalary = await Salary.findById(salary._id)
    .populate('worker', 'name employeeId')
    .populate('processedBy', 'name')

  res.status(201).json({
    success: true,
    data: populatedSalary,
    message: 'Salary record created successfully',
  })
})

// @desc    Update salary record
// @route   PUT /api/salary/:id
// @access  Private/Admin
export const updateSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findById(req.params.id)

  if (!salary) {
    res.status(404)
    throw new Error('Salary record not found')
  }

  // Don't allow updates to paid salaries (unless admin override)
  if (salary.status === 'paid' && !req.body.forceUpdate) {
    res.status(400)
    throw new Error('Cannot update a paid salary record')
  }

  const updatedSalary = await Salary.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('worker', 'name employeeId')
    .populate('processedBy', 'name')

  res.json({
    success: true,
    data: updatedSalary,
    message: 'Salary record updated successfully',
  })
})

// @desc    Delete salary record
// @route   DELETE /api/salary/:id
// @access  Private/Admin
export const deleteSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findById(req.params.id)

  if (!salary) {
    res.status(404)
    throw new Error('Salary record not found')
  }

  // Don't allow deleting paid salaries
  if (salary.status === 'paid') {
    res.status(400)
    throw new Error('Cannot delete a paid salary record')
  }

  await salary.deleteOne()

  res.json({
    success: true,
    message: 'Salary record deleted successfully',
  })
})

// @desc    Process payment
// @route   PUT /api/salary/:id/pay
// @access  Private/Admin
export const processSalaryPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod } = req.body

  const salary = await Salary.findById(req.params.id)

  if (!salary) {
    res.status(404)
    throw new Error('Salary record not found')
  }

  salary.paidAmount += amount
  salary.paymentMethod = paymentMethod
  salary.paidDate = new Date()
  salary.approvedBy = req.user._id

  await salary.save()

  const updatedSalary = await Salary.findById(salary._id)
    .populate('worker', 'name employeeId')
    .populate('approvedBy', 'name')

  res.json({
    success: true,
    data: updatedSalary,
    message: salary.status === 'paid' ? 'Salary paid in full' : 'Partial payment processed',
  })
})

// @desc    Get my salary (for workers)
// @route   GET /api/salary/my
// @access  Private/Worker
export const getMySalary = asyncHandler(async (req, res) => {
  const { year, page = 1, limit = 12 } = req.query

  const query = { worker: req.user._id }

  if (year) {
    query.month = { $regex: `^${year}` }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [salaries, total] = await Promise.all([
    Salary.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ month: -1 }),
    Salary.countDocuments(query),
  ])

  // Calculate totals
  const summary = await Salary.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: '$netSalary' },
        totalPaid: { $sum: '$paidAmount' },
        totalPending: {
          $sum: { $subtract: ['$netSalary', '$paidAmount'] },
        },
      },
    },
  ])

  res.json({
    success: true,
    data: salaries,
    summary: summary[0] || {
      totalEarned: 0,
      totalPaid: 0,
      totalPending: 0,
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get salary stats
// @route   GET /api/salary/stats
// @access  Private/Admin
export const getSalaryStats = asyncHandler(async (req, res) => {
  const { month } = req.query

  let matchQuery = {}
  if (month) {
    matchQuery.month = month
  }

  const stats = await Salary.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalBaseSalary: { $sum: '$baseSalary' },
        totalOvertime: { $sum: '$overtime' },
        totalBonus: { $sum: '$bonus' },
        totalDeductions: { $sum: '$deductions' },
        totalNetSalary: { $sum: '$netSalary' },
        totalPaid: { $sum: '$paidAmount' },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
      },
    },
  ])

  res.json({
    success: true,
    data: stats[0] || {
      totalRecords: 0,
      totalBaseSalary: 0,
      totalOvertime: 0,
      totalBonus: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      totalPaid: 0,
      paidCount: 0,
      pendingCount: 0,
    },
  })
})

// @desc    Generate salary for all workers
// @route   POST /api/salary/generate
// @access  Private/Admin
export const generateMonthlySalary = asyncHandler(async (req, res) => {
  const { month } = req.body

  if (!month) {
    res.status(400)
    throw new Error('Month is required (format: YYYY-MM)')
  }

  // Get all active workers
  const workers = await User.find({ role: 'Worker', status: 'active' })

  const [year, monthNum] = month.split('-')
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0)

  const results = []

  for (const worker of workers) {
    // Check if salary already exists
    const existing = await Salary.findOne({ worker: worker._id, month })
    if (existing) {
      results.push({ worker: worker.name, status: 'skipped', reason: 'Already exists' })
      continue
    }

    // Calculate from attendance
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          worker: worker._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hoursWorked' },
          totalOvertime: { $sum: '$overtime' },
        },
      },
    ])

    const hours = attendanceStats[0]?.totalHours || 0
    const overtimeHours = attendanceStats[0]?.totalOvertime || 0

    const baseSalary = hours * (worker.hourlyRate || 0)
    const overtimePay = overtimeHours * (worker.hourlyRate || 0) * 1.5

    try {
      const salary = await Salary.create({
        worker: worker._id,
        month,
        baseSalary,
        overtime: overtimePay,
        hoursWorked: hours,
        overtimeHours,
        processedBy: req.user._id,
      })

      results.push({ worker: worker.name, status: 'created', salaryId: salary._id })
    } catch (error) {
      results.push({ worker: worker.name, status: 'error', reason: error.message })
    }
  }

  res.json({
    success: true,
    message: `Salary generation completed for ${month}`,
    data: results,
  })
})

import Attendance from '../models/Attendance.js'
import User from '../models/User.js'

/**
 * Calculate salary invoice based on attendance records
 * @param {ObjectId} workerId - Worker's user ID
 * @param {Date} periodFrom - Start date of salary period
 * @param {Date} periodTo - End date of salary period
 * @returns {Object} Salary breakdown
 */
export const calculateSalaryInvoice = async (workerId, periodFrom, periodTo) => {
  // Fetch worker details
  const worker = await User.findById(workerId)
  if (!worker) {
    throw new Error('Worker not found')
  }

  const startOfDay = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }

  const maxDate = (a, b) => (a.getTime() >= b.getTime() ? a : b)

  // ENTERPRISE RULE: Adjust period start if worker joined during the period (ignore pre-join attendance)
  let effectivePeriodFrom = startOfDay(periodFrom)
  if (worker.joinDate) {
    effectivePeriodFrom = maxDate(effectivePeriodFrom, startOfDay(worker.joinDate))
  }

  // ENTERPRISE RULE: Adjust period end date if worker became inactive during the period
  let effectivePeriodTo = startOfDay(periodTo)
  if (worker.status === 'inactive' && worker.inactiveFrom) {
    const inactiveFromDate = new Date(worker.inactiveFrom)
    inactiveFromDate.setHours(0, 0, 0, 0)
    
    // If worker became inactive before period end, only calculate up to day before inactive date
    if (inactiveFromDate <= effectivePeriodTo) {
      const dayBeforeInactive = new Date(inactiveFromDate)
      dayBeforeInactive.setDate(dayBeforeInactive.getDate() - 1)
      effectivePeriodTo = dayBeforeInactive
      console.log(`Worker became inactive on ${inactiveFromDate.toISOString().split('T')[0]}. Calculating salary only up to ${effectivePeriodTo.toISOString().split('T')[0]}`)
    }
  }

  // If no active overlap in the selected period, salary should be zero
  if (effectivePeriodTo.getTime() < effectivePeriodFrom.getTime()) {
    return {
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        employeeId: worker.employeeId,
      },
      salaryBreakdown: {
        salaryType: String(worker.paymentType || 'Monthly').toLowerCase() === 'daily' ? 'daily' : 'monthly',
        baseSalaryRate: 0,
        workingDaysInPeriod: 0,
        presentDays: 0,
        absentDays: 0,
        halfDays: 0,
        overtimeHours: 0,
        overtimeRate: worker.overtimeRate || worker.hourlyRate || 0,
        overtimeAmount: 0,
        baseSalaryAmount: 0,
        deductions: 0,
        deductionNotes: '',
        netPay: 0,
      },
      period: { from: periodFrom, to: periodTo },
      attendanceRecords: 0,
    }
  }

  // Fetch attendance records for the period (up to effective end date)
  const attendanceRecords = await Attendance.find({
    // Attendance model uses `worker` field (ObjectId -> User)
    worker: workerId,
    date: {
      $gte: effectivePeriodFrom,
      $lte: effectivePeriodTo,
    },
    status: { $in: ['present', 'half-day'] },
  })

  // Calculate working days in period
  const start = new Date(periodFrom)
  const end = new Date(periodTo)
  const workingDaysInPeriod = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

  // Count attendance
  let presentDays = 0
  let absentDays = 0
  let halfDays = 0
  let overtimeHours = 0

  attendanceRecords.forEach((record) => {
    if (record.status === 'present') {
      presentDays++
      // Attendance model uses `overtime` and approval flag `isApproved`
      overtimeHours += record.isApproved ? (record.overtime || 0) : 0
    } else if (record.status === 'half-day') {
      halfDays++
      presentDays += 0.5
      overtimeHours += record.isApproved ? (record.overtime || 0) : 0
    } else if (record.status === 'absent') {
      absentDays++
    }
  })

  // Normalize salary type to match Invoice schema enum ['daily','monthly']
  const salaryTypeRaw = worker.paymentType || 'Monthly'
  const salaryType =
    String(salaryTypeRaw).toLowerCase() === 'daily' ? 'daily' : 'monthly'
  const dailySalary = worker.salaryDaily || 0
  const monthlySalary = worker.salaryMonthly || 0
  const hourlyRate = worker.hourlyRate || 0
  const overtimeRate = worker.overtimeRate || hourlyRate * 1.5
  const workingDaysPerMonth = worker.workingDaysPerMonth || 26

  // Calculate base salary
  let baseSalaryAmount = 0
  let baseSalaryRate = 0

  if (salaryType === 'daily') {
    baseSalaryRate = dailySalary
    baseSalaryAmount = dailySalary * presentDays
  } else if (salaryType === 'monthly') {
    baseSalaryRate = monthlySalary
    // For monthly, calculate per-day rate based on standard working days per month
    const perDayRate = monthlySalary / workingDaysPerMonth
    baseSalaryAmount = perDayRate * presentDays
  }

  // Calculate overtime amount
  const overtimeAmount = overtimeRate * overtimeHours

  // Calculate net pay (no deductions by default)
  const deductions = 0
  const netPay = baseSalaryAmount + overtimeAmount - deductions

  return {
    worker: {
      id: worker._id,
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      employeeId: worker.employeeId,
    },
    salaryBreakdown: {
      salaryType,
      baseSalaryRate,
      workingDaysInPeriod,
      presentDays,
      absentDays,
      halfDays,
      overtimeHours,
      overtimeRate,
      overtimeAmount,
      baseSalaryAmount,
      deductions,
      deductionNotes: '',
      netPay,
    },
    period: {
      from: periodFrom,
      to: periodTo,
    },
    attendanceRecords: attendanceRecords.length,
  }
}

/**
 * Validate salary period
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Object} Validation result
 */
export const validateSalaryPeriod = (from, to) => {
  const start = new Date(from)
  const end = new Date(to)
  const today = new Date()

  const errors = []

  if (start > end) {
    errors.push('Start date must be before end date')
  }

  if (end > today) {
    errors.push('End date cannot be in the future')
  }

  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  if (daysDiff > 31) {
    errors.push('Salary period cannot exceed 31 days')
  }

  if (daysDiff < 1) {
    errors.push('Salary period must be at least 1 day')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get suggested salary periods (current month, last month, custom)
 * @returns {Array} Suggested periods
 */
export const getSuggestedSalaryPeriods = () => {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  // Current month (1st to today)
  const currentMonthStart = new Date(currentYear, currentMonth, 1)
  const currentMonthEnd = new Date(today)

  // Last month (1st to last day)
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1)
  const lastMonthEnd = new Date(currentYear, currentMonth, 0)

  // Last 30 days
  const last30DaysStart = new Date(today)
  last30DaysStart.setDate(today.getDate() - 30)
  const last30DaysEnd = new Date(today)

  return [
    {
      label: 'Current Month',
      from: currentMonthStart.toISOString().split('T')[0],
      to: currentMonthEnd.toISOString().split('T')[0],
    },
    {
      label: 'Last Month',
      from: lastMonthStart.toISOString().split('T')[0],
      to: lastMonthEnd.toISOString().split('T')[0],
    },
    {
      label: 'Last 30 Days',
      from: last30DaysStart.toISOString().split('T')[0],
      to: last30DaysEnd.toISOString().split('T')[0],
    },
  ]
}

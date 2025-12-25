import mongoose from 'mongoose'
import Project from '../models/Project.js'
import MaterialCost from '../models/MaterialCost.js'
import OtherCost from '../models/OtherCost.js'
import Attendance from '../models/Attendance.js'
import User from '../models/User.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function minDate(a, b) {
  return a.getTime() <= b.getTime() ? a : b
}

function maxDate(a, b) {
  return a.getTime() >= b.getTime() ? a : b
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100
}

async function computeProjectWorkerSalarySummary({ project, asOfDate = new Date() }) {
  const projectStart = startOfDay(project.startDate)
  const projectEndInclusive = startOfDay(project.endDate)
  const today = startOfDay(asOfDate)
  const effectiveEndInclusive = minDate(projectEndInclusive, today)
  const endExclusive = new Date(effectiveEndInclusive)
  endExclusive.setDate(endExclusive.getDate() + 1)

  const workerIds = (project.assignedWorkers || []).map((id) => id.toString())
  if (workerIds.length === 0) {
    return {
      range: { start: projectStart, endInclusive: effectiveEndInclusive },
      rows: [],
      totalPayable: 0,
    }
  }

  const workers = await User.find({ _id: { $in: workerIds } })
    .select('name position role status inactiveFrom joinDate paymentType baseSalary salaryMonthly salaryDaily hourlyRate overtimeRate workingDaysPerMonth workingHoursPerDay')
    .lean()

  const ids = workers.map((w) => w._id)

  const agg = await Attendance.aggregate([
    {
      $match: {
        worker: { $in: ids },
        date: { $gte: projectStart, $lt: endExclusive },
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

  const byWorker = new Map(agg.map((r) => [String(r._id), r]))

  const rows = workers.map((w) => {
    const stats = byWorker.get(String(w._id)) || { presentDays: 0, halfDays: 0, approvedOvertimeHours: 0 }

    // Apply worker active date range constraints inside the project window
    let activeStart = projectStart
    if (w.joinDate) activeStart = maxDate(activeStart, startOfDay(w.joinDate))

    let activeEndExclusive = endExclusive
    if (w.inactiveFrom) {
      const inactiveFromStart = startOfDay(w.inactiveFrom) // first day NOT active
      activeEndExclusive = minDate(activeEndExclusive, inactiveFromStart)
    }

    // If the worker isn't active in the project window, treat as zero payable
    if (activeEndExclusive.getTime() <= activeStart.getTime()) {
      return {
        workerId: w._id,
        name: w.name,
        role: w.position || w.role,
        daysWorked: 0,
        presentDays: 0,
        halfDays: 0,
        approvedOvertimeHours: 0,
        payable: 0,
      }
    }

    // Note: Attendance records are already blocked on/after inactiveFrom by attendanceController,
    // so stats are normally consistent. We still keep the active range for correctness/legacy data.
    const daysWorked = Number(stats.presentDays || 0) + 0.5 * Number(stats.halfDays || 0)

    const paymentType = w.paymentType || 'Monthly'
    const workingDaysPerMonth = Number(w.workingDaysPerMonth || 26)
    const workingHoursPerDay = Number(w.workingHoursPerDay || 8)

    const monthly = Number(w.salaryMonthly || w.baseSalary || 0)
    const daily = Number(w.salaryDaily || w.baseSalary || 0)

    const perDayRate = paymentType === 'Monthly' && workingDaysPerMonth > 0
      ? (monthly / workingDaysPerMonth)
      : daily

    const basePay = perDayRate * daysWorked

    const hourlyRate = Number(w.hourlyRate || 0) || (workingHoursPerDay > 0 ? (perDayRate / workingHoursPerDay) : 0)
    const overtimeRate = Number(w.overtimeRate || 0) || hourlyRate
    const overtimePay = Number(stats.approvedOvertimeHours || 0) * overtimeRate

    return {
      workerId: w._id,
      name: w.name,
      role: w.position || w.role,
      daysWorked: round2(daysWorked),
      presentDays: Number(stats.presentDays || 0),
      halfDays: Number(stats.halfDays || 0),
      approvedOvertimeHours: round2(Number(stats.approvedOvertimeHours || 0)),
      payable: round2(basePay + overtimePay),
    }
  }).sort((a, b) => (b.payable || 0) - (a.payable || 0))

  const totalPayable = round2(rows.reduce((sum, r) => sum + (r.payable || 0), 0))

  return {
    range: { start: projectStart, endInclusive: effectiveEndInclusive },
    rows,
    totalPayable,
  }
}

// @desc    Get derived worker salary summary for a project (READ-ONLY)
// @route   GET /api/projects/:id/worker-salary-summary
// @access  Private
export const getWorkerSalarySummary = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const summary = await computeProjectWorkerSalarySummary({ project })

  res.json({
    success: true,
    data: summary,
  })
})

// @desc    Get budget summary
// @route   GET /api/projects/:id/budget-summary
// @access  Private
export const getBudgetSummary = asyncHandler(async (req, res) => {
    const projectId = req.params.id

    // Verify project exists
    const project = await Project.findById(projectId)
    if (!project) {
        res.status(404)
        throw new Error('Project not found')
    }

    const pId = new mongoose.Types.ObjectId(projectId)

    // Aggregate Material Costs
    const materialAgg = await MaterialCost.aggregate([
        { $match: { project: pId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
    const totalMaterial = materialAgg[0]?.total || 0

    // Aggregate Other Costs
    const otherAgg = await OtherCost.aggregate([
        { $match: { project: pId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const totalOther = otherAgg[0]?.total || 0

    // Derived Worker Salaries (READ-ONLY, from Attendance + approved overtime)
    const salarySummary = await computeProjectWorkerSalarySummary({ project })
    const totalSalary = salarySummary.totalPayable || 0

    // Calculate totals
    const totalSpent = totalMaterial + totalOther + totalSalary
    const remaining = project.budget - totalSpent

    // Also update the project's 'spent' field for consistency
    project.spent = totalSpent
    await project.save()

    res.json({
        success: true,
        data: {
            totalBudget: project.budget,
            spent: totalSpent,
            remaining: remaining,
            breakdown: {
                materials: totalMaterial,
                otherCosts: totalOther,
                salaries: totalSalary
            }
        }
    })
})

import Project from '../models/Project.js'
import Task from '../models/Task.js'
import User from '../models/User.js'
import Attendance from '../models/Attendance.js'
import Salary from '../models/Salary.js'
import Invoice from '../models/Invoice.js'
import MaterialCost from '../models/MaterialCost.js'
import OtherCost from '../models/OtherCost.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

// Helper function to parse date range
const parseDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)) // Default: start of month
  const end = endDate ? new Date(endDate) : new Date() // Default: today
  
  // Set to start of day for start date
  start.setHours(0, 0, 0, 0)
  // Set to end of day for end date
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

// @desc    Get comprehensive dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query
  const { start, end } = parseDateRange(startDate, endDate)

  // Run all queries in parallel for performance
  const [
    totalWorkers,
    activeWorkers,
    workersOnLeave,
    idleWorkers,
    totalProjects,
    activeProjects,
    completedProjects,
    delayedProjects,
    tasksCompleted,
    tasksPending,
    tasksOverdue,
    attendanceToday,
    revenue,
    expenses,
    advances
  ] = await Promise.all([
    // Worker Stats
    User.countDocuments({ role: 'Worker' }),
    User.countDocuments({ role: 'Worker', status: 'active' }),
    User.countDocuments({ role: 'Worker', status: 'on-leave' }),
    // Idle workers (active workers with no tasks assigned)
    User.aggregate([
      { $match: { role: 'Worker', status: 'active' } },
      {
        $lookup: {
          from: 'tasks',
          let: { workerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$assignedTo', '$$workerId'] },
                status: { $in: ['pending', 'in-progress'] }
              }
            }
          ],
          as: 'activeTasks'
        }
      },
      { $match: { activeTasks: { $size: 0 } } },
      { $count: 'count' }
    ]).then(result => result[0]?.count || 0),

    // Project Stats
    Project.countDocuments(),
    Project.countDocuments({ status: 'in-progress' }),
    Project.countDocuments({ 
      status: 'completed',
      actualEndDate: { $gte: start, $lte: end }
    }),
    Project.countDocuments({
      status: 'in-progress',
      endDate: { $lt: new Date() }
    }),

    // Task Stats
    Task.countDocuments({
      status: 'completed',
      completedAt: { $gte: start, $lte: end }
    }),
    Task.countDocuments({
      status: { $in: ['pending', 'in-progress'] }
    }),
    Task.countDocuments({
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date() }
    }),

    // Attendance Today
    Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),

    // Revenue (Paid invoices in date range)
    Invoice.aggregate([
      {
        $match: {
          invoiceType: 'project',
          status: 'paid',
          paidDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Expenses (Salaries + Materials + Other Costs)
    Promise.all([
      Salary.aggregate([
        {
          $match: {
            status: 'paid',
            paidDate: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]),
      MaterialCost.aggregate([
        {
          $match: {
            purchaseDate: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalCost' } } }
      ]),
      OtherCost.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]).then(([salaries, materials, others]) => ({
      salaries: salaries[0]?.total || 0,
      materials: materials[0]?.total || 0,
      others: others[0]?.total || 0,
      total: (salaries[0]?.total || 0) + (materials[0]?.total || 0) + (others[0]?.total || 0)
    })),

    // Outstanding Advances
    User.aggregate([
      { $match: { role: 'Worker', advanceBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$advanceBalance' } } }
    ])
  ])

  // Process attendance data
  const attendanceStats = {
    present: 0,
    absent: 0,
    halfDay: 0,
    onLeave: 0
  }
  
  attendanceToday.forEach(item => {
    if (item._id === 'present') attendanceStats.present = item.count
    if (item._id === 'absent') attendanceStats.absent = item.count
    if (item._id === 'half-day') attendanceStats.halfDay = item.count
    if (item._id === 'on-leave') attendanceStats.onLeave = item.count
  })

  // Calculate financial metrics
  const totalRevenue = revenue[0]?.total || 0
  const totalExpenses = expenses.total
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0

  // Calculate worker utilization
  const assignedWorkers = activeWorkers - idleWorkers
  const utilization = activeWorkers ? ((assignedWorkers / activeWorkers) * 100).toFixed(1) : 0

  res.json({
    success: true,
    data: {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      workers: {
        total: totalWorkers,
        active: activeWorkers,
        onLeave: workersOnLeave,
        idle: idleWorkers,
        utilization: parseFloat(utilization)
      },
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        delayed: delayedProjects
      },
      tasks: {
        completed: tasksCompleted,
        pending: tasksPending,
        overdue: tasksOverdue
      },
      attendance: {
        today: attendanceStats
      },
      financial: {
        revenue: totalRevenue,
        expenses: {
          total: totalExpenses,
          breakdown: {
            salaries: expenses.salaries,
            materials: expenses.materials,
            others: expenses.others
          }
        },
        profit: netProfit,
        profitMargin: parseFloat(profitMargin),
        advancesOutstanding: advances[0]?.total || 0
      }
    },
    message: 'Dashboard stats loaded successfully'
  })
})

// @desc    Get revenue statistics
// @route   GET /api/dashboard/revenue
// @access  Private
export const getRevenueStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query
  const { start, end } = parseDateRange(startDate, endDate)

  const [paid, pending, overdue] = await Promise.all([
    // Paid invoices
    Invoice.aggregate([
      {
        $match: {
          invoiceType: 'project',
          status: 'paid',
          paidDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Pending invoices (sent but not paid)
    Invoice.aggregate([
      {
        $match: {
          invoiceType: 'project',
          status: 'sent',
          invoiceDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balanceAmount' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Overdue invoices
    Invoice.aggregate([
      {
        $match: {
          invoiceType: 'project',
          status: 'sent',
          dueDate: { $lt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balanceAmount' },
          count: { $sum: 1 }
        }
      }
    ])
  ])

  res.json({
    success: true,
    data: {
      paid: {
        amount: paid[0]?.total || 0,
        count: paid[0]?.count || 0
      },
      pending: {
        amount: pending[0]?.total || 0,
        count: pending[0]?.count || 0
      },
      overdue: {
        amount: overdue[0]?.total || 0,
        count: overdue[0]?.count || 0
      },
      total: (paid[0]?.total || 0) + (pending[0]?.total || 0)
    },
    message: 'Revenue stats loaded successfully'
  })
})

// @desc    Get expense statistics
// @route   GET /api/dashboard/expenses
// @access  Private
export const getExpenseStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query
  const { start, end } = parseDateRange(startDate, endDate)

  const [salaries, materials, others, pendingSalaries] = await Promise.all([
    // Paid salaries
    Salary.aggregate([
      {
        $match: {
          status: 'paid',
          paidDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Material costs
    MaterialCost.aggregate([
      {
        $match: {
          purchaseDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalCost' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Other costs
    OtherCost.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Pending salaries
    Salary.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'partial'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$netSalary', '$paidAmount'] } },
          count: { $sum: 1 }
        }
      }
    ])
  ])

  const totalExpenses = (salaries[0]?.total || 0) + (materials[0]?.total || 0) + (others[0]?.total || 0)

  res.json({
    success: true,
    data: {
      total: totalExpenses,
      breakdown: {
        salaries: {
          paid: salaries[0]?.total || 0,
          pending: pendingSalaries[0]?.total || 0,
          count: salaries[0]?.count || 0
        },
        materials: {
          total: materials[0]?.total || 0,
          count: materials[0]?.count || 0
        },
        others: {
          total: others[0]?.total || 0,
          count: others[0]?.count || 0
        }
      }
    },
    message: 'Expense stats loaded successfully'
  })
})

// @desc    Get revenue trend (last 6 months)
// @route   GET /api/dashboard/charts/revenue-trend
// @access  Private
export const getRevenueTrend = asyncHandler(async (req, res) => {
  const months = []
  const now = new Date()

  // Generate last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    const [revenue, expenses] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            invoiceType: 'project',
            status: 'paid',
            paidDate: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]),
      Promise.all([
        Salary.aggregate([
          {
            $match: {
              status: 'paid',
              paidDate: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } }
        ]),
        MaterialCost.aggregate([
          {
            $match: {
              purchaseDate: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          { $group: { _id: null, total: { $sum: '$totalCost' } } }
        ]),
        OtherCost.aggregate([
          {
            $match: {
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]).then(([sal, mat, oth]) => ({
        total: (sal[0]?.total || 0) + (mat[0]?.total || 0) + (oth[0]?.total || 0)
      }))
    ])

    const revenueTotal = revenue[0]?.total || 0
    const expenseTotal = expenses.total
    const profit = revenueTotal - expenseTotal

    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      revenue: revenueTotal,
      expenses: expenseTotal,
      profit: profit
    })
  }

  res.json({
    success: true,
    data: months,
    message: 'Revenue trend loaded successfully'
  })
})

// @desc    Get attendance chart data (current week)
// @route   GET /api/dashboard/charts/attendance
// @access  Private
export const getAttendanceChart = asyncHandler(async (req, res) => {
  // Get current week (Monday to Sunday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)

  const weekData = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const attendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: date, $lte: dayEnd }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const stats = {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toISOString().split('T')[0],
      present: 0,
      halfDay: 0,
      absent: 0,
      onLeave: 0
    }

    attendance.forEach(item => {
      if (item._id === 'present') stats.present = item.count
      if (item._id === 'half-day') stats.halfDay = item.count
      if (item._id === 'absent') stats.absent = item.count
      if (item._id === 'on-leave') stats.onLeave = item.count
    })

    weekData.push(stats)
  }

  res.json({
    success: true,
    data: weekData,
    message: 'Attendance chart data loaded successfully'
  })
})

// @desc    Get project budget utilization
// @route   GET /api/dashboard/charts/project-budget
// @access  Private
export const getProjectBudgetChart = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    status: { $in: ['in-progress', 'completed'] }
  })
    .select('name budget spent')
    .sort({ budgetUtilization: -1 })
    .limit(10)
    .lean()

  const chartData = projects.map(project => {
    const utilization = project.budget ? ((project.spent / project.budget) * 100).toFixed(1) : 0
    return {
      name: project.name,
      budget: project.budget,
      spent: project.spent,
      utilization: parseFloat(utilization),
      status: project.spent > project.budget ? 'over' : project.spent > project.budget * 0.8 ? 'warning' : 'good'
    }
  })

  res.json({
    success: true,
    data: chartData,
    message: 'Project budget chart data loaded successfully'
  })
})

export default {
  getDashboardStats,
  getRevenueStats,
  getExpenseStats,
  getRevenueTrend,
  getAttendanceChart,
  getProjectBudgetChart
}

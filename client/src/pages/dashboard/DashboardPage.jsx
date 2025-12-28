import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dashboardService from '../../services/dashboardService'
import projectService from '../../services/projectService'
import taskService from '../../services/taskService'
import workerService from '../../services/workerService'
import DateRangePicker from '../../components/common/DateRangePicker'

// MUI Icons
import PeopleIcon from '@mui/icons-material/People'
import FolderIcon from '@mui/icons-material/Folder'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import ErrorIcon from '@mui/icons-material/Error'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import WarningIcon from '@mui/icons-material/Warning'
import PersonOffIcon from '@mui/icons-material/PersonOff'

const DashboardPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(() => {
    // Initialize with "This Month" as default
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(23, 59, 59, 999)

    return {
      start: monthStart,
      end: today,
      label: 'This Month'
    }
  })
  const [dashboardStats, setDashboardStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [workers, setWorkers] = useState([])

  useEffect(() => {
    if (dateRange) {
      fetchDashboardData()
    }
  }, [dateRange])

  const fetchDashboardData = async () => {
    if (!dateRange) return

    try {
      setLoading(true)
      console.log('Fetching dashboard stats for range:', dateRange.start, 'to', dateRange.end)

      const params = {
        startDate: dateRange.start.toISOString().split('T')[0],
        endDate: dateRange.end.toISOString().split('T')[0]
      }

      const [statsRes, projectsRes, tasksRes, workersRes] = await Promise.all([
        dashboardService.getStats(params),
        projectService.getAllProjects({ limit: 5 }),
        taskService.getAllTasks({ limit: 5 }),
        workerService.getAllWorkers({ limit: 5 }),
      ])

      setDashboardStats(statsRes.data)
      setProjects(projectsRes.data || [])
      setTasks(tasksRes.data || [])
      setWorkers(workersRes.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      console.error('Error details:', error.response?.data || error.message)

      // Set empty data to allow dashboard to render with error state
      setDashboardStats({
        workers: { total: 0, active: 0, onLeave: 0, idle: 0, utilization: 0 },
        projects: { total: 0, active: 0, completed: 0, delayed: 0 },
        tasks: { completed: 0, pending: 0, overdue: 0 },
        attendance: { today: { present: 0, halfDay: 0, absent: 0, onLeave: 0 } },
        financial: {
          revenue: 0,
          expenses: { total: 0, breakdown: { salaries: 0, materials: 0, others: 0 } },
          profit: 0,
          profitMargin: 0,
          advancesOutstanding: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10'
      case 'in-progress':
        return 'text-primary bg-primary/10'
      case 'pending':
        return 'text-warning bg-warning/10'
      default:
        return 'text-neutral-500 bg-neutral-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />
      case 'in-progress':
        return <ScheduleIcon fontSize="small" />
      case 'pending':
        return <ErrorIcon fontSize="small" />
      default:
        return null
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'bg-danger/10 text-danger border-danger/20'
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'low':
        return 'bg-success/10 text-success border-success/20'
      default:
        return 'bg-neutral-100 text-neutral-500'
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  if (loading || !dashboardStats) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const { workers: workerStats, projects: projectStats, tasks: taskStats, financial, attendance } = dashboardStats

  // Prepare stats for cards
  const stats = [
    {
      title: 'Net Profit',
      value: formatCurrency(financial.profit),
      icon: AttachMoneyIcon,
      color: financial.profit >= 0 ? 'success' : 'danger',
      subtitle: `${financial.profitMargin}% margin`,
      trendUp: financial.profit >= 0,
      clickPath: '/projects'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(financial.revenue),
      icon: TrendingUpIcon,
      color: 'primary',
      subtitle: dateRange.label,
      trendUp: true,
      clickPath: '/projects'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(financial.expenses.total),
      icon: TrendingDownIcon,
      color: 'warning',
      subtitle: `Salaries: ${formatCurrency(financial.expenses.breakdown.salaries)}`,
      trendUp: false,
      clickPath: '/salary'
    },
    {
      title: 'Active Workers',
      value: `${workerStats.active}/${workerStats.total}`,
      icon: PeopleIcon,
      color: 'info',
      subtitle: `${workerStats.utilization}% utilized`,
      trendUp: workerStats.utilization > 70,
      clickPath: '/workers'
    },
    {
      title: 'Active Projects',
      value: projectStats.active,
      icon: FolderIcon,
      color: 'primary',
      subtitle: projectStats.delayed > 0 ? `⚠️ ${projectStats.delayed} delayed` : 'On track',
      trendUp: projectStats.delayed === 0,
      clickPath: '/projects'
    },
    {
      title: 'Tasks Completed',
      value: taskStats.completed,
      icon: AssignmentTurnedInIcon,
      color: 'success',
      subtitle: dateRange.label,
      trendUp: true,
      clickPath: '/tasks'
    },
    {
      title: 'Tasks Pending',
      value: taskStats.pending,
      icon: PendingActionsIcon,
      color: 'warning',
      subtitle: taskStats.overdue > 0 ? `${taskStats.overdue} overdue` : 'None overdue',
      trendUp: taskStats.overdue === 0,
      clickPath: '/tasks'
    },
    {
      title: 'Idle Workers',
      value: workerStats.idle,
      icon: PersonOffIcon,
      color: workerStats.idle > 5 ? 'danger' : 'neutral',
      subtitle: 'Workers with no tasks',
      trendUp: workerStats.idle < 5,
      clickPath: '/workers'
    },
  ]

  // Alerts
  const alerts = []

  if (financial.profit < 0) {
    alerts.push({
      severity: 'error',
      message: `⚠️ Negative profit: ${formatCurrency(financial.profit)}. Expenses exceed revenue!`,
      action: 'Review Costs'
    })
  }

  if (projectStats.delayed > 0) {
    alerts.push({
      severity: 'warning',
      message: `🚨 ${projectStats.delayed} project${projectStats.delayed > 1 ? 's are' : ' is'} delayed`,
      action: 'View Projects'
    })
  }

  if (taskStats.overdue > 0) {
    alerts.push({
      severity: 'warning',
      message: `⏰ ${taskStats.overdue} task${taskStats.overdue > 1 ? 's are' : ' is'} overdue`,
      action: 'View Tasks'
    })
  }

  if (workerStats.idle > 5) {
    alerts.push({
      severity: 'info',
      message: `🧑‍🔧 ${workerStats.idle} workers have no tasks assigned`,
      action: 'Assign Tasks'
    })
  }

  if (financial.advancesOutstanding > 0) {
    alerts.push({
      severity: 'info',
      message: `💰 Outstanding advances: ${formatCurrency(financial.advancesOutstanding)}`,
      action: 'View Details'
    })
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header with Date Picker */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Here's your business overview for <span className="font-medium text-primary">{dateRange?.label}</span>
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </motion.div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${alert.severity === 'error' ? 'bg-danger/10 border-danger' :
                alert.severity === 'warning' ? 'bg-warning/10 border-warning' :
                  'bg-info/10 border-info'
                }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${alert.severity === 'error' ? 'text-danger' :
                  alert.severity === 'warning' ? 'text-warning' :
                    'text-info'
                  }`}>
                  {alert.message}
                </p>
                <button className="text-xs font-medium text-primary hover:underline">
                  {alert.action} →
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            primary: 'from-primary to-primary-dark',
            info: 'from-info to-info-dark',
            success: 'from-success to-success-dark',
            warning: 'from-warning to-warning-dark',
            danger: 'from-danger to-danger-dark',
            neutral: 'from-neutral-400 to-neutral-600'
          }

          return (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              onClick={() => stat.clickPath && navigate(stat.clickPath)}
              className="premium-card p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" />
                </div>
                <div className={`text-xs font-medium ${stat.trendUp ? 'text-success' : 'text-neutral-400'}`}>
                  {stat.trendUp ? '↗' : '↘'}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {stat.value}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                  {stat.title}
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  {stat.subtitle}
                </p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Attendance Today */}
      {attendance?.today && (
        <motion.div variants={itemVariants} className="premium-card p-6">
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
            📊 Attendance Today
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-success/10">
              <p className="text-3xl font-bold text-success">{attendance.today.present}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Present</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-warning/10">
              <p className="text-3xl font-bold text-warning">{attendance.today.halfDay}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Half Day</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-danger/10">
              <p className="text-3xl font-bold text-danger">{attendance.today.absent}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Absent</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-info/10">
              <p className="text-3xl font-bold text-info">{attendance.today.onLeave}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">On Leave</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <motion.div variants={itemVariants} className="premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Recent Projects
            </h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-primary hover:text-primary-dark font-medium text-sm transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 4).map((project, index) => {
              const key = project.id || project._id || index
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary-dark/20 flex items-center justify-center">
                    <FolderIcon className="text-primary" fontSize="small" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-light-text dark:text-dark-text truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {project.client}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      {project.status.replace('-', ' ')}
                    </span>
                    <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div variants={itemVariants} className="premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Recent Tasks
            </h2>
            <button
              onClick={() => navigate('/tasks')}
              className="text-primary hover:text-primary-dark font-medium text-sm transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {tasks.slice(0, 4).map((task, index) => {
              const key = task.id || task._id || index
              const worker = task.assignedTo
              const workerName = worker?.name || workers.find(w => w.id === worker)?.name || 'Unassigned'

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-light-text dark:text-dark-text">
                      {task.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1 mb-3">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {worker?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {workerName}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Workers Overview */}
      <motion.div variants={itemVariants} className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Team Overview
          </h2>
          <button
            onClick={() => navigate('/workers')}
            className="text-primary hover:text-primary-dark font-medium text-sm transition-colors"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-light-border dark:border-dark-border">
                <th className="pb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  Worker
                </th>
                <th className="pb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  Position
                </th>
                <th className="pb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  Department
                </th>
                <th className="pb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  Status
                </th>
                <th className="pb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  Skills
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.slice(0, 5).map((worker, index) => {
                const key = worker.id || worker._id || index
                return (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/workers')}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                          <span className="text-white font-medium">
                            {worker.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-light-text dark:text-dark-text">
                            {worker.name}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {worker.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-neutral-600 dark:text-neutral-300">
                      {worker.position}
                    </td>
                    <td className="py-4 text-neutral-600 dark:text-neutral-300">
                      {worker.department}
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${worker.status === 'active'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                        }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {worker.skills?.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 rounded-md text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                          >
                            {skill}
                          </span>
                        ))}
                        {worker.skills?.length > 2 && (
                          <span className="px-2 py-1 rounded-md text-xs bg-primary/10 text-primary">
                            +{worker.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default DashboardPage

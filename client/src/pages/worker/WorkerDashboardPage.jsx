import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import workerService from '../../services/workerService'
import toast from 'react-hot-toast'

// MUI Icons
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import WorkIcon from '@mui/icons-material/Work'

const WorkerDashboardPage = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    worker: null,
    tasks: [],
    attendance: [],
    todayAttendance: null
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?._id) return

      try {
        setLoading(true)
        const [workerRes, tasksRes, attendanceRes] = await Promise.all([
          workerService.getWorker(user._id),
          workerService.getWorkerTasks(user._id),
          workerService.getWorkerAttendance(user._id)
        ])

        // Find today's attendance
        const today = new Date().toISOString().split('T')[0]
        const todayAtt = attendanceRes.data.find(a =>
          new Date(a.date).toISOString().split('T')[0] === today
        )

        setData({
          worker: workerRes.data.worker,
          tasks: tasksRes.data || [],
          attendance: attendanceRes.data || [],
          todayAttendance: todayAtt
        })
      } catch (error) {
        console.error('Error loading dashboard:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const myTasks = data.tasks
  const completedTasks = myTasks.filter(t => t.status === 'completed').length
  const pendingTasks = myTasks.filter(t => t.status === 'pending').length
  const inProgressTasks = myTasks.filter(t => t.status === 'in-progress').length

  const workerData = data.worker || {}
  const todayAttendance = data.todayAttendance

  const stats = [
    {
      title: 'Total Tasks',
      value: myTasks.length,
      icon: AssignmentIcon,
      color: 'primary',
    },
    {
      title: 'Completed',
      value: completedTasks,
      icon: CheckCircleIcon,
      color: 'success',
    },
    {
      title: 'In Progress',
      value: inProgressTasks,
      icon: ScheduleIcon,
      color: 'info',
    },
    {
      title: 'Pending',
      value: pendingTasks,
      icon: EventAvailableIcon,
      color: 'warning',
    },
  ]

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
          Welcome, {user?.name || 'Worker'}! 👷
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Here's your work summary for today.
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div variants={itemVariants} className="premium-card p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-white font-bold text-3xl">
              {user?.name?.charAt(0) || 'W'}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
              {user?.name || workerData.name}
            </h2>
            <p className="text-primary font-medium">{workerData.position}</p>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              {workerData.department} • Employee ID: {workerData.employeeId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {workerData.certifications?.map((cert) => (
              <span
                key={cert}
                className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            primary: 'from-primary to-primary-dark',
            info: 'from-info to-info-dark',
            success: 'from-success to-success-dark',
            warning: 'from-warning to-warning-dark',
          }

          return (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="premium-card p-5"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} flex items-center justify-center shadow-lg mb-3`}>
                <Icon className="text-white" fontSize="small" />
              </div>
              <h3 className="text-2xl font-bold text-light-text dark:text-dark-text">
                {stat.value}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                {stat.title}
              </p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Today's Attendance Card */}
      <motion.div variants={itemVariants} className="premium-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-info-dark flex items-center justify-center">
            <CalendarTodayIcon className="text-white" fontSize="small" />
          </div>
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Today's Attendance
          </h2>
        </div>

        {todayAttendance ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2 text-success mb-2">
                <AccessTimeIcon fontSize="small" />
                <span className="text-sm font-medium">Check In</span>
              </div>
              <p className="text-xl font-bold text-light-text dark:text-dark-text">
                {todayAttendance.checkIn || '--:--'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2 text-danger mb-2">
                <AccessTimeIcon fontSize="small" />
                <span className="text-sm font-medium">Check Out</span>
              </div>
              <p className="text-xl font-bold text-light-text dark:text-dark-text">
                {todayAttendance.checkOut || '--:--'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2 text-info mb-2">
                <WorkIcon fontSize="small" />
                <span className="text-sm font-medium">Hours Worked</span>
              </div>
              <p className="text-xl font-bold text-light-text dark:text-dark-text">
                {todayAttendance.hoursWorked}h
              </p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2 text-warning mb-2">
                <ScheduleIcon fontSize="small" />
                <span className="text-sm font-medium">Overtime</span>
              </div>
              <p className="text-xl font-bold text-light-text dark:text-dark-text">
                {todayAttendance.overtime}h
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              You haven't checked in yet today.
            </p>
            <button className="btn-primary">
              Mark Attendance
            </button>
          </div>
        )}
      </motion.div>

      {/* My Tasks */}
      <motion.div variants={itemVariants} className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <AssignmentIcon className="text-white" fontSize="small" />
            </div>
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              My Tasks
            </h2>
          </div>
          <button className="text-primary hover:text-primary-dark font-medium text-sm transition-colors">
            View All
          </button>
        </div>

        <div className="space-y-4">
          {myTasks.length > 0 ? (
            myTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/30 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-light-text dark:text-dark-text">
                    {task.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  {task.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <CalendarTodayIcon fontSize="small" />
                      Due: {task.dueDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <AccessTimeIcon fontSize="small" />
                      {task.actualHours}h
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('-', ' ')}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Progress</span>
                    <span className="font-medium text-light-text dark:text-dark-text">
                      {task.completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${task.completionPercentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full rounded-full ${task.completionPercentage === 100
                          ? 'bg-success'
                          : 'bg-gradient-to-r from-primary to-primary-dark'
                        }`}
                    />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <AssignmentIcon className="text-neutral-300 dark:text-neutral-600 mx-auto mb-4" style={{ fontSize: 48 }} />
              <p className="text-neutral-500 dark:text-neutral-400">
                No tasks assigned to you yet.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Skills Section */}
      <motion.div variants={itemVariants} className="premium-card p-6">
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          My Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {workerData.skills?.map((skill) => (
            <span
              key={skill}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary-dark/10 text-primary font-medium border border-primary/20"
            >
              {skill}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default WorkerDashboardPage

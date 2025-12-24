import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import projectService from '../../services/projectService'
import taskService from '../../services/taskService'
import workerService from '../../services/workerService'

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

const DashboardPage = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState({
    totalWorkers: 0,
    activeProjects: 0,
    tasksCompleted: 0,
    tasksPending: 0,
  })
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [workers, setWorkers] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [statsRes, projectsRes, tasksRes, workersRes] = await Promise.all([
          projectService.getProjectStats(),
          projectService.getAllProjects({ limit: 5 }),
          taskService.getAllTasks({ limit: 5 }),
          workerService.getAllWorkers({ limit: 5 }),
        ])

        // Parse stats from backend structure
        // Backend returns: { overview: { totalProjects, totalBudget, totalSpent, avgProgress }, byStatus: [], byPriority: [] }
        // We need to map this to our UI stats or fetch additional data if needed.
        // For now, let's use what we have and maybe fetch task stats separately if needed,
        // or calculate from loaded data (not ideal for large datasets but ok for now).
        // Update: We'll interpret standard counts from the services.

        // Since getProjectStats might not give us "totalWorkers" or "tasksPending", we might need to rely on other endpoints or
        // assumption that "statsRes" has expanded. 
        // Let's look at what we sent in projectController.
        // It returns data.overview.totalProjects. 
        // It doesn't return workers or tasks counts directly in that specific controller function.
        // We will calculate from the lists for now or assuming the backend might be updated later.
        // Actually, let's use the array lengths for now if pagination returns total count.

        setStatsData({
          totalWorkers: workersRes.pagination?.total || workersRes.data?.length || 0,
          activeProjects: statsRes.data?.overview?.totalProjects || 0, // This is total, not just active.
          tasksCompleted: 0, // Placeholder
          tasksPending: 0, // Placeholder
        })

        setProjects(projectsRes.data || [])
        setTasks(tasksRes.data || [])
        setWorkers(workersRes.data || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const stats = [
    {
      title: 'Total Workers',
      value: statsData.totalWorkers,
      icon: PeopleIcon,
      color: 'primary',
      trend: '+12%', // Static for now
      trendUp: true,
    },
    {
      title: 'Active Projects',
      value: statsData.activeProjects,
      icon: FolderIcon,
      color: 'info',
      trend: '+5%',
      trendUp: true,
    },
    {
      title: 'Tasks Completed',
      value: statsData.tasksCompleted,
      icon: AssignmentTurnedInIcon,
      color: 'success',
      trend: '+18%',
      trendUp: true,
    },
    {
      title: 'Tasks Pending',
      value: statsData.tasksPending,
      icon: PendingActionsIcon,
      color: 'warning',
      trend: '-8%',
      trendUp: false,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
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
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Here's what's happening with your projects today.
        </p>
      </motion.div>

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
          }

          return (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="premium-card p-6"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.trendUp ? 'text-success' : 'text-danger'
                  }`}>
                  {stat.trendUp ? (
                    <TrendingUpIcon fontSize="small" />
                  ) : (
                    <TrendingDownIcon fontSize="small" />
                  )}
                  {stat.trend}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-light-text dark:text-dark-text">
                  {stat.value}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                  {stat.title}
                </p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <motion.div variants={itemVariants} className="premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Recent Projects
            </h2>
            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <MoreVertIcon className="text-neutral-400" />
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
            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <MoreVertIcon className="text-neutral-400" />
            </button>
          </div>
          <div className="space-y-4">
            {tasks.slice(0, 4).map((task, index) => {
              const key = task.id || task._id || index
              const worker = task.assignedTo // in backend populate this is an object or id
              // if it's an object from populate, use it directly
              // if it's just an id, look it up in workers list
              const workerName = worker?.name || workers.find(w => w.id === worker)?.name || 'Unassigned'

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/30 transition-colors cursor-pointer"
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
          <button className="text-primary hover:text-primary-dark font-medium text-sm transition-colors">
            View All
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
                  className="border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
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

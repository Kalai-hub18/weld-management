import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// MUI Components
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'

// MUI Icons
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

// Components
import TasksTable from '../../components/tasks/TasksTable'
import TaskCard from '../../components/tasks/TaskCard'
import AddTaskModal from '../../components/tasks/AddTaskModal'
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal'

import { STATUS_COLORS } from '../../constants/tasks'
import taskService from '../../services/taskService'
import workerService from '../../services/workerService'
import projectService from '../../services/projectService'
import { useSettings } from '../../context/SettingsContext'
import { formatDate } from '../../utils/formatters'

const TasksPage = () => {
  const today = new Date().toISOString().split('T')[0]
  const { settings } = useSettings()
  const [selectedDate, setSelectedDate] = useState(today)
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [workerFilter, setWorkerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('table')
  const [showFilters, setShowFilters] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [detailsStartEditing, setDetailsStartEditing] = useState(false)
  const [tasks, setTasks] = useState([])
  const [workers, setWorkers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    totalActualHours: 0,
  })

  const normalizeId = (x) => x?.id || x?._id || x

  const toUiTask = (t) => {
    const project = t.project
      ? { id: normalizeId(t.project), name: t.project.name, projectId: t.project.projectId }
      : null

    const assignedWorkersRaw = Array.isArray(t.assignedWorkers) ? t.assignedWorkers : []
    const workers = assignedWorkersRaw.length > 0
      ? assignedWorkersRaw.map((u) => ({ id: normalizeId(u), name: u?.name, email: u?.email }))
      : (t.assignedTo ? [{ id: normalizeId(t.assignedTo), name: t.assignedTo.name, email: t.assignedTo.email }] : [])

    const worker = workers[0] || null
    // Extract date string from UTC date to avoid timezone shifts
    const date = t.dueDate ? (() => {
      const d = new Date(t.dueDate)
      // Use UTC methods to extract date parts to avoid timezone conversion
      const year = d.getUTCFullYear()
      const month = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })() : ''

    return {
      id: normalizeId(t),
      taskId: t.taskId,
      title: t.title,
      description: t.description,
      type: (t.tags && t.tags[0]) || '',
      date,
      startTime: t.startTime || '',
      endTime: t.endTime || '',
      actualHours: t.actualHours || 0,
      project,
      worker,
      workers,
      workerIds: workers.map((w) => normalizeId(w)).filter(Boolean),
      status: t.status,
      priority: t.priority,
      location: t.location || '',
      materials: (t.tags && t.tags.slice(1)) || [],
      notes: t.notes || '',
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '',
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString().split('T')[0] : '',
      _raw: t,
    }
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const [tasksRes, workersRes, projectsRes, statsRes] = await Promise.all([
          taskService.getAllTasks({ limit: 1000 }),
          workerService.getAllWorkers({ limit: 1000 }),
          projectService.getAllProjects({ limit: 1000 }),
          taskService.getTaskStats(),
        ])

        const list = (tasksRes.data || []).map(toUiTask)
        setTasks(list)
        setWorkers(workersRes.data || [])
        setProjects(projectsRes.data || [])

        const overview = statsRes.data?.overview || statsRes.overview || {}
        setStats({
          totalTasks: overview.totalTasks || 0,
          completedTasks: overview.completedTasks || 0,
          pendingTasks: overview.pendingTasks || 0,
          inProgressTasks: overview.inProgressTasks || 0,
          totalActualHours: overview.totalActualHours || 0,
        })
      } catch (e) {
        console.error(e)
        toast.error('Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const q = (searchTerm || '').toLowerCase()
    return tasks.filter(task => {
      const matchesDate = selectedDate === 'all' || task.date === selectedDate
      const matchesSearch =
        ((task.title || '').toLowerCase().includes(q)) ||
        ((task.taskId || '').toLowerCase().includes(q)) ||
        ((task.type || '').toLowerCase().includes(q))
      const matchesProject = projectFilter === 'all' || task.project?.id === projectFilter
      const matchesWorker = workerFilter === 'all' || (task.workerIds || []).includes(workerFilter)
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter

      return matchesDate && matchesSearch && matchesProject && matchesWorker && matchesStatus
    })
  }, [tasks, selectedDate, searchTerm, projectFilter, workerFilter, statusFilter])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Date navigation
  const navigateDate = (direction) => {
    if (selectedDate === 'all') {
      setSelectedDate(today)
      return
    }
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + direction)
    setSelectedDate(current.toISOString().split('T')[0])
  }

  const formatDateDisplay = (dateStr) => {
    if (dateStr === 'all') return 'All Dates'
    const date = new Date(dateStr)
    const isToday = dateStr === today
    const formatted = formatDate(date, settings)
    return isToday ? `Today - ${formatted}` : formatted
  }

  const handleTaskClick = (task, opts = {}) => {
    setSelectedTask(task)
    setDetailsStartEditing(!!opts.startEditing)
  }

  const toastApiError = (e, fallback) =>
    toast.error(e?.response?.data?.message || e?.message || fallback)

  const updateTaskInList = (updated) => {
    const id = normalizeId(updated)
    setTasks((prev) => prev.map((t) => (normalizeId(t) === id ? updated : t)))
  }

  const removeTaskFromList = (task) => {
    const id = normalizeId(task)
    setTasks((prev) => prev.filter((t) => normalizeId(t) !== id))
  }

  const handleUpdateTaskStatus = async (task, newStatus) => {
    const id = normalizeId(task)
    if (!id) throw new Error('Missing task id')
    const res = await taskService.updateStatus(id, { status: newStatus })
    const saved = res.data ? toUiTask(res.data) : toUiTask(res)
    updateTaskInList(saved)
    setSelectedTask(saved)
    return saved
  }

  const handleLogTaskHours = async (task, hours) => {
    const id = normalizeId(task)
    if (!id) throw new Error('Missing task id')
    const res = await taskService.updateStatus(id, { status: task.status, actualHours: hours })
    const saved = res.data ? toUiTask(res.data) : toUiTask(res)
    updateTaskInList(saved)
    setSelectedTask(saved)
    return saved
  }

  const handleUpdateTask = async (task, payload) => {
    const id = normalizeId(task)
    if (!id) throw new Error('Missing task id')
    const res = await taskService.updateTask(id, payload)
    const saved = res.data ? toUiTask(res.data) : toUiTask(res)
    updateTaskInList(saved)
    setSelectedTask(saved)
    return saved
  }

  const handleDeleteTask = async (task) => {
    const id = normalizeId(task)
    if (!id) throw new Error('Missing task id')
    await taskService.deleteTask(id)
    removeTaskFromList(task)
    if (normalizeId(selectedTask) === id) setSelectedTask(null)
  }

  const handleStartTaskFromMenu = async (task) => {
    try {
      await handleUpdateTaskStatus(task, 'in-progress')
      toast.success('Task started')
    } catch (e) {
      toastApiError(e, 'Failed to start task')
    }
  }

  const handleCompleteTaskFromMenu = async (task) => {
    try {
      await handleUpdateTaskStatus(task, 'completed')
      toast.success('Task marked complete')
    } catch (e) {
      toastApiError(e, 'Failed to update task')
    }
  }

  const handleDeleteTaskFromMenu = async (task) => {
    try {
      await handleDeleteTask(task)
      toast.success('Task deleted')
    } catch (e) {
      toastApiError(e, 'Failed to delete task')
    }
  }

  const handleAddTask = async (newTaskForm) => {
    try {
      const payload = {
        title: newTaskForm.title,
        description: newTaskForm.description,
        projectId: newTaskForm.projectId || undefined,
        assignedWorkers: newTaskForm.workerIds || undefined,
        priority: newTaskForm.priority,
        dueDate: newTaskForm.date,
        startTime: newTaskForm.startTime,
        endTime: newTaskForm.endTime,
        location: newTaskForm.location,
        notes: newTaskForm.notes,
        tags: [
          ...(newTaskForm.type ? [newTaskForm.type] : []),
        ],
      }

      const created = await taskService.createTask(payload)
      const createdTask = created.data ? toUiTask(created.data) : toUiTask(created)
      setTasks(prev => [createdTask, ...prev])
      toast.success('Task created successfully')
      setAddModalOpen(false)
    } catch (e) {
      console.error(e)
      console.error('Create task failed:', e?.response?.data || e)
      toast.error(e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || 'Failed to create task')
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
            Daily Tasks
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage and track daily welding tasks
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start lg:self-auto"
        >
          <AddIcon fontSize="small" />
          Add Task
        </button>
      </motion.div>

      {/* Date Navigation */}
      <motion.div variants={itemVariants} className="premium-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconButton onClick={() => navigateDate(-1)} disabled={selectedDate === 'all'}>
              <ChevronLeftIcon />
            </IconButton>
            <div className="flex items-center gap-3">
              <CalendarTodayIcon className="text-primary" />
              <div>
                <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
                  {formatDateDisplay(selectedDate)}
                </h2>
                <p className="text-sm text-neutral-500">
                  {filteredTasks.length} tasks
                </p>
              </div>
            </div>
            <IconButton onClick={() => navigateDate(1)} disabled={selectedDate === 'all'}>
              <ChevronRightIcon />
            </IconButton>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip title="Go to Today">
              <IconButton
                onClick={() => setSelectedDate(today)}
                className={selectedDate === today ? '!bg-primary/10' : ''}
              >
                <TodayIcon className={selectedDate === today ? 'text-primary' : ''} />
              </IconButton>
            </Tooltip>
            <button
              onClick={() => setSelectedDate(selectedDate === 'all' ? today : 'all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedDate === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {selectedDate === 'all' ? 'Showing All' : 'View All'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AssignmentIcon}
          label="Total Tasks"
          value={stats.totalTasks ?? 0}
          color="primary"
        />
        <StatCard
          icon={PendingActionsIcon}
          label="Pending"
          value={(stats.pendingTasks ?? 0) + (stats.inProgressTasks ?? 0)}
          color="warning"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Completed"
          value={stats.completedTasks ?? 0}
          color="success"
        />
        <StatCard
          icon={AccessTimeIcon}
          label="Hours Logged"
          value={`${stats.totalActualHours ?? 0}h`}
          color="info"
        />
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <TextField
          placeholder="Search tasks..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon className="text-neutral-400" />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px' },
          }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              showFilters 
                ? 'bg-primary text-white' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <FilterListIcon fontSize="small" />
            Filters
          </button>
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <IconButton
              size="small"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? '!bg-white dark:!bg-neutral-700' : ''}
            >
              <ViewListIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setViewMode('cards')}
              className={viewMode === 'cards' ? '!bg-white dark:!bg-neutral-700' : ''}
            >
              <ViewModuleIcon fontSize="small" />
            </IconButton>
          </div>
        </div>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="premium-card p-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormControl fullWidth size="small">
                <InputLabel>Project</InputLabel>
                <Select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  label="Project"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="all">All Projects</MenuItem>
                  {projects.map((project) => {
                    const pid = normalizeId(project)
                    return (
                      <MenuItem key={pid} value={pid}>
                        {project.name}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Worker</InputLabel>
                <Select
                  value={workerFilter}
                  onChange={(e) => setWorkerFilter(e.target.value)}
                  label="Worker"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="all">All Workers</MenuItem>
                  {workers.map((worker) => {
                    const wid = normalizeId(worker)
                    return (
                      <MenuItem key={wid} value={wid}>
                        {worker.name}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {Object.entries(STATUS_COLORS).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {/* Active Filters */}
            {(projectFilter !== 'all' || workerFilter !== 'all' || statusFilter !== 'all') && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-light-border dark:border-dark-border">
                <span className="text-sm text-neutral-500">Active:</span>
                {projectFilter !== 'all' && (
                  <Chip
                    size="small"
                    label={projects.find((p) => normalizeId(p) === projectFilter)?.name}
                    onDelete={() => setProjectFilter('all')}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {workerFilter !== 'all' && (
                  <Chip
                    size="small"
                    label={workers.find((w) => normalizeId(w) === workerFilter)?.name}
                    onDelete={() => setWorkerFilter('all')}
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {statusFilter !== 'all' && (
                  <Chip
                    size="small"
                    label={STATUS_COLORS[statusFilter]?.label}
                    onDelete={() => setStatusFilter('all')}
                    sx={{
                      backgroundColor: STATUS_COLORS[statusFilter]?.light,
                      color: STATUS_COLORS[statusFilter]?.text,
                    }}
                  />
                )}
                <button
                  onClick={() => {
                    setProjectFilter('all')
                    setWorkerFilter('all')
                    setStatusFilter('all')
                  }}
                  className="text-sm text-primary hover:underline ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks Content */}
      <motion.div variants={itemVariants}>
        {viewMode === 'table' ? (
          <TasksTable
            tasks={filteredTasks}
            onTaskClick={(task) => handleTaskClick(task, { startEditing: false })}
            onViewTask={(task) => handleTaskClick(task, { startEditing: false })}
            onEditTask={(task) => handleTaskClick(task, { startEditing: true })}
            onStartTask={handleStartTaskFromMenu}
            onCompleteTask={handleCompleteTaskFromMenu}
            onDeleteTask={handleDeleteTaskFromMenu}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TaskCard
                  task={task}
                  onClick={() => handleTaskClick(task, { startEditing: false })}
                  onView={(t) => handleTaskClick(t, { startEditing: false })}
                  onEdit={(t) => handleTaskClick(t, { startEditing: true })}
                  onStart={handleStartTaskFromMenu}
                  onComplete={handleCompleteTaskFromMenu}
                  onDelete={handleDeleteTaskFromMenu}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="premium-card p-12 text-center">
            <AssignmentIcon className="text-neutral-300 dark:text-neutral-600 mx-auto mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
              No tasks found
            </h3>
            <p className="text-neutral-500 mb-4">
              {selectedDate === today
                ? "No tasks scheduled for today"
                : "Try adjusting your filters or date selection"
              }
            </p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="btn-primary"
            >
              Add New Task
            </button>
          </div>
        )}
      </motion.div>

      {/* Add Task Modal */}
      <AddTaskModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        defaultDate={selectedDate !== 'all' ? selectedDate : today}
        onAdd={handleAddTask}
        workers={workers}
        projects={projects}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        open={!!selectedTask}
        onClose={() => {
          setSelectedTask(null)
          setDetailsStartEditing(false)
        }}
        task={selectedTask}
        startEditing={detailsStartEditing}
        onUpdate={handleUpdateTask}
        onUpdateStatus={handleUpdateTaskStatus}
        onLogHours={handleLogTaskHours}
        onDelete={handleDeleteTask}
        projects={projects}
        workers={workers}
      />
    </motion.div>
  )
}

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20 text-primary',
    success: 'from-success/10 to-success/5 border-success/20 text-success',
    warning: 'from-warning/10 to-warning/5 border-warning/20 text-warning',
    info: 'from-info/10 to-info/5 border-info/20 text-info',
  }

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon fontSize="small" />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default TasksPage

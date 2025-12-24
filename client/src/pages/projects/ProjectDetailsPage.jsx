import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

// Hooks
import {
  useMaterials,
  useOtherCosts,
  useWorkerSalaries,
  useBudgetSummary
} from '../../hooks/useProjectCosts'

// MUI Components
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Autocomplete from '@mui/material/Autocomplete'


// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import AddIcon from '@mui/icons-material/Add'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupIcon from '@mui/icons-material/Group'
import TimelineIcon from '@mui/icons-material/Timeline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PendingIcon from '@mui/icons-material/Pending'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import PrintIcon from '@mui/icons-material/Print'
import ShareIcon from '@mui/icons-material/Share'

// Components
import AddWorkerModal from '../../components/projects/AddWorkerModal'
import ProjectTimeline from '../../components/projects/ProjectTimeline'
import MaterialCostTable from '../../components/projects/budget/MaterialCostTable'
import OtherCostTable from '../../components/projects/budget/OtherCostTable'
import WorkerSalaryTable from '../../components/projects/budget/WorkerSalaryTable'
import BudgetSummaryCard from '../../components/projects/budget/BudgetSummaryCard'
import EditProjectModal from '../../components/projects/EditProjectModal'
import toast from 'react-hot-toast'
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal'
import taskService from '../../services/taskService'
import Swal from 'sweetalert2'

import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants/projects'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate as fmtDate } from '../../utils/formatters'
import { mergeSettings } from '../../utils/settings'

const ProjectDetailsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSettings()
  const [activeTab, setActiveTab] = useState(0)
  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // State for Project Data
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Task modal (Timeline)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskModalStartEditing, setTaskModalStartEditing] = useState(false)
  const [customerMenuAnchorEl, setCustomerMenuAnchorEl] = useState(null)
  const customerMenuOpen = Boolean(customerMenuAnchorEl)
  const [projectMenuAnchorEl, setProjectMenuAnchorEl] = useState(null)
  const projectMenuOpen = Boolean(projectMenuAnchorEl)

  const normalizeId = (x) => x?.id || x?._id || x

  const toUiTask = (t, proj) => {
    const date = t?.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''
    const workers = (t?.assignedWorkers?.length ? t.assignedWorkers : (t?.assignedTo ? [t.assignedTo] : [])) || []
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
      project: proj ? { id: normalizeId(proj), name: proj.name, projectId: proj.projectId } : null,
      workers,
      workerIds: workers.map((w) => normalizeId(w)).filter(Boolean),
      status: t.status,
      priority: t.priority,
      location: t.location || '',
      materials: (t.tags && t.tags.slice(1)) || [],
      notes: t.notes || '',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      _raw: t,
    }
  }

  const refreshProject = async () => {
    if (!id) return
    setTasksLoading(true)
    try {
      const res = await api.get(`/projects/${id}`)
      if (res.data.success) {
        const proj = res.data.data.project
        setProject(proj)
        const rawTasks = res.data.data.tasks || []
        setTasks(rawTasks.map((t) => toUiTask(t, proj)))
      }
    } finally {
      setTasksLoading(false)
    }
  }

  const escapeHtml = (str) => {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  const buildCustomerPrintHtml = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const title = `${project?.client || 'Customer'} — Details`
    const contact = project?.clientContact || {}
    const rows = [
      { label: 'Customer', value: project?.client || '-' },
      { label: 'Contact Name', value: contact?.name || '-' },
      { label: 'Phone', value: contact?.phone || '-' },
      { label: 'Email', value: contact?.email || '-' },
      { label: 'Project', value: project?.name || '-' },
      { label: 'Project ID', value: project?.projectId || project?._id || '-' },
      { label: 'Location', value: project?.location || '-' },
    ]

    const toGrid = (items) =>
      items
        .map(
          (r) => `
          <div class="row">
            <div class="label">${escapeHtml(r.label)}</div>
            <div class="value">${escapeHtml(r.value)}</div>
          </div>
        `
        )
        .join('')

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
      .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:1px solid #E5E7EB; padding-bottom:12px; }
      .h1 { font-size: 20px; font-weight: 800; margin: 0; }
      .sub { margin-top: 4px; font-size: 12px; color: #6B7280; }
      .section { margin-top: 16px; }
      .sectionTitle { font-size: 12px; letter-spacing: .08em; color: #6B7280; font-weight: 800; margin: 0 0 10px; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
      .row { display:flex; gap:10px; }
      .label { width: 120px; font-size: 12px; color: #6B7280; font-weight: 700; }
      .value { font-size: 12px; color: #111827; font-weight: 600; word-break: break-word; }
      .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; display:flex; justify-content:space-between; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1 class="h1">${escapeHtml(title)}</h1>
        <div class="sub">Generated on ${escapeHtml(todayStr)}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="sectionTitle">Customer & Project</h2>
      <div class="grid">
        ${toGrid(rows)}
      </div>
    </div>

    <div class="footer">
      <div>Workforce Management</div>
      <div>Project: ${escapeHtml(project?.projectId || project?._id || '')}</div>
    </div>
  </body>
</html>`
  }

  const openPrintWindow = (html) => {
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) {
      toast.error('Popup blocked. Please allow popups to download PDF.')
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  const handleCustomerPrint = () => {
    if (!project) return
    openPrintWindow(buildCustomerPrintHtml())
  }

  const handleCustomerShare = async () => {
    try {
      const url = window.location.href
      const title = project?.client ? `${project.client} — Customer` : 'Customer'
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch (e) {
      console.error(e)
      toast.error('Failed to share')
    }
  }

  const handleCustomerMenuOpen = (e) => setCustomerMenuAnchorEl(e.currentTarget)
  const handleCustomerMenuClose = () => setCustomerMenuAnchorEl(null)
  const handleCustomerDownloadPdf = () => {
    handleCustomerMenuClose()
    handleCustomerPrint()
  }

  const buildProjectPrintHtml = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const title = `${project?.name || 'Project'} — Details`
    const contact = project?.clientContact || {}

    const projectRows = [
      { label: 'Project', value: project?.name || '-' },
      { label: 'Project ID', value: project?.projectId || project?._id || '-' },
      { label: 'Status', value: statusColor?.label || project?.status || '-' },
      { label: 'Priority', value: project?.priority || '-' },
      { label: 'Start Date', value: project?.startDate ? formatDate(project.startDate, effectiveSettings) : '-' },
      { label: 'End Date', value: project?.endDate ? formatDate(project.endDate, effectiveSettings) : '-' },
      { label: 'Location', value: project?.location || '-' },
      { label: 'Budget', value: formatCurrency(project?.budget || 0, effectiveSettings) },
      { label: 'Spent', value: formatCurrency(spentAmount || 0, effectiveSettings) },
      { label: 'Remaining', value: formatCurrency((project?.budget || 0) - (spentAmount || 0), effectiveSettings) },
    ]

    const customerRows = [
      { label: 'Customer', value: project?.client || '-' },
      { label: 'Contact Name', value: contact?.name || '-' },
      { label: 'Phone', value: contact?.phone || '-' },
      { label: 'Email', value: contact?.email || '-' },
    ]

    const toGrid = (items) =>
      items
        .map(
          (r) => `
          <div class="row">
            <div class="label">${escapeHtml(r.label)}</div>
            <div class="value">${escapeHtml(r.value)}</div>
          </div>
        `
        )
        .join('')

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
      .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:1px solid #E5E7EB; padding-bottom:12px; }
      .h1 { font-size: 20px; font-weight: 800; margin: 0; }
      .sub { margin-top: 4px; font-size: 12px; color: #6B7280; }
      .section { margin-top: 16px; }
      .sectionTitle { font-size: 12px; letter-spacing: .08em; color: #6B7280; font-weight: 800; margin: 0 0 10px; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
      .row { display:flex; gap:10px; }
      .label { width: 120px; font-size: 12px; color: #6B7280; font-weight: 700; }
      .value { font-size: 12px; color: #111827; font-weight: 600; word-break: break-word; }
      .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; display:flex; justify-content:space-between; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1 class="h1">${escapeHtml(title)}</h1>
        <div class="sub">Generated on ${escapeHtml(todayStr)}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="sectionTitle">Project Summary</h2>
      <div class="grid">
        ${toGrid(projectRows)}
      </div>
    </div>

    <div class="section">
      <h2 class="sectionTitle">Customer</h2>
      <div class="grid">
        ${toGrid(customerRows)}
      </div>
    </div>

    <div class="footer">
      <div>Workforce Management</div>
      <div>Project: ${escapeHtml(project?.projectId || project?._id || '')}</div>
    </div>
  </body>
</html>`
  }

  const handleProjectPrint = () => {
    if (!project) return
    openPrintWindow(buildProjectPrintHtml())
  }

  const handleProjectShare = async () => {
    try {
      const url = window.location.href
      const title = project?.name ? `${project.name} — Project` : 'Project'
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch (e) {
      console.error(e)
      toast.error('Failed to share')
    }
  }

  const handleProjectMenuOpen = (e) => setProjectMenuAnchorEl(e.currentTarget)
  const handleProjectMenuClose = () => setProjectMenuAnchorEl(null)
  const handleProjectDownloadPdf = () => {
    handleProjectMenuClose()
    handleProjectPrint()
  }

  // Budget Hooks
  const {
    materials,
    add: addMaterial,
    update: updateMaterial,
    remove: deleteMaterial
  } = useMaterials(project?._id)

  const {
    costs: otherCosts,
    add: addOtherCost,
    update: updateOtherCost,
    remove: deleteOtherCost
  } = useOtherCosts(project?._id)

  const {
    salaries,
    refresh: refreshSalaries
  } = useWorkerSalaries(project?._id)

  const {
    summary: budgetSummary,
    refresh: refreshBudget
  } = useBudgetSummary(project?._id)

  // Fetch Project Data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        // Check if ID is a valid MongoDB ObjectID (24 hex chars)
        // If not, it might be a mock ID, so we might fail or need fallback logic
        // For this implementation, we assume valid ID or handle error gracefully
        const res = await api.get(`/projects/${id}`)
        if (res.data.success) {
          const proj = res.data.data.project
          setProject(proj)
          const rawTasks = res.data.data.tasks || []
          setTasks(rawTasks.map((t) => toUiTask(t, proj)))
        }
      } catch (err) {
        console.error("Failed to fetch project:", err)
        setError("Project not found or invalid ID")
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProject()
  }, [id])

  // Auto-refresh timeline when the Timeline tab is opened
  useEffect(() => {
    if (activeTab === 1) refreshProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])



  const effectiveSettings = useMemo(() => {
    return mergeSettings(settings, project?.settingsOverrides || {})
  }, [settings, project?.settingsOverrides])



  // Reload budget when tab is switched to Budget (index 3)
  useEffect(() => {
    if (activeTab === 3 && project?._id) {
      refreshBudget()
      refreshSalaries?.()
    }
  }, [activeTab, project?._id, refreshBudget, refreshSalaries])


  if (loading) {
    return <LinearProgress />
  }

  if (error || !project) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-light-text dark:text-dark-text mb-2">
            {error || "Project not found"}
          </h2>
          <button
            onClick={() => navigate('/projects')}
            className="text-primary hover:underline"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  // Derived Data
  const statusColor = STATUS_COLORS[project.status] || { bg: '#888', text: '#fff', light: '#eee', label: project.status }
  const priorityColor = PRIORITY_COLORS[project.priority] || { bg: '#888', text: '#fff', light: '#eee' }
  const assignedWorkerDetails = project.assignedWorkers || []
  const isProjectLocked = Boolean(project?.locked || project?.isLocked) || project?.status === 'completed'

  // Task Stats
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'todo').length
  }

  // Calculate metrics
  const today = new Date()
  const startDate = new Date(project.startDate)
  const endDate = new Date(project.endDate)
  // const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  // const daysElapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))

  // Use budgetSummary from hook if available, else project.spent
  const spentAmount = budgetSummary ? budgetSummary.spent : project.spent
  const budgetUtilization = project.budget > 0 ? Math.round((spentAmount / project.budget) * 100) : 0



  const handleAddWorker = (updatedProject) => {
    if (updatedProject) {
      setProject(prev => ({ ...prev, ...updatedProject }))
    }
    setAddWorkerModalOpen(false)
  }

  const handleRemoveWorker = async (workerId) => {
    try {
      if (!project?._id) return

      const result = await Swal.fire({
        title: 'Are you sure you want to remove this worker from the project?',
        text: 'This will not delete past attendance or salary records.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Remove worker',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        focusCancel: true,
      })

      if (!result.isConfirmed) return

      const remaining = (project.assignedWorkers || [])
        .map(w => w?._id || w?.id || w)
        .filter(id => id && id !== workerId)
      const response = await api.put(`/projects/${project._id}/workers`, { workerIds: remaining })
      setProject(prev => ({ ...prev, ...response.data?.data }))
      toast.success('Worker removed from project')
    } catch (e) {
      console.error(e)
      toast.error(e?.response?.data?.message || 'Failed to remove worker')
    }
  }

  const handleOpenTask = (task, { startEditing = false } = {}) => {
    setSelectedTask(task)
    setTaskModalStartEditing(startEditing)
    setTaskModalOpen(true)
  }

  const handleCloseTaskModal = () => {
    setTaskModalOpen(false)
    setSelectedTask(null)
    setTaskModalStartEditing(false)
  }

  const handleUpdateTask = async (task, payload) => {
    const tid = task?.id || task?._id
    await taskService.updateTask(tid, payload)
    await refreshProject()
  }

  const handleUpdateTaskStatus = async (task, status) => {
    const tid = task?.id || task?._id
    await taskService.updateStatus(tid, status)
    await refreshProject()
  }

  const handleDeleteTask = async (task) => {
    const tid = task?.id || task?._id
    await taskService.deleteTask(tid)
    await refreshProject()
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
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors mt-1"
          >
            <ArrowBackIcon className="text-neutral-600 dark:text-neutral-300" />
          </button>
          <div>
            <p className="text-sm text-neutral-500 mb-1">{project.projectId || project._id.substr(-6)}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-sm text-neutral-500">
                Customer: <span className="font-semibold text-light-text dark:text-dark-text">{project.client || '—'}</span>
              </span>
              {(project.clientContact?.phone || project.clientContact?.email) && (
                <div className="flex items-center gap-1">
                  {project.clientContact?.phone && (
                    <Tooltip title={`Call ${project.clientContact.phone}`}>
                      <IconButton
                        size="small"
                        className="!bg-neutral-100 dark:!bg-neutral-800"
                        component="a"
                        href={`tel:${project.clientContact.phone}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PhoneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {project.clientContact?.email && (
                    <Tooltip title={`Email ${project.clientContact.email}`}>
                      <IconButton
                        size="small"
                        className="!bg-neutral-100 dark:!bg-neutral-800"
                        component="a"
                        href={`mailto:${project.clientContact.email}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Chip
                label={statusColor?.label}
                sx={{
                  backgroundColor: statusColor?.light,
                  color: statusColor?.text,
                  fontWeight: 600,
                }}
              />
              <Chip
                label={project.priority}
                size="small"
                sx={{
                  backgroundColor: priorityColor?.light,
                  color: priorityColor?.text,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title="Print (Save as PDF)">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800" onClick={handleProjectPrint}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800" onClick={handleProjectShare}>
              <ShareIcon />
            </IconButton>
          </Tooltip>
          <button
            onClick={() => setEditModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <EditIcon fontSize="small" />
            <span className="hidden sm:inline">Edit Project</span>
          </button>
          <IconButton onClick={handleProjectMenuOpen} aria-label="Project actions">
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={projectMenuAnchorEl}
            open={projectMenuOpen}
            onClose={handleProjectMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleProjectDownloadPdf}>
              <span className="mr-2">PDF</span>
              Download PDF
            </MenuItem>
          </Menu>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStatCard
          icon={CheckCircleIcon}
          label="Progress"
          value={`${project.progress}%`}
          color={statusColor?.bg}
        />
        <QuickStatCard
          icon={CalendarTodayIcon}
          label="Days Left"
          value={daysRemaining > 0 ? daysRemaining : 'Overdue'}
          color={daysRemaining > 0 ? '#0EA5E9' : '#EF4444'}
        />
        <QuickStatCard
          icon={AttachMoneyIcon}
          label="Budget Used"
          value={`${budgetUtilization}%`}
          color={budgetUtilization > 90 ? '#EF4444' : '#22C55E'}
        />
        <QuickStatCard
          icon={GroupIcon}
          label="Team Size"
          value={assignedWorkerDetails.length}
          color="#8B5CF6"
        />
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="premium-card">
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
                '& .Mui-selected': { color: '#FF6A00' },
                '& .MuiTabs-indicator': { backgroundColor: '#FF6A00' },
              }}
              variant="scrollable"
            >
              <Tab icon={<AssignmentIcon fontSize="small" />} label="Overview" iconPosition="start" />
              <Tab icon={<TimelineIcon fontSize="small" />} label="Timeline" iconPosition="start" />
              <Tab icon={<GroupIcon fontSize="small" />} label="Team" iconPosition="start" />
              <Tab icon={<MonetizationOnIcon fontSize="small" />} label="Budget & Costs" iconPosition="start" />
            </Tabs>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 0 && (
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">
                      Description
                    </h3>
                    <p className="text-light-text dark:text-dark-text">
                      {project.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-neutral-500 uppercase">
                        Overall Progress
                      </h3>
                      <span className="text-lg font-bold" style={{ color: statusColor?.bg }}>
                        {project.progress}%
                      </span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={project.progress}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: statusColor?.light,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: statusColor?.bg,
                          borderRadius: 5,
                        },
                      }}
                    />
                  </div>

                  {/* Tasks Summary */}
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-3">
                      Tasks Overview
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      <TaskStatCard
                        icon={AssignmentIcon}
                        label="Total"
                        value={taskStats.total}
                        color="neutral"
                      />
                      <TaskStatCard
                        icon={CheckCircleIcon}
                        label="Completed"
                        value={taskStats.completed}
                        color="success"
                      />
                      <TaskStatCard
                        icon={ScheduleIcon}
                        label="In Progress"
                        value={taskStats.inProgress}
                        color="primary"
                      />
                      <TaskStatCard
                        icon={PendingIcon}
                        label="Pending"
                        value={taskStats.pending}
                        color="warning"
                      />
                    </div>
                  </div>

                  {/* Budget Mini-view (Redirects to Budget Tab visually) */}
                  <div onClick={() => setActiveTab(3)} className="cursor-pointer transition-transform hover:scale-[1.01]">
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-3">
                      Budget Snippet (Click for Details)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                        <p className="text-xs text-neutral-500">Total Budget</p>
                        <p className="text-xl font-bold text-light-text dark:text-dark-text">
                          {formatCurrency(project.budget, effectiveSettings)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-success/10">
                        <p className="text-xs text-neutral-500">Spent</p>
                        <p className="text-xl font-bold text-success">
                          {formatCurrency(spentAmount, effectiveSettings)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-info/10">
                        <p className="text-xs text-neutral-500">Remaining</p>
                        <p className="text-xl font-bold text-info">
                          {formatCurrency(project.budget - spentAmount, effectiveSettings)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: '8px' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 1 && (
                <div className="space-y-3">
                  {tasksLoading && (
                    <p className="text-sm text-neutral-500">Loading timeline…</p>
                  )}
                  <ProjectTimeline
                    tasks={tasks}
                    onTaskClick={(t) => handleOpenTask(t, { startEditing: false })}
                  />
                </div>
              )}

              {/* Team Tab */}
              {activeTab === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase">
                      Assigned Workers ({assignedWorkerDetails.length})
                    </h3>
                    {user?.role === 'Admin' && !isProjectLocked && (
                      <button
                        onClick={() => setAddWorkerModalOpen(true)}
                        className="btn-primary text-sm flex items-center gap-1"
                      >
                        <AddIcon fontSize="small" />
                        Add Worker
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {assignedWorkerDetails.length === 0 && <p className="text-neutral-500">No workers assigned.</p>}
                    {assignedWorkerDetails.map((worker) => (
                      <div
                        key={worker._id || worker.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            sx={{
                              width: 44,
                              height: 44,
                              background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                            }}
                          >
                            {worker.name ? worker.name.charAt(0) : '?'}
                          </Avatar>
                          <div>
                            <p className="font-medium text-light-text dark:text-dark-text">
                              {worker.name}
                            </p>
                            <p className="text-sm text-primary">{worker.position || worker.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Skills not always populated in simple API logic, skip for now */}
                          {user?.role === 'Admin' && !isProjectLocked && (
                            <Tooltip title="Remove from project">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveWorker(worker._id)}
                                className="!text-danger"
                              >
                                <RemoveCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BUDGET TAB */}
              {activeTab === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <BudgetSummaryCard 
                    summary={budgetSummary || {
                      totalBudget: project.budget,
                      spent: project.spent,
                      remaining: project.budget - project.spent
                    }} 
                    settings={effectiveSettings}
                  />

                  <MaterialCostTable
                    materials={materials}
                    onAdd={addMaterial}
                    onUpdate={updateMaterial}
                    onDelete={deleteMaterial}
                    userRole={user?.role}
                    settings={effectiveSettings}
                  />

                  <OtherCostTable
                    costs={otherCosts}
                    onAdd={addOtherCost}
                    onUpdate={updateOtherCost}
                    onDelete={deleteOtherCost}
                    userRole={user?.role}
                    settings={effectiveSettings}
                  />

                  <WorkerSalaryTable
                    salaries={salaries}
                    settings={effectiveSettings}
                  />
                </Box>
              )}

              {/* PROJECT SETTINGS TAB - REMOVED (Settings managed in Admin panel) */}
              {false && activeTab === 4 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-500 uppercase">Overrides</h3>
                      <p className="text-sm text-neutral-500">
                        Project-level currency/theme overrides (fallback to workspace defaults).
                      </p>
                    </div>
                    <Button variant="contained" onClick={saveProjectOverrides} disabled={savingOverrides || user?.role !== 'Admin'}>
                      {savingOverrides ? 'Saving…' : 'Save Project Settings'}
                    </Button>
                  </div>

                  {user?.role !== 'Admin' && (
                    <Alert severity="info">Only Admin can edit project-level settings.</Alert>
                  )}

                  <Divider />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={currencyOverrideEnabled}
                        onChange={(e) => {
                          const on = e.target.checked
                          setOverridesDraft((p) => ({
                            ...p,
                            currency: on ? { ...(effectiveSettings.currency || {}) } : null,
                          }))
                        }}
                      />
                    }
                    label="Override currency for this project"
                  />

                  {currencyOverrideEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Autocomplete
                        options={CURRENCY_OPTIONS}
                        value={CURRENCY_OPTIONS.find((o) => o.code === overridesDraft.currency?.code) || null}
                        onChange={(_, opt) => {
                          if (!opt) return
                          setOverridesDraft((p) => ({
                            ...p,
                            currency: {
                              ...(p.currency || {}),
                              code: opt.code,
                              symbol: opt.symbol,
                              decimals: opt.decimals,
                              position: opt.position || 'prefix',
                            },
                          }))
                        }}
                        getOptionLabel={(o) => `${o.code} — ${o.name}`}
                        isOptionEqualToValue={(a, b) => a.code === b.code}
                        renderInput={(params) => (
                          <TextField {...params} label="Currency" placeholder="Search: INR, USD…" />
                        )}
                      />
                      <TextField
                        label="Symbol"
                        value={overridesDraft.currency?.symbol || ''}
                        onChange={(e) => setOverridesDraft((p) => ({ ...p, currency: { ...(p.currency || {}), symbol: e.target.value } }))}
                      />
                      <TextField
                        label="Position"
                        value={overridesDraft.currency?.position || 'prefix'}
                        onChange={(e) => setOverridesDraft((p) => ({ ...p, currency: { ...(p.currency || {}), position: e.target.value } }))}
                        helperText="prefix / suffix"
                      />
                      <TextField
                        label="Decimals"
                        type="number"
                        value={overridesDraft.currency?.decimals ?? 2}
                        onChange={(e) => setOverridesDraft((p) => ({ ...p, currency: { ...(p.currency || {}), decimals: Number(e.target.value) } }))}
                        inputProps={{ min: 0, max: 6 }}
                      />
                    </div>
                  )}

                  <Divider />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={dateTimeOverrideEnabled}
                        onChange={(e) => {
                          const on = e.target.checked
                          setOverridesDraft((p) => ({
                            ...p,
                            dateTime: on ? { ...(effectiveSettings.dateTime || {}) } : null,
                          }))
                        }}
                      />
                    }
                    label="Override date/time for this project"
                  />

                  {dateTimeOverrideEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Autocomplete
                        options={timeZones}
                        value={overridesDraft.dateTime?.timezone || 'UTC'}
                        onChange={(_, tz) => {
                          if (!tz) return
                          setOverridesDraft((p) => ({
                            ...p,
                            dateTime: { ...(p.dateTime || {}), timezone: tz },
                          }))
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Timezone" placeholder="Search timezone" />
                        )}
                      />
                      <FormControl>
                        <InputLabel>Date Format</InputLabel>
                        <Select
                          label="Date Format"
                          value={overridesDraft.dateTime?.dateFormat || 'YYYY-MM-DD'}
                          onChange={(e) =>
                            setOverridesDraft((p) => ({
                              ...p,
                              dateTime: { ...(p.dateTime || {}), dateFormat: e.target.value },
                            }))
                          }
                        >
                          <MenuItem value="DD-MM-YYYY">DD-MM-YYYY</MenuItem>
                          <MenuItem value="MM-DD-YYYY">MM-DD-YYYY</MenuItem>
                          <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <InputLabel>Time Format</InputLabel>
                        <Select
                          label="Time Format"
                          value={overridesDraft.dateTime?.timeFormat || '24h'}
                          onChange={(e) =>
                            setOverridesDraft((p) => ({
                              ...p,
                              dateTime: { ...(p.dateTime || {}), timeFormat: e.target.value },
                            }))
                          }
                        >
                          <MenuItem value="12h">12h</MenuItem>
                          <MenuItem value="24h">24h</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                  )}

                  <Divider />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={themeOverrideEnabled}
                        onChange={(e) => {
                          const on = e.target.checked
                          setOverridesDraft((p) => ({
                            ...p,
                            theme: on ? { ...(effectiveSettings.theme || {}) } : null,
                          }))
                        }}
                      />
                    }
                    label="Override theme for this project"
                  />

                  {themeOverrideEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ColorField
                        label="Primary"
                        value={overridesDraft.theme?.primary || ''}
                        onChange={(v) => setOverridesDraft((p) => ({ ...p, theme: { ...(p.theme || {}), primary: v } }))}
                      />
                      <ColorField
                        label="Secondary"
                        value={overridesDraft.theme?.secondary || ''}
                        onChange={(v) => setOverridesDraft((p) => ({ ...p, theme: { ...(p.theme || {}), secondary: v } }))}
                      />
                      <ColorField
                        label="Accent"
                        value={overridesDraft.theme?.accent || ''}
                        onChange={(v) => setOverridesDraft((p) => ({ ...p, theme: { ...(p.theme || {}), accent: v } }))}
                      />
                      <ColorField
                        label="Background"
                        value={overridesDraft.theme?.background || ''}
                        onChange={(v) => setOverridesDraft((p) => ({ ...p, theme: { ...(p.theme || {}), background: v } }))}
                      />
                      <TextField
                        label="Font Size"
                        type="number"
                        value={overridesDraft.theme?.fontSize ?? 14}
                        onChange={(e) => setOverridesDraft((p) => ({ ...p, theme: { ...(p.theme || {}), fontSize: Number(e.target.value) } }))}
                        inputProps={{ min: 10, max: 22 }}
                      />
                    </div>
                  )}

                  {themeOverrideEnabled && !themeContrast.ok && themeContrast.rows.length > 0 && (
                    <Alert severity="warning">
                      Contrast warning (target ≥ 3.0):{' '}
                      {themeContrast.rows.map((r) => `${r.label}: ${r.ratio}`).join(' • ')}
                    </Alert>
                  )}
                </Box>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Column - Sidebar */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Project Info */}
          <div className="premium-card p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Project Details
            </h3>
            <div className="space-y-4">
              <InfoRow icon={CalendarTodayIcon} label="Start Date" value={formatDate(project.startDate, settings)} />
              <InfoRow icon={CalendarTodayIcon} label="End Date" value={formatDate(project.endDate, settings)} />
              <InfoRow icon={LocationOnIcon} label="Location" value={project.location || 'N/A'} />
            </div>
          </div>

          {/* Customer Info */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase">
                Customer
              </h3>
              <div className="flex items-center gap-2">
                <Tooltip title="Print (Save as PDF)">
                  <IconButton size="small" className="!bg-neutral-100 dark:!bg-neutral-800" onClick={handleCustomerPrint}>
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share">
                  <IconButton size="small" className="!bg-neutral-100 dark:!bg-neutral-800" onClick={handleCustomerShare}>
                    <ShareIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={handleCustomerMenuOpen} aria-label="Customer actions">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={customerMenuAnchorEl}
                  open={customerMenuOpen}
                  onClose={handleCustomerMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem onClick={handleCustomerDownloadPdf}>
                    <span className="mr-2">PDF</span>
                    Download PDF
                  </MenuItem>
                </Menu>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar sx={{ bgcolor: '#1E293B' }}>
                  {project.client ? project.client.charAt(0) : 'C'}
                </Avatar>
                <div>
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {project.client}
                  </p>
                  <p className="text-sm text-neutral-500">Customer</p>
                </div>
              </div>

              {(project.clientContact?.name || project.clientContact?.phone || project.clientContact?.email) ? (
                <div className="space-y-2">
                  {project.clientContact?.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <PersonIcon fontSize="small" className="text-neutral-400" />
                      <span className="text-light-text dark:text-dark-text font-medium">
                        {project.clientContact.name}
                      </span>
                      <span className="text-neutral-500">(Contact)</span>
                    </div>
                  )}
                  {project.clientContact?.phone && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <PhoneIcon fontSize="small" className="text-neutral-400" />
                        <span className="text-light-text dark:text-dark-text">{project.clientContact.phone}</span>
                      </div>
                      <a
                        href={`tel:${project.clientContact.phone}`}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Call
                      </a>
                    </div>
                  )}
                  {project.clientContact?.email && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <EmailIcon fontSize="small" className="text-neutral-400" />
                        <span className="text-light-text dark:text-dark-text">{project.clientContact.email}</span>
                      </div>
                      <a
                        href={`mailto:${project.clientContact.email}`}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Email
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  No customer contact details added yet.
                </p>
              )}
            </div>
          </div>

          {/* Manager Info */}
          <div className="premium-card p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Project Manager
            </h3>
            {project.manager && (
              <div className="flex items-center gap-3">
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
                  }}
                >
                  {project.manager.name ? project.manager.name.charAt(0) : 'M'}
                </Avatar>
                <div>
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {project.manager.name}
                  </p>
                  <p className="text-sm text-primary">{project.manager.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="premium-card p-6">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                Notes
              </h3>
              <p className="text-sm text-light-text dark:text-dark-text">
                {project.notes}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Worker Modal */}
      <AddWorkerModal
        open={addWorkerModalOpen}
        onClose={() => setAddWorkerModalOpen(false)}
        projectId={project._id}
        assignedWorkerIds={project.assignedWorkers?.map(w => w._id)}
        onAdd={handleAddWorker}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
        onSave={async (updatedProject) => {
          try {
            const pid = project?._id || project?.id
            if (!pid) throw new Error('Missing project id')
            const res = await api.put(`/projects/${pid}`, updatedProject)
            if (res.data?.success) {
              setProject(res.data.data)
              toast.success('Project updated')
              setEditModalOpen(false)
            } else {
              toast.error(res.data?.message || 'Failed to update project')
            }
          } catch (e) {
            console.error(e)
            const details = e.response?.data?.errors?.[0]?.message
            toast.error(details || e.response?.data?.message || 'Failed to update project')
          }
        }}
      />

      {/* Task Detail Modal (from Timeline) */}
      <TaskDetailsModal
        open={taskModalOpen}
        onClose={handleCloseTaskModal}
        task={selectedTask}
        startEditing={taskModalStartEditing}
        onUpdate={handleUpdateTask}
        onUpdateStatus={handleUpdateTaskStatus}
        onDelete={handleDeleteTask}
        projects={project ? [project] : []}
        workers={assignedWorkerDetails || []}
      />
    </motion.div>
  )
}

// Helper Components
const QuickStatCard = ({ icon: Icon, label, value, color }) => (
  <div className="premium-card p-4">
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon sx={{ color }} />
      </div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-xl font-bold text-light-text dark:text-dark-text">{value}</p>
      </div>
    </div>
  </div>
)

const TaskStatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600',
    success: 'bg-success/10 text-success',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
  }

  return (
    <div className={`p-3 rounded-xl ${colors[color]} text-center`}>
      <Icon fontSize="small" className="mb-1" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  )
}

const InfoRow = ({ icon: Icon, label, value, small = false }) => (
  <div className="flex items-start gap-3">
    <Icon className="text-neutral-400 mt-0.5" fontSize="small" />
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-light-text dark:text-dark-text ${small ? 'text-sm' : ''}`}>
        {value}
      </p>
    </div>
  </div>
)

const formatDate = (dateStr, settings) => {
  if (!dateStr) return 'N/A'
  return fmtDate(dateStr, settings)
}

export default ProjectDetailsPage

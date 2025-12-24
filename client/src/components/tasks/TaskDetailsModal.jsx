import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

// MUI Components
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Autocomplete from '@mui/material/Autocomplete'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import FolderIcon from '@mui/icons-material/Folder'
import PersonIcon from '@mui/icons-material/Person'
import InventoryIcon from '@mui/icons-material/Inventory'
import NotesIcon from '@mui/icons-material/Notes'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import AssignmentIcon from '@mui/icons-material/Assignment'

// Data
import { STATUS_COLORS, PRIORITY_COLORS, TASK_TYPES } from '../../constants/tasks'
import taskService from '../../services/taskService'

const TaskDetailsModal = ({ 
  open, 
  onClose, 
  task, 
  startEditing = false, 
  onUpdate,
  onUpdateStatus, 
  onLogHours, 
  onDelete,
  projects = [],
  workers = []
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [eligibleWorkers, setEligibleWorkers] = useState([])
  const [eligibleLoading, setEligibleLoading] = useState(false)
  const [eligibleMessage, setEligibleMessage] = useState('')

  // Editable form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    type: 'Welding',
    actualHours: 0,
    dueDate: '',
    startTime: '',
    endTime: '',
    location: '',
    projectId: '',
    assignedWorkers: [],
    materials: [],
    notes: '',
  })

  // Initialize form data when task changes
  useEffect(() => {
    if (!open || !task) return
    
    setIsEditing(!!startEditing)
    setHasUnsavedChanges(false)
    
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      type: task.type || 'Welding',
      actualHours: task.actualHours || 0,
      // TasksPage normalizes date-only into `task.date`
      dueDate: task.date || (task.dueDate ? String(task.dueDate).split('T')[0] : ''),
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      location: task.location || '',
      projectId: task.project?.id || task.project?._id || task.project || '',
      // TasksPage normalizes assigned ids into `task.workerIds`
      assignedWorkers: Array.isArray(task.workerIds) ? task.workerIds : (task.assignedWorkers?.map(w => w._id || w) || []),
      materials: task.materials || [],
      notes: task.notes || '',
    })
  }, [open, startEditing, task])

  const isStarted = task?.status && task.status !== 'pending'

  const selectedProject = useMemo(() => {
    const pid = formData.projectId || task?.project?.id || task?.project?._id || task?.project
    if (!pid) return null
    return projects.find(p => (p._id || p.id) === pid) || null
  }, [projects, formData.projectId, task])

  const formatYmdToDmy = (ymd) => {
    if (!ymd || typeof ymd !== 'string') return ''
    const [y, m, d] = ymd.split('-')
    if (!y || !m || !d) return ymd
    return `${d}-${m}-${y}`
  }

  const projectEndDateStr = useMemo(() => {
    if (!selectedProject?.endDate) return ''
    const dt = new Date(selectedProject.endDate)
    if (Number.isNaN(dt.getTime())) return ''
    return dt.toISOString().split('T')[0]
  }, [selectedProject])

  const projectStartDateStr = useMemo(() => {
    if (!selectedProject?.startDate) return ''
    const dt = new Date(selectedProject.startDate)
    if (Number.isNaN(dt.getTime())) return ''
    return dt.toISOString().split('T')[0]
  }, [selectedProject])

  const projectDateHint = useMemo(() => {
    if (!projectStartDateStr && !projectEndDateStr) return ''
    const start = projectStartDateStr ? formatYmdToDmy(projectStartDateStr) : '—'
    const end = projectEndDateStr ? formatYmdToDmy(projectEndDateStr) : '—'
    return `Project schedule: ${start} → ${end}. You can create tasks up to the end date.`
  }, [projectStartDateStr, projectEndDateStr])

  const projectEndWarning = useMemo(() => {
    if (!projectEndDateStr || !formData.dueDate) return ''
    const end = new Date(`${projectEndDateStr}T00:00:00`)
    const cur = new Date(`${formData.dueDate}T00:00:00`)
    if ([end, cur].some(d => Number.isNaN(d.getTime()))) return ''
    const diffDays = Math.round((end.getTime() - cur.getTime()) / 86400000)
    if (diffDays < 0) return ''
    if (diffDays > 2) return ''
    const endLabel = formatYmdToDmy(projectEndDateStr)
    if (diffDays === 0) return `Project ends today (End: ${endLabel}).`
    if (diffDays === 1) return `Project ends tomorrow (End: ${endLabel}).`
    return `Project ends in ${diffDays} days (End: ${endLabel}).`
  }, [projectEndDateStr, formData.dueDate])

  useEffect(() => {
    const fetchEligible = async () => {
      if (!open) return
      if (!isEditing) return
      if (!formData.dueDate) return
      setEligibleLoading(true)
      try {
        const res = await taskService.getEligibleWorkers(formData.dueDate, formData.startTime, formData.endTime)
        setEligibleWorkers(res.data || [])
        setEligibleMessage(res.message || '')
      } catch {
        setEligibleWorkers([])
        setEligibleMessage('Failed to load eligible workers')
      } finally {
        setEligibleLoading(false)
      }
    }
    fetchEligible()
  }, [open, isEditing, formData.dueDate, formData.startTime, formData.endTime])

  if (!task) return null

  const statusColor = STATUS_COLORS[formData.status] || STATUS_COLORS[task.status]
  const priorityColor = PRIORITY_COLORS[formData.priority] || PRIORITY_COLORS[task.priority]

  const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const progressPercent = formData.actualHours > 0
    ? Math.min(100, Math.round(formData.actualHours * 10)) // simple visual feedback; not tied to "estimated hours"
    : 0

  // Handle field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    // ENTERPRISE UX: If date changes while editing, clear selected workers (prevents invalid assignments)
    if (field === 'dueDate') {
      setFormData(prev => ({ ...prev, dueDate: value, assignedWorkers: [] }))
    }
  }

  const handleToggleEditMode = () => {
    if (isEditing && hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Discard them?')
      if (!confirm) return
    }
    setIsEditing(!isEditing)
    if (isEditing) {
      // Reset form data
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        type: task.type || 'Welding',
        actualHours: task.actualHours || 0,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        startTime: task.startTime || '',
        endTime: task.endTime || '',
        location: task.location || '',
        projectId: task.project?._id || task.project || '',
        assignedWorkers: task.assignedWorkers?.map(w => w._id || w) || [],
        materials: task.materials || [],
        notes: task.notes || '',
      })
      setHasUnsavedChanges(false)
    }
  }

  const handleSaveChanges = async () => {
    const taskId = task?.id || task?._id
    if (!taskId) {
      toast.error('Task ID is missing')
      return
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Task title is required')
      return
    }
    if (!formData.projectId) {
      toast.error('Project is required')
      return
    }
    if (!formData.dueDate) {
      toast.error('Due date is required')
      return
    }
    if (projectEndDateStr && formData.dueDate > projectEndDateStr) {
      toast.error('This task date exceeds the project end date. Please extend the project to continue.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        type: formData.type,
        actualHours: Number(formData.actualHours),
        dueDate: formData.dueDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location,
        projectId: formData.projectId,
        assignedWorkers: formData.assignedWorkers,
        // Persist type/materials using tags (backward-compatible)
        tags: [
          ...(formData.type ? [formData.type] : []),
          ...(Array.isArray(formData.materials) ? formData.materials : []),
        ],
        notes: formData.notes,
      }

      if (onUpdate) {
        await onUpdate(task, payload)
      }
      toast.success('Task updated successfully')
      setIsEditing(false)
      setHasUnsavedChanges(false)
    } catch (e) {
      console.error('Save error:', e)
      toast.error(e?.response?.data?.message || 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickStatusUpdate = async (newStatus) => {
    if (isEditing) {
      handleFieldChange('status', newStatus)
      return
    }
    
    try {
      await onUpdateStatus?.(task, newStatus)
      toast.success('Status updated')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!(task?.id || task?._id)) return
    const ok = window.confirm(`Delete task "${task.title}"?`)
    if (!ok) return
    setDeleting(true)
    try {
      await onDelete?.(task)
      toast.success('Task deleted')
      onClose?.()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px', maxHeight: '90vh' },
      }}
    >
      <DialogTitle className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-4">
        <div className="flex items-center gap-3 flex-1">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${priorityColor?.bg} 0%, ${priorityColor?.bg}dd 100%)` 
            }}
          >
            <AssignmentIcon className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-neutral-500">{task.taskId}</p>
              <Chip
                label={statusColor?.label}
                size="small"
                sx={{
                  backgroundColor: statusColor?.light,
                  color: statusColor?.text,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: '20px',
                }}
              />
              {hasUnsavedChanges && (
                <Chip
                  label="Unsaved"
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 600, fontSize: '0.7rem', height: '20px' }}
                />
              )}
            </div>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
              {isEditing ? 'Edit Task' : 'View Task'}
            </h2>
            <p className="text-sm text-neutral-500">
              {isEditing ? 'Update task details' : `${task.title} • ${task.type || 'Task'} • ${task.priority} priority`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FormControlLabel
            control={
              <Switch
                checked={isEditing}
                onChange={handleToggleEditMode}
                color="primary"
              />
            }
            label={isEditing ? 'Editing' : 'Edit'}
            sx={{ mr: 1 }}
          />
          {!isEditing && (
            <IconButton onClick={handleDelete} disabled={deleting}>
              <DeleteIcon className="text-danger" />
            </IconButton>
          )}
          <IconButton
            onClick={onClose}
            aria-label="Close"
            sx={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#fff',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.75)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent className="!py-6">
        <div className="space-y-6">
          {/* SECTION: Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Task Information
            </h3>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <TextField
                    fullWidth
                    label="Task Title"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    required
                    error={!formData.title.trim()}
                    helperText={!formData.title.trim() ? 'Title is required' : ''}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormControl fullWidth>
                      <InputLabel>Task Type</InputLabel>
                      <Select
                        value={formData.type}
                        label="Task Type"
                        onChange={(e) => handleFieldChange('type', e.target.value)}
                      >
                        {TASK_TYPES.map(type => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={formData.priority}
                        label="Priority"
                        onChange={(e) => handleFieldChange('priority', e.target.value)}
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="urgent">Urgent</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.status}
                        label="Status"
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in-progress">In Progress</MenuItem>
                        <MenuItem value="on-hold">On Hold</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                  />
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Description</p>
                    <p className="text-light-text dark:text-dark-text">
                      {task.description || 'No description provided.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION: Time Tracking */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Time Tracking
            </h3>
            
            <div className="premium-card p-4 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Logged Hours
                </span>
                <span className="text-lg font-bold" style={{ color: statusColor?.bg }}>
                  {Number(formData.actualHours || 0)}h
                </span>
              </div>
              
              {isEditing ? (
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <TextField
                    fullWidth
                    type="number"
                    label="Actual Hours Logged"
                    value={formData.actualHours}
                    onChange={(e) => handleFieldChange('actualHours', e.target.value)}
                    inputProps={{ min: 0, step: 0.5 }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-3">
                  <AccessTimeIcon sx={{ fontSize: 18 }} className="text-neutral-400" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    <strong>{task.actualHours}h</strong> logged
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions (only in view mode) */}
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              {task.status === 'pending' && (
                <button
                  onClick={() => handleQuickStatusUpdate('in-progress')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-info/10 text-info hover:bg-info/20 transition-colors"
                >
                  <PlayArrowIcon fontSize="small" />
                  Start Task
                </button>
              )}
              {task.status === 'in-progress' && (
                <>
                  <button
                    onClick={() => handleQuickStatusUpdate('on-hold')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                  >
                    <PauseIcon fontSize="small" />
                    Put On Hold
                  </button>
                  <button
                    onClick={() => handleQuickStatusUpdate('completed')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors"
                  >
                    <CheckCircleIcon fontSize="small" />
                    Mark Complete
                  </button>
                </>
              )}
              {task.status === 'on-hold' && (
                <button
                  onClick={() => handleQuickStatusUpdate('in-progress')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-info/10 text-info hover:bg-info/20 transition-colors"
                >
                  <PlayArrowIcon fontSize="small" />
                  Resume Task
                </button>
              )}
            </div>
          )}

          {/* SECTION: Schedule */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Schedule
            </h3>
            
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TextField
                  fullWidth
                  type="date"
                  label="Due Date"
                  value={formData.dueDate}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!formData.dueDate}
                  helperText={
                    !formData.dueDate
                      ? 'Required'
                      : (projectEndDateStr && formData.dueDate > projectEndDateStr)
                        ? 'This task date exceeds the project end date. Please extend the project to continue.'
                        : (projectEndWarning || projectDateHint)
                  }
                  disabled={isStarted}
                  inputProps={{
                    max: projectEndDateStr || undefined,
                  }}
                />
                <TextField
                  fullWidth
                  type="time"
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(e) => handleFieldChange('startTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={isStarted}
                />
                <TextField
                  fullWidth
                  type="time"
                  label="End Time"
                  value={formData.endTime}
                  onChange={(e) => handleFieldChange('endTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={isStarted}
                />
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="Work location"
                  className="md:col-span-4"
                  disabled={isStarted}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow
                  icon={CalendarTodayIcon}
                  label="Due Date"
                  value={formatDate(task.date || task.dueDate)}
                />
                <InfoRow
                  icon={AccessTimeIcon}
                  label="Time"
                  value={`${formatTime(task.startTime)} - ${formatTime(task.endTime)}`}
                />
                <InfoRow
                  icon={LocationOnIcon}
                  label="Location"
                  value={task.location || 'Not specified'}
                />
              </div>
            )}
          </div>

          {/* SECTION: Assignment */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Assignment
            </h3>
            
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormControl fullWidth required error={!formData.projectId}>
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={formData.projectId}
                    label="Project"
                    onChange={(e) => handleFieldChange('projectId', e.target.value)}
                    disabled={isStarted}
                  >
                    {projects.map(project => {
                      const pid = project._id || project.id
                      return (
                        <MenuItem key={pid} value={pid}>
                          {project.name}
                        </MenuItem>
                      )
                    })}
                  </Select>
                  {!formData.projectId && (
                    <FormHelperText>Project is required</FormHelperText>
                  )}
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Assign Workers</InputLabel>
                  <Select
                    multiple
                    value={formData.assignedWorkers}
                    onChange={(e) => handleFieldChange('assignedWorkers', e.target.value)}
                    label="Assign Workers"
                    disabled={isStarted || eligibleLoading || !formData.dueDate || eligibleWorkers.length === 0}
                    renderValue={(selected) => {
                      if (!selected?.length) return <em>Unassigned</em>
                      const names = selected
                        .map((id) => eligibleWorkers.find(w => (w._id || w.id) === id)?.name || workers.find(w => (w._id || w.id) === id)?.name)
                        .filter(Boolean)
                      return names.join(', ')
                    }}
                  >
                    {(eligibleWorkers.length ? eligibleWorkers : []).map(worker => {
                      const wid = worker._id || worker.id
                      return (
                        <MenuItem key={wid} value={wid} disabled={worker.canAssign === false}>
                          {worker.name} - {worker.position}
                          {worker.attendanceStatus === 'half-day' ? ' — Half Day – Limited availability' : ''}
                          {typeof worker.remainingHours === 'number' ? ` (Remaining: ${worker.remainingHours}h)` : ''}
                          {worker.canAssign === false && worker.blockedReason ? ` — ${worker.blockedReason}` : ''}
                        </MenuItem>
                      )
                    })}
                  </Select>
                  <FormHelperText>
                    {isStarted
                      ? 'This task has started. Date/Time/Assignment are read-only.'
                      : eligibleLoading
                        ? 'Loading eligible workers...'
                        : eligibleWorkers.length === 0
                          ? (eligibleMessage || 'No eligible workers for this date.')
                          : 'Workers shown are Active and either Present (full day) or Half Day (limited availability). Overlaps and over-assignment are blocked.'}
                  </FormHelperText>
                </FormControl>
              </div>
            ) : (
              <div className="space-y-3">
                {task.project ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                    <FolderIcon className="text-primary" />
                    <div>
                      <p className="font-medium text-light-text dark:text-dark-text">
                        {task.project.name}
                      </p>
                      <p className="text-xs text-primary">{task.project.projectId}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-neutral-400 text-sm">No project assigned</p>
                )}

                {(task.workers && task.workers.length > 0) || (task.assignedWorkers && task.assignedWorkers.length > 0) ? (
                  <div className="space-y-2">
                    {(task.workers || task.assignedWorkers).map(worker => (
                      <div key={worker._id || worker.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                          }}
                        >
                          {(worker.name || '').split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <div>
                          <p className="font-medium text-light-text dark:text-dark-text">
                            {worker.name}
                          </p>
                          <p className="text-sm text-primary">{worker.position || worker.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-400 text-sm">No workers assigned</p>
                )}
              </div>
            )}
          </div>

          {/* SECTION: Additional Details */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Additional Details
            </h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={formData.materials}
                  onChange={(e, newValue) => handleFieldChange('materials', newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Materials Required"
                      placeholder="Type and press Enter"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option}
                        {...getTagProps({ index })}
                        size="small"
                      />
                    ))
                  }
                />
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Additional notes or instructions"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {task.materials && task.materials.length > 0 && (
                  <div>
                    <p className="text-sm text-neutral-500 mb-2">Materials Required</p>
                    <div className="flex flex-wrap gap-2">
                      {task.materials.map((material, index) => (
                        <Chip
                          key={index}
                          label={material}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {task.notes && (
                  <div>
                    <p className="text-sm text-neutral-500 mb-2">Notes</p>
                    <p className="text-sm text-light-text dark:text-dark-text p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                      {task.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs text-neutral-400">
            <span>Created: {formatDate(task.createdAt)}</span>
            <span>Updated: {formatDate(task.updatedAt)}</span>
          </div>
        </div>
      </DialogContent>

      <DialogActions className="border-t border-light-border dark:border-dark-border p-4">
        {isEditing ? (
          <>
            <button
              onClick={handleToggleEditMode}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </>
        ) : (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium"
          >
            Close
          </button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// Info Row Component
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="text-neutral-400 mt-0.5" fontSize="small" />
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-light-text dark:text-dark-text">{value}</p>
    </div>
  </div>
)

export default TaskDetailsModal

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import taskService from '../../services/taskService'

// MUI Components
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import AssignmentIcon from '@mui/icons-material/Assignment'

import { TASK_TYPES } from '../../constants/tasks'

const AddTaskModal = ({ open, onClose, defaultDate, onAdd, workers = [], projects = [] }) => {
  const getId = (x) => x?.id || x?._id || x
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    projectId: '',
    workerIds: [],
    priority: 'medium',
    location: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [eligibleWorkers, setEligibleWorkers] = useState([])
  const [eligibleLoading, setEligibleLoading] = useState(false)
  const [eligibleMessage, setEligibleMessage] = useState('')

  const selectedProject = useMemo(() => {
    if (!formData.projectId) return null
    return projects.find(p => getId(p) === formData.projectId) || null
  }, [projects, formData.projectId])

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

  const formatYmdToDmy = (ymd) => {
    if (!ymd || typeof ymd !== 'string') return ''
    const [y, m, d] = ymd.split('-')
    if (!y || !m || !d) return ymd
    return `${d}-${m}-${y}`
  }

  const projectDateHint = useMemo(() => {
    if (!projectStartDateStr && !projectEndDateStr) return ''
    const start = projectStartDateStr ? formatYmdToDmy(projectStartDateStr) : '—'
    const end = projectEndDateStr ? formatYmdToDmy(projectEndDateStr) : '—'
    return `Project schedule: ${start} → ${end}. You can create tasks up to the end date.`
  }, [projectStartDateStr, projectEndDateStr])

  const projectEndWarning = useMemo(() => {
    if (!projectEndDateStr || !formData.date) return ''
    const end = new Date(`${projectEndDateStr}T00:00:00`)
    const cur = new Date(`${formData.date}T00:00:00`)
    if ([end, cur].some(d => Number.isNaN(d.getTime()))) return ''
    const diffDays = Math.round((end.getTime() - cur.getTime()) / 86400000)
    if (diffDays < 0) return ''
    if (diffDays > 2) return '' // only last 3 days (inclusive)
    const endLabel = formatYmdToDmy(projectEndDateStr)
    if (diffDays === 0) return `Project ends today (End: ${endLabel}).`
    if (diffDays === 1) return `Project ends tomorrow (End: ${endLabel}).`
    return `Project ends in ${diffDays} days (End: ${endLabel}).`
  }, [projectEndDateStr, formData.date])

  // ENTERPRISE RULE: Only show eligible workers for selected task date
  const filteredWorkers = useMemo(() => eligibleWorkers, [eligibleWorkers])

  useEffect(() => {
    const fetchEligible = async () => {
      if (!open) return
      const date = formData.date
      if (!date) return
      setEligibleLoading(true)
      try {
        // Don't pass startTime/endTime to show all eligible workers including half-day
        const res = await taskService.getEligibleWorkers(date)
        setEligibleWorkers(res.data || [])
        setEligibleMessage(res.message || '')
      } catch (e) {
        setEligibleWorkers([])
        setEligibleMessage('Failed to load eligible workers')
      } finally {
        setEligibleLoading(false)
      }
    }
    fetchEligible()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formData.date])

  const handleChange = (e) => {
    const { name, value } = e.target

    // When project changes, auto-fill location (keep all assigned workers)
    if (name === 'date') {
      // Reset worker selection when date changes (prevents stale assignments)
      setFormData(prev => ({ ...prev, date: value, workerIds: [] }))
    } else if (name === 'projectId') {
      const proj = projects.find(p => getId(p) === value) || null
      const projLocation = proj?.location || ''

      setFormData(prev => ({
        ...prev,
        projectId: value,
        location: projLocation,
        // ✅ Keep all assigned workers - backend will handle team assignment
      }))
    } else if (name === 'workerIds') {
      const next = Array.isArray(value) ? value : []
      setFormData(prev => ({ ...prev, workerIds: next }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.date) newErrors.date = 'Date is required'
    if (!formData.projectId) newErrors.projectId = 'Project is required'
    if (!formData.workerIds || formData.workerIds.length === 0) newErrors.workerIds = 'At least one worker is required'
    if (projectEndDateStr && formData.date && formData.date > projectEndDateStr) {
      newErrors.date = 'This task date exceeds the project end date. Please extend the project to continue.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      if (onAdd) {
        await onAdd({
          ...formData,
        })
      }
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      type: '',
      date: defaultDate || new Date().toISOString().split('T')[0],
      projectId: '',
      workerIds: [],
      priority: 'medium',
      location: '',
      notes: '',
    })
    setErrors({})
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px', maxHeight: '90vh' },
      }}
    >
      <DialogTitle className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <AssignmentIcon className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">Add Task</h2>
            <p className="text-sm text-neutral-500">Create a new daily task</p>
          </div>
        </div>
        <IconButton
          onClick={handleClose}
          aria-label="Close"
          sx={{
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.75)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="!py-6">
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Task Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Task Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                error={!!errors.title}
                helperText={errors.title}
                required
                className="md:col-span-2"
              />
              <FormControl fullWidth error={!!errors.type}>
                <InputLabel>Task Type</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  label="Task Type"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {TASK_TYPES.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Schedule
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <TextField
                fullWidth
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                error={!!errors.date}
                helperText={
                  errors.date ||
                  projectEndWarning ||
                  projectDateHint
                }
                required
                inputProps={{
                  max: projectEndDateStr || undefined,
                }}
              />
            </div>
          </div>

          {/* Assignment */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormControl fullWidth error={Boolean(errors.projectId)}>
                <InputLabel>Project</InputLabel>
                <Select
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  label="Project"
                >
                  {projects.map(project => {
                    const pid = getId(project)
                    return (
                      <MenuItem key={pid} value={pid}>
                        {project.name}
                      </MenuItem>
                    )
                  })}
                </Select>
                <FormHelperText>
                  {errors.projectId ? errors.projectId : 'Select the project this task belongs to.'}
                </FormHelperText>
              </FormControl>
              <FormControl fullWidth error={Boolean(errors.workerIds)}>
                <InputLabel>Assign Worker</InputLabel>
                <Select
                  multiple
                  name="workerIds"
                  value={formData.workerIds}
                  onChange={handleChange}
                  label="Assign Worker(s)"
                  renderValue={(selected) => {
                    if (!selected?.length) return <em>Unassigned</em>
                    const names = selected
                      .map((id) => filteredWorkers.find(w => getId(w) === id)?.name)
                      .filter(Boolean)
                    return names.join(', ')
                  }}
                >
                  {filteredWorkers.map(worker => {
                    const wid = getId(worker)
                    return (
                      <MenuItem key={wid} value={wid}>
                        {worker.name} - {worker.position}
                        {worker.attendanceStatus === 'half-day' ? ' — Half Day – Limited availability' : ''}
                        {typeof worker.remainingHours === 'number' ? ` (Remaining: ${worker.remainingHours}h)` : ''}
                      </MenuItem>
                    )
                  })}
                </Select>
                <FormHelperText>
                  {errors.workerIds
                    ? errors.workerIds
                    : eligibleLoading
                      ? 'Loading eligible workers...'
                      : filteredWorkers.length === 0
                        ? (eligibleMessage || 'No eligible workers for this date.')
                        : 'Workers shown are Active and either Present (full day) or Half Day (limited availability).'}
                </FormHelperText>
              </FormControl>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                helperText={selectedProject?.location ? 'Auto-filled from project (you can edit)' : ''}
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Additional Notes
            </h3>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </div>
        </div>
      </DialogContent>

      <DialogActions className="border-t border-light-border dark:border-dark-border p-4">
        <button
          onClick={handleClose}
          className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            eligibleLoading ||
            !formData.title.trim() ||
            !formData.date ||
            !formData.projectId ||
            filteredWorkers.length === 0 ||
            (formData.workerIds || []).length === 0
          }
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            'Create Task'
          )}
        </button>
      </DialogActions>
    </Dialog>
  )
}

export default AddTaskModal

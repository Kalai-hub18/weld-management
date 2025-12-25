import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// MUI Components
import Drawer from '@mui/material/Drawer'
import Avatar from '@mui/material/Avatar'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import ScheduleIcon from '@mui/icons-material/Schedule'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import DeselectIcon from '@mui/icons-material/Deselect'

import { ATTENDANCE_STATUS, STATUS_COLORS, leaveTypes } from '../../constants/attendance'

// Utility functions for overtime calculation
const STANDARD_WORKING_HOURS = 8

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

const calculateOvertimeHours = (checkIn, checkOut, status) => {
  // If status is NOT "Overtime", return 0
  if (status !== ATTENDANCE_STATUS.OVERTIME) {
    return 0
  }
  
  // If either time is missing, return 0
  if (!checkIn || !checkOut) {
    return 0
  }
  
  // Convert HH:MM to minutes
  let checkInMinutes = timeToMinutes(checkIn)
  let checkOutMinutes = timeToMinutes(checkOut)
  
  // Handle overnight shifts (crosses midnight)
  if (checkOutMinutes < checkInMinutes) {
    checkOutMinutes += 24 * 60 // Add 24 hours
  }
  
  // Calculate total worked minutes
  const totalMinutes = checkOutMinutes - checkInMinutes
  
  // If negative or zero, return 0
  if (totalMinutes <= 0) {
    return 0
  }
  
  // Convert to hours
  const totalHours = totalMinutes / 60
  
  // Calculate overtime (total - standard)
  const overtime = Math.max(0, totalHours - STANDARD_WORKING_HOURS)
  
  // Round to 2 decimal places
  return Math.round(overtime * 100) / 100
}

const isValidTimeFormat = (timeStr) => {
  if (!timeStr) return true // Optional field
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(timeStr)
}

const validateAttendanceForm = (formData) => {
  const errors = {}
  
  // ONLY Status is required
  if (!formData.status || formData.status.trim() === '') {
    errors.status = 'Status is required'
  }
  
  // Optional: Validate time format if provided
  if (formData.checkIn && !isValidTimeFormat(formData.checkIn)) {
    errors.checkIn = 'Invalid time format (HH:MM)'
  }
  
  if (formData.checkOut && !isValidTimeFormat(formData.checkOut)) {
    errors.checkOut = 'Invalid time format (HH:MM)'
  }
  
  // Optional: Check Out should be after Check In (unless overnight)
  if (formData.checkIn && formData.checkOut) {
    const checkInMin = timeToMinutes(formData.checkIn)
    const checkOutMin = timeToMinutes(formData.checkOut)
    
    // Allow overnight shifts, but warn if same time
    if (checkInMin === checkOutMin) {
      errors.checkOut = 'Check Out cannot be same as Check In'
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

const AttendanceDrawer = ({
  open,
  onClose,
  date,
  attendanceData,
  workers,
  projects,
  onUpdateAttendance,
  onBulkUpdate,
  onDeleteAttendance,
}) => {
  const getInitials = (name) => {
    const safe = (name || '').trim()
    if (!safe) return '?'
    return safe
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }
  const [editingWorkerId, setEditingWorkerId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [selectedWorkers, setSelectedWorkers] = useState([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedWorker, setExpandedWorker] = useState(null)
  const [showHiddenInfo, setShowHiddenInfo] = useState(true)

  useEffect(() => {
    if (!open) {
      setEditingWorkerId(null)
      setEditForm({})
      setValidationErrors({})
      setSelectedWorkers([])
      setBulkStatus('')
      setExpandedWorker(null)
      setShowHiddenInfo(true)
    }
  }, [open])

  const dateToYMD = (d) => {
    if (!d) return ''
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
    const dt = new Date(d)
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // ENTERPRISE RULE: Inactive date acts as a hard cut-off
  // Block attendance actions if selected_date >= inactive_from
  const isBlockedByInactiveCutoff = (workerRow) => {
    const status = workerRow?.workerStatus
    if (status !== 'inactive') return false
    if (!workerRow?.workerInactiveFrom) return true
    const selected = dateToYMD(date)
    const inactiveFrom = dateToYMD(workerRow.workerInactiveFrom)
    return selected >= inactiveFrom
  }

  // Auto-calculate overtime when checkIn, checkOut, or status changes
  useEffect(() => {
    if (editingWorkerId && editForm.status) {
      const overtime = calculateOvertimeHours(
        editForm.checkIn,
        editForm.checkOut,
        editForm.status
      )
      
      // Only update if changed to avoid infinite loop
      if (overtime !== editForm.overtimeHours) {
        setEditForm(prev => ({
          ...prev,
          overtimeHours: overtime
        }))
      }
    }
  }, [editForm.checkIn, editForm.checkOut, editForm.status, editingWorkerId])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleEdit = (worker) => {
    // ENTERPRISE RULE: Prevent edits on/after inactive cut-off (backend also enforces)
    if (isBlockedByInactiveCutoff(worker)) {
      const inactiveFromLabel = worker?.workerInactiveFrom
        ? new Date(worker.workerInactiveFrom).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '(inactive date not set)'
      toast.error(`This worker became inactive on ${inactiveFromLabel}. Attendance is blocked on/after that date.`)
      return
    }
    
    setEditingWorkerId(worker.workerId)
    
    // Calculate initial overtime
    const initialOvertime = calculateOvertimeHours(
      worker.checkIn || '',
      worker.checkOut || '',
      worker.status
    )
    
    setEditForm({
      status: worker.status || '',
      checkIn: worker.checkIn || '',
      checkOut: worker.checkOut || '',
      overtimeHours: initialOvertime,
      notes: worker.notes || '',
      leaveType: '',
      attendanceId: worker.attendanceId || null,
    })
    setValidationErrors({})
  }

  const handleCancelEdit = () => {
    setEditingWorkerId(null)
    setEditForm({})
    setValidationErrors({})
  }

  const handleSave = async (workerId) => {
    // Validate form
    const validation = validateAttendanceForm(editForm)
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      toast.error('Please fix validation errors')
      return
    }
    
    setSaving(true)
    
    // Prepare payload WITHOUT projectId
    const payload = {
      status: editForm.status,
      checkIn: editForm.checkIn || null,
      checkOut: editForm.checkOut || null,
      overtimeHours: editForm.overtimeHours || 0,
      notes: editForm.notes || null,
      attendanceId: editForm.attendanceId,
    }
    
    await onUpdateAttendance(date, workerId, payload)
    
    setSaving(false)
    setEditingWorkerId(null)
    setEditForm({})
    setValidationErrors({})
  }

  const handleDelete = async (worker) => {
    if (!worker?.attendanceId) return
    setSaving(true)
    try {
      await onDeleteAttendance?.(date, worker.workerId, worker.attendanceId)
      setExpandedWorker(null)
      handleCancelEdit()
    } finally {
      setSaving(false)
    }
  }

  const handleSelectWorker = (worker) => {
    // ENTERPRISE RULE: Prevent selecting workers who are blocked by cut-off (should be rare)
    if (isBlockedByInactiveCutoff(worker)) {
      toast.error('This worker is inactive for the selected date. Attendance is blocked.')
      return
    }

    const workerId = worker.workerId
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    )
  }

  const handleSelectAll = () => {
    if (selectedWorkers.length === attendanceData?.workers.length) {
      setSelectedWorkers([])
    } else {
      // ENTERPRISE RULE: Only select workers eligible for this date
      const eligible = attendanceData?.workers.filter(w => !isBlockedByInactiveCutoff(w)) || []
      setSelectedWorkers(eligible.map(w => w.workerId))
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedWorkers.length === 0) {
      toast.error('Please select status and workers')
      return
    }

    setSaving(true)
    
    const updates = selectedWorkers.map(workerId => ({
      workerId,
      status: bulkStatus,
      // Only add times for statuses that need them
      checkIn: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY].includes(bulkStatus) 
        ? '09:00' 
        : null,
      checkOut: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY].includes(bulkStatus) 
        ? '17:00' 
        : null,
      overtimeHours: 0, // Always 0 for bulk updates
    }))

    await onBulkUpdate(date, updates)
    
    setSaving(false)
    setSelectedWorkers([])
    setBulkStatus('')
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case ATTENDANCE_STATUS.PRESENT:
        return <CheckCircleIcon className="text-success" fontSize="small" />
      case ATTENDANCE_STATUS.ABSENT:
        return <CancelIcon className="text-danger" fontSize="small" />
      case ATTENDANCE_STATUS.LEAVE:
        return <EventBusyIcon className="text-warning" fontSize="small" />
      case ATTENDANCE_STATUS.HALF_DAY:
        return <ScheduleIcon className="text-info" fontSize="small" />
      case ATTENDANCE_STATUS.OVERTIME:
        return <TrendingUpIcon className="text-purple-500" fontSize="small" />
      default:
        return <AccessTimeIcon className="text-neutral-400" fontSize="small" />
    }
  }

  const getStatusChip = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS['not-marked']
    return (
      <Chip
        size="small"
        label={status?.replace('-', ' ') || 'Not Marked'}
        sx={{
          backgroundColor: colors.light,
          color: colors.text,
          fontWeight: 600,
          textTransform: 'capitalize',
        }}
      />
    )
  }

  // Calculate summary for the day
  const daySummary = attendanceData?.workers.reduce(
    (acc, w) => {
      if (w.status === ATTENDANCE_STATUS.PRESENT || w.status === ATTENDANCE_STATUS.OVERTIME) acc.present++
      else if (w.status === ATTENDANCE_STATUS.ABSENT) acc.absent++
      else if (w.status === ATTENDANCE_STATUS.LEAVE) acc.leave++
      else if (w.status === ATTENDANCE_STATUS.HALF_DAY) acc.halfDay++
      if (w.status === ATTENDANCE_STATUS.OVERTIME) acc.overtime++
      acc.totalOTHours += w.overtimeHours || 0
      return acc
    },
    { present: 0, absent: 0, leave: 0, halfDay: 0, overtime: 0, totalOTHours: 0 }
  ) || { present: 0, absent: 0, leave: 0, halfDay: 0, overtime: 0, totalOTHours: 0 }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          maxWidth: '100%',
        },
      }}
    >
      <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
        {/* Header */}
        <div className="p-4 border-b border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                Daily Attendance
              </h2>
              <p className="text-sm text-primary font-medium">
                {formatDate(date)}
              </p>
            </div>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          {/* Day Summary */}
          <div className="grid grid-cols-5 gap-2">
            <SummaryBadge icon={CheckCircleIcon} value={daySummary.present} label="Present" color="success" />
            <SummaryBadge icon={CancelIcon} value={daySummary.absent} label="Absent" color="danger" />
            <SummaryBadge icon={EventBusyIcon} value={daySummary.leave} label="Leave" color="warning" />
            <SummaryBadge icon={ScheduleIcon} value={daySummary.halfDay} label="Half" color="info" />
            <SummaryBadge icon={TrendingUpIcon} value={`${daySummary.totalOTHours}h`} label="OT" color="purple" />
          </div>

          {/* ENTERPRISE UX: Explain hidden workers for the selected date (no silent failures) */}
          {(attendanceData?.hiddenWorkers?.length || 0) > 0 && (
            <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
              <button
                type="button"
                onClick={() => setShowHiddenInfo((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-light-text dark:text-dark-text">
                    {attendanceData.hiddenWorkers.length} inactive worker{attendanceData.hiddenWorkers.length === 1 ? '' : 's'} hidden for this date
                  </p>
                  <p className="text-xs text-neutral-500">
                    This is expected: inactive date is a hard cut-off for future attendance.
                  </p>
                </div>
                {showHiddenInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </button>
              <Collapse in={showHiddenInfo}>
                <div className="px-4 pb-3 space-y-2">
                  {attendanceData.hiddenWorkers.slice(0, 8).map((w) => (
                    <div key={w.workerId} className="flex items-center justify-between gap-3">
                      <div className="text-sm text-neutral-700 dark:text-neutral-200">
                        {w.name}
                      </div>
                      <Chip
                        size="small"
                        variant="outlined"
                        color="default"
                        label={
                          w.inactiveFrom
                            ? `Inactive from ${new Date(w.inactiveFrom).toISOString().split('T')[0]}`
                            : 'Inactive date not set'
                        }
                      />
                    </div>
                  ))}
                  {attendanceData.hiddenWorkers.length > 8 && (
                    <p className="text-xs text-neutral-500">
                      +{attendanceData.hiddenWorkers.length - 8} more hidden worker(s)
                    </p>
                  )}
                </div>
              </Collapse>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedWorkers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-primary/5 border-b border-primary/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-primary">
                {selectedWorkers.length} selected
              </span>
              <button
                onClick={() => setSelectedWorkers([])}
                className="text-xs text-neutral-500 hover:text-primary"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <FormControl size="small" className="flex-1">
                <InputLabel>Set Status</InputLabel>
                <Select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  label="Set Status"
                  sx={{ borderRadius: '8px' }}
                >
                  <MenuItem value={ATTENDANCE_STATUS.PRESENT}>Present</MenuItem>
                  <MenuItem value={ATTENDANCE_STATUS.ABSENT}>Absent</MenuItem>
                  <MenuItem value={ATTENDANCE_STATUS.LEAVE}>Leave</MenuItem>
                  <MenuItem value={ATTENDANCE_STATUS.HALF_DAY}>Half Day</MenuItem>
                </Select>
              </FormControl>
              <button
                onClick={handleBulkUpdate}
                disabled={!bulkStatus || saving}
                className="btn-primary px-4"
              >
                {saving ? 'Saving...' : 'Apply'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Select All / Deselect */}
        <div className="p-3 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            {attendanceData?.workers.length || 0} Workers
          </span>
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {selectedWorkers.length === attendanceData?.workers.length ? (
              <>
                <DeselectIcon fontSize="small" />
                Deselect All
              </>
            ) : (
              <>
                <SelectAllIcon fontSize="small" />
                Select All
              </>
            )}
          </button>
        </div>

        {/* Workers List */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {attendanceData?.workers.map((worker, index) => {
              const isInactive = worker.workerStatus === 'inactive'
              const isBlocked = isBlockedByInactiveCutoff(worker)
              
              return (
              <motion.div
                key={worker.workerId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-light-border dark:border-dark-border"
              >
                <div
                  className={`p-4 transition-colors ${
                    isBlocked 
                      ? 'bg-neutral-100/50 dark:bg-neutral-800/30 opacity-60' 
                      : selectedWorkers.includes(worker.workerId)
                      ? 'bg-primary/5'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedWorkers.includes(worker.workerId)}
                      onChange={() => handleSelectWorker(worker)}
                      disabled={isBlocked}
                      size="small"
                      sx={{
                        color: '#FF6A00',
                        '&.Mui-checked': { color: '#FF6A00' },
                      }}
                    />

                    {/* Avatar */}
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {getInitials(worker.workerName || worker.name)}
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-light-text dark:text-dark-text truncate">
                          {worker.workerName || worker.name || 'Unknown Worker'}
                        </p>
                        {isInactive && (
                          <Tooltip 
                            title={
                              worker.workerInactiveFrom 
                                ? `Inactive from ${new Date(worker.workerInactiveFrom).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
                                : 'Inactive worker'
                            }
                          >
                            <Chip 
                              label={worker.workerStatus || 'Inactive'} 
                              size="small" 
                              color="error" 
                              variant="outlined"
                              sx={{ height: '18px', fontSize: '10px', textTransform: 'capitalize' }}
                            />
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        {worker.checkIn && (
                          <span>{worker.checkIn} - {worker.checkOut || '--:--'}</span>
                        )}
                        {worker.overtimeHours > 0 && (
                          <span className="text-purple-500 font-medium">
                            +{worker.overtimeHours}h OT
                          </span>
                        )}
                        {isInactive && worker.workerInactiveFrom && (
                          <span className="text-warning text-xs">
                            ⚠️ Inactive from {new Date(worker.workerInactiveFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {getStatusChip(worker.status)}
                      <Tooltip title={isBlocked ? 'Attendance blocked for inactive worker on this date' : 'Edit'}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={isBlocked}
                            onClick={() => {
                              if (expandedWorker === worker.workerId) {
                                setExpandedWorker(null)
                                handleCancelEdit()
                              } else {
                                setExpandedWorker(worker.workerId)
                                handleEdit(worker)
                              }
                            }}
                          >
                            {expandedWorker === worker.workerId ? (
                              <ExpandLessIcon fontSize="small" />
                            ) : (
                              <EditIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  <Collapse in={expandedWorker === worker.workerId}>
                    <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border space-y-3">
                      {/* Status Select - REQUIRED */}
                      <FormControl fullWidth size="small" required error={!!validationErrors.status}>
                        <InputLabel>Status *</InputLabel>
                        <Select
                          value={editForm.status || ''}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          label="Status *"
                        >
                          <MenuItem value={ATTENDANCE_STATUS.PRESENT}>
                            <div className="flex items-center gap-2">
                              <CheckCircleIcon className="text-success" fontSize="small" />
                              Present
                            </div>
                          </MenuItem>
                          <MenuItem value={ATTENDANCE_STATUS.ABSENT}>
                            <div className="flex items-center gap-2">
                              <CancelIcon className="text-danger" fontSize="small" />
                              Absent
                            </div>
                          </MenuItem>
                          <MenuItem value={ATTENDANCE_STATUS.LEAVE}>
                            <div className="flex items-center gap-2">
                              <EventBusyIcon className="text-warning" fontSize="small" />
                              Leave
                            </div>
                          </MenuItem>
                          <MenuItem value={ATTENDANCE_STATUS.HALF_DAY}>
                            <div className="flex items-center gap-2">
                              <ScheduleIcon className="text-info" fontSize="small" />
                              Half Day
                            </div>
                          </MenuItem>
                          <MenuItem value={ATTENDANCE_STATUS.OVERTIME}>
                            <div className="flex items-center gap-2">
                              <TrendingUpIcon className="text-purple-500" fontSize="small" />
                              Overtime
                            </div>
                          </MenuItem>
                        </Select>
                        <FormHelperText>
                          {validationErrors.status || '⚠️ Only Status is required. All other fields are optional.'}
                        </FormHelperText>
                      </FormControl>

                      {/* Time Inputs - Conditional & Optional */}
                      {(editForm.status === ATTENDANCE_STATUS.PRESENT ||
                        editForm.status === ATTENDANCE_STATUS.HALF_DAY ||
                        editForm.status === ATTENDANCE_STATUS.OVERTIME) && (
                        <div className="grid grid-cols-2 gap-3">
                          <TextField
                            size="small"
                            label="Check In (Optional)"
                            type="time"
                            value={editForm.checkIn || ''}
                            onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            error={!!validationErrors.checkIn}
                            helperText={validationErrors.checkIn}
                          />
                          <TextField
                            size="small"
                            label="Check Out (Optional)"
                            type="time"
                            value={editForm.checkOut || ''}
                            onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            error={!!validationErrors.checkOut}
                            helperText={validationErrors.checkOut}
                          />
                        </div>
                      )}

                      {/* Overtime Hours - Auto-calculated, Read-only */}
                      {editForm.status === ATTENDANCE_STATUS.OVERTIME && (
                        <TextField
                          fullWidth
                          size="small"
                          label="Overtime Hours"
                          type="number"
                          value={editForm.overtimeHours || 0}
                          disabled
                          InputProps={{
                            readOnly: true,
                            sx: { backgroundColor: 'rgba(0,0,0,0.05)' }
                          }}
                          helperText="ℹ️ Auto-calculated: (Check Out - Check In) - 8 hours"
                        />
                      )}

                      {/* Leave Type */}
                      {editForm.status === ATTENDANCE_STATUS.LEAVE && (
                        <FormControl fullWidth size="small">
                          <InputLabel>Leave Type (Optional)</InputLabel>
                          <Select
                            value={editForm.leaveType || ''}
                            onChange={(e) => setEditForm({ ...editForm, leaveType: e.target.value })}
                            label="Leave Type (Optional)"
                          >
                            {leaveTypes.map(type => (
                              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Notes - Always Optional */}
                      <TextField
                        fullWidth
                        size="small"
                        label="Notes (Optional)"
                        multiline
                        rows={2}
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Add any notes..."
                      />

                      {/* PROJECT FIELD REMOVED */}

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2">
                        {worker.attendanceId && (
                          <button
                            onClick={() => handleDelete(worker)}
                            disabled={saving}
                            className="px-4 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        )}
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSave(worker.workerId)}
                          disabled={saving}
                          className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                        >
                          {saving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <SaveIcon fontSize="small" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  </Collapse>
                </div>
              </motion.div>
            )}
            )}
          </AnimatePresence>

          {/* Empty State */}
          {(!attendanceData?.workers || attendanceData.workers.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <AccessTimeIcon sx={{ fontSize: 48 }} className="mb-4" />
              <p>No workers to display</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}

// Summary Badge Component
const SummaryBadge = ({ icon: Icon, value, label, color }) => {
  const colorClasses = {
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
    purple: 'bg-purple-500/10 text-purple-500',
  }

  return (
    <div className={`p-2 rounded-lg text-center ${colorClasses[color]}`}>
      <Icon fontSize="small" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] opacity-70">{label}</p>
    </div>
  )
}

export default AttendanceDrawer

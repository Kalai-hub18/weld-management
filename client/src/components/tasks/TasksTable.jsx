import { useState } from 'react'
import { motion } from 'framer-motion'

// MUI Components
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'

// MUI Icons
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants/tasks'

const TasksTable = ({
  tasks,
  onTaskClick,
  onViewTask,
  onEditTask,
  onStartTask,
  onCompleteTask,
  onDeleteTask,
}) => {
  const [selectedTasks, setSelectedTasks] = useState([])
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [activeTaskId, setActiveTaskId] = useState(null)

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedTasks(tasks.map(t => t.id))
    } else {
      setSelectedTasks([])
    }
  }

  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleMenuOpen = (event, taskId) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setActiveTaskId(taskId)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setActiveTaskId(null)
  }

  const getActiveTask = () => tasks.find((t) => t.id === activeTaskId) || null

  const handleView = () => {
    const t = getActiveTask()
    handleMenuClose()
    if (t) onViewTask?.(t)
  }

  const handleEdit = () => {
    const t = getActiveTask()
    handleMenuClose()
    if (t) onEditTask?.(t)
  }

  const handleStart = async () => {
    const t = getActiveTask()
    handleMenuClose()
    if (t) await onStartTask?.(t)
  }

  const handleComplete = async () => {
    const t = getActiveTask()
    handleMenuClose()
    if (t) await onCompleteTask?.(t)
  }

  const handleDelete = async () => {
    const t = getActiveTask()
    handleMenuClose()
    if (!t) return
    const ok = window.confirm(`Delete task "${t.title}"?`)
    if (!ok) return
    await onDeleteTask?.(t)
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (dateStr === today.toISOString().split('T')[0]) return 'Today'
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '?'
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="premium-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-light-border dark:border-dark-border bg-neutral-50 dark:bg-neutral-800/50">
              <th className="p-4 w-12">
                <Checkbox
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  indeterminate={selectedTasks.length > 0 && selectedTasks.length < tasks.length}
                  onChange={handleSelectAll}
                  sx={{ '&.Mui-checked': { color: '#FF6A00' } }}
                />
              </th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Task</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Date</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Project</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Worker</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Status</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Time</th>
              <th className="text-center p-4 text-sm font-semibold text-neutral-500 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => {
              const statusColor = STATUS_COLORS[task.status]
              const priorityColor = PRIORITY_COLORS[task.priority]

              return (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onTaskClick(task)}
                  className={`border-b border-light-border dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors ${
                    selectedTasks.includes(task.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => handleSelectTask(task.id)}
                      sx={{ '&.Mui-checked': { color: '#FF6A00' } }}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-10 rounded-full"
                        style={{ backgroundColor: priorityColor?.bg }}
                      />
                      <div>
                        <p className="font-medium text-light-text dark:text-dark-text">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-neutral-500">{task.taskId}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {task.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-dark-text">
                        {formatDate(task.date)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatTime(task.startTime)} - {formatTime(task.endTime)}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    {task.project ? (
                      <div>
                        <p className="text-sm text-light-text dark:text-dark-text truncate max-w-[150px]">
                          {task.project.name}
                        </p>
                        <p className="text-xs text-primary">{task.project.projectId}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {task.workers?.length ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                          }}
                        >
                          {getInitials(task.workers[0]?.name)}
                        </Avatar>
                        <div>
                          <p className="text-sm text-light-text dark:text-dark-text">
                            {task.workers[0]?.name}
                            {task.workers.length > 1 ? ` +${task.workers.length - 1}` : ''}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {task.workers.length > 1 ? 'Multiple workers' : (task.workers[0]?.email || '')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">Unassigned</span>
                    )}
                  </td>
                  <td className="p-4">
                    <Chip
                      size="small"
                      label={statusColor?.label}
                      sx={{
                        backgroundColor: statusColor?.light,
                        color: statusColor?.text,
                        fontWeight: 600,
                        fontSize: '11px',
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <AccessTimeIcon sx={{ fontSize: 14 }} className="text-neutral-400" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-300">
                        {formatTime(task.startTime)} - {formatTime(task.endTime)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, task.id)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Actions Menu (UI-only; row click opens details) */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: '12px', minWidth: 150 },
        }}
      >
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" className="mr-2" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" className="mr-2" />
          Edit Task
        </MenuItem>
        <MenuItem onClick={handleStart}>
          <PlayArrowIcon fontSize="small" className="mr-2" />
          Start Task
        </MenuItem>
        <MenuItem onClick={handleComplete}>
          <CheckCircleIcon fontSize="small" className="mr-2" />
          Mark Complete
        </MenuItem>
        <MenuItem onClick={handleDelete} className="!text-danger">
          <DeleteIcon fontSize="small" className="mr-2" />
          Delete
        </MenuItem>
      </Menu>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="p-4 bg-primary/5 border-t border-light-border dark:border-dark-border flex items-center justify-between">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            {selectedTasks.length} task(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
              Mark Complete
            </button>
            <button className="px-3 py-1.5 text-sm rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksTable

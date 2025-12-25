import { motion } from 'framer-motion'
import { useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

// MUI Icons
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import FolderIcon from '@mui/icons-material/Folder'
import PersonIcon from '@mui/icons-material/Person'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants/tasks'

const TaskCard = ({ task, onClick, onView, onEdit, onStart, onComplete, onDelete }) => {
  const statusColor = STATUS_COLORS[task.status]
  const priorityColor = PRIORITY_COLORS[task.priority]
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)

  const openMenu = (e) => {
    e.stopPropagation()
    setMenuAnchorEl(e.currentTarget)
  }
  const closeMenu = () => setMenuAnchorEl(null)

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

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Estimated Hours removed (business requirement). If needed internally, derive duration from start/end.
  const durationLabel = (() => {
    if (!task.startTime || !task.endTime) return ''
    const [sh, sm] = task.startTime.split(':').map(Number)
    const [eh, em] = task.endTime.split(':').map(Number)
    if (![sh, sm, eh, em].every(Number.isFinite)) return ''
    let start = sh * 60 + sm
    let end = eh * 60 + em
    if (end < start) end += 24 * 60 // overnight shift
    const mins = Math.max(0, end - start)
    const hrs = Math.floor(mins / 60)
    const rem = mins % 60
    if (mins === 0) return ''
    return hrs > 0 ? `${hrs}h${rem ? ` ${rem}m` : ''}` : `${rem}m`
  })()

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="premium-card p-4 cursor-pointer h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-12 rounded-full"
            style={{ backgroundColor: priorityColor?.bg }}
          />
          <div>
            <span className="text-xs text-neutral-500">{task.taskId}</span>
            <h3 className="font-semibold text-light-text dark:text-dark-text line-clamp-1">
              {task.title}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Chip
            size="small"
            label={statusColor?.label}
            sx={{
              backgroundColor: statusColor?.light,
              color: statusColor?.text,
              fontWeight: 600,
              fontSize: '10px',
              height: '22px',
            }}
          />
          <IconButton
            size="small"
            aria-label="Task actions"
            onClick={openMenu}
            sx={{ color: 'text.secondary' }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={closeMenu}
            PaperProps={{ sx: { borderRadius: '12px', minWidth: 160 } }}
          >
            <MenuItem onClick={() => { closeMenu(); onView?.(task) }}>
              <VisibilityIcon fontSize="small" className="mr-2" />
              View
            </MenuItem>
            <MenuItem onClick={() => { closeMenu(); onEdit?.(task) }}>
              <EditIcon fontSize="small" className="mr-2" />
              Edit
            </MenuItem>
            {task.status === 'pending' && (
              <MenuItem onClick={() => { closeMenu(); onStart?.(task) }}>
                <PlayArrowIcon fontSize="small" className="mr-2" />
                Start
              </MenuItem>
            )}
            {task.status === 'in-progress' && (
              <MenuItem onClick={() => { closeMenu(); onComplete?.(task) }}>
                <CheckCircleIcon fontSize="small" className="mr-2" />
                Complete
              </MenuItem>
            )}
            <MenuItem onClick={() => { closeMenu(); onDelete?.(task) }} className="!text-danger">
              <DeleteIcon fontSize="small" className="mr-2" />
              Delete
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* Type Badge */}
      <div className="mb-3">
        <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          {task.type}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4">
        {task.description}
      </p>

      {/* Info Grid */}
      <div className="space-y-2 mb-4">
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <AccessTimeIcon sx={{ fontSize: 16 }} className="text-neutral-400" />
          <span className="text-neutral-600 dark:text-neutral-300">
            {formatDate(task.date)} • {formatTime(task.startTime)} - {formatTime(task.endTime)}
          </span>
        </div>

        {/* Project */}
        {task.project && (
          <div className="flex items-center gap-2 text-sm">
            <FolderIcon sx={{ fontSize: 16 }} className="text-primary" />
            <span className="text-neutral-600 dark:text-neutral-300 truncate">
              {task.project.name}
            </span>
          </div>
        )}

        {/* Location */}
        {task.location && (
          <div className="flex items-center gap-2 text-sm">
            <LocationOnIcon sx={{ fontSize: 16 }} className="text-neutral-400" />
            <span className="text-neutral-500 truncate">{task.location}</span>
          </div>
        )}
      </div>

      {/* Duration (derived from Start/End Time) */}
      {durationLabel && (
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-500">
          <span>Duration</span>
          <span className="font-medium text-neutral-700 dark:text-neutral-200">{durationLabel}</span>
        </div>
      )}

      {/* Footer - Worker */}
      <div className="mt-auto pt-3 border-t border-light-border dark:border-dark-border">
        {task.workers?.length ? (
          <div className="flex items-center gap-2">
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: '0.7rem',
                background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
              }}
            >
              {getInitials(task.workers[0]?.name)}
            </Avatar>
            <div>
              <p className="text-sm font-medium text-light-text dark:text-dark-text">
                {task.workers[0]?.name}
                {task.workers.length > 1 ? ` +${task.workers.length - 1}` : ''}
              </p>
              <p className="text-xs text-neutral-500">
                {task.workers.length > 1 ? 'Multiple workers' : (task.workers[0]?.email || '')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-neutral-400">
            <PersonIcon sx={{ fontSize: 20 }} />
            <span className="text-sm">Unassigned</span>
          </div>
        )}
      </div>

      {/* Priority Indicator */}
      <Tooltip title={`${task.priority} priority`}>
        <div
          className="absolute top-0 right-4 w-2 h-8 rounded-b-full"
          style={{ backgroundColor: priorityColor?.bg }}
        />
      </Tooltip>
    </motion.div>
  )
}

export default TaskCard

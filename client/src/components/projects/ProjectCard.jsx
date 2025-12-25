import { useState } from 'react'
import { motion } from 'framer-motion'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

// MUI Icons
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import GroupIcon from '@mui/icons-material/Group'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants/projects'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency } from '../../utils/formatters'

const ProjectCard = ({ project, onClick, onEdit, onDelete }) => {
  const { settings } = useSettings()
  const [anchorEl, setAnchorEl] = useState(null)
  const statusColor = STATUS_COLORS[project.status]
  const priorityColor = PRIORITY_COLORS[project.priority]

  // Assigned workers may be populated objects (backend) or ids
  const assignedWorkerDetails = (project.assignedWorkers || [])
    .map(w => (typeof w === 'string' ? null : w))
    .filter(Boolean)

  // Calculate days remaining
  const today = new Date()
  const endDate = new Date(project.endDate)
  const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
  const isOverdue = daysRemaining < 0 && project.status !== 'completed'

  // Calculate budget utilization
  const budgetUtilization = Math.round((project.spent / project.budget) * 100)

  const handleMenuOpen = (e) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleView = () => {
    handleMenuClose()
    onClick()
  }

  const handleEdit = () => {
    handleMenuClose()
    if (onEdit) onEdit(project)
  }

  const handleDelete = () => {
    handleMenuClose()
    if (onDelete) onDelete(project)
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="premium-card p-5 cursor-pointer h-full flex flex-col relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-xs text-neutral-500 mb-1">{project.projectId}</p>
          <h3 className="font-semibold text-light-text dark:text-dark-text line-clamp-2">
            {project.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Chip
            size="small"
            label={statusColor?.label}
            sx={{
              backgroundColor: statusColor?.light,
              color: statusColor?.text,
              fontWeight: 600,
              flexShrink: 0,
            }}
          />
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            className="!ml-1"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { borderRadius: '12px', minWidth: 160 },
        }}
      >
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" className="mr-2" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" className="mr-2 text-info" />
          Edit Project
        </MenuItem>
        <MenuItem onClick={handleDelete} className="!text-danger">
          <DeleteIcon fontSize="small" className="mr-2" />
          Delete
        </MenuItem>
      </Menu>

      {/* Client */}
      <div className="mb-4">
        <p className="text-sm text-primary font-medium">{project.client}</p>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-500">Progress</span>
          <span className="text-sm font-bold" style={{ color: statusColor?.bg }}>
            {project.progress}%
          </span>
        </div>
        <LinearProgress
          variant="determinate"
          value={project.progress}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: statusColor?.light,
            '& .MuiLinearProgress-bar': {
              backgroundColor: statusColor?.bg,
              borderRadius: 3,
            },
          }}
        />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Deadline */}
        <div className="flex items-center gap-2">
          <CalendarTodayIcon className="text-neutral-400" sx={{ fontSize: 16 }} />
          <div>
            <p className="text-[10px] text-neutral-400 uppercase">Deadline</p>
            <p className={`text-xs font-medium ${isOverdue ? 'text-danger' : ''}`}>
              {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Budget */}
        <div className="flex items-center gap-2">
          <AttachMoneyIcon className="text-neutral-400" sx={{ fontSize: 16 }} />
          <div>
            <p className="text-[10px] text-neutral-400 uppercase">Budget</p>
            <p className="text-xs font-medium">
              {formatCurrency(project.budget / 1000, settings).replace(/\.\d+/, '')}K
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 col-span-2">
          <LocationOnIcon className="text-neutral-400" sx={{ fontSize: 16 }} />
          <p className="text-xs text-neutral-500 truncate">{project.location}</p>
        </div>
      </div>

      {/* Priority & Days */}
      <div className="flex items-center justify-between mb-4">
        <Chip
          size="small"
          label={project.priority}
          sx={{
            backgroundColor: priorityColor?.light,
            color: priorityColor?.text,
            fontWeight: 600,
            textTransform: 'capitalize',
            fontSize: '10px',
          }}
        />
        {project.status !== 'completed' && (
          <span className={`text-xs font-medium ${isOverdue ? 'text-danger' : 'text-neutral-500'}`}>
            {isOverdue 
              ? `${Math.abs(daysRemaining)} days overdue` 
              : `${daysRemaining} days left`
            }
          </span>
        )}
      </div>

      {/* Footer - Team */}
      <div className="mt-auto pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GroupIcon className="text-neutral-400" sx={{ fontSize: 16 }} />
          <span className="text-xs text-neutral-500">Team</span>
        </div>
        <AvatarGroup
          max={4}
          sx={{
            '& .MuiAvatar-root': {
              width: 28,
              height: 28,
              fontSize: '0.75rem',
              border: '2px solid white',
            },
          }}
        >
          {assignedWorkerDetails.map((worker) => (
            <Tooltip key={worker._id} title={worker.name}>
              <Avatar
                sx={{
                  background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                }}
              >
                {worker.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
            </Tooltip>
          ))}
        </AvatarGroup>
      </div>

      {/* Tasks Summary */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-light-border dark:border-dark-border text-xs">
        <span className="text-success">
          ✓ {project.tasks?.completed ?? 0}
        </span>
        <span className="text-primary">
          ◷ {project.tasks?.inProgress ?? 0}
        </span>
        <span className="text-neutral-400">
          ○ {project.tasks?.pending ?? 0}
        </span>
      </div>
    </motion.div>
  )
}

export default ProjectCard

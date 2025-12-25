import { useState } from 'react'
import { motion } from 'framer-motion'

// MUI Components
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'

// MUI Icons
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import ArchiveIcon from '@mui/icons-material/Archive'
import FolderIcon from '@mui/icons-material/Folder'
import GroupIcon from '@mui/icons-material/Group'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

// Data
import { STATUS_COLORS } from '../../constants/projects'

const DeleteProjectDialog = ({ open, onClose, project, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('')
  const [archiveInstead, setArchiveInstead] = useState(false)
  const [loading, setLoading] = useState(false)

  const isDeleteEnabled = confirmText === project?.name

  const handleConfirm = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    setConfirmText('')
    onConfirm(archiveInstead ? 'archive' : 'delete')
  }

  const handleClose = () => {
    setConfirmText('')
    setArchiveInstead(false)
    onClose()
  }

  if (!project) return null

  const statusColor = STATUS_COLORS[project.status]

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px' },
      }}
    >
      <DialogTitle className="text-center pt-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center"
        >
          <WarningAmberIcon className="text-danger" sx={{ fontSize: 40 }} />
        </motion.div>
        <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
          Delete Project?
        </h2>
      </DialogTitle>

      <DialogContent className="text-center px-8">
        {/* Project Info Card */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <FolderIcon className="text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-light-text dark:text-dark-text">
                {project.name}
              </p>
              <p className="text-sm text-neutral-500">{project.projectId}</p>
            </div>
            <Chip
              size="small"
              label={statusColor?.label}
              sx={{
                backgroundColor: statusColor?.light,
                color: statusColor?.text,
                fontWeight: 600,
              }}
            />
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-light-border dark:border-dark-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                <GroupIcon sx={{ fontSize: 14 }} />
                <span className="text-xs">Workers</span>
              </div>
              <p className="font-bold text-light-text dark:text-dark-text">
                {project.assignedWorkers?.length || 0}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                <AssignmentIcon sx={{ fontSize: 14 }} />
                <span className="text-xs">Tasks</span>
              </div>
              <p className="font-bold text-light-text dark:text-dark-text">
                {project.tasks?.total || 0}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                <AttachMoneyIcon sx={{ fontSize: 14 }} />
                <span className="text-xs">Spent</span>
              </div>
              <p className="font-bold text-light-text dark:text-dark-text">
                ${(project.spent / 1000).toFixed(0)}K
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-500">Progress</span>
              <span className="font-medium">{project.progress}%</span>
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
        </div>

        <p className="text-neutral-600 dark:text-neutral-300 mb-4">
          This action will permanently delete this project and all associated data:
        </p>

        <ul className="text-left text-sm text-neutral-500 dark:text-neutral-400 mb-6 space-y-2">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            All project milestones and timeline
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Task assignments linked to this project
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Worker assignments and allocations
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Budget and expense records
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            All project documents and notes
          </li>
        </ul>

        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 mb-6">
          <FormControlLabel
            control={
              <Checkbox
                checked={archiveInstead}
                onChange={(e) => setArchiveInstead(e.target.checked)}
                sx={{
                  color: '#F59E0B',
                  '&.Mui-checked': { color: '#F59E0B' },
                }}
              />
            }
            label={
              <span className="text-sm text-warning font-medium">
                Archive instead (Recommended) - Project will be hidden but data preserved
              </span>
            }
          />
        </div>

        {!archiveInstead && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-sm text-neutral-500 mb-2">
              Type <span className="font-bold text-danger">{project.name}</span> to confirm deletion:
            </p>
            <TextField
              fullWidth
              placeholder="Enter project name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              error={confirmText.length > 0 && !isDeleteEnabled}
              helperText={confirmText.length > 0 && !isDeleteEnabled ? 'Name does not match' : ''}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                },
              }}
            />
          </motion.div>
        )}
      </DialogContent>

      <DialogActions className="p-6 pt-2 flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 px-6 py-3 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={(!archiveInstead && !isDeleteEnabled) || loading}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            archiveInstead
              ? 'bg-warning text-white hover:bg-warning/90 disabled:opacity-50'
              : 'bg-danger text-white hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : archiveInstead ? (
            <>
              <ArchiveIcon fontSize="small" />
              Archive Project
            </>
          ) : (
            <>
              <DeleteForeverIcon fontSize="small" />
              Delete Permanently
            </>
          )}
        </button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteProjectDialog

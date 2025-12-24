import { useState } from 'react'
import { motion } from 'framer-motion'

// MUI Components
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Avatar from '@mui/material/Avatar'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

// MUI Icons
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import ArchiveIcon from '@mui/icons-material/Archive'

const DeleteWorkerDialog = ({ open, onClose, worker, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('')
  const [archiveInstead, setArchiveInstead] = useState(false)
  const [inactiveFrom, setInactiveFrom] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const isDeleteEnabled = confirmText === worker?.name

  const handleConfirm = async () => {
    setLoading(true)
    try {
      // ENTERPRISE RULE: Inactive cut-off date is required when archiving
      if (archiveInstead && !inactiveFrom) return
      await onConfirm({ action: archiveInstead ? 'archive' : 'delete', inactiveFrom })
      setConfirmText('')
      setArchiveInstead(false)
      setInactiveFrom(new Date().toISOString().split('T')[0])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setArchiveInstead(false)
    setInactiveFrom(new Date().toISOString().split('T')[0])
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
        },
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
          Delete Worker?
        </h2>
      </DialogTitle>

      <DialogContent className="text-center px-8">
        <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 mb-6">
          <Avatar
            src={worker?.photo}
            sx={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
            }}
          >
            {worker?.name?.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <div className="text-left">
            <p className="font-semibold text-light-text dark:text-dark-text">
              {worker?.name}
            </p>
            <p className="text-sm text-neutral-500">{worker?.employeeId}</p>
          </div>
        </div>

        <p className="text-neutral-600 dark:text-neutral-300 mb-4">
          This action will permanently delete all data associated with this worker including:
        </p>

        <ul className="text-left text-sm text-neutral-500 dark:text-neutral-400 mb-6 space-y-2">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Attendance records
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Salary history
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Task assignments
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Project associations
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
                Archive instead (Recommended) - Data will be preserved but worker will be inactive
              </span>
            }
          />

          {archiveInstead && (
            <div className="mt-3 pl-7">
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-2">
                From this date, attendance/salary/invoices will be blocked. Past records remain unchanged.
              </p>
              <TextField
                type="date"
                size="small"
                fullWidth
                label="Inactive From (cut-off date)"
                value={inactiveFrom}
                onChange={(e) => setInactiveFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </div>
          )}
        </div>

        {!archiveInstead && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-sm text-neutral-500 mb-2">
              Type <span className="font-bold text-danger">{worker?.name}</span> to confirm deletion:
            </p>
            <TextField
              fullWidth
              placeholder="Enter worker name"
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
          disabled={(!archiveInstead && !isDeleteEnabled) || (archiveInstead && !inactiveFrom) || loading}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            archiveInstead
              ? 'bg-warning text-white hover:bg-warning-dark disabled:opacity-50'
              : 'bg-danger text-white hover:bg-danger-dark disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : archiveInstead ? (
            <>
              <ArchiveIcon fontSize="small" />
              Archive Worker
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

export default DeleteWorkerDialog

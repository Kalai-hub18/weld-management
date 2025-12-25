import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

// MUI Components
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddIcon from '@mui/icons-material/PersonAdd'

import workerService from '../../services/workerService'
import projectService from '../../services/projectService'

const AddWorkerModal = ({ open, onClose, projectId, assignedWorkerIds = [], onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWorkers, setSelectedWorkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [allWorkers, setAllWorkers] = useState([])

  const getId = (w) => w?.id || w?._id || w

  useEffect(() => {
    const fetchWorkers = async () => {
      if (!open) return
      try {
        const res = await workerService.getAllWorkers({ limit: 1000 })
        setAllWorkers(res.data || [])
      } catch (e) {
        console.error(e)
        toast.error('Failed to load workers')
      }
    }
    fetchWorkers()
  }, [open])

  // Get workers not already assigned
  const unassignedWorkers = useMemo(() => {
    const assignedSet = new Set((assignedWorkerIds || []).filter(Boolean))
    return (allWorkers || []).filter(w => !assignedSet.has(getId(w)))
  }, [assignedWorkerIds])

  // Filter by search
  const filteredWorkers = useMemo(() => {
    return unassignedWorkers.filter(worker =>
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [unassignedWorkers, searchTerm])

  const handleToggleWorker = (workerId) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    )
  }

  const handleSubmit = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const combined = Array.from(new Set([...(assignedWorkerIds || []), ...selectedWorkers]))
      const res = await projectService.assignWorkers(projectId, combined)
      toast.success('Workers assigned successfully')
      if (onAdd) onAdd(res.data)
      handleClose()
    } catch (e) {
      console.error(e)
      toast.error(e.response?.data?.message || 'Failed to assign workers')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSearchTerm('')
    setSelectedWorkers([])
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px', maxHeight: '80vh' },
      }}
    >
      <DialogTitle className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <PersonAddIcon className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
              Add Workers to Project
            </h2>
            <p className="text-sm text-neutral-500">
              Select workers to assign
            </p>
          </div>
        </div>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="!py-4">
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search workers by name, position, or skill..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon className="text-neutral-400" />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px' },
          }}
          className="mb-4"
        />

        {/* Selected Count */}
        {selectedWorkers.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 flex items-center justify-between">
            <span className="text-sm text-primary font-medium">
              {selectedWorkers.length} worker(s) selected
            </span>
            <button
              onClick={() => setSelectedWorkers([])}
              className="text-xs text-neutral-500 hover:text-primary"
            >
              Clear
            </button>
          </div>
        )}

        {/* Workers List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredWorkers.length > 0 ? (
            filteredWorkers.map((worker, index) => {
              const wid = getId(worker)
              return (
              <motion.div
                key={wid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleToggleWorker(wid)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedWorkers.includes(wid)
                    ? 'bg-primary/10 border-2 border-primary/30'
                    : 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-2 border-transparent'
                }`}
              >
                <Checkbox
                  checked={selectedWorkers.includes(wid)}
                  onChange={() => handleToggleWorker(wid)}
                  sx={{
                    color: '#FF6A00',
                    '&.Mui-checked': { color: '#FF6A00' },
                  }}
                />
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                    fontSize: '0.875rem',
                  }}
                >
                  {worker.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-light-text dark:text-dark-text">
                    {worker.name}
                  </p>
                  <p className="text-sm text-primary">{worker.position}</p>
                </div>
                <div className="hidden sm:flex flex-wrap gap-1 max-w-[150px]">
                  {worker.skills.slice(0, 2).map((skill, i) => (
                    <Chip
                      key={i}
                      label={skill}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '10px', height: '20px' }}
                    />
                  ))}
                  {worker.skills.length > 2 && (
                    <Chip
                      label={`+${worker.skills.length - 2}`}
                      size="small"
                      sx={{
                        fontSize: '10px',
                        height: '20px',
                        backgroundColor: '#FF6A0020',
                        color: '#FF6A00',
                      }}
                    />
                  )}
                </div>
              </motion.div>
              )
            })
          ) : (
            <div className="text-center py-8 text-neutral-400">
              <PersonAddIcon sx={{ fontSize: 48 }} className="mb-2" />
              <p>No available workers found</p>
            </div>
          )}
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
          disabled={loading || selectedWorkers.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding...
            </>
          ) : (
            `Add ${selectedWorkers.length || ''} Worker${selectedWorkers.length !== 1 ? 's' : ''}`
          )}
        </button>
      </DialogActions>
    </Dialog>
  )
}

export default AddWorkerModal

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// MUI Components
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

// MUI Icons
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'

// Components
import AddWorkerModal from '../../components/workers/AddWorkerModal'
import EditWorkerDialog from '../../components/workers/EditWorkerDialog'
import DeleteWorkerDialog from '../../components/workers/DeleteWorkerDialog'

// Data
import workerService from '../../services/workerService'

const WorkersPage = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [workerToEdit, setWorkerToEdit] = useState(null)
  const [workerToDelete, setWorkerToDelete] = useState(null)
  const [workersList, setWorkersList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      // ENTERPRISE RULE: Show ALL workers (active + inactive) for history and reference
      // Inactive workers are clearly labeled and cannot be used in future operations
      const response = await workerService.getAllWorkers({ 
        activeOnly: 'false', // Show all workers
        limit: 1000 
      })
      console.log('📊 Workers API Response:', response)
      console.log('📊 Workers Data:', response.data)
      console.log('📊 Workers Count:', response.data?.length)
      setWorkersList(response.data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
      toast.error('Failed to load workers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkers()
  }, [])

  const getId = (worker) => worker?.id || worker?._id
  const workers = workersList

  const handleMenuOpen = (event, worker) => {
    setAnchorEl(event.currentTarget)
    setSelectedWorker(worker)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedWorker(null)
  }

  const handleViewProfile = (worker) => {
    const id = getId(worker) || worker
    if (!id) return
    navigate(`/workers/${id}`)
    handleMenuClose()
  }

  const handleEditClick = () => {
    setWorkerToEdit(selectedWorker)
    setEditModalOpen(true)
    handleMenuClose()
  }

  const handleDeleteClick = () => {
    setWorkerToDelete(selectedWorker)
    setDeleteModalOpen(true)
    handleMenuClose()
  }

  const handleEditSave = async (updatedWorker) => {
    try {
      // API call to update worker
      const id = getId(updatedWorker)
      if (!id) throw new Error('Missing worker id')

      // Send only backend-supported fields (prevents "edited but not saved" issues)
      const payload = {
        name: updatedWorker.name,
        email: updatedWorker.email,
        phone: updatedWorker.phone,
        alternatePhone: updatedWorker.alternatePhone,
        department: updatedWorker.department,
        position: updatedWorker.position,
        status: updatedWorker.status,
        // ENTERPRISE: hard cut-off date used by attendance visibility + action validation
        inactiveFrom: updatedWorker.inactiveFrom ?? null,
        // Salary config (Edit Worker -> Salary tab)
        paymentType: updatedWorker.paymentType,
        baseSalary: updatedWorker.baseSalary,
        overtimeRate: updatedWorker.overtimeRate,
        workingDaysPerMonth: updatedWorker.workingDaysPerMonth,
        workingHoursPerDay: updatedWorker.workingHoursPerDay,
        salaryMonthly: updatedWorker.salaryMonthly,
        salaryDaily: updatedWorker.salaryDaily,
        skills: updatedWorker.skills,
        certifications: updatedWorker.certifications,
        address: updatedWorker.address,
        employmentType: updatedWorker.employmentType,
        experience: updatedWorker.experience,
        dateOfBirth: updatedWorker.dateOfBirth,
        gender: updatedWorker.gender,
        aadhaar: updatedWorker.aadhaar,
        pan: updatedWorker.pan,
        age: updatedWorker.age,
        maritalStatus: updatedWorker.maritalStatus,
        bloodGroup: updatedWorker.bloodGroup,
        bankDetails: updatedWorker.bankDetails,
        salary: updatedWorker.salary,
        pfNumber: updatedWorker.pfNumber,
        emergencyContact: updatedWorker.emergencyContact,
        hourlyRate: updatedWorker.hourlyRate,
      }

      const response = await workerService.updateWorker(id, payload)
      const saved = response.data?.worker || response.data
      setWorkersList(prev =>
        prev.map(w => getId(w) === id ? saved : w)
      )
      setEditModalOpen(false)
      setWorkerToEdit(null)
      toast.success(`${updatedWorker.name} updated successfully!`)
    } catch (error) {
      console.error('Error updating worker:', error)
      toast.error('Failed to update worker')
    }
  }

  const handleDeleteConfirm = async ({ action, inactiveFrom }) => {
    try {
      const id = getId(workerToDelete)
      if (!id) throw new Error('Missing worker id')
      if (action === 'archive') {
        const response = await workerService.updateWorker(id, { status: 'inactive', inactiveFrom })
        const saved = response.data?.worker || response.data
        setWorkersList(prev =>
          prev.map(w => getId(w) === id ? saved : w)
        )
        toast.success(`${workerToDelete.name} has been archived`)
      } else {
        await workerService.deleteWorker(id)
        setWorkersList(prev => prev.filter(w => getId(w) !== id))
        toast.success(`${workerToDelete.name} has been deleted`)
      }
      setDeleteModalOpen(false)
      setWorkerToDelete(null)
    } catch (error) {
      console.error('Error deleting worker:', error)
      toast.error(error.response?.data?.message || 'Failed to update worker')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'default'
      case 'on-leave': return 'warning'
      default: return 'default'
    }
  }

  const filteredWorkers = workers.filter(worker =>
    (worker.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (worker.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (worker.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
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
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
            Workers
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage your workforce ({filteredWorkers.length} workers)
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <AddIcon fontSize="small" />
          Add Worker
        </button>
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <TextField
          placeholder="Search workers..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon className="text-neutral-400" />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px' },
          }}
        />
        <div className="flex items-center gap-2">
          <Tooltip title="Filters">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <IconButton
              size="small"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? '!bg-white dark:!bg-neutral-700' : ''}
            >
              <GridViewIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? '!bg-white dark:!bg-neutral-700' : ''}
            >
              <ViewListIcon fontSize="small" />
            </IconButton>
          </div>
        </div>
      </motion.div>

      {/* Workers Grid/List */}
      {viewMode === 'grid' ? (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filteredWorkers.map((worker) => (
            <motion.div
              key={worker.id || worker._id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="premium-card p-5 cursor-pointer"
              onClick={() => handleViewProfile(worker)}
            >
              <div className="flex items-start justify-between mb-4">
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                  }}
                >
                  {worker.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <IconButton
                  size="small"
                  aria-label={`Worker actions for ${worker.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMenuOpen(e, worker)
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </div>

              <h3 className="font-semibold text-light-text dark:text-dark-text mb-1">
                {worker.name}
              </h3>
              <p className="text-sm text-primary font-medium mb-1">{worker.position}</p>
              <p className="text-xs text-neutral-500 mb-3">{worker.department}</p>

              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start gap-1">
                  <Chip
                    label={worker.status}
                    color={getStatusColor(worker.status)}
                    size="small"
                    className="capitalize"
                  />
                  {worker.status === 'inactive' && worker.inactiveFrom && (
                    <span className="text-[11px] text-neutral-500">
                      Inactive from {new Date(worker.inactiveFrom).toISOString().split('T')[0]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip title="Call">
                    <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                      <PhoneIcon fontSize="small" className="text-success" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Email">
                    <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                      <EmailIcon fontSize="small" className="text-info" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

              {/* Skills */}
              {worker.skills && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-light-border dark:border-dark-border">
                  {worker.skills.slice(0, 2).map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 rounded text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    >
                      {skill}
                    </span>
                  ))}
                  {worker.skills.length > 2 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                      +{worker.skills.length - 2}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="premium-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border">
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Worker</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Position</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Department</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((worker) => (
                <tr
                  key={worker.id || worker._id}
                  className="border-b border-light-border dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  onClick={() => handleViewProfile(worker)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
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
                      <div>
                        <p className="font-medium text-light-text dark:text-dark-text">{worker.name}</p>
                        <p className="text-xs text-neutral-500">{worker.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{worker.position}</td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{worker.department}</td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <Chip
                        label={worker.status}
                        color={getStatusColor(worker.status)}
                        size="small"
                        className="capitalize"
                      />
                      {worker.status === 'inactive' && worker.inactiveFrom && (
                        <span className="text-[11px] text-neutral-500">
                          Inactive from {new Date(worker.inactiveFrom).toISOString().split('T')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <IconButton
                      size="small"
                      aria-label={`Worker actions for ${worker.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMenuOpen(e, worker)
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { borderRadius: '12px', minWidth: 160 },
        }}
      >
        <MenuItem onClick={() => handleViewProfile(selectedWorker)}>
          <VisibilityIcon fontSize="small" className="mr-2" />
          View Profile
        </MenuItem>
        <MenuItem onClick={handleEditClick}>
          <EditIcon fontSize="small" className="mr-2 text-info" />
          Edit Worker
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} className="!text-danger">
          <DeleteIcon fontSize="small" className="mr-2" />
          Delete
        </MenuItem>
      </Menu>

      {/* Add Worker Modal */}
      <AddWorkerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={async (newWorkerData) => {
          try {
            const response = await workerService.createWorker(newWorkerData)
            const saved = response.data?.worker || response.data
            setWorkersList(prev => [saved, ...prev])
            toast.success(`${saved.name} added successfully!`)
          } catch (error) {
            console.error('Error creating worker:', error)
            toast.error(error.response?.data?.message || 'Failed to add worker')
          }
        }}
      />

      {/* Edit Worker Dialog */}
      <EditWorkerDialog
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setWorkerToEdit(null)
        }}
        worker={workerToEdit}
        onSave={handleEditSave}
      />

      {/* Delete Worker Dialog */}
      <DeleteWorkerDialog
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setWorkerToDelete(null)
        }}
        worker={workerToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </motion.div>
  )
}

export default WorkersPage

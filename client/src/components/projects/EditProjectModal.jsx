import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

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
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Slider from '@mui/material/Slider'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import FolderIcon from '@mui/icons-material/Folder'
import AddIcon from '@mui/icons-material/Add'
import InfoIcon from '@mui/icons-material/Info'
import PersonIcon from '@mui/icons-material/Person'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'

// Context
import { useSettings } from '../../context/SettingsContext'

const EditProjectModal = ({ open, onClose, project, onSave }) => {
  const { settings } = useSettings()
  
  // Get currency symbol from settings
  const currencySymbol = settings?.currency?.symbol || '$'
  const currencyCode = settings?.currency?.code || 'USD'
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    clientContactName: '',
    clientContactEmail: '',
    clientContactPhone: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    progress: 0,
    startDate: '',
    endDate: '',
    budget: '',
    spent: '',
    location: '',
    tags: [],
    newTag: '',
    notes: '',
  })

  useEffect(() => {
    if (project && open) {
      const toDateInput = (v) => {
        if (!v) return ''
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
      }
      setFormData({
        name: project.name || '',
        client: project.client || '',
        clientContactName: project.clientContact?.name || '',
        clientContactEmail: project.clientContact?.email || '',
        clientContactPhone: project.clientContact?.phone || '',
        description: project.description || '',
        status: project.status || 'pending',
        priority: project.priority || 'medium',
        progress: project.progress || 0,
        // Date inputs need YYYY-MM-DD; backend provides ISO strings/dates
        startDate: toDateInput(project.startDate),
        endDate: toDateInput(project.endDate),
        budget: project.budget || '',
        spent: project.spent || '',
        location: project.location || '',
        tags: project.tags || [],
        newTag: '',
        notes: project.notes || '',
      })
    }
  }, [project, open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: '',
      }))
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    // Simulate API call removed
    // await new Promise(resolve => setTimeout(resolve, 1000))

    const toNumberOrUndefined = (value) => {
      const n = Number(value)
      return Number.isFinite(n) ? n : undefined
    }

    const budgetNum = toNumberOrUndefined(formData.budget)
    const spentNum = toNumberOrUndefined(formData.spent)

    const safeStr = (v) => (typeof v === 'string' ? v.trim() : '')
    const clientContactName = safeStr(formData.clientContactName)
    const clientContactEmail = safeStr(formData.clientContactEmail)
    const clientContactPhone = safeStr(formData.clientContactPhone)

    const clientContact =
      clientContactName || clientContactEmail || clientContactPhone
        ? {
          ...(clientContactName ? { name: clientContactName } : {}),
          // IMPORTANT: don't send empty string for email (backend validates email format)
          ...(clientContactEmail ? { email: clientContactEmail } : {}),
          ...(clientContactPhone ? { phone: clientContactPhone } : {}),
        }
        : undefined

    // IMPORTANT:
    // Do NOT spread the full `project` object into the payload.
    // It contains populated objects (manager/assignedWorkers) which break backend validation.
    const updatedProject = {
      name: formData.name,
      client: formData.client,
      ...(clientContact ? { clientContact } : {}),
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      progress: formData.progress,
      ...(formData.startDate ? { startDate: formData.startDate } : {}),
      ...(formData.endDate ? { endDate: formData.endDate } : {}),
      ...(budgetNum !== undefined ? { budget: budgetNum } : {}),
      ...(spentNum !== undefined ? { spent: spentNum } : {}),
      location: formData.location,
      tags: formData.tags,
      notes: formData.notes,
    }

    onSave(updatedProject)
    setLoading(false)
  }

  const tabPanels = [
    { label: 'Details', icon: InfoIcon },
    { label: 'Client', icon: PersonIcon },
    { label: 'Budget', icon: AttachMoneyIcon },
    { label: 'Schedule', icon: CalendarTodayIcon },
  ]

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
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <FolderIcon className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
              Edit Project
            </h2>
            <p className="text-sm text-neutral-500">{project?.projectId}</p>
          </div>
        </div>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
        className="border-b border-light-border dark:border-dark-border"
        sx={{
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: '#FF6A00' },
          '& .MuiTabs-indicator': { backgroundColor: '#FF6A00' },
        }}
      >
        {tabPanels.map((tab, index) => (
          <Tab key={index} label={tab.label} icon={<tab.icon fontSize="small" />} iconPosition="start" />
        ))}
      </Tabs>

      <DialogContent className="!py-6">
        {/* Details Tab */}
        {activeTab === 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <TextField
              fullWidth
              label="Project Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="pending">Planned</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="on-hold">On Hold</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
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
            </div>

            {/* Progress Slider */}
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2 block">
                Progress: {formData.progress}%
              </label>
              <Slider
                value={formData.progress}
                onChange={(_, value) => setFormData(prev => ({ ...prev, progress: value }))}
                valueLabelDisplay="auto"
                sx={{
                  color: '#FF6A00',
                  '& .MuiSlider-thumb': { backgroundColor: '#FF6A00' },
                }}
              />
            </div>

            <TextField
              fullWidth
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />

            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <TextField
                  size="small"
                  placeholder="Add a tag..."
                  name="newTag"
                  value={formData.newTag}
                  onChange={handleChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1"
                />
                <IconButton onClick={handleAddTag} className="!bg-primary !text-white">
                  <AddIcon />
                </IconButton>
              </div>
            </div>

            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </motion.div>
        )}

        {/* Client Tab */}
        {activeTab === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <TextField
              fullWidth
              label="Client Name"
              name="client"
              value={formData.client}
              onChange={handleChange}
              required
            />
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                Client Contact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Contact Name"
                  name="clientContactName"
                  value={formData.clientContactName}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Email"
                  name="clientContactEmail"
                  type="email"
                  value={formData.clientContactEmail}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Phone"
                  name="clientContactPhone"
                  value={formData.clientContactPhone}
                  onChange={handleChange}
                  className="md:col-span-2"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Budget Tab */}
        {activeTab === 2 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Total Budget"
                name="budget"
                type="number"
                value={formData.budget}
                onChange={handleChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                label="Amount Spent"
                name="spent"
                type="number"
                value={formData.spent}
                onChange={handleChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                }}
              />
            </div>

            {/* Budget Summary */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                Budget Summary
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-info/10">
                  <p className="text-xs text-neutral-500">Total Budget</p>
                  <p className="text-xl font-bold text-info">
                    {currencySymbol}{parseFloat(formData.budget || 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <p className="text-xs text-neutral-500">Spent</p>
                  <p className="text-xl font-bold text-warning">
                    {currencySymbol}{parseFloat(formData.spent || 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <p className="text-xs text-neutral-500">Remaining</p>
                  <p className="text-xl font-bold text-success">
                    {currencySymbol}{(parseFloat(formData.budget || 0) - parseFloat(formData.spent || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-500">Budget Utilization</span>
                  <span className="font-medium">
                    {formData.budget ? Math.round((formData.spent / formData.budget) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${formData.budget ? Math.min(100, (formData.spent / formData.budget) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Schedule Tab */}
        {activeTab === 3 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Start Date"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="End Date"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </div>

            {/* Timeline Info */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                Timeline Summary
              </h4>
              {formData.startDate && formData.endDate && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-info/10">
                    <p className="text-xs text-neutral-500">Total Days</p>
                    <p className="text-xl font-bold text-info">
                      {Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24))}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-warning/10">
                    <p className="text-xs text-neutral-500">Days Elapsed</p>
                    <p className="text-xl font-bold text-warning">
                      {Math.max(0, Math.ceil((new Date() - new Date(formData.startDate)) / (1000 * 60 * 60 * 24)))}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success/10">
                    <p className="text-xs text-neutral-500">Days Remaining</p>
                    <p className="text-xl font-bold text-success">
                      {Math.max(0, Math.ceil((new Date(formData.endDate) - new Date()) / (1000 * 60 * 60 * 24)))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </DialogContent>

      <DialogActions className="border-t border-light-border dark:border-dark-border p-4">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </DialogActions>
    </Dialog>
  )
}

export default EditProjectModal

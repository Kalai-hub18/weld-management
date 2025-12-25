import { useState } from 'react'
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

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import FolderIcon from '@mui/icons-material/Folder'

// Context
import { useSettings } from '../../context/SettingsContext'

const AddProjectModal = ({ open, onClose, onAdd }) => {
  const { settings } = useSettings()
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    clientContactName: '',
    clientContactEmail: '',
    clientContactPhone: '',
    description: '',
    startDate: '',
    endDate: '',
    paymentType: 'fixed',
    rate: '',
    workingDaysPerWeek: 6,
    overtimeRate: '',
    overtimeHours: '',
    currency: settings?.currency?.code || 'USD',
    location: '',
    priority: 'medium',
    tags: [],
    newTag: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Get currency symbol from settings
  const currencySymbol = settings?.currency?.symbol || '$'
  const currencyCode = settings?.currency?.code || 'USD'

  const computeTotals = () => {
    const start = formData.startDate ? new Date(formData.startDate) : null
    const end = formData.endDate ? new Date(formData.endDate) : null
    const rate = parseFloat(formData.rate) || 0
    const overtimeRate = parseFloat(formData.overtimeRate) || 0
    const overtimeHours = parseFloat(formData.overtimeHours) || 0
    const workingDaysPerWeek = Math.min(7, Math.max(1, parseInt(formData.workingDaysPerWeek || 0, 10)))

    let totalDays = 0
    if (start && end && !isNaN(start) && !isNaN(end) && end >= start) {
      totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
    }

    const fullWeeks = Math.floor(totalDays / 7)
    const remainingDays = totalDays % 7
    const workingDays = totalDays
      ? fullWeeks * workingDaysPerWeek + Math.min(remainingDays, workingDaysPerWeek)
      : 0

    let baseTotal = 0
    switch (formData.paymentType) {
      case 'daily':
        baseTotal = rate * workingDays
        break
      case 'weekly':
        baseTotal = rate * Math.max(1, Math.ceil(totalDays / 7 || 0))
        break
      case 'monthly':
        baseTotal = rate * Math.max(1, Math.ceil(totalDays / 30 || 0))
        break
      case 'fixed':
      default:
        baseTotal = rate
        break
    }

    const overtimeTotal = overtimeRate && overtimeHours ? overtimeRate * overtimeHours : 0
    const estimatedTotal = baseTotal + overtimeTotal

    return { estimatedTotal, workingDays, totalDays }
  }

  const { estimatedTotal, workingDays, totalDays } = computeTotals()

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

    try {
      const safeStr = (v) => (typeof v === 'string' ? v.trim() : '')
      const clientContactName = safeStr(formData.clientContactName)
      const clientContactEmail = safeStr(formData.clientContactEmail)
      const clientContactPhone = safeStr(formData.clientContactPhone)

      const clientContact =
        clientContactName || clientContactEmail || clientContactPhone
          ? {
            ...(clientContactName ? { name: clientContactName } : {}),
            ...(clientContactEmail ? { email: clientContactEmail } : {}),
            ...(clientContactPhone ? { phone: clientContactPhone } : {}),
          }
          : undefined

      const newProject = {
        name: formData.name,
        client: formData.client,
        ...(clientContact ? { clientContact } : {}),
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: estimatedTotal || 0,
        paymentType: formData.paymentType,
        rate: parseFloat(formData.rate) || 0,
        workingDaysPerWeek: parseInt(formData.workingDaysPerWeek || 0, 10),
        overtimeRate: parseFloat(formData.overtimeRate) || 0,
        overtimeHours: parseFloat(formData.overtimeHours) || 0,
        currency: currencyCode, // Use currency from settings
        location: formData.location,
        priority: formData.priority,
        tags: formData.tags,
      }

      if (onAdd) {
        await onAdd(newProject)
      }
      handleClose()
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      client: '',
      clientContactName: '',
      clientContactEmail: '',
      clientContactPhone: '',
      description: '',
      startDate: '',
      endDate: '',
      paymentType: 'fixed',
      rate: '',
      workingDaysPerWeek: 6,
      overtimeRate: '',
      overtimeHours: '',
      currency: 'USD',
      location: '',
      priority: 'medium',
      tags: [],
      newTag: '',
    })
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
            <FolderIcon className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
              Create New Project
            </h2>
            <p className="text-sm text-neutral-500">Fill in the project details</p>
          </div>
        </div>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="!py-6">
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Project Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="md:col-span-2"
              />
              <TextField
                fullWidth
                label="Client Name"
                name="client"
                value={formData.client}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
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

          {/* Client Contact */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Client Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              />
            </div>
          </div>

          {/* Schedule & Budget */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Schedule & Budget
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Start Date"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="End Date"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
                error={Boolean(formData.startDate && formData.endDate && formData.endDate < formData.startDate)}
                helperText={
                  formData.startDate && formData.endDate && formData.endDate < formData.startDate
                    ? 'End date must be after start date'
                    : ''
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <FormControl fullWidth>
                <InputLabel>Payment Type</InputLabel>
                <Select
                  label="Payment Type"
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={handleChange}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="fixed">Fixed</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Currency"
                value={`${currencyCode} (${currencySymbol})`}
                InputProps={{ readOnly: true }}
                helperText="Currency is set in Settings"
              />

              <TextField
                fullWidth
                label={`Rate (${formData.paymentType === 'daily'
                  ? 'per Day'
                  : formData.paymentType === 'weekly'
                    ? 'per Week'
                    : formData.paymentType === 'monthly'
                      ? 'per Month'
                      : 'Fixed Amount'
                  })`}
                name="rate"
                type="number"
                value={formData.rate}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {currencySymbol}
                    </InputAdornment>
                  ),
                }}
                required
              />

              <TextField
                fullWidth
                label="Working Days / Week"
                name="workingDaysPerWeek"
                type="number"
                value={formData.workingDaysPerWeek}
                onChange={handleChange}
                inputProps={{ min: 1, max: 7 }}
                helperText="1 - 7"
              />

              <TextField
                fullWidth
                label="Overtime Rate (optional)"
                name="overtimeRate"
                type="number"
                value={formData.overtimeRate}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {currencySymbol}
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Overtime Hours (optional)"
                name="overtimeHours"
                type="number"
                value={formData.overtimeHours}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <TextField
                fullWidth
                label="Working Days (calculated)"
                value={workingDays || 0}
                InputProps={{ readOnly: true }}
                helperText={totalDays ? `${totalDays} total days in range` : 'Select dates to calculate'}
              />
              <TextField
                fullWidth
                label="Estimated Total"
                value={estimatedTotal ? `${currencySymbol}${estimatedTotal.toFixed(2)}` : ''}
                InputProps={{ readOnly: true }}
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          {/* Priority & Tags */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Priority & Tags
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <div className="flex gap-2">
                  <TextField
                    fullWidth
                    size="small"
                    label="Add Tag"
                    name="newTag"
                    value={formData.newTag}
                    onChange={handleChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <IconButton onClick={handleAddTag} className="!bg-primary !text-white">
                    <AddIcon />
                  </IconButton>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        onDelete={() => handleRemoveTag(tag)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
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
            !formData.name ||
            !formData.client ||
            !formData.startDate ||
            !formData.endDate ||
            !formData.paymentType ||
            !formData.rate ||
            Number(formData.rate) <= 0 ||
            Number(formData.workingDaysPerWeek) < 1 ||
            Number(formData.workingDaysPerWeek) > 7 ||
            estimatedTotal <= 0
          }
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            'Create Project'
          )}
        </button>
      </DialogActions>
    </Dialog>
  )
}

export default AddProjectModal

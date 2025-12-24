import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import invoiceService from '../../services/invoiceService'
import projectService from '../../services/projectService'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency } from '../../utils/formatters'
import { validateInvoiceForm, roundCurrency } from '../../utils/validators'

const ProjectInvoiceFormPage = () => {
  const { settings } = useSettings()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [formData, setFormData] = useState({
    projectId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    totalAmount: 0,
    paidAmount: 0,
    status: 'draft',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: '',
  })

  useEffect(() => {
    fetchProjects()
    if (isEdit) {
      fetchInvoice()
    }
  }, [id])

  const fetchProjects = async () => {
    try {
      const response = await projectService.getAllProjects()
      setProjects(response.data || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects. Please try again.')
    }
  }

  const fetchInvoice = async () => {
    try {
      const response = await invoiceService.getProjectInvoiceById(id)
      const invoice = response.data
      setFormData({
        projectId: invoice.projectId?._id || invoice.projectId || '',
        invoiceDate: invoice.invoiceDate.split('T')[0],
        dueDate: invoice.dueDate.split('T')[0],
        clientName: invoice.clientName || '',
        clientEmail: invoice.clientEmail || '',
        clientPhone: invoice.clientPhone || '',
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount || 0,
        status: invoice.status,
        items: invoice.items.length > 0 ? invoice.items : [{ description: '', quantity: 1, rate: 0, amount: 0 }],
        notes: invoice.notes || '',
      })
    } catch (error) {
      toast.error('Failed to fetch invoice')
      navigate('/invoices/project')
    }
  }

  const getId = (p) => p?.id || p?._id

  const handleProjectSelect = (projectId) => {
    const project = projects.find((p) => getId(p) === projectId)
    if (!project) {
      setFormData((prev) => ({ ...prev, projectId }))
      return
    }

    // Project model: `client` (string) + `clientContact` (object)
    setFormData((prev) => ({
      ...prev,
      projectId,
      clientName: project.client || prev.clientName || '',
      clientEmail: project.clientContact?.email || prev.clientEmail || '',
      clientPhone: project.clientContact?.phone || prev.clientPhone || '',
    }))
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value

    // Calculate amount with proper rounding
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(newItems[index].quantity) || 0
      const rate = parseFloat(newItems[index].rate) || 0
      newItems[index].amount = roundCurrency(quantity * rate)
    }

    // Calculate total with proper rounding
    const total = roundCurrency(
      newItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    )

    setFormData({ ...formData, items: newItems, totalAmount: total })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, rate: 0, amount: 0 }],
    })
  }

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    const total = newItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    setFormData({ ...formData, items: newItems, totalAmount: total })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    const validation = validateInvoiceForm(formData)
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error))
      return
    }

    setLoading(true)

    try {
      if (isEdit) {
        await invoiceService.updateProjectInvoice(id, formData)
        toast.success('Invoice updated successfully')
      } else {
        const response = await invoiceService.createProjectInvoice(formData)
        toast.success('Invoice created successfully')
        navigate(`/invoices/project/${response.data._id}`)
        return
      }
      navigate(`/invoices/project/${id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(isEdit ? `/invoices/project/${id}` : '/invoices/project')}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
            {isEdit ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-neutral-500">
            {isEdit ? 'Update invoice details' : 'Create a new invoice'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Invoice Date"
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </div>
        </motion.div>

        {/* Project & Client Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-card p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Project & Client Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              select
              label="Select Project"
              value={formData.projectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              required
            >
              <MenuItem value="">Select a project</MenuItem>
              {projects.map((project) => (
                <MenuItem key={getId(project)} value={getId(project)}>
                  {project.name} — {project.client}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Client Name"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
            />
            <TextField
              label="Phone"
              value={formData.clientPhone}
              onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
            />
          </div>
        </motion.div>

        {/* Line Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="premium-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Line Items</h2>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addItem} size="small">
              Add Item
            </Button>
          </div>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-start">
                <TextField
                  label="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="col-span-5"
                  required
                />
                <TextField
                  label="Quantity"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="col-span-2"
                  inputProps={{ min: 0.01, step: 0.01 }}
                  required
                />
                <TextField
                  label="Rate"
                  type="number"
                  value={item.rate}
                  onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                  className="col-span-2"
                  inputProps={{ min: 0, step: 0.01 }}
                  required
                />
                <TextField
                  label="Amount"
                  value={item.amount.toFixed(2)}
                  className="col-span-2"
                  disabled
                />
                <IconButton
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                  className="col-span-1 !mt-2"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-neutral-500">Total Amount</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(formData.totalAmount, settings)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Payment & Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="premium-card p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <TextField
              label="Paid Amount"
              type="number"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
              inputProps={{ min: 0, max: formData.totalAmount, step: 0.01 }}
              helperText={formData.paidAmount > formData.totalAmount ? 'Cannot exceed total amount' : ''}
              error={formData.paidAmount > formData.totalAmount}
            />
            <TextField
              label="Balance Due"
              value={(formData.totalAmount - formData.paidAmount).toFixed(2)}
              disabled
            />
          </div>
          <TextField
            label="Notes"
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            fullWidth
          />
        </motion.div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outlined"
            onClick={() => navigate(isEdit ? `/invoices/project/${id}` : '/invoices/project')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ProjectInvoiceFormPage

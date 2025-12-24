import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ReceiptIcon from '@mui/icons-material/Receipt'
import invoiceService from '../../services/invoiceService'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'info' },
  paid: { label: 'Paid', color: 'success' },
  overdue: { label: 'Overdue', color: 'error' },
  cancelled: { label: 'Cancelled', color: 'default' },
}

const ProjectInvoicesPage = () => {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const params = { 
        status: statusFilter,
        invoiceType: 'project'
      }
      if (search) params.search = search
      const response = await invoiceService.getProjectInvoices(params)
      setInvoices(response.data)
    } catch (error) {
      toast.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchInvoices()
  }

  const handleMenuOpen = (event, invoice) => {
    setAnchorEl(event.currentTarget)
    setSelectedInvoice(invoice)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedInvoice(null)
  }

  const handleView = () => {
    navigate(`/invoices/project/${selectedInvoice._id}`)
    handleMenuClose()
  }

  const handleEdit = () => {
    navigate(`/invoices/project/${selectedInvoice._id}/edit`)
    handleMenuClose()
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      handleMenuClose()
      return
    }

    try {
      await invoiceService.deleteProjectInvoice(selectedInvoice._id)
      toast.success('Invoice deleted successfully')
      fetchInvoices()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete invoice')
    }
    handleMenuClose()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Invoices</h1>
          <p className="text-neutral-500">Manage and track all invoices</p>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/invoices/project/create')}
          className="btn-primary"
        >
          Create Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="premium-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <TextField
            placeholder="Search by invoice number, client, or worker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            className="flex-1"
          />
          <div className="flex gap-2">
            {['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'contained' : 'outlined'}
                onClick={() => setStatusFilter(status)}
                size="small"
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="premium-card">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <ReceiptIcon sx={{ fontSize: 64, opacity: 0.3 }} className="text-neutral-400" />
            <p className="mt-4 text-neutral-500">No invoices found</p>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
            onClick={() => navigate('/invoices/project/create')}
              className="btn-primary mt-4"
            >
              Create First Invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Client/Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {invoices.map((invoice) => (
                  <motion.tr
                    key={invoice._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                    onClick={() => navigate(`/invoices/project/${invoice._id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-primary">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{invoice.clientName || invoice.workerName}</p>
                        <p className="text-sm text-neutral-500">
                          {invoice.clientEmail || invoice.workerEmail}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(invoice.invoiceDate, settings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(invoice.dueDate, settings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">
                      {formatCurrency(invoice.totalAmount, settings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Chip
                        label={STATUS_CONFIG[invoice.status].label}
                        color={STATUS_CONFIG[invoice.status].color}
                        size="small"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMenuOpen(e, invoice)
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" className="mr-2" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" className="mr-2" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} className="text-error">
          <DeleteIcon fontSize="small" className="mr-2" />
          Delete
        </MenuItem>
      </Menu>
    </div>
  )
}

export default ProjectInvoicesPage

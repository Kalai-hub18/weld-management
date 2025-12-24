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
import DownloadIcon from '@mui/icons-material/Download'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import invoiceService from '../../services/invoiceService'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Generated', color: 'info' },
  paid: { label: 'Paid', color: 'success' },
}

const SalaryInvoicesPage = () => {
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
      const params = { status: statusFilter }
      if (search) params.search = search
      const response = await invoiceService.getSalaryInvoices(params)
      setInvoices(response.data)
    } catch (error) {
      toast.error('Failed to fetch salary invoices')
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
    navigate(`/invoices/salary/${selectedInvoice._id}`)
    handleMenuClose()
  }

  const handleMarkAsPaid = async () => {
    try {
      await invoiceService.updateSalaryInvoice(selectedInvoice._id, {
        status: 'paid',
        paidAmount: selectedInvoice.totalAmount,
      })
      toast.success('Invoice marked as paid')
      fetchInvoices()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update invoice')
    }
    handleMenuClose()
  }

  const handleDownload = () => {
    if (selectedInvoice.pdfUrl) {
      window.open(selectedInvoice.pdfUrl, '_blank')
    } else {
      toast.error('PDF not generated yet')
    }
    handleMenuClose()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
            Salary Invoices
          </h1>
          <p className="text-neutral-500">Generate and manage worker salary invoices</p>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/invoices/salary/generate')}
          className="btn-primary"
        >
          Generate Salary Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="premium-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <TextField
            placeholder="Search by invoice number or worker name..."
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
            {['all', 'draft', 'sent', 'paid'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'contained' : 'outlined'}
                onClick={() => setStatusFilter(status)}
                size="small"
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
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
            <AccountBalanceWalletIcon
              sx={{ fontSize: 64, opacity: 0.3 }}
              className="text-neutral-400"
            />
            <p className="mt-4 text-neutral-500">No salary invoices found</p>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/invoices/salary/generate')}
              className="btn-primary mt-4"
            >
              Generate First Salary Invoice
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
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    OT Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Net Pay
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
                    onClick={() => navigate(`/invoices/salary/${invoice._id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-success">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{invoice.workerName}</p>
                        <p className="text-sm text-neutral-500">{invoice.workerEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.salaryPeriod && (
                        <div className="text-sm">
                          <p>{formatDate(invoice.salaryPeriod.from, settings)}</p>
                          <p className="text-neutral-500">
                            to {formatDate(invoice.salaryPeriod.to, settings)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.salaryBreakdown?.presentDays || 0} /{' '}
                      {invoice.salaryBreakdown?.workingDaysInPeriod || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.salaryBreakdown?.overtimeHours || 0} hrs
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-success">
                      {formatCurrency(invoice.totalAmount, settings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Chip
                        label={STATUS_CONFIG[invoice.status]?.label || invoice.status}
                        color={STATUS_CONFIG[invoice.status]?.color || 'default'}
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
        <MenuItem onClick={handleDownload}>
          <DownloadIcon fontSize="small" className="mr-2" />
          Download PDF
        </MenuItem>
        {selectedInvoice?.status !== 'paid' && (
          <MenuItem onClick={handleMarkAsPaid} className="text-success">
            <CheckCircleIcon fontSize="small" className="mr-2" />
            Mark as Paid
          </MenuItem>
        )}
      </Menu>
    </div>
  )
}

export default SalaryInvoicesPage

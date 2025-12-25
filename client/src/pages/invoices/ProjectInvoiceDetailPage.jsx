import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import invoiceService from '../../services/invoiceService'
import InvoiceCommunicationButtons from '../../components/invoice/InvoiceCommunicationButtons'
import InvoiceAttachments from '../../components/invoice/InvoiceAttachments'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'info' },
  paid: { label: 'Paid', color: 'success' },
  overdue: { label: 'Overdue', color: 'error' },
  cancelled: { label: 'Cancelled', color: 'default' },
}

const InvoiceDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const response = await invoiceService.getProjectInvoiceById(id)
      setInvoice(response.data)
    } catch (error) {
      toast.error('Failed to fetch invoice')
      navigate('/invoices/project')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    try {
      await invoiceService.deleteProjectInvoice(id)
      toast.success('Invoice deleted successfully')
      navigate('/invoices/project')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete invoice')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!invoice) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/invoices/project')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-neutral-500">Invoice Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InvoiceCommunicationButtons invoice={invoice} onSent={fetchInvoice} />
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/invoices/project/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Invoice Information</h2>
              <Chip
                label={STATUS_CONFIG[invoice.status].label}
                color={STATUS_CONFIG[invoice.status].color}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Invoice Number</p>
                <p className="font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Invoice Date</p>
                <p className="font-semibold">
                  {formatDate(invoice.invoiceDate, settings)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Due Date</p>
                <p className="font-semibold">
                  {formatDate(invoice.dueDate, settings)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Status</p>
                <p className="font-semibold">{STATUS_CONFIG[invoice.status].label}</p>
              </div>
            </div>

            <Divider className="my-6" />

            {/* Client/Worker Details */}
            <div>
              <h3 className="font-semibold mb-4">
                {invoice.clientName ? 'Client Details' : 'Worker Details'}
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-neutral-500">Name</p>
                  <p className="font-medium">{invoice.clientName || invoice.workerName}</p>
                </div>
                {(invoice.clientEmail || invoice.workerEmail) && (
                  <div>
                    <p className="text-sm text-neutral-500">Email</p>
                    <p className="font-medium">{invoice.clientEmail || invoice.workerEmail}</p>
                  </div>
                )}
                {(invoice.clientPhone || invoice.workerPhone) && (
                  <div>
                    <p className="text-sm text-neutral-500">Phone</p>
                    <p className="font-medium">{invoice.clientPhone || invoice.workerPhone}</p>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <>
                <Divider className="my-6" />
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">{invoice.notes}</p>
                </div>
              </>
            )}
          </motion.div>

          {/* Line Items */}
          {invoice.items && invoice.items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="premium-card p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Line Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Description</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Quantity</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Rate</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(item.rate, settings)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(item.amount, settings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Attachments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="premium-card p-6"
          >
            <InvoiceAttachments invoice={invoice} onUpdate={fetchInvoice} />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="premium-card p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Total Amount</span>
                <span className="font-semibold">
                  {formatCurrency(invoice.totalAmount, settings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Paid Amount</span>
                <span className="font-semibold text-success">
                  {formatCurrency(invoice.paidAmount || 0, settings)}
                </span>
              </div>
              <Divider />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Balance Due</span>
                <span className="font-bold text-primary">
                  {formatCurrency(invoice.balanceAmount || invoice.totalAmount, settings)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Created By */}
          {invoice.createdBy && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="premium-card p-6"
            >
              <h3 className="font-semibold mb-3">Created By</h3>
              <div className="space-y-2">
                <p className="font-medium">{invoice.createdBy.name}</p>
                <p className="text-sm text-neutral-500">{invoice.createdBy.email}</p>
                <p className="text-xs text-neutral-400">
                  {new Date(invoice.createdAt).toLocaleString()}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetailPage

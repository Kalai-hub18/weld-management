import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Card from '@mui/material/Card'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PaymentIcon from '@mui/icons-material/Payment'
import invoiceService from '../../services/invoiceService'
import InvoiceCommunicationButtons from '../../components/invoice/InvoiceCommunicationButtons'
import InvoiceAttachments from '../../components/invoice/InvoiceAttachments'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Generated', color: 'info' },
  paid: { label: 'Paid', color: 'success' },
}

const SalaryInvoiceDetailPage = () => {
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
      const response = await invoiceService.getSalaryInvoiceById(id)
      setInvoice(response.data)
    } catch (error) {
      toast.error('Failed to fetch invoice')
      navigate('/invoices/salary')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    try {
      await invoiceService.updateSalaryInvoice(id, {
        status: 'paid',
        paidAmount: invoice.totalAmount,
      })
      toast.success('Invoice marked as paid')
      fetchInvoice()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update invoice')
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

  const breakdown = invoice.salaryBreakdown || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/invoices/salary')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-neutral-500">Salary Invoice Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InvoiceCommunicationButtons invoice={invoice} onSent={fetchInvoice} />
          {invoice.status !== 'paid' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<PaymentIcon />}
              onClick={handleMarkAsPaid}
            >
              Mark as Paid
            </Button>
          )}
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
                label={STATUS_CONFIG[invoice.status]?.label || invoice.status}
                color={STATUS_CONFIG[invoice.status]?.color || 'default'}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Invoice Number</p>
                <p className="font-semibold text-success">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Invoice Date</p>
                <p className="font-semibold">
                  {formatDate(invoice.invoiceDate, settings)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Salary Period</p>
                <p className="font-semibold">
                  {formatDate(invoice.salaryPeriod.from, settings)} -{' '}
                  {formatDate(invoice.salaryPeriod.to, settings)}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Status</p>
                <p className="font-semibold">{STATUS_CONFIG[invoice.status]?.label}</p>
              </div>
            </div>

            <Divider className="my-6" />

            {/* Worker Details */}
            <div>
              <h3 className="font-semibold mb-4">Worker Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-neutral-500">Name</p>
                  <p className="font-medium">{invoice.workerName}</p>
                </div>
                {invoice.workerEmail && (
                  <div>
                    <p className="text-sm text-neutral-500">Email</p>
                    <p className="font-medium">{invoice.workerEmail}</p>
                  </div>
                )}
                {invoice.workerPhone && (
                  <div>
                    <p className="text-sm text-neutral-500">Phone</p>
                    <p className="font-medium">{invoice.workerPhone}</p>
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

          {/* Attendance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Attendance Summary</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl bg-success/10">
                <CheckCircleIcon className="text-success" sx={{ fontSize: 40 }} />
                <p className="text-3xl font-bold mt-2 text-success">{breakdown.presentDays || 0}</p>
                <p className="text-sm text-neutral-500 mt-1">Present Days</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-error/10">
                <CancelIcon className="text-error" sx={{ fontSize: 40 }} />
                <p className="text-3xl font-bold mt-2 text-error">{breakdown.absentDays || 0}</p>
                <p className="text-sm text-neutral-500 mt-1">Absent Days</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-warning/10">
                <AccessTimeIcon className="text-warning" sx={{ fontSize: 40 }} />
                <p className="text-3xl font-bold mt-2 text-warning">{breakdown.overtimeHours || 0}</p>
                <p className="text-sm text-neutral-500 mt-1">OT Hours</p>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-neutral-500">
              Total Working Days: {breakdown.workingDaysInPeriod || 0}
            </div>
          </motion.div>

          {/* Salary Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="premium-card p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Salary Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  <tr>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">Base Salary ({breakdown.salaryType})</p>
                        <p className="text-sm text-neutral-500">
                          {formatCurrency(breakdown.baseSalaryRate, settings)} × {breakdown.presentDays} days
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(breakdown.baseSalaryAmount, settings)}
                    </td>
                  </tr>
                  {breakdown.overtimeHours > 0 && (
                    <tr>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">Overtime</p>
                          <p className="text-sm text-neutral-500">
                            {formatCurrency(breakdown.overtimeRate, settings)} × {breakdown.overtimeHours} hours
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-info">
                        +{formatCurrency(breakdown.overtimeAmount, settings)}
                      </td>
                    </tr>
                  )}
                  {breakdown.deductions > 0 && (
                    <tr>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">Deductions</p>
                          {breakdown.deductionNotes && (
                            <p className="text-sm text-neutral-500">{breakdown.deductionNotes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-error">
                        -{formatCurrency(breakdown.deductions, settings)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <td className="px-4 py-4 font-bold text-lg">Net Pay</td>
                    <td className="px-4 py-4 text-right font-bold text-lg text-success">
                      {formatCurrency(breakdown.netPay || invoice.totalAmount, settings)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>

          {/* Attachments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="premium-card p-6"
          >
            <InvoiceAttachments invoice={invoice} onUpdate={fetchInvoice} readOnly={invoice.status === 'paid'} />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="premium-card p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Total Amount</span>
                <span className="font-semibold">{formatCurrency(invoice.totalAmount, settings)}</span>
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
              <h3 className="font-semibold mb-3">Generated By</h3>
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

export default SalaryInvoiceDetailPage

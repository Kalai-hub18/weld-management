import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalculateIcon from '@mui/icons-material/Calculate'
import SaveIcon from '@mui/icons-material/Save'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import invoiceService from '../../services/invoiceService'
import workerService from '../../services/workerService'
import InvoiceAttachments from '../../components/invoice/InvoiceAttachments'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency } from '../../utils/formatters'
import { validateSalaryInvoiceData, roundCurrency } from '../../utils/validators'

const SalaryInvoiceGeneratePage = () => {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [workers, setWorkers] = useState([])
  const [periodSuggestions, setPeriodSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [calculation, setCalculation] = useState(null)
  const [formData, setFormData] = useState({
    workerId: '',
    periodFrom: '',
    periodTo: '',
    deductions: 0,
    deductionNotes: '',
    notes: '',
  })

  useEffect(() => {
    fetchWorkers()
    fetchPeriodSuggestions()
  }, [])

  const fetchWorkers = async () => {
    try {
      // ENTERPRISE RULE: Only active workers can have salary invoices generated
      const response = await workerService.getWorkers({ activeOnly: 'true' })
      setWorkers(response.data || [])
    } catch (error) {
      console.error('Failed to fetch workers:', error)
      toast.error('Failed to load workers. Please try again.')
    }
  }

  const fetchPeriodSuggestions = async () => {
    try {
      const response = await invoiceService.getSalaryPeriodSuggestions()
      setPeriodSuggestions(response.data || [])
    } catch (error) {
      console.error('Failed to fetch period suggestions')
    }
  }

  const handlePeriodSelect = (period) => {
    setFormData({
      ...formData,
      periodFrom: period.from,
      periodTo: period.to,
    })
  }

  const handleCalculate = async () => {
    // Validate form data
    const validation = validateSalaryInvoiceData(formData)
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error))
      return
    }

    setCalculating(true)
    try {
      const response = await invoiceService.calculateSalaryPreview({
        workerId: formData.workerId,
        periodFrom: formData.periodFrom,
        periodTo: formData.periodTo,
      })
      setCalculation(response.data)
      toast.success('Salary calculated successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to calculate salary')
    } finally {
      setCalculating(false)
    }
  }

  const handleGenerate = async () => {
    if (!calculation) {
      toast.error('Please calculate salary first')
      return
    }

    // Validate deductions
    if (formData.deductions < 0) {
      toast.error('Deductions cannot be negative')
      return
    }

    if (formData.deductions > (calculation.salaryBreakdown.baseSalaryAmount + calculation.salaryBreakdown.overtimeAmount)) {
      toast.error('Deductions cannot exceed total salary')
      return
    }

    setLoading(true)
    try {
      const response = await invoiceService.generateSalaryInvoice({
        workerId: formData.workerId,
        periodFrom: formData.periodFrom,
        periodTo: formData.periodTo,
        deductions: roundCurrency(formData.deductions),
        deductionNotes: formData.deductionNotes,
        notes: formData.notes,
      })
      toast.success('Salary invoice generated successfully')
      navigate(`/invoices/salary/${response.data._id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate invoice')
    } finally {
      setLoading(false)
    }
  }

  const netPay = calculation
    ? calculation.salaryBreakdown.baseSalaryAmount +
      calculation.salaryBreakdown.overtimeAmount -
      (formData.deductions || 0)
    : 0

  return (
    <div className="space-y-6">
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
            Generate Salary Invoice
          </h1>
          <p className="text-neutral-500">Calculate and generate worker salary invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Worker & Period Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Worker & Period</h2>
            
            <div className="space-y-4">
              <TextField
                select
                fullWidth
                label="Select Worker"
                value={formData.workerId}
                onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
                required
              >
                <MenuItem value="">Select a worker</MenuItem>
                {workers.map((worker) => (
                  <MenuItem key={worker._id} value={worker._id}>
                    {worker.name} - {worker.employeeId}
                  </MenuItem>
                ))}
              </TextField>

              {/* Period Suggestions */}
              <div>
                <p className="text-sm text-neutral-500 mb-2">Quick Select Period:</p>
                <div className="flex gap-2 flex-wrap">
                  {periodSuggestions.map((period) => (
                    <Button
                      key={period.label}
                      variant="outlined"
                      size="small"
                      onClick={() => handlePeriodSelect(period)}
                    >
                      {period.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={formData.periodFrom}
                  onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  fullWidth
                  label="To Date"
                  type="date"
                  value={formData.periodTo}
                  onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </div>

              <Button
                fullWidth
                variant="contained"
                startIcon={<CalculateIcon />}
                onClick={handleCalculate}
                disabled={calculating || !formData.workerId || !formData.periodFrom || !formData.periodTo}
                className="btn-primary"
              >
                {calculating ? 'Calculating...' : 'Calculate Salary'}
              </Button>
            </div>
          </motion.div>

          {/* Deductions & Notes */}
          {calculation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="premium-card p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Deductions & Notes</h2>
              
              <div className="space-y-4">
                <TextField
                  fullWidth
                  label="Deductions"
                  type="number"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                  inputProps={{ 
                    min: 0, 
                    max: calculation ? (calculation.salaryBreakdown.baseSalaryAmount + calculation.salaryBreakdown.overtimeAmount) : undefined,
                    step: 0.01 
                  }}
                  helperText="Enter any deductions (advance, loans, etc.)"
                  error={calculation && formData.deductions > (calculation.salaryBreakdown.baseSalaryAmount + calculation.salaryBreakdown.overtimeAmount)}
                />

                <TextField
                  fullWidth
                  label="Deduction Notes"
                  value={formData.deductionNotes}
                  onChange={(e) => setFormData({ ...formData, deductionNotes: e.target.value })}
                  placeholder="Reason for deductions..."
                />

                <TextField
                  fullWidth
                  label="Invoice Notes"
                  multiline
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes or remarks..."
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          {calculation ? (
            <>
              {/* Attendance Summary */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="premium-card p-6"
              >
                <h3 className="font-semibold mb-4">Attendance Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <CheckCircleIcon className="text-success" sx={{ fontSize: 32 }} />
                    <p className="text-2xl font-bold mt-2">
                      {calculation.salaryBreakdown.presentDays}
                    </p>
                    <p className="text-xs text-neutral-500">Present</p>
                  </div>
                  <div className="text-center">
                    <CancelIcon className="text-error" sx={{ fontSize: 32 }} />
                    <p className="text-2xl font-bold mt-2">
                      {calculation.salaryBreakdown.absentDays}
                    </p>
                    <p className="text-xs text-neutral-500">Absent</p>
                  </div>
                  <div className="text-center">
                    <AccessTimeIcon className="text-warning" sx={{ fontSize: 32 }} />
                    <p className="text-2xl font-bold mt-2">
                      {calculation.salaryBreakdown.overtimeHours}
                    </p>
                    <p className="text-xs text-neutral-500">OT Hours</p>
                  </div>
                </div>
              </motion.div>

              {/* Salary Breakdown */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="premium-card p-6"
              >
                <h3 className="font-semibold mb-4">Salary Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Salary Type
                    </span>
                    <span className="font-medium capitalize">
                      {calculation.salaryBreakdown.salaryType}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Base Salary Rate
                    </span>
                    <span className="font-medium">
                      {formatCurrency(calculation.salaryBreakdown.baseSalaryRate, settings)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Working Days
                    </span>
                    <span className="font-medium">
                      {calculation.salaryBreakdown.presentDays} / {calculation.salaryBreakdown.workingDaysInPeriod}
                    </span>
                  </div>
                  <Divider />
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Base Salary
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(calculation.salaryBreakdown.baseSalaryAmount, settings)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Overtime ({calculation.salaryBreakdown.overtimeHours} hrs)
                    </span>
                    <span className="font-semibold text-info">
                      +{formatCurrency(calculation.salaryBreakdown.overtimeAmount, settings)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Deductions
                    </span>
                    <span className="font-semibold text-error">
                      -{formatCurrency(formData.deductions || 0, settings)}
                    </span>
                  </div>
                  <Divider />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Net Pay</span>
                    <span className="font-bold text-success">
                      {formatCurrency(netPay, settings)}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Generate Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleGenerate}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </>
          ) : (
            <Card className="premium-card">
              <CardContent className="text-center py-8">
                <CalculateIcon sx={{ fontSize: 64, opacity: 0.3 }} className="text-neutral-400" />
                <p className="mt-4 text-neutral-500">
                  Select worker and period, then click Calculate to see salary breakdown
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalaryInvoiceGeneratePage

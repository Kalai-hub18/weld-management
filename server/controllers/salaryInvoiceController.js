import Invoice from '../models/Invoice.js'
import User from '../models/User.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'
import {
  calculateSalaryInvoice,
  validateSalaryPeriod,
  getSuggestedSalaryPeriods,
} from '../utils/salaryInvoiceCalculator.js'

// @desc    Get all salary invoices
// @route   GET /api/invoices/salary
// @access  Private
export const getSalaryInvoices = asyncHandler(async (req, res) => {
  const { status, search, workerId, limit, page = 1 } = req.query

  const query = { invoiceType: 'salary' }

  if (status && status !== 'all') {
    query.status = status
  }

  if (workerId) {
    query.workerId = workerId
  }

  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { workerName: { $regex: search, $options: 'i' } },
    ]
  }

  const pageSize = limit ? parseInt(limit) : 50
  const skip = (parseInt(page) - 1) * pageSize

  const invoices = await Invoice.find(query)
    .populate('workerId', 'name email phone employeeId')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(skip)

  const total = await Invoice.countDocuments(query)

  res.json({
    success: true,
    data: invoices,
    pagination: {
      page: parseInt(page),
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  })
})

// @desc    Get single salary invoice
// @route   GET /api/invoices/salary/:id
// @access  Private
export const getSalaryInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    invoiceType: 'salary',
  })
    .populate('workerId', 'name email phone employeeId dailySalary monthlySalary')
    .populate('createdBy', 'name email')

  if (!invoice) {
    res.status(404)
    throw new Error('Salary invoice not found')
  }

  res.json({
    success: true,
    data: invoice,
  })
})

// @desc    Calculate salary preview (before generating invoice)
// @route   POST /api/invoices/salary/calculate
// @access  Private/Admin
export const calculateSalaryPreview = asyncHandler(async (req, res) => {
  const { workerId, periodFrom, periodTo } = req.body

  if (!workerId || !periodFrom || !periodTo) {
    res.status(400)
    throw new Error('Worker ID, period from, and period to are required')
  }

  // Verify worker exists
  const worker = await User.findById(workerId)
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  // Validate period
  const validation = validateSalaryPeriod(periodFrom, periodTo)
  if (!validation.valid) {
    res.status(400)
    throw new Error(validation.errors.join(', '))
  }

  // ENTERPRISE RULE: Date-based salary calculation validation
  // If worker is inactive, check if salary period overlaps with inactive date
  if (worker.status === 'inactive' && worker.inactiveFrom) {
    const inactiveFromDate = new Date(worker.inactiveFrom)
    const periodFromDate = new Date(periodFrom)
    const periodToDate = new Date(periodTo)
    
    inactiveFromDate.setHours(0, 0, 0, 0)
    periodFromDate.setHours(0, 0, 0, 0)
    periodToDate.setHours(0, 0, 0, 0)
    
    // If period starts on or after inactive date, reject
    if (periodFromDate >= inactiveFromDate) {
      res.status(400)
      throw new Error(`Cannot calculate salary for period starting ${periodFrom}. Worker became inactive from ${inactiveFromDate.toISOString().split('T')[0]}.`)
    }
    
    // If period includes inactive date, warn but allow (will calculate only up to inactive date)
    if (periodToDate >= inactiveFromDate) {
      // Note: Salary calculation will automatically exclude attendance after inactiveFrom
      console.log(`Warning: Salary period includes inactive date. Calculation will only include attendance before ${inactiveFromDate.toISOString().split('T')[0]}`)
    }
  }

  // Calculate salary (calculator will respect inactiveFrom date)
  const calculation = await calculateSalaryInvoice(workerId, periodFrom, periodTo)

  res.json({
    success: true,
    data: calculation,
    message: 'Salary calculated successfully',
  })
})

// @desc    Generate salary invoice
// @route   POST /api/invoices/salary
// @access  Private/Admin
export const generateSalaryInvoice = asyncHandler(async (req, res) => {
  const { workerId, periodFrom, periodTo, deductions, deductionNotes, notes } = req.body

  if (!workerId || !periodFrom || !periodTo) {
    res.status(400)
    throw new Error('Worker ID, period from, and period to are required')
  }

  // Verify worker exists
  const worker = await User.findById(workerId)
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  // Validate period
  const validation = validateSalaryPeriod(periodFrom, periodTo)
  if (!validation.valid) {
    res.status(400)
    throw new Error(validation.errors.join(', '))
  }

  // ENTERPRISE RULE: Date-based salary invoice validation
  // If worker is inactive, check if salary period overlaps with inactive date
  if (worker.status === 'inactive' && worker.inactiveFrom) {
    const inactiveFromDate = new Date(worker.inactiveFrom)
    const periodFromDate = new Date(periodFrom)
    const periodToDate = new Date(periodTo)
    
    inactiveFromDate.setHours(0, 0, 0, 0)
    periodFromDate.setHours(0, 0, 0, 0)
    periodToDate.setHours(0, 0, 0, 0)
    
    // If period starts on or after inactive date, reject
    if (periodFromDate >= inactiveFromDate) {
      res.status(400)
      throw new Error(`Cannot generate salary invoice for period starting ${periodFrom}. Worker became inactive from ${inactiveFromDate.toISOString().split('T')[0]}.`)
    }
    
    // If period includes inactive date, warn but allow (will calculate only up to inactive date)
    if (periodToDate >= inactiveFromDate) {
      console.log(`Warning: Salary period includes inactive date. Invoice will only include attendance before ${inactiveFromDate.toISOString().split('T')[0]}`)
    }
  }

  // Calculate salary (calculator will respect inactiveFrom date)
  const calculation = await calculateSalaryInvoice(workerId, periodFrom, periodTo)

  // Apply custom deductions if provided
  let finalDeductions = calculation.salaryBreakdown.deductions
  let finalNetPay = calculation.salaryBreakdown.netPay

  if (deductions !== undefined && deductions >= 0) {
    finalDeductions = deductions
    finalNetPay =
      calculation.salaryBreakdown.baseSalaryAmount +
      calculation.salaryBreakdown.overtimeAmount -
      deductions
  }

  // Create invoice
  const invoice = await Invoice.create({
    invoiceType: 'salary',
    workerId: calculation.worker.id,
    workerName: calculation.worker.name,
    workerEmail: calculation.worker.email,
    workerPhone: calculation.worker.phone,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    salaryPeriod: {
      from: periodFrom,
      to: periodTo,
    },
    salaryBreakdown: {
      ...calculation.salaryBreakdown,
      deductions: finalDeductions,
      deductionNotes: deductionNotes || '',
      netPay: finalNetPay,
    },
    totalAmount: finalNetPay,
    notes,
    status: 'draft',
    createdBy: req.user._id,
  })

  res.status(201).json({
    success: true,
    data: invoice,
    message: 'Salary invoice generated successfully',
  })
})

// @desc    Update salary invoice (mainly for payment status)
// @route   PUT /api/invoices/salary/:id
// @access  Private/Admin
export const updateSalaryInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    invoiceType: 'salary',
  })

  if (!invoice) {
    res.status(404)
    throw new Error('Salary invoice not found')
  }

  const { status, paidAmount, notes, deductions, deductionNotes } = req.body

  // Update fields
  if (status) invoice.status = status
  if (paidAmount !== undefined) invoice.paidAmount = paidAmount
  if (notes !== undefined) invoice.notes = notes

  // Allow updating deductions (recalculate net pay)
  if (deductions !== undefined && invoice.salaryBreakdown) {
    invoice.salaryBreakdown.deductions = deductions
    invoice.salaryBreakdown.deductionNotes = deductionNotes || invoice.salaryBreakdown.deductionNotes
    invoice.salaryBreakdown.netPay =
      invoice.salaryBreakdown.baseSalaryAmount +
      invoice.salaryBreakdown.overtimeAmount -
      deductions
    invoice.totalAmount = invoice.salaryBreakdown.netPay
  }

  await invoice.save()

  res.json({
    success: true,
    data: invoice,
    message: 'Salary invoice updated successfully',
  })
})

// @desc    Delete salary invoice
// @route   DELETE /api/invoices/salary/:id
// @access  Private/Admin
export const deleteSalaryInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    invoiceType: 'salary',
  })

  if (!invoice) {
    res.status(404)
    throw new Error('Salary invoice not found')
  }

  await invoice.deleteOne()

  res.json({
    success: true,
    message: 'Salary invoice deleted successfully',
  })
})

// @desc    Get suggested salary periods
// @route   GET /api/invoices/salary/periods/suggestions
// @access  Private
export const getSalaryPeriodSuggestions = asyncHandler(async (req, res) => {
  const suggestions = getSuggestedSalaryPeriods()

  res.json({
    success: true,
    data: suggestions,
  })
})

// @desc    Get worker salary summary for a period
// @route   GET /api/invoices/salary/worker/:workerId/summary
// @access  Private
export const getWorkerSalarySummary = asyncHandler(async (req, res) => {
  const { workerId } = req.params
  const { periodFrom, periodTo } = req.query

  if (!periodFrom || !periodTo) {
    res.status(400)
    throw new Error('Period from and to are required')
  }

  // Get worker details
  const worker = await User.findById(workerId)
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  // Get existing invoices for this worker in this period
  const existingInvoices = await Invoice.find({
    invoiceType: 'salary',
    workerId,
    'salaryPeriod.from': { $lte: new Date(periodTo) },
    'salaryPeriod.to': { $gte: new Date(periodFrom) },
  })

  // Calculate salary for the period
  const calculation = await calculateSalaryInvoice(workerId, periodFrom, periodTo)

  res.json({
    success: true,
    data: {
      worker: calculation.worker,
      calculation: calculation.salaryBreakdown,
      period: calculation.period,
      existingInvoices: existingInvoices.length,
      hasOverlap: existingInvoices.length > 0,
    },
  })
})

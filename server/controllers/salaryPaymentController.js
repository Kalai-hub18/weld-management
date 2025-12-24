import User from '../models/User.js'
import SalaryPayment from '../models/SalaryPayment.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'
import { calculateSalary } from '../utils/salary/calculateSalary.js'
import { recomputeAdvanceLedger } from '../utils/salary/recomputeAdvanceLedger.js'

// POST /api/salary/preview
export const previewSalaryPayment = asyncHandler(async (req, res) => {
  const { workerId, type, daysPaid, amount, payDate, note } = req.body

  const worker = await User.findOne({ _id: workerId, role: 'Worker' })
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  const calc = calculateSalary(worker, { type, daysPaid, amount })

  const currentAdvanceBalance = Number(worker.advanceBalance || 0)
  const projectedAdvanceBalance =
    type === 'advance'
      ? currentAdvanceBalance + calc.netAmount
      : Math.max(0, currentAdvanceBalance - calc.advanceDeducted)

  res.json({
    success: true,
    data: {
      workerId,
      type,
      daysPaid: daysPaid ?? null,
      amount: amount ?? null,
      payDate: payDate || new Date().toISOString(),
      note: note || '',
      worker: {
        name: worker.name,
        employeeId: worker.employeeId,
        salaryMonthly: worker.salaryMonthly || 0,
        salaryDaily: worker.salaryDaily || 0,
        advanceBalance: currentAdvanceBalance,
      },
      calculation: calc,
      projected: {
        advanceBalance: projectedAdvanceBalance,
      },
      ledger: {
        advanceBalanceBefore: currentAdvanceBalance,
        advanceBalanceAfter: projectedAdvanceBalance,
      },
    },
    message: 'Salary payment preview calculated',
  })
})

// POST /api/salary/pay
export const paySalary = asyncHandler(async (req, res) => {
  const { workerId, type, daysPaid, amount, payDate, note } = req.body

  const worker = await User.findOne({ _id: workerId, role: 'Worker' })
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  const calc = calculateSalary(worker, { type, daysPaid, amount })
  const currentAdvanceBalance = Number(worker.advanceBalance || 0)

  // Update advance balance
  let newAdvanceBalance = currentAdvanceBalance
  if (type === 'advance') {
    newAdvanceBalance = currentAdvanceBalance + calc.netAmount
  } else {
    newAdvanceBalance = Math.max(0, currentAdvanceBalance - calc.advanceDeducted)
  }

  worker.advanceBalance = newAdvanceBalance
  await worker.save()

  const payment = await SalaryPayment.create({
    workerId,
    type,
    payDate: payDate ? new Date(payDate) : new Date(),
    daysPaid: type === 'partial' ? daysPaid : null,
    amountGross: calc.amountGross,
    advanceDeducted: calc.advanceDeducted,
    netAmount: calc.netAmount,
    advanceBalanceBefore: currentAdvanceBalance,
    advanceBalanceAfter: newAdvanceBalance,
    note: note || '',
    createdBy: req.user._id,
  })

  res.status(201).json({
    success: true,
    data: {
      payment,
      worker: {
        _id: worker._id,
        name: worker.name,
        employeeId: worker.employeeId,
        advanceBalance: worker.advanceBalance,
      },
    },
    message: 'Salary payment recorded successfully',
  })
})

// GET /api/salary/history/:workerId
export const getSalaryHistory = asyncHandler(async (req, res) => {
  const { workerId } = req.params
  const { page = 1, limit = 50 } = req.query

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [records, total] = await Promise.all([
    SalaryPayment.find({ workerId, isVoided: false })
      .populate('createdBy', 'name')
      .sort({ payDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    SalaryPayment.countDocuments({ workerId, isVoided: false }),
  ])

  res.json({
    success: true,
    data: records,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
    message: 'Salary payment history loaded',
  })
})

// PUT /api/salary/payments/:id
// Allowed updates: payDate, note (amounts/types are immutable for audit)
export const updateSalaryPayment = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { payDate, note } = req.body

  const payment = await SalaryPayment.findById(id)
  if (!payment) {
    res.status(404)
    throw new Error('Salary payment not found')
  }
  if (payment.isVoided) {
    res.status(400)
    throw new Error('Cannot update a voided payment')
  }

  if (payDate !== undefined) payment.payDate = new Date(payDate)
  if (note !== undefined) payment.note = note
  await payment.save()

  // If date changed, recompute ledger ordering impacts
  await recomputeAdvanceLedger(payment.workerId)

  res.json({
    success: true,
    data: payment,
    message: 'Salary payment updated',
  })
})

// DELETE /api/salary/payments/:id  (soft delete: void)
export const voidSalaryPayment = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { reason } = req.body || {}

  const payment = await SalaryPayment.findById(id)
  if (!payment) {
    res.status(404)
    throw new Error('Salary payment not found')
  }
  if (payment.isVoided) {
    res.status(400)
    throw new Error('Payment already voided')
  }

  payment.isVoided = true
  payment.voidReason = reason || ''
  payment.voidedAt = new Date()
  payment.voidedBy = req.user._id
  await payment.save()

  await recomputeAdvanceLedger(payment.workerId)

  res.json({
    success: true,
    data: { _id: payment._id, isVoided: true },
    message: 'Salary payment voided',
  })
})



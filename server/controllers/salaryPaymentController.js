import User from '../models/User.js'
import SalaryPayment from '../models/SalaryPayment.js'
import Salary from '../models/Salary.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'
import { calculateSalary } from '../utils/salary/calculateSalary.js'
import { recomputeAdvanceLedger } from '../utils/salary/recomputeAdvanceLedger.js'

// POST /api/salary/preview
export const previewSalaryPayment = asyncHandler(async (req, res) => {
  const { workerId, type, daysPaid, amount, dailyPayments, payDate, note } = req.body

  const worker = await User.findOne({ _id: workerId, role: 'Worker' })
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  const calc = calculateSalary(worker, { type, daysPaid, amount, dailyPayments })

  // For preview, we simulate that dailyPayments are effectively advances that increase the balance immediately
  const dailyPaymentsTotal = Array.isArray(dailyPayments)
    ? dailyPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    : 0

  const currentAdvanceBalance = Number(worker.advanceBalance || 0)

  // Projected balance logic:
  // If type is 'advance' or 'daily', balance increases by amount
  // If type is 'full', balance decreases by advanceDeducted, BUT daily payments increase it effectively (as they are new debts being paid off immediately? No, wait.)
  // Actually, 'daily' payments are just ADVANCE payments made on specific dates.
  // When we pay 'full' with a list of 'daily' payments:
  // 1. We act as if those daily payments happen -> Advance Balance INCREASES.
  // 2. Then we pay the full salary -> Advance Balance DECREASES by (Old Balance + New Daily Payments).
  // So net effect on Advance Balance is: 0 (if fully deducted).

  let projectedAdvanceBalance = currentAdvanceBalance

  if (type === 'advance' || type === 'daily') {
    projectedAdvanceBalance += calc.netAmount
  } else if (type === 'full') {
    // In full payment, we deduct existing advance AND the new daily payments.
    // So effectively we are clearing the old balance and paying out the rest after subtracting daily payments.
    // The daily payments are fleeting: they are added then immediately deducted.
    // So we just look at what happens to the OLD balance.
    // The OLD balance is reduced by advanceDeducted.
    projectedAdvanceBalance = Math.max(0, currentAdvanceBalance - calc.advanceDeducted)
  } else {
    projectedAdvanceBalance = Math.max(0, currentAdvanceBalance - calc.advanceDeducted)
  }

  res.json({
    success: true,
    data: {
      workerId,
      type,
      daysPaid: daysPaid ?? null,
      amount: amount ?? null,
      dailyPayments: dailyPayments ?? [],
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
  const { workerId, type, daysPaid, amount, dailyPayments, payDate, note } = req.body

  const worker = await User.findOne({ _id: workerId, role: 'Worker' })
  if (!worker) {
    res.status(404)
    throw new Error('Worker not found')
  }

  // Calculate salary details
  // dailyPayments are passed here. In 'calculateSalary', they are summed and treated as 'dailyPaymentsTotal'.
  // We want to deduct this total from the 'rest' of the cash to pay, so that 'netAmount' is the remaining cash.
  // HOWEVER, for the RECORD, we want to record the FULL amount as the "Payment Transaction" for the month.
  // 
  // Let's analyze:
  // If Worker has earned 20,000.
  // We pay 1000 via daily payments (cash earlier).
  // Now we pay 'full'.
  // calculateSalary returns: amountGross: 20000, dailyPaymentsTotal: 1000, netAmount: 19000.
  // The 'SalaryPayment' record is the receipt for this transaction.
  // If we record '19000', then we only account for 19000. The 1000 is lost if we don't have separate records.
  // 
  // User wants "View" button to show the 1000 details inside this 20000/19000 record.
  // So this record MUST represent the TOTAL settlment.
  // 
  // If we set `amountGross` = 20000. `advanceDeducted` = 0. `dailyDeduction` = 1000. `netAmount` = 19000.
  // This accurately reflects: "We settled 20000 worth of salary. 1000 was already paid (daily). 19000 paid now."
  // 
  // So:
  // 1. We keep 'dailyPayments' in calculation to get 'dailyPaymentsTotal'.
  // 2. We DO NOT create separate records.
  // 3. We save 'dailyPayments' into 'dailyPaymentDetails' of this record.
  // 4. We DO NOT touch advance balance for daily payments (since they are not advances, they are just early payments).
  //    Wait, previous logic treated them as advances.
  //    If we stop treating them as advances, we simplfy things.
  //    "Advance Balance" is for LOANS.
  //    "Daily Payment" is partial salary.
  //    So yes, we should NOT touch advance balance for these unless they are explicitly 'type=advance'.
  // 
  // 5. 'Full' payment logic:
  //    Deduct existing Advance Balance (loans) as usual.
  //    Deduct Daily Payments (early salary) as 'dailyDeduction'.
  //    Remaining is 'netAmount' (cash now).

  const calc = calculateSalary(worker, { type, daysPaid, amount, dailyPayments })
  const currentAdvanceBalance = Number(worker.advanceBalance || 0)

  // Update advance balance based on the main payment (deducting advance)
  let newAdvanceBalance = currentAdvanceBalance

  // Logic for advance deduction from Advance Balance
  if (type === 'advance') {
    // This is a NEW advance given
    newAdvanceBalance = currentAdvanceBalance + calc.netAmount
  } else if (type === 'daily') {
    // Standalone daily payment (if used outside of full pay flow). 
    // If user uses "Daily" type explicitly (not as part of Full), it acts as advance?
    // Current UI "Daily Payment" modal sends type='daily'.
    // Wait, the "Daily Payment List" in the modal is what we are embedding.
    // If the USER clicks "Pay Daily" button separately, that's different.
    // But here we are in 'paySalary' being called from the Modal which submits 'full' with 'dailyPayments' array.

    // If 'dailyPayments' array is present, we are in the "Full Pay with Daily Deductions" flow.
    // So 'type' is likely 'full' or 'partial'.

    if (calc.advanceDeducted > 0) {
      newAdvanceBalance = Math.max(0, currentAdvanceBalance - calc.advanceDeducted)
    }
  } else {
    // Full/Partial/Adhoc
    if (calc.advanceDeducted > 0) {
      newAdvanceBalance = Math.max(0, currentAdvanceBalance - calc.advanceDeducted)
    }
  }

  // Update Worker's Advance Balance
  if (newAdvanceBalance !== currentAdvanceBalance) {
    worker.advanceBalance = newAdvanceBalance
    await worker.save()
  }

  // Prepare Daily Payment Details
  const dailyDetails = Array.isArray(dailyPayments) ? dailyPayments.map(d => ({
    date: d.date,
    amount: Number(d.amount)
  })).filter(d => d.amount > 0) : []

  // Create SalaryPayment Record
  const payment = await SalaryPayment.create({
    workerId,
    type,
    payDate: payDate ? new Date(payDate) : new Date(),
    daysPaid: type === 'partial' ? daysPaid : null,
    amountGross: calc.amountGross, // e.g. 18000
    advanceDeducted: calc.advanceDeducted, // Loan deduction
    dailyDeduction: calc.dailyPaymentsTotal, // Early payments
    dailyPaymentDetails: dailyDetails, // Store details
    netAmount: calc.netAmount, // Cash paid now
    advanceBalanceBefore: currentAdvanceBalance,
    advanceBalanceAfter: newAdvanceBalance,
    note: note || '',
    createdBy: req.user._id,
  })

  // SYNC WITH SALARY MODEL (Fix for UI display)
  // Determine Month (YYYY-MM)
  const pDate = new Date(payment.payDate)
  const monthStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`

  // UPSERT Salary Record
  // We want to ensure specific month's salary record exists and reflects the payment.
  // If we just paid "Full", we usually expect this covers the whole month.

  if (type === 'full') {
    let salaryDoc = await Salary.findOne({ worker: workerId, month: monthStr })

    if (!salaryDoc) {
      // Create new Salary doc
      salaryDoc = new Salary({
        worker: workerId,
        month: monthStr,
        baseSalary: worker.salaryMonthly || 0, // Fallback
        // usage of 'calc' might give better insight if it returned base used? 
        // But worker.salaryMonthly is the standard.
      })
    }

    // Update paid amount. 
    // Note: If multiple 'full' payments are made (weird, but possible), we accumulate?
    // Usually 'full' implies one-shot. But let's be safe and accumulate 'paidAmount'.
    // Actually, if we just paid 18000 gross, that is the value clearing the salary liability.
    // 'netAmount' is cash. 'dailyDeduction' + 'advanceDeducted' are also "paid" components (in kind/past).
    // So 'paidAmount' in Salary model should reflect 'amountGross' effectively?
    // 'paidAmount' in Salary model usually drives 'remainingAmount'.
    // Expenses (Deductions) in Salary model are 'deductions'.
    // 
    // Let's see Salary.js model:
    // netSalary = base + overtime + bonus - deductions
    // paidAmount = what has been paid.
    // remaining = netSalary - paidAmount.
    // 
    // If 'dailyDeduction' (1000) and 'advanceDeducted' (500) are 'deductions' from the Pay, 
    // are they 'Salary Deductions' (like Tax)? NO.
    // They are 'Payment Deductions'.
    // 
    // So, 'netSalary' should represent the total worker EARNINGS (e.g. 18000).
    // 'paidAmount' should match 18000 if fully paid.
    // 
    // So we add 'amountGross' to 'paidAmount'.

    // Check if we are updating an existing paid amount or setting it.
    // Simple approach: Add to existing.
    salaryDoc.paidAmount = (salaryDoc.paidAmount || 0) + payment.amountGross

    // Also update baseSalary if it looks like we are paying based on a higher salary setting?
    // Or just trust the model default. For now, trust existing or newly initialized.

    // Save (triggers status update)
    await salaryDoc.save()
  }

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



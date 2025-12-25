export function calculateSalary(worker, opts) {
  const type = opts?.type
  if (!type) throw new Error('type is required')

  const advanceBalance = Number(worker?.advanceBalance || 0)
  const salaryMonthly = Number(worker?.salaryMonthly || 0)
  const salaryDaily = Number(worker?.salaryDaily || 0)

  const coerceNumber = (x) => {
    const n = Number(x)
    return Number.isFinite(n) ? n : 0
  }

  const daysInMonth = coerceNumber(opts?.daysInMonth || 30) || 30
  const requestedDays = coerceNumber(opts?.daysPaid)
  const requestedAmount = coerceNumber(opts?.amount)
  const dailyPayments = Array.isArray(opts?.dailyPayments) ? opts.dailyPayments : []
  const dailyPaymentsTotal = dailyPayments.reduce((acc, curr) => acc + coerceNumber(curr.amount), 0)

  let amountGross = 0
  let advanceDeducted = 0
  let netAmount = 0

  if (type === 'full') {
    amountGross = salaryMonthly
    // Calculate total advance including new daily payments (simulated as already paid)
    // Actually, daily payments are NEW deductions we are about to make.
    // So we treat them as additional advance to be deducted.
    advanceDeducted = Math.min(advanceBalance, amountGross)

    // Total deduction = Existing Advance Deducted + New Daily Payments
    // We deduct daily payments from the remaining amount
    const remainingAfterAdvance = amountGross - advanceDeducted
    const dailyDeduction = Math.min(dailyPaymentsTotal, remainingAfterAdvance)

    // We don't change advanceDeducted (that tracks historical advance), 
    // but the dailyPayments will be recorded as separate 'daily' (advance) payments.
    // The net pay is what remains.
    netAmount = Math.max(0, remainingAfterAdvance - dailyPaymentsTotal)
  } else if (type === 'partial') {
    if (!requestedDays || requestedDays <= 0) throw new Error('daysPaid must be > 0 for partial')
    const daily = salaryDaily > 0 ? salaryDaily : (salaryMonthly > 0 ? salaryMonthly / daysInMonth : 0)
    amountGross = daily * requestedDays
    advanceDeducted = Math.min(advanceBalance, amountGross)
    netAmount = amountGross - advanceDeducted
  } else if (type === 'advance' || type === 'daily') {
    if (!requestedAmount || requestedAmount <= 0) throw new Error('amount must be > 0 for advance/daily')
    amountGross = requestedAmount
    advanceDeducted = 0
    netAmount = amountGross
  } else if (type === 'adhoc') {
    if (!requestedAmount || requestedAmount <= 0) throw new Error('amount must be > 0 for adhoc')
    amountGross = requestedAmount
    advanceDeducted = Math.min(advanceBalance, amountGross)
    netAmount = amountGross - advanceDeducted
  } else {
    throw new Error(`Unsupported type: ${type}`)
  }

  // Normalize rounding (money)
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
  return {
    amountGross: round2(amountGross),
    advanceDeducted: round2(advanceDeducted),
    netAmount: round2(netAmount),
    dailyPaymentsTotal: round2(dailyPaymentsTotal),
  }
}



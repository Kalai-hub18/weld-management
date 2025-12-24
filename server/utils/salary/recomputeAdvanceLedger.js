import SalaryPayment from '../../models/SalaryPayment.js'
import User from '../../models/User.js'

/**
 * Recompute date-wise advance ledger snapshots for a worker.
 * - Uses stored payment numbers (amountGross/advanceDeducted/netAmount) as immutable facts.
 * - Orders by payDate asc, then createdAt asc for stable sequencing.
 * - Writes advanceBalanceBefore/After for each non-voided payment.
 * - Updates User.advanceBalance = latest balance.
 */
export async function recomputeAdvanceLedger(workerId) {
  const worker = await User.findById(workerId)
  if (!worker) throw new Error('Worker not found')

  const payments = await SalaryPayment.find({ workerId, isVoided: false })
    .sort({ payDate: 1, createdAt: 1 })

  let balance = 0
  const ops = []

  for (const p of payments) {
    const before = balance
    if (p.type === 'advance') {
      balance = before + Number(p.netAmount || 0)
    } else {
      balance = Math.max(0, before - Number(p.advanceDeducted || 0))
    }
    const after = balance

    // Only update if changed (reduces writes)
    if (p.advanceBalanceBefore !== before || p.advanceBalanceAfter !== after) {
      ops.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { advanceBalanceBefore: before, advanceBalanceAfter: after } },
        },
      })
    }
  }

  if (ops.length) {
    await SalaryPayment.bulkWrite(ops)
  }

  worker.advanceBalance = balance
  await worker.save()

  return { workerId, advanceBalance: balance, updatedPayments: ops.length }
}



import mongoose from 'mongoose'

const salaryPaymentSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    payDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      enum: ['full', 'partial', 'advance', 'adhoc', 'daily'],
      required: true,
      index: true,
    },
    daysPaid: {
      type: Number,
      default: null,
      min: [0, 'Days paid cannot be negative'],
    },
    amountGross: {
      type: Number,
      required: true,
      min: [0, 'Gross amount cannot be negative'],
    },
    advanceDeducted: {
      type: Number,
      default: 0,
      min: [0, 'Advance deducted cannot be negative'],
    },
    dailyDeduction: {
      type: Number,
      default: 0,
      min: [0, 'Daily deduction cannot be negative'],
    },
    dailyPaymentDetails: [{
      date: Date,
      amount: Number,
    }],
    overtimeDeduction: {
      type: Number,
      default: 0,
      min: [0, 'Overtime deduction cannot be negative'],
    },
    overtimePaymentDetails: [{
      date: Date,
      amount: Number,
      hours: Number,
    }],
    netAmount: {
      type: Number,
      required: true,
      min: [0, 'Net amount cannot be negative'],
    },
    // Snapshot advance balance at the time of this payment (date-wise maintenance)
    advanceBalanceBefore: {
      type: Number,
      default: 0,
      min: [0, 'Advance balance before cannot be negative'],
    },
    advanceBalanceAfter: {
      type: Number,
      default: 0,
      min: [0, 'Advance balance after cannot be negative'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Soft delete / audit
    isVoided: {
      type: Boolean,
      default: false,
      index: true,
    },
    voidReason: {
      type: String,
      trim: true,
      default: '',
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
)

salaryPaymentSchema.index({ workerId: 1, payDate: -1 })

const SalaryPayment = mongoose.model('SalaryPayment', salaryPaymentSchema)

export default SalaryPayment



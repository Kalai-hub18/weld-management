import mongoose from 'mongoose'

const salarySchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker is required'],
    },
    month: {
      type: String, // Format: "YYYY-MM"
      required: [true, 'Month is required'],
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: [0, 'Base salary cannot be negative'],
    },
    overtime: {
      type: Number,
      default: 0,
      min: [0, 'Overtime cannot be negative'],
    },
    bonus: {
      type: Number,
      default: 0,
      min: [0, 'Bonus cannot be negative'],
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative'],
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending',
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    paidDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank-transfer', 'check', 'other'],
    },
    hoursWorked: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    deductionDetails: [{
      type: {
        type: String,
        enum: ['tax', 'insurance', 'loan', 'advance', 'other'],
      },
      amount: Number,
      description: String,
    }],
    bonusDetails: [{
      type: {
        type: String,
        enum: ['performance', 'project', 'holiday', 'other'],
      },
      amount: Number,
      description: String,
    }],
    notes: {
      type: String,
      trim: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

// Calculate net salary before saving
salarySchema.pre('save', function (next) {
  this.netSalary = this.baseSalary + (this.overtime || 0) + (this.bonus || 0) - (this.deductions || 0)

  // Update status based on payment
  if (this.paidAmount >= this.netSalary) {
    this.status = 'paid'
  } else if (this.paidAmount > 0) {
    this.status = 'partial'
  }

  next()
})

// Virtual for remaining amount
salarySchema.virtual('remainingAmount').get(function () {
  return this.netSalary - this.paidAmount
})

// Enable virtuals in JSON
salarySchema.set('toJSON', { virtuals: true })
salarySchema.set('toObject', { virtuals: true })

// Compound index for worker + month (one salary record per worker per month)
salarySchema.index({ worker: 1, month: 1 }, { unique: true })
salarySchema.index({ status: 1 })
salarySchema.index({ month: 1 })

const Salary = mongoose.model('Salary', salarySchema)

export default Salary

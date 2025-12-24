import mongoose from 'mongoose'

const invoiceSchema = new mongoose.Schema(
  {
    invoiceType: {
      type: String,
      enum: ['project', 'salary'],
      required: true,
      default: 'project',
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    // Project Invoice specific fields
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    clientName: String,
    clientEmail: String,
    clientPhone: String,
    clientAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    
    // Salary Invoice specific fields
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    workerName: String,
    workerEmail: String,
    workerPhone: String,
    salaryPeriod: {
      from: Date,
      to: Date,
    },
    salaryBreakdown: {
      salaryType: {
        type: String,
        enum: ['daily', 'monthly'],
      },
      baseSalaryRate: Number,
      workingDaysInPeriod: Number,
      presentDays: Number,
      absentDays: Number,
      halfDays: Number,
      overtimeHours: Number,
      overtimeRate: Number,
      overtimeAmount: Number,
      baseSalaryAmount: Number,
      deductions: Number,
      deductionNotes: String,
      netPay: Number,
    },
    // Financial details
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    
    // Project Invoice line items
    items: [
      {
        description: String,
        quantity: Number,
        rate: Number,
        amount: Number,
      },
    ],
    subtotal: Number,
    taxRate: Number,
    taxAmount: Number,
    discount: Number,
    // PDF and attachments
    pdfUrl: String,
    pdfGeneratedAt: Date,
    attachments: [
      {
        type: {
          type: String,
          enum: ['work_proof', 'material', 'reference'],
        },
        url: String,
        filename: String,
        size: Number,
        uploadedAt: Date,
      },
    ],
    // Public link for sharing
    publicLink: {
      token: String,
      expiresAt: Date,
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    // Notes
    notes: String,
    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

// Auto-generate invoice number early so required validation passes
invoiceSchema.pre('validate', async function (next) {
  try {
    if (!this.invoiceNumber) {
      const prefix = this.invoiceType === 'project' ? 'PRJ' : 'SAL'
      const count = await mongoose.model('Invoice').countDocuments({ invoiceType: this.invoiceType })
      const year = new Date().getFullYear()
      this.invoiceNumber = `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`
    }
    next()
  } catch (e) {
    next(e)
  }
})

invoiceSchema.pre('save', function (next) {
  // Calculate balance amount
  this.balanceAmount = this.totalAmount - this.paidAmount

  // For project invoices, calculate totals
  if (this.invoiceType === 'project' && this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0)
    this.taxAmount = this.subtotal * ((this.taxRate || 0) / 100)
    this.totalAmount = this.subtotal + this.taxAmount - (this.discount || 0)
  }

  // For salary invoices, use net pay as total
  if (this.invoiceType === 'salary' && this.salaryBreakdown) {
    this.totalAmount = this.salaryBreakdown.netPay || 0
  }

  next()
})

const Invoice = mongoose.model('Invoice', invoiceSchema)

export default Invoice

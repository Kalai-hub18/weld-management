import mongoose from 'mongoose'

const currencyOverrideSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    symbol: { type: String, trim: true },
    position: { type: String, enum: ['prefix', 'suffix'] },
    decimals: { type: Number, min: 0, max: 6 },
  },
  { _id: false }
)

const themeOverrideSchema = new mongoose.Schema(
  {
    primary: { type: String, trim: true },
    secondary: { type: String, trim: true },
    accent: { type: String, trim: true },
    background: { type: String, trim: true },
    fontSize: { type: Number, min: 10, max: 22 },
  },
  { _id: false }
)

const dateTimeOverrideSchema = new mongoose.Schema(
  {
    timezone: { type: String, trim: true }, // IANA tz
    dateFormat: { type: String, enum: ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'] },
    timeFormat: { type: String, enum: ['12h', '24h'] },
  },
  { _id: false }
)

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    client: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientContact: {
      name: String,
      email: String,
      phone: String,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'on-hold', 'cancelled'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    actualEndDate: {
      type: Date,
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    spent: {
      type: Number,
      default: 0,
      min: [0, 'Spent amount cannot be negative'],
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100'],
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedWorkers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    location: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
      trim: true,
    },
    attachments: [{
      name: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Enterprise-ready: allow per-project overrides that fall back to workspace Settings.
    // Only store overrides (no defaults) so "null/undefined" means inherit.
    settingsOverrides: {
      currency: { type: currencyOverrideSchema, default: undefined },
      dateTime: { type: dateTimeOverrideSchema, default: undefined },
      theme: { type: themeOverrideSchema, default: undefined },
    },
  },
  {
    timestamps: true,
  }
)

// Generate project ID before saving
projectSchema.pre('save', async function (next) {
  if (!this.projectId) {
    const count = await mongoose.model('Project').countDocuments()
    this.projectId = `P${String(count + 1).padStart(3, '0')}`
  }
  next()
})

// Virtual for days remaining
projectSchema.virtual('daysRemaining').get(function () {
  const today = new Date()
  const end = new Date(this.endDate)
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

// Virtual for is overdue
projectSchema.virtual('isOverdue').get(function () {
  if (this.status === 'completed') return false
  return new Date() > new Date(this.endDate)
})

// Virtual for budget utilization percentage
projectSchema.virtual('budgetUtilization').get(function () {
  if (this.budget === 0) return 0
  return Math.round((this.spent / this.budget) * 100)
})

// Enable virtuals in JSON
projectSchema.set('toJSON', { virtuals: true })
projectSchema.set('toObject', { virtuals: true })

// Indexes
projectSchema.index({ status: 1 })
projectSchema.index({ priority: 1 })
projectSchema.index({ manager: 1 })
projectSchema.index({ startDate: 1, endDate: 1 })
projectSchema.index({ name: 'text', client: 'text', projectId: 'text' })

const Project = mongoose.model('Project', projectSchema)

export default Project

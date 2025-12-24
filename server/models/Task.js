import mongoose from 'mongoose'
import Counter from './Counter.js'

async function getNextTaskSequence() {
  // Initialize counter based on current max taskId (if missing) to prevent collisions
  const existing = await Counter.findOne({ name: 'taskId' }).lean()
  if (!existing) {
    // NOTE: Use a JS scan to avoid any Mongo aggregation compatibility issues.
    // This runs only once per DB (when the counter doc doesn't exist).
    const docs = await mongoose.model('Task')
      .find({ taskId: { $regex: /^T\d+$/ } })
      .select('taskId')
      .lean()

    let maxNum = 0
    for (const d of docs) {
      const raw = String(d?.taskId || '')
      const n = Number.parseInt(raw.slice(1), 10)
      if (Number.isFinite(n) && n > maxNum) maxNum = n
    }
    try {
      await Counter.create({ name: 'taskId', seq: maxNum })
    } catch (e) {
      if (!(e && e.code === 11000)) throw e
    }
  }

  const updated = await Counter.findOneAndUpdate(
    { name: 'taskId' },
    { $inc: { seq: 1 } },
    { new: true }
  ).lean()

  return updated?.seq || 1
}

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Multi-worker assignment (preferred). Keep assignedTo for backwards-compat/UI.
    assignedWorkers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'on-hold', 'completed', 'cancelled'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    // Schedule fields (UI derives duration from Start/End)
    startTime: {
      type: String, // "HH:MM"
      default: '',
      trim: true,
    },
    endTime: {
      type: String, // "HH:MM"
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    completedAt: {
      type: Date,
    },
    actualHours: {
      type: Number,
      default: 0,
      min: [0, 'Actual hours cannot be negative'],
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Percentage cannot be less than 0'],
      max: [100, 'Percentage cannot exceed 100'],
    },
    tags: [{
      type: String,
      trim: true,
    }],
    attachments: [{
      name: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

// Generate task ID before saving
taskSchema.pre('save', async function (next) {
  if (!this.taskId) {
    const seq = await getNextTaskSequence()
    this.taskId = `T${String(seq).padStart(3, '0')}`
  }

  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed') {
    this.completedAt = new Date()
    this.completionPercentage = 100
  }

  next()
})

// Virtual for is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (this.status === 'completed' || this.status === 'cancelled') return false
  return new Date() > new Date(this.dueDate)
})

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function () {
  const today = new Date()
  const due = new Date(this.dueDate)
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  return diff
})

// Enable virtuals in JSON
taskSchema.set('toJSON', { virtuals: true })
taskSchema.set('toObject', { virtuals: true })

// Indexes
taskSchema.index({ project: 1 })
taskSchema.index({ assignedTo: 1 })
taskSchema.index({ status: 1 })
taskSchema.index({ priority: 1 })
taskSchema.index({ dueDate: 1 })
taskSchema.index({ title: 'text', taskId: 'text' })

const Task = mongoose.model('Task', taskSchema)

export default Task

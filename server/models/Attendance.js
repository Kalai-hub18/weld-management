import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    checkIn: {
      type: String, // Format: "HH:MM"
    },
    checkOut: {
      type: String, // Format: "HH:MM"
    },
    // Preferred UTC timestamps (stored as Date in Mongo = UTC)
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'on-leave'],
      default: 'present',
    },
    hoursWorked: {
      type: Number,
      default: 0,
      min: [0, 'Hours worked cannot be negative'],
    },
    overtime: {
      type: Number,
      default: 0,
      min: [0, 'Overtime cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Calculate hours worked before saving
attendanceSchema.pre('save', function (next) {
  const standardHours = 8

  if (this.checkInAt && this.checkOutAt) {
    const totalMinutes = Math.max(0, Math.round((this.checkOutAt.getTime() - this.checkInAt.getTime()) / 60000))
    const hours = totalMinutes / 60
    this.hoursWorked = Math.min(hours, standardHours + (this.overtime || 0))
    this.overtime = hours > standardHours ? hours - standardHours : 0
    return next()
  }

  // Backward compatible calculation from "HH:MM" strings
  if (this.checkIn && this.checkOut) {
    const [inHours, inMinutes] = this.checkIn.split(':').map(Number)
    const [outHours, outMinutes] = this.checkOut.split(':').map(Number)
    const inTime = inHours * 60 + inMinutes
    const outTime = outHours * 60 + outMinutes
    const totalMinutes = Math.max(0, outTime - inTime)
    const hours = totalMinutes / 60
    this.hoursWorked = Math.min(hours, standardHours + (this.overtime || 0))
    this.overtime = hours > standardHours ? hours - standardHours : 0
  }

  next()
})

// Compound index for worker + date (one attendance record per worker per day)
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true })
attendanceSchema.index({ date: 1 })
attendanceSchema.index({ status: 1 })

const Attendance = mongoose.model('Attendance', attendanceSchema)

export default Attendance

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

function normalizeEmailValue(value) {
  if (value === undefined || value === null) return undefined
  const s = String(value).trim().toLowerCase()
  if (!s) return undefined
  if (s === 'undefined' || s === 'null') return undefined
  return s
}

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: false, // Made optional
      default: undefined,
      set: normalizeEmailValue,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'Worker'],
      default: 'Worker',
    },
    department: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'on-leave'],
      default: 'active',
    },
    inactiveFrom: {
      type: Date,
      default: null,
      // ENTERPRISE RULE: Represents the first day the worker is NOT active
      // Required when status = 'inactive'
      // Used for date-based attendance visibility filtering
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    address: {
      type: String,
      trim: true,
    },
    // Worker-specific fields
    skills: [{
      type: String,
      trim: true,
    }],
    certifications: [{
      type: String,
      trim: true,
    }],
    hourlyRate: {
      type: Number,
      default: 0,
    },
    // Salary config fields (enhanced for auto-calculation)
    paymentType: {
      type: String,
      enum: ['Daily', 'Monthly'],
      default: 'Monthly',
    },
    baseSalary: {
      type: Number,
      default: 0,
      min: [0, 'Base salary cannot be negative'],
    },
    salaryMonthly: {
      type: Number,
      default: 0,
      min: [0, 'Monthly salary cannot be negative'],
    },
    salaryDaily: {
      type: Number,
      default: 0,
      min: [0, 'Daily salary cannot be negative'],
    },
    hourlyRate: {
      type: Number,
      default: 0,
      min: [0, 'Hourly rate cannot be negative'],
    },
    overtimeRate: {
      type: Number,
      default: 0,
      min: [0, 'Overtime rate cannot be negative'],
    },
    workingDaysPerMonth: {
      type: Number,
      default: 26,
      min: [1, 'Working days must be at least 1'],
      max: [31, 'Working days cannot exceed 31'],
    },
    workingHoursPerDay: {
      type: Number,
      default: 8,
      min: [1, 'Working hours must be at least 1'],
      max: [24, 'Working hours cannot exceed 24'],
    },
    advanceBalance: {
      // Positive number means worker has taken advances that can be deducted from salary payments
      type: Number,
      default: 0,
      min: [0, 'Advance balance cannot be negative'],
    },
    employmentType: {
      type: String,
      default: 'full-time',
    },
    experience: {
      type: Number,
      default: 0,
    },
    // Extended profile fields (used by Worker profile/edit UI)
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: '',
    },
    maritalStatus: {
      type: String,
      default: '',
      trim: true,
    },
    bloodGroup: {
      type: String,
      default: '',
      trim: true,
    },
    aadhaar: String,
    pan: {
      type: String,
      default: '',
      trim: true,
    },
    alternatePhone: {
      type: String,
      default: '',
      trim: true,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
    },
    salary: {
      baseSalary: {
        type: Number,
        default: 0,
      },
      paymentType: {
        type: String,
        default: 'Monthly',
      },
    },
    pfNumber: String,
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      relation: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
)

// Generate employee ID before saving
userSchema.pre('save', async function (next) {
  // Generate employee ID if not exists
  if (!this.employeeId) {
    const prefix = this.role === 'Admin' ? 'A' : this.role === 'Manager' ? 'M' : 'W'
    const count = await mongoose.model('User').countDocuments({ role: this.role })
    this.employeeId = `${prefix}${String(count + 1).padStart(3, '0')}`
  }

  // Hash password if modified
  if (!this.isModified('password')) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Get public profile (exclude sensitive data)
userSchema.methods.toPublicProfile = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshToken
  delete obj.__v
  return obj
}

// Virtual for full name
userSchema.virtual('initials').get(function () {
  return this.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
})

// Indexes
userSchema.index({ role: 1 })
userSchema.index({ status: 1 })
userSchema.index({ department: 1 })
userSchema.index({ name: 'text', email: 'text', username: 'text', employeeId: 'text' })
// Email must be unique ONLY when it is a real non-empty string.
// This prevents duplicate-key errors when email is optional or when legacy docs contain blank emails.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: 'email_unique_nonempty',
    // NOTE: Some MongoDB versions don't support $ne in partial indexes (it rewrites to $not).
    // We enforce "non-empty" at app layer via setter, and only index actual strings here.
    partialFilterExpression: { email: { $type: 'string' } },
  }
)

const User = mongoose.model('User', userSchema)

export default User

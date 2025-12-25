import { z } from 'zod'

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

const dateOnlyString = z
  .string()
  // Accept YYYY-MM-DD (date-only) which is what the frontend uses
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)')

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (expected HH:MM)')

// Optional email field:
// - Frontend sends null when email is not provided
// - Convert "" / whitespace-only into null
const optionalEmail = z.preprocess(
  (v) => {
    if (v === undefined) return null
    if (v === null) return null
    if (typeof v === 'string' && v.trim() === '') return null
    return v
  },
  z.string().email('Invalid email').nullable().optional()
)

// Generic validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })

      // Apply parsed/coerced values back to req (Zod strips unknown keys + coerces types)
      if (parsed && typeof parsed === 'object') {
        if (parsed.body !== undefined) req.body = parsed.body
        if (parsed.query !== undefined) req.query = parsed.query
        if (parsed.params !== undefined) req.params = parsed.params
      }
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.slice(1).join('.'), // Remove 'body', 'query', or 'params' prefix
          message: e.message,
        }))

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        })
      }
      next(error)
    }
  }
}

// Common validation schemas
export const schemas = {
  // Auth schemas
  login: z.object({
    body: z.object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  register: z.object({
    body: z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      role: z.enum(['Admin', 'Manager', 'Worker']).optional(),
    }),
  }),

  updatePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    }),
  }),

  // User schemas
  updateUser: z.object({
    body: z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      status: z.enum(['active', 'inactive', 'suspended', 'on-leave']).optional(),
    }),
  }),

  createUser: z.object({
    body: z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string().min(2),
      email: z.string().email(),
      role: z.enum(['Admin', 'Manager', 'Worker']).optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      skills: z.array(z.string()).optional(),
      certifications: z.array(z.string()).optional(),
      hourlyRate: z.coerce.number().nonnegative().optional(),
    }),
  }),

  // Worker schemas
  listWorkers: z.object({
    query: z
      .object({
        status: z.enum(['active', 'inactive', 'suspended', 'on-leave']).optional(),
        department: z.string().optional(),
        search: z.string().optional(),
        skills: z.string().optional(), // comma-separated list
        // ENTERPRISE RULE: Workers page must show active + inactive for history
        // activeOnly=false disables default active filter in controller
        activeOnly: z.enum(['true', 'false']).optional(),
        // ENTERPRISE RULE: Attendance view can request date-based visibility
        forDate: dateOnlyString.optional(),
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(1000).optional(),
      })
      .optional(),
  }),

  createWorker: z.object({
    body: z.object({
      username: z.string().min(3, 'Username is required'),
      password: z.string().min(6, 'Password is required'),
      name: z.string().min(2, 'Name is required'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: optionalEmail,
      phone: z.string().min(1, 'Phone is required'),
      department: z.string().min(1, 'Department is required'),
      position: z.string().min(1, 'Position is required'),
      role: z.enum(['Admin', 'Manager', 'Worker']).optional(),
      status: z.enum(['active', 'inactive', 'suspended', 'on-leave']).optional(),
      hourlyRate: z.coerce.number().nonnegative('Hourly rate must be 0 or more').optional(),
      skills: z.array(z.string()).optional(),
      // certifications removed - not needed for welding management
      address: z.string().optional(),
      employmentType: z.string().optional(),
      experience: z.coerce.number().nonnegative().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      aadhaar: z.string().optional(),
      // Salary fields
      paymentType: z.enum(['Daily', 'Monthly']).optional(),
      baseSalary: z.coerce.number().nonnegative().optional(),
      salaryMonthly: z.coerce.number().nonnegative().optional(),
      salaryDaily: z.coerce.number().nonnegative().optional(),
      overtimeRate: z.coerce.number().nonnegative().optional(),
      workingDaysPerMonth: z.coerce.number().int().min(1).max(31).optional(),
      workingHoursPerDay: z.coerce.number().int().min(1).max(24).optional(),
      bankDetails: z
        .object({
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          ifscCode: z.string().optional(),
        })
        .optional(),
      pfNumber: z.string().optional(),
      emergencyContact: z
        .object({
          name: z.string().optional(),
          relation: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
        })
        .optional(),
    }),
  }),

  updateWorker: z.object({
    body: z.object({
      name: z.string().min(2).optional(),
      email: optionalEmail,
      phone: z.string().optional(),
      alternatePhone: z.string().optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      status: z.enum(['active', 'inactive', 'suspended', 'on-leave']).optional(),
      // ENTERPRISE RULE: inactiveFrom is required when status is set to inactive
      // The frontend sends YYYY-MM-DD for date-only inputs
      inactiveFrom: dateOnlyString.nullable().optional(),
      // Salary config
      paymentType: z.enum(['Daily', 'Monthly']).optional(),
      baseSalary: z.coerce.number().nonnegative().optional(),
      hourlyRate: z.coerce.number().nonnegative().optional(),
      overtimeRate: z.coerce.number().nonnegative().optional(),
      workingDaysPerMonth: z.coerce.number().int().min(1).max(31).optional(),
      workingHoursPerDay: z.coerce.number().int().min(1).max(24).optional(),
      salaryMonthly: z.coerce.number().nonnegative().optional(),
      salaryDaily: z.coerce.number().nonnegative().optional(),
      skills: z.array(z.string()).optional(),
      certifications: z.array(z.string()).optional(),
      address: z.string().optional(),
      employmentType: z.string().optional(),
      experience: z.coerce.number().nonnegative().optional(),
      age: z.coerce.number().int().nonnegative().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      aadhaar: z.string().optional(),
      pan: z.string().optional(),
      maritalStatus: z.string().optional(),
      bloodGroup: z.string().optional(),
      bankDetails: z
        .object({
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          ifscCode: z.string().optional(),
        })
        .optional(),
      salary: z
        .object({
          baseSalary: z.coerce.number().nonnegative().optional(),
          paymentType: z.enum(['Monthly', 'Daily', 'Hourly']).optional(),
        })
        .optional(),
      pfNumber: z.string().optional(),
      emergencyContact: z
        .object({
          name: z.string().optional(),
          relation: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
        })
        .optional(),
    }).superRefine((body, ctx) => {
      // If caller sets status to inactive, inactiveFrom MUST be present and not null
      if (body.status === 'inactive') {
        if (!body.inactiveFrom) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['inactiveFrom'],
            message: 'Inactive From date is required when status is inactive',
          })
        }
      }
    }),
  }),

  // Project schemas
  createProject: z.object({
    body: z.object({
      name: z.string().min(3, 'Project name must be at least 3 characters'),
      client: z.string().min(2, 'Client name is required'),
      description: z.string().optional(),
      startDate: z.string().min(1, 'Start date is required'),
      endDate: z.string().min(1, 'End date is required'),
      budget: z.coerce.number().nonnegative('Budget must be 0 or more'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['pending', 'in-progress', 'completed', 'on-hold', 'cancelled']).optional(),
      manager: objectId.optional(),
      assignedWorkers: z.array(objectId).optional(),
      location: z.string().optional(),
      tags: z.array(z.string()).optional(),
      clientContact: z
        .object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
        })
        .optional(),
    }),
  }),

  updateProject: z.object({
    body: z.object({
      name: z.string().min(3).optional(),
      client: z.string().min(2).optional(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      budget: z.coerce.number().nonnegative().optional(),
      spent: z.coerce.number().nonnegative().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['pending', 'in-progress', 'completed', 'on-hold', 'cancelled']).optional(),
      manager: objectId.optional().nullable(),
      assignedWorkers: z.array(objectId).optional(),
      location: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      clientContact: z
        .object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
        })
        .optional(),

      // Per-project settings overrides (fallback to workspace Settings when null/undefined)
      settingsOverrides: z
        .object({
          currency: z
            .object({
              code: z.string().regex(/^[A-Z]{3}$/, 'Currency code must be 3 uppercase letters'),
              symbol: z.string().min(1, 'Currency symbol is required'),
              position: z.enum(['prefix', 'suffix']),
              decimals: z.coerce.number().int().min(0).max(6),
            })
            .nullable()
            .optional(),
          dateTime: z
            .object({
              timezone: z.string().min(1),
              dateFormat: z.enum(['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']),
              timeFormat: z.enum(['12h', '24h']),
            })
            .nullable()
            .optional(),
          theme: z
            .object({
              primary: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'primary must be hex color (#RRGGBB)'),
              secondary: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'secondary must be hex color (#RRGGBB)'),
              accent: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'accent must be hex color (#RRGGBB)'),
              background: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'background must be hex color (#RRGGBB)'),
              fontSize: z.coerce.number().int().min(10).max(22),
            })
            .nullable()
            .optional(),
        })
        .optional(),
    }),
  }),

  updateProjectProgress: z.object({
    body: z.object({
      progress: z.coerce.number().int().min(0).max(100),
    }),
  }),

  assignProjectWorkers: z.object({
    body: z.object({
      workerIds: z.array(objectId).min(0),
    }),
  }),

  // Task schemas
  createTask: z.object({
    body: z.object({
      title: z.string().min(3, 'Task title must be at least 3 characters'),
      description: z.string().optional(),
      projectId: objectId,
      assignedTo: objectId.optional(), // legacy single-worker
      assignedWorkers: z.array(objectId).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      // Date-only string (YYYY-MM-DD) is required for workforce planning
      dueDate: dateOnlyString,
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).optional(),
      tags: z.array(z.string()).optional(),
    }).superRefine((body, ctx) => {
      const hasSingle = !!body.assignedTo
      const hasMany = Array.isArray(body.assignedWorkers) && body.assignedWorkers.length > 0
      if (!hasSingle && !hasMany) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assignedWorkers'],
          message: 'At least one worker must be assigned',
        })
      }
    }),
  }),

  updateTask: z.object({
    body: z.object({
      title: z.string().min(3).optional(),
      description: z.string().optional(),
      project: objectId.optional(),
      projectId: objectId.optional(), // allow frontend alias
      assignedTo: objectId.optional().nullable(),
      assignedWorkers: z.array(objectId).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).optional(),
      dueDate: dateOnlyString.optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
      actualHours: z.coerce.number().nonnegative().optional(),
      completionPercentage: z.coerce.number().int().min(0).max(100).optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),

  // Task worker eligibility (used by Task Assignment module)
  eligibleTaskWorkers: z.object({
    query: z.object({
      date: dateOnlyString,
      startTime: hhmm.optional(),
      endTime: hhmm.optional(),
    }).superRefine((q, ctx) => {
      if ((q.startTime && !q.endTime) || (!q.startTime && q.endTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endTime'],
          message: 'Both startTime and endTime are required when filtering by time slot',
        })
      }

      if (q.startTime && q.endTime) {
        const [sh, sm] = q.startTime.split(':').map(Number)
        const [eh, em] = q.endTime.split(':').map(Number)
        const s = sh * 60 + sm
        const e = eh * 60 + em
        if (e <= s) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endTime'],
            message: 'endTime must be after startTime',
          })
        }
      }
    }),
  }),

  updateTaskStatus: z.object({
    body: z.object({
      status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']),
      completionPercentage: z.coerce.number().int().min(0).max(100).optional(),
      actualHours: z.coerce.number().nonnegative().optional(),
    }),
  }),

  addTaskComment: z.object({
    body: z.object({
      text: z.string().min(1, 'Comment text is required'),
    }),
  }),

  // Settings schemas
  settingsParams: z.object({
    params: z.object({
      workspaceId: z.string().min(1, 'workspaceId is required'),
    }),
  }),

  updateSettings: z.object({
    body: z.object({
      currency: z
        .object({
          code: z.string().regex(/^[A-Z]{3}$/, 'Currency code must be 3 uppercase letters'),
          symbol: z.string().min(1, 'Currency symbol is required'),
          position: z.enum(['prefix', 'suffix']),
          decimals: z.coerce.number().int().min(0).max(6),
        })
        .optional(),
      dateTime: z
        .object({
          timezone: z.string().min(1),
          dateFormat: z.enum(['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']),
          timeFormat: z.enum(['12h', '24h']),
        })
        .optional(),
      theme: z
        .object({
          primary: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'primary must be hex color (#RRGGBB)'),
          secondary: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'secondary must be hex color (#RRGGBB)'),
          accent: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'accent must be hex color (#RRGGBB)'),
          background: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'background must be hex color (#RRGGBB)'),
          fontSize: z.coerce.number().int().min(10).max(22),
        })
        .optional(),
    }).refine((b) => Object.keys(b || {}).length > 0, { message: 'At least one settings section is required' }),
  }),

  // Attendance schemas
  markAttendance: z.object({
    body: z.object({
      workerId: objectId.optional(), // worker can omit and backend uses req.user._id
      date: z.string().optional(),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      checkInAt: z.string().datetime().optional(),
      checkOutAt: z.string().datetime().optional(),
      timeZone: z.string().optional(),
      status: z.enum(['present', 'absent', 'half-day', 'on-leave']),
      notes: z.string().optional(),
      project: objectId.optional(),
    }),
  }),

  updateAttendance: z.object({
    body: z.object({
      worker: objectId.optional(),
      project: objectId.optional().nullable(),
      date: z.string().optional(),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      checkInAt: z.string().datetime().optional(),
      checkOutAt: z.string().datetime().optional(),
      status: z.enum(['present', 'absent', 'half-day', 'on-leave']).optional(),
      notes: z.string().optional(),
      approvedBy: objectId.optional(),
    }),
  }),

  // Salary schemas
  payrollView: z.object({
    query: z.object({
      period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
      date: z.string().min(4),
      worker: objectId.optional(),
      workerId: objectId.optional(),
      status: z.enum(['pending', 'paid', 'partial', 'all']).optional(),
      workspaceId: z.string().optional(),
    }).refine((q) => {
      const p = (q.period || 'monthly').toLowerCase()
      const v = String(q.date || '')
      if (p === 'daily' || p === 'weekly') return /^\d{4}-\d{2}-\d{2}$/.test(v)
      if (p === 'monthly') return /^\d{4}-\d{2}$/.test(v)
      if (p === 'yearly') return /^\d{4}$/.test(v)
      return false
    }, { message: 'Invalid date format for selected period' }),
  }),

  salaryPreview: z.object({
    body: z.object({
      workerId: objectId,
      type: z.enum(['full', 'partial', 'advance', 'adhoc']),
      daysPaid: z.coerce.number().int().min(1).max(31).optional(),
      amount: z.coerce.number().positive().optional(),
      payDate: z.string().optional(),
      note: z.string().optional(),
    }).refine((data) => {
      if (data.type === 'partial') return data.daysPaid !== undefined
      if (data.type === 'advance' || data.type === 'adhoc') return data.amount !== undefined
      return true
    }, { message: 'Invalid payload for selected type' }),
  }),

  salaryPay: z.object({
    body: z.object({
      workerId: objectId,
      type: z.enum(['full', 'partial', 'advance', 'adhoc']),
      daysPaid: z.coerce.number().int().min(1).max(31).optional(),
      amount: z.coerce.number().positive().optional(),
      payDate: z.string().optional(),
      note: z.string().optional(),
    }).refine((data) => {
      if (data.type === 'partial') return data.daysPaid !== undefined
      if (data.type === 'advance' || data.type === 'adhoc') return data.amount !== undefined
      return true
    }, { message: 'Invalid payload for selected type' }),
  }),

  salaryHistoryParams: z.object({
    params: z.object({
      workerId: objectId,
    }),
    query: paginationQuery.optional(),
  }),

  salaryPaymentUpdate: z.object({
    params: z.object({
      id: objectId,
    }),
    body: z.object({
      payDate: z.string().optional(),
      note: z.string().optional(),
    }),
  }),

  salaryPaymentVoid: z.object({
    params: z.object({
      id: objectId,
    }),
    body: z.object({
      reason: z.string().optional(),
    }).optional(),
  }),

  createSalary: z.object({
    body: z.object({
      workerId: objectId,
      month: z.string().min(1, 'Month is required'),
      baseSalary: z.coerce.number().nonnegative('Base salary cannot be negative'),
      overtime: z.coerce.number().nonnegative().optional(),
      bonus: z.coerce.number().nonnegative().optional(),
      deductions: z.coerce.number().nonnegative().optional(),
      notes: z.string().optional(),
    }),
  }),

  updateSalary: z.object({
    body: z.object({
      month: z.string().optional(),
      baseSalary: z.coerce.number().nonnegative().optional(),
      overtime: z.coerce.number().nonnegative().optional(),
      bonus: z.coerce.number().nonnegative().optional(),
      deductions: z.coerce.number().nonnegative().optional(),
      notes: z.string().optional(),
      status: z.enum(['pending', 'paid', 'partial']).optional(),
      forceUpdate: z.boolean().optional(),
    }),
  }),

  processSalaryPayment: z.object({
    body: z.object({
      amount: z.coerce.number().positive('Amount must be greater than 0'),
      paymentMethod: z.string().min(1, 'Payment method is required'),
    }),
  }),

  // Common list query schemas
  listQuery: z.object({
    query: paginationQuery.passthrough().optional(),
  }),

  // MongoDB ObjectId validation
  mongoId: z.object({
    params: z.object({
      id: objectId,
    }),
  }),

  // "Your" resource schemas
  listYour: z.object({
    query: z.object({
      q: z.string().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(1000).optional(),
    }).optional(),
  }),

  createYour: z.object({
    body: z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      status: z.string().optional(),
    }),
  }),

  updateYour: z.object({
    body: z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.string().optional(),
    }).refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
  }),
}

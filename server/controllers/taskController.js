import Task from '../models/Task.js'
import Project from '../models/Project.js'
import Attendance from '../models/Attendance.js'
import User from '../models/User.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

function parseHHMMToMinutes(t) {
  const s = String(t || '')
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function intervalOverlaps(aStart, aEnd, bStart, bEnd) {
  // half-open intervals [start,end)
  return aStart < bEnd && bStart < aEnd
}

function computeInterval({ startTime, endTime }) {
  const startMin = parseHHMMToMinutes(startTime)
  const endMin = parseHHMMToMinutes(endTime)
  if (startMin === null || endMin === null) return null
  if (endMin <= startMin) return null
  return { startMin, endMin, durationMin: endMin - startMin }
}

function parseDateOnlyLocal(dateStr) {
  // Parse YYYY-MM-DD as a UTC calendar date to avoid timezone shifts
  // This ensures the date stored in MongoDB matches the date string provided
  const [y, m, d] = String(dateStr || '').split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0))
  return dt
}

function localDayRange(dateStr) {
  const start = parseDateOnlyLocal(dateStr)
  // Add one day in UTC to avoid timezone issues
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

function startOfLocalDayFromDate(dt) {
  const d = new Date(dt)
  d.setHours(0, 0, 0, 0)
  return d
}

function taskDateExceedsProjectEndDate({ taskDate, projectEndDate }) {
  // BUSINESS RULE: allow any task date <= project end date (end date is the final boundary)
  const end = startOfLocalDayFromDate(projectEndDate)
  return taskDate.getTime() > end.getTime()
}

function isWorkerActiveForDate(worker, targetDate) {
  if (!worker) return false
  if (worker.status === 'active') return true
  if (worker.status === 'inactive') {
    if (!worker.inactiveFrom) return false
    const inactiveFrom = new Date(worker.inactiveFrom)
    inactiveFrom.setHours(0, 0, 0, 0)
    const td = new Date(targetDate)
    td.setHours(0, 0, 0, 0)
    return td < inactiveFrom
  }
  return false
}

function getDailyCapacityMinutes({ worker, attendanceStatus }) {
  const baseHours = Number(worker?.workingHoursPerDay) || 8
  const baseMinutes = Math.max(0, Math.round(baseHours * 60))

  if (attendanceStatus === 'present') return baseMinutes
  if (attendanceStatus === 'half-day') return Math.floor(baseMinutes / 2)
  return 0
}

async function getTasksForWorkersOnDate({ workerIds, dateStart, dateEnd, excludeTaskId }) {
  const q = {
    dueDate: { $gte: dateStart, $lt: dateEnd },
    status: { $ne: 'cancelled' },
    assignedWorkers: { $in: workerIds },
  }
  if (excludeTaskId) q._id = { $ne: excludeTaskId }

  return await Task.find(q)
    .select('assignedWorkers startTime endTime')
    .lean()
}

async function assertWorkersAvailableForTask({ workerIds, taskDateStr, startTime, endTime, excludeTaskId }) {
  // Attendance logic:
  // - present => full day capacity
  // - half-day => half-day capacity (remaining hours only)
  // - absent/on-leave/missing => no availability
  // Worker status inactive => no availability

  const interval = computeInterval({ startTime, endTime })
  if (!interval) {
    const err = new Error('Task start time and end time are required and must be a valid range (HH:MM)')
    err.statusCode = 400
    throw err
  }

  const uniqueIds = [...new Set(workerIds.map(String))]
  const { start: dayStart, end: dayEnd } = localDayRange(taskDateStr)

  const [workers, att, existingTasks] = await Promise.all([
    User.find({ _id: { $in: uniqueIds }, role: 'Worker' })
      .select('name position status inactiveFrom role workingHoursPerDay')
      .lean(),
    Attendance.find({ worker: { $in: uniqueIds }, date: { $gte: dayStart, $lt: dayEnd } })
      .select('worker status')
      .lean(),
    getTasksForWorkersOnDate({ workerIds: uniqueIds, dateStart: dayStart, dateEnd: dayEnd, excludeTaskId }),
  ])

  const byWorker = new Map(workers.map(w => [String(w._id), w]))
  const attByWorker = new Map(att.map(a => [String(a.worker), a]))

  // Build per-worker assigned minutes + overlap detection
  const assignedMinutes = new Map(uniqueIds.map(id => [String(id), 0]))
  const hasOverlap = new Map(uniqueIds.map(id => [String(id), false]))

  for (const t of existingTasks) {
    const tInterval = computeInterval({ startTime: t.startTime, endTime: t.endTime }) || { startMin: 0, endMin: 24 * 60, durationMin: 24 * 60 }

    for (const wid of (t.assignedWorkers || []).map(String)) {
      if (!assignedMinutes.has(wid)) continue
      assignedMinutes.set(wid, (assignedMinutes.get(wid) || 0) + tInterval.durationMin)
      if (intervalOverlaps(interval.startMin, interval.endMin, tInterval.startMin, tInterval.endMin)) {
        hasOverlap.set(wid, true)
      }
    }
  }

  const overlapNames = []
  const capacityExceededHalfDay = [] // fully consumed half-day (0 remaining)
  const capacityExceededHalfDayPartial = [] // half-day but not enough remaining for this task
  const capacityExceeded = []

  for (const wid of uniqueIds) {
    const worker = byWorker.get(String(wid))
    if (!worker) continue

    const isActiveForDate = isWorkerActiveForDate(worker, dayStart)
    if (!isActiveForDate) {
      capacityExceeded.push(worker.name)
      continue
    }

    const rec = attByWorker.get(String(wid))
    const status = rec?.status
    if (status !== 'present' && status !== 'half-day') {
      // Not available at all
      capacityExceeded.push(worker.name)
      continue
    }

    if (hasOverlap.get(String(wid))) {
      overlapNames.push(worker.name)
      continue
    }

    const capMin = getDailyCapacityMinutes({ worker, attendanceStatus: status })
    const usedMin = assignedMinutes.get(String(wid)) || 0
    const remainingMin = capMin - usedMin

    // Explicit half-day message when no remaining time
    if (status === 'half-day' && remainingMin <= 0) {
      capacityExceededHalfDay.push(worker.name)
      continue
    }

    if (interval.durationMin > remainingMin) {
      if (status === 'half-day') {
        capacityExceededHalfDayPartial.push({
          name: worker.name,
          remainingHours: Math.max(0, Math.round((remainingMin / 60) * 10) / 10),
        })
      } else {
        capacityExceeded.push(worker.name)
      }
    }
  }

  if (overlapNames.length > 0) {
    const err = new Error(`Cannot assign task: time overlaps with existing task(s) for (${overlapNames.join(', ')})`)
    err.statusCode = 400
    throw err
  }

  if (capacityExceededHalfDay.length > 0) {
    // Requirement: clear message when half-day worker has no remaining availability
    const err = new Error('This worker has already completed their half-day work.')
    err.statusCode = 400
    throw err
  }

  if (capacityExceededHalfDayPartial.length > 0) {
    const items = capacityExceededHalfDayPartial
      .map(x => `${x.name} (remaining ${x.remainingHours}h)`)
      .join(', ')
    const err = new Error(`Half Day – Limited availability: ${items}`)
    err.statusCode = 400
    throw err
  }

  if (capacityExceeded.length > 0) {
    const err = new Error(`Cannot assign task: insufficient available hours for (${capacityExceeded.join(', ')})`)
    err.statusCode = 400
    throw err
  }
}

async function assertWorkersEligibleForTask({ workerIds, taskDate }) {
  // workerIds: array of ObjectId-like strings
  if (!Array.isArray(workerIds) || workerIds.length === 0) {
    const err = new Error('At least one worker must be assigned')
    err.statusCode = 400
    throw err
  }

  const uniqueIds = [...new Set(workerIds.map(String))]

  // Load worker docs
  const workers = await User.find({ _id: { $in: uniqueIds }, role: 'Worker' })
    .select('name position status inactiveFrom role workingHoursPerDay')
    .lean()

  if (workers.length !== uniqueIds.length) {
    const err = new Error('One or more assigned workers were not found')
    err.statusCode = 400
    throw err
  }

  // Validate active-for-date
  const inactiveForDate = workers.filter(w => !isWorkerActiveForDate(w, taskDate))
  if (inactiveForDate.length > 0) {
    const names = inactiveForDate.map(w => w.name).join(', ')
    const err = new Error(`Cannot assign task: worker inactive for selected date (${names})`)
    err.statusCode = 400
    throw err
  }

  // Validate attendance for taskDate (present OR half-day)
  const start = new Date(taskDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const att = await Attendance.find({ worker: { $in: uniqueIds }, date: { $gte: start, $lt: end } })
    .select('worker status')
    .lean()

  const byWorker = new Map(att.map(a => [String(a.worker), a]))
  const missing = []
  const notAvailable = []
  for (const w of workers) {
    const rec = byWorker.get(String(w._id))
    if (!rec) {
      missing.push(w.name)
      continue
    }
    if (rec.status !== 'present' && rec.status !== 'half-day') {
      notAvailable.push(w.name)
    }
  }

  if (missing.length || notAvailable.length) {
    const parts = []
    if (missing.length) parts.push(`no attendance marked (${missing.join(', ')})`)
    if (notAvailable.length) parts.push(`attendance not available (${notAvailable.join(', ')})`)
    const err = new Error(`Cannot assign task: ${parts.join('; ')} for selected date`)
    err.statusCode = 400
    throw err
  }
}

// @desc    Get eligible workers for a task date (active-for-date + attendance present)
// @route   GET /api/tasks/eligible-workers?date=YYYY-MM-DD
// @access  Private/Admin/Manager (canManageTasks)
export const getEligibleTaskWorkers = asyncHandler(async (req, res) => {
  const { date, startTime, endTime } = req.query
  const { start, end } = localDayRange(date)
  const taskDate = start

  const requestedInterval = (startTime && endTime) ? computeInterval({ startTime, endTime }) : null
  const durationMin = requestedInterval?.durationMin || 0

  // Find present/half-day attendance for that date and populate worker
  const attendance = await Attendance.find({ date: { $gte: start, $lt: end }, status: { $in: ['present', 'half-day'] } })
    .populate('worker', 'name position status inactiveFrom role workingHoursPerDay')
    .select('worker status')

  const workers = attendance
    .map(a => ({ worker: a.worker, attendanceStatus: a.status }))
    .filter(Boolean)
    .filter(x => x.worker && x.worker.role === 'Worker')
    .filter(x => isWorkerActiveForDate(x.worker, taskDate))

  const workerIds = workers.map(x => String(x.worker._id))
  const existingTasks = workerIds.length
    ? await getTasksForWorkersOnDate({ workerIds, dateStart: start, dateEnd: end })
    : []

  const assignedMinutes = new Map(workerIds.map(id => [String(id), 0]))
  const overlaps = new Map(workerIds.map(id => [String(id), false]))

  for (const t of existingTasks) {
    const tInterval = computeInterval({ startTime: t.startTime, endTime: t.endTime }) || { startMin: 0, endMin: 24 * 60, durationMin: 24 * 60 }
    for (const wid of (t.assignedWorkers || []).map(String)) {
      if (!assignedMinutes.has(wid)) continue
      assignedMinutes.set(wid, (assignedMinutes.get(wid) || 0) + tInterval.durationMin)
      if (requestedInterval && intervalOverlaps(requestedInterval.startMin, requestedInterval.endMin, tInterval.startMin, tInterval.endMin)) {
        overlaps.set(wid, true)
      }
    }
  }

  const eligible = workers.map(({ worker, attendanceStatus }) => {
    const wid = String(worker._id)
    const capMin = getDailyCapacityMinutes({ worker, attendanceStatus })
    const usedMin = assignedMinutes.get(wid) || 0
    const remainingMin = capMin - usedMin

    const isHalfDay = attendanceStatus === 'half-day'
    const label = isHalfDay ? 'Half Day – Limited availability' : 'Present'

    let canAssign = true
    let blockedReason = ''

    if (requestedInterval) {
      if (overlaps.get(wid)) {
        canAssign = false
        blockedReason = 'Time overlap with existing task'
      } else if (isHalfDay && remainingMin <= 0) {
        canAssign = false
        blockedReason = 'This worker has already completed their half-day work.'
      } else if (durationMin > remainingMin) {
        canAssign = false
        blockedReason = 'Insufficient remaining availability'
      }
    } else {
      // Without a specific time slot, only block half-day workers who have no remaining time
      if (isHalfDay && remainingMin <= 0) {
        canAssign = false
        blockedReason = 'This worker has already completed their half-day work.'
      }
    }

    return {
      _id: worker._id,
      name: worker.name,
      position: worker.position || '',
      attendanceStatus,
      availabilityLabel: label,
      capacityHours: Math.round((capMin / 60) * 10) / 10,
      assignedHours: Math.round((usedMin / 60) * 10) / 10,
      remainingHours: Math.max(0, Math.round((remainingMin / 60) * 10) / 10),
      canAssign,
      blockedReason,
    }
  })

  res.json({
    success: true,
    data: eligible,
    message: eligible.length > 0 ? 'Eligible workers loaded' : 'No eligible workers for selected date',
    meta: {
      date,
      eligibleCount: eligible.length,
    },
  })
})

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, project, projectId, assignedTo, search, page = 1, limit = 10 } = req.query

  const query = {}

  // For workers, only show their own tasks
  if (req.user.role === 'Worker') {
    query.$or = [
      { assignedTo: req.user._id },
      { assignedWorkers: req.user._id },
    ]
  } else if (assignedTo) {
    query.$or = [
      { assignedTo },
      { assignedWorkers: assignedTo },
    ]
  }

  if (status) query.status = status
  if (priority) query.priority = priority
  // frontend may send `projectId` instead of `project`
  if (project || projectId) query.project = project || projectId
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { taskId: { $regex: search, $options: 'i' } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('project', 'name projectId')
      .populate('assignedTo', 'name email')
      .populate('assignedWorkers', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ dueDate: 1 }),
    Task.countDocuments(query),
  ])

  res.json({
    success: true,
    data: tasks,
    message: 'Tasks loaded successfully',
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('project', 'name projectId client')
    .populate('assignedTo', 'name email phone')
    .populate('assignedWorkers', 'name email phone')
    .populate('createdBy', 'name')
    .populate('comments.user', 'name')

  if (!task) {
    res.status(404)
    throw new Error('Task not found')
  }

  // Workers can only view their own tasks
  if (
    req.user.role === 'Worker' &&
    task.assignedTo?._id.toString() !== req.user._id.toString() &&
    !(task.assignedWorkers || []).some(u => u?._id?.toString() === req.user._id.toString())
  ) {
    res.status(403)
    throw new Error('Not authorized to view this task')
  }

  res.json({
    success: true,
    data: task,
    message: 'Task loaded successfully',
  })
})

// @desc    Create task
// @route   POST /api/tasks
// @access  Private/Admin/Manager
export const createTask = asyncHandler(async (req, res) => {
  const {
    title, description, projectId, assignedTo, assignedWorkers,
    priority, dueDate, startTime, endTime, location, notes, tags,
  } = req.body

  // Verify project exists
  const project = await Project.findById(projectId)
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const teamIds = (project.assignedWorkers || []).map(id => id.toString())

  // Normalize multi-workers input:
  // - Prefer assignedWorkers[]
  // - Support legacy assignedTo (single) by mapping to [assignedTo]
  const normalizedWorkers =
    Array.isArray(assignedWorkers) ? assignedWorkers :
      (assignedTo ? [assignedTo] : [])

  // ENTERPRISE RULE: Task assignment requires eligible workers for the task date
  const taskDate = parseDateOnlyLocal(dueDate)
  // BUSINESS RULE: Task date must not exceed Project end date
  if (taskDateExceedsProjectEndDate({ taskDate, projectEndDate: project.endDate })) {
    res.status(400)
    throw new Error('This task date exceeds the project end date. Please extend the project to continue.')
  }
  await assertWorkersEligibleForTask({ workerIds: normalizedWorkers, taskDate })
  // Availability-based assignment (attendance + remaining hours + no overlaps)
  // Only validate time-based availability if startTime and endTime are provided
  if (normalizedWorkers.length > 0 && startTime && endTime) {
    await assertWorkersAvailableForTask({
      workerIds: normalizedWorkers,
      taskDateStr: dueDate,
      startTime,
      endTime,
    })
  }

  // ✅ NEW LOGIC: Auto-add workers to project team if not already present
  let projectUpdated = false
  const workersToAdd = []

  if (normalizedWorkers.length > 0) {
    for (const wid of normalizedWorkers) {
      if (!teamIds.includes(wid.toString())) {
        workersToAdd.push(wid)
        teamIds.push(wid.toString())
        projectUpdated = true
      }
    }
  }

  // Update project team if new workers were added
  if (projectUpdated) {
    project.assignedWorkers = [...new Set([...project.assignedWorkers, ...workersToAdd])]
    await project.save()
  }

  // Create task (retry once if taskId unique collision happens)
  let task
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      task = await Task.create({
        title,
        description,
        project: projectId,
        assignedTo: normalizedWorkers[0],
        assignedWorkers: normalizedWorkers,
        priority,
        dueDate: taskDate,
        startTime: startTime || '',
        endTime: endTime || '',
        location: location || '',
        notes: notes || '',
        tags,
        createdBy: req.user._id,
      })
      break
    } catch (e) {
      const isTaskIdDup = e?.code === 11000 && (e?.keyPattern?.taskId || e?.keyValue?.taskId)
      if (isTaskIdDup && attempt === 0) continue
      throw e
    }
  }

  const populatedTask = await Task.findById(task._id)
    .populate('project', 'name projectId')
    .populate('assignedTo', 'name email')
    .populate('assignedWorkers', 'name email')

  res.status(201).json({
    success: true,
    data: populatedTask,
    message: projectUpdated
      ? 'Task created and workers added to project team'
      : 'Task created successfully',
    meta: {
      workersAddedToProject: workersToAdd.length,
      projectTeamSize: project.assignedWorkers.length
    }
  })
})

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private/Admin/Manager
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)

  if (!task) {
    res.status(404)
    throw new Error('Task not found')
  }

  // Only allow updating safe fields
  const allowed = [
    'title',
    'description',
    'priority',
    'status',
    'dueDate',
    'startTime',
    'endTime',
    'location',
    'notes',
    'actualHours',
    'completionPercentage',
    'tags',
    'assignedTo',
    'assignedWorkers',
    'project',
    'projectId', // alias
  ]

  const body = {}
  for (const k of allowed) {
    if (req.body[k] !== undefined) body[k] = req.body[k]
  }

  // Normalize project field
  if (body.projectId !== undefined && body.project === undefined) {
    body.project = body.projectId
  }
  delete body.projectId

  // ENTERPRISE RULE: If assignment/date changes, validate eligibility for that date
  const nextDueDateStr = body.dueDate !== undefined ? body.dueDate : null
  const effectiveDate = nextDueDateStr
    ? parseDateOnlyLocal(nextDueDateStr)
    : (task.dueDate ? parseDateOnlyLocal(new Date(task.dueDate).toISOString().split('T')[0]) : null)

  // Determine effective project for validation
  const nextProjectId = body.project !== undefined ? body.project : task.project
  const boundaryProjectNeeded = body.dueDate !== undefined || body.project !== undefined
  const assignmentProjectNeeded = body.project !== undefined || body.assignedTo !== undefined || body.assignedWorkers !== undefined

  // Load project once if needed (end-date boundary + assignment side effects)
  const projectForValidation = (boundaryProjectNeeded || assignmentProjectNeeded)
    ? await Project.findById(nextProjectId)
    : null

  if ((boundaryProjectNeeded || assignmentProjectNeeded) && !projectForValidation) {
    res.status(404)
    throw new Error('Project not found')
  }

  // BUSINESS RULE: Block task date > project end date (even for edits)
  if (effectiveDate && projectForValidation?.endDate) {
    if (taskDateExceedsProjectEndDate({ taskDate: effectiveDate, projectEndDate: projectForValidation.endDate })) {
      res.status(400)
      throw new Error('This task date exceeds the project end date. Please extend the project to continue.')
    }
  }

  // ✅ NEW LOGIC: Auto-add workers to project team when task assignment changes
  let projectUpdated = false
  const workersToAdd = []

  if (assignmentProjectNeeded) {
    const teamIds = (projectForValidation.assignedWorkers || []).map(id => id.toString())

    const normalizedWorkers =
      Array.isArray(body.assignedWorkers) ? body.assignedWorkers :
        (body.assignedTo !== undefined && body.assignedTo !== null ? [body.assignedTo] : undefined)

    if (normalizedWorkers !== undefined) {
      if (!effectiveDate) {
        res.status(400)
        throw new Error('Task date is required for assignment validation')
      }

      await assertWorkersEligibleForTask({ workerIds: normalizedWorkers, taskDate: effectiveDate })

      // Availability-based assignment: enforce overlap + capacity for the effective date/time.
      // Only validate if both startTime and endTime are provided
      const effectiveDateStr = effectiveDate.toISOString().split('T')[0]
      const effectiveStartTime = body.startTime !== undefined ? body.startTime : task.startTime
      const effectiveEndTime = body.endTime !== undefined ? body.endTime : task.endTime

      if (effectiveStartTime && effectiveEndTime) {
        await assertWorkersAvailableForTask({
          workerIds: normalizedWorkers,
          taskDateStr: effectiveDateStr,
          startTime: effectiveStartTime,
          endTime: effectiveEndTime,
          excludeTaskId: task._id,
        })
      }

      // Auto-add workers to project team if not already present
      for (const wid of normalizedWorkers) {
        if (!teamIds.includes(wid.toString())) {
          workersToAdd.push(wid)
          teamIds.push(wid.toString())
          projectUpdated = true
        }
      }

      // Update project team if new workers were added
      if (projectUpdated) {
        projectForValidation.assignedWorkers = [...new Set([...projectForValidation.assignedWorkers, ...workersToAdd])]
        await projectForValidation.save()
      }

      body.assignedWorkers = normalizedWorkers
      body.assignedTo = normalizedWorkers[0] || null
    }
  }

  // Normalize dueDate to start-of-day if provided as date-only string
  if (body.dueDate !== undefined) {
    body.dueDate = parseDateOnlyLocal(body.dueDate)
  }

  const updatedTask = await Task.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
    .populate('project', 'name projectId')
    .populate('assignedTo', 'name email')
    .populate('assignedWorkers', 'name email')

  res.json({
    success: true,
    data: updatedTask,
    message: projectUpdated
      ? 'Task updated and workers added to project team'
      : 'Task updated successfully',
    meta: projectUpdated ? {
      workersAddedToProject: workersToAdd.length,
      projectTeamSize: (await Project.findById(nextProjectId)).assignedWorkers.length
    } : undefined
  })
})

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin/Manager
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)

  if (!task) {
    res.status(404)
    throw new Error('Task not found')
  }

  await task.deleteOne()

  res.json({
    success: true,
    message: 'Task deleted successfully',
  })
})

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, completionPercentage, actualHours } = req.body

  const task = await Task.findById(req.params.id)

  if (!task) {
    res.status(404)
    throw new Error('Task not found')
  }

  // Workers can only update their own tasks
  if (
    req.user.role === 'Worker' &&
    task.assignedTo?.toString() !== req.user._id.toString() &&
    !(task.assignedWorkers || []).some(u => u?.toString() === req.user._id.toString())
  ) {
    res.status(403)
    throw new Error('Not authorized to update this task')
  }

  task.status = status
  if (completionPercentage !== undefined) task.completionPercentage = completionPercentage
  if (actualHours !== undefined) task.actualHours = actualHours

  await task.save()

  const updatedTask = await Task.findById(task._id)
    .populate('project', 'name')
    .populate('assignedTo', 'name')
    .populate('assignedWorkers', 'name')

  res.json({
    success: true,
    data: updatedTask,
    message: 'Task status updated successfully',
  })
})

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
export const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body

  const task = await Task.findById(req.params.id)

  if (!task) {
    res.status(404)
    throw new Error('Task not found')
  }

  task.comments.push({
    user: req.user._id,
    text,
  })

  await task.save()

  const updatedTask = await Task.findById(task._id)
    .populate('comments.user', 'name')

  res.json({
    success: true,
    data: updatedTask.comments,
    message: 'Comment added successfully',
  })
})

// @desc    Get task stats
// @route   GET /api/tasks/stats
// @access  Private
export const getTaskStats = asyncHandler(async (req, res) => {
  const matchQuery = req.user.role === 'Worker'
    ? { assignedTo: req.user._id }
    : {}

  const stats = await Task.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        pendingTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
        inProgressTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
        },
        totalActualHours: { $sum: '$actualHours' },
      },
    },
  ])

  const priorityStats = await Task.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
      },
    },
  ])

  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
      },
      byPriority: priorityStats,
    },
  })
})

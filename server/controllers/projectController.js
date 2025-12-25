import Project from '../models/Project.js'
import Task from '../models/Task.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  const { status, priority, manager, search, page = 1, limit = 10 } = req.query

  const query = {}

  if (status) query.status = status
  if (priority) query.priority = priority
  if (manager) query.manager = manager
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { client: { $regex: search, $options: 'i' } },
      { projectId: { $regex: search, $options: 'i' } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [projects, total] = await Promise.all([
    Project.find(query)
      .populate('manager', 'name email')
      .populate('assignedWorkers', 'name email position')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
    Project.countDocuments(query),
  ])

  res.json({
    success: true,
    data: projects,
    message: 'Projects loaded successfully',
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  })
})

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('manager', 'name email phone')
    .populate('assignedWorkers', 'name email phone position skills')
    .populate('createdBy', 'name')

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Get project tasks
  const tasks = await Task.find({ project: project._id })
    .populate('assignedTo', 'name email position')
    .populate('assignedWorkers', 'name email position')
    .sort({ dueDate: 1 })

  res.json({
    success: true,
    data: {
      project,
      tasks,
    },
    message: 'Project loaded successfully',
  })
})

// @desc    Create project
// @route   POST /api/projects
// @access  Private/Admin
export const createProject = asyncHandler(async (req, res) => {
  const {
    name, client, clientContact, description, startDate, endDate,
    budget, priority, manager, assignedWorkers, location, tags,
  } = req.body

  const project = await Project.create({
    name,
    client,
    clientContact,
    description,
    startDate,
    endDate,
    budget,
    priority,
    manager,
    assignedWorkers,
    location,
    tags,
    createdBy: req.user._id,
  })

  const populatedProject = await Project.findById(project._id)
    .populate('manager', 'name email')
    .populate('assignedWorkers', 'name email')

  res.status(201).json({
    success: true,
    data: populatedProject,
    message: 'Project created successfully',
  })
})

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private/Admin
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('manager', 'name email')
    .populate('assignedWorkers', 'name email')

  res.json({
    success: true,
    data: updatedProject,
    message: 'Project updated successfully',
  })
})

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private/Admin
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Delete associated tasks
  await Task.deleteMany({ project: project._id })

  await project.deleteOne()

  res.json({
    success: true,
    message: 'Project and associated tasks deleted successfully',
  })
})

// @desc    Update project progress
// @route   PUT /api/projects/:id/progress
// @access  Private/Admin/Manager
export const updateProgress = asyncHandler(async (req, res) => {
  const { progress } = req.body

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { progress },
    { new: true, runValidators: true }
  )

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Auto-update status based on progress
  if (progress === 100 && project.status !== 'completed') {
    project.status = 'completed'
    project.actualEndDate = new Date()
    await project.save()
  }

  res.json({
    success: true,
    data: project,
    message: 'Project progress updated successfully',
  })
})

// @desc    Assign workers to project
// @route   PUT /api/projects/:id/workers
// @access  Private/Admin/Manager
export const assignWorkers = asyncHandler(async (req, res) => {
  const { workerIds } = req.body

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { assignedWorkers: workerIds },
    { new: true, runValidators: true }
  ).populate('assignedWorkers', 'name email position')

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  res.json({
    success: true,
    data: project,
    message: 'Project workers updated successfully',
  })
})

// @desc    Get project stats
// @route   GET /api/projects/stats
// @access  Private/Admin/Manager
export const getProjectStats = asyncHandler(async (req, res) => {
  const stats = await Project.aggregate([
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        totalBudget: { $sum: '$budget' },
        totalSpent: { $sum: '$spent' },
        avgProgress: { $avg: '$progress' },
      },
    },
  ])

  const statusStats = await Project.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ])

  const priorityStats = await Project.aggregate([
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
        totalProjects: 0,
        totalBudget: 0,
        totalSpent: 0,
        avgProgress: 0,
      },
      byStatus: statusStats,
      byPriority: priorityStats,
    },
    message: 'Project stats loaded successfully',
  })
})

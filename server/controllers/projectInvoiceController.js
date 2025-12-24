import Invoice from '../models/Invoice.js'
import Project from '../models/Project.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

// @desc    Get all project invoices
// @route   GET /api/invoices/project
// @access  Private
export const getProjectInvoices = asyncHandler(async (req, res) => {
  const { status, search, projectId, limit, page = 1 } = req.query

  const query = { invoiceType: 'project' }

  if (status && status !== 'all') {
    query.status = status
  }

  if (projectId) {
    query.projectId = projectId
  }

  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
    ]
  }

  const pageSize = limit ? parseInt(limit) : 50
  const skip = (parseInt(page) - 1) * pageSize

  const invoices = await Invoice.find(query)
    .populate('projectId', 'name client')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(skip)

  const total = await Invoice.countDocuments(query)

  res.json({
    success: true,
    data: invoices,
    pagination: {
      page: parseInt(page),
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  })
})

// @desc    Get single project invoice
// @route   GET /api/invoices/project/:id
// @access  Private
export const getProjectInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    invoiceType: 'project',
  })
    .populate('projectId', 'name client budget')
    .populate('createdBy', 'name email')

  if (!invoice) {
    res.status(404)
    throw new Error('Project invoice not found')
  }

  res.json({
    success: true,
    data: invoice,
  })
})

// @desc    Create project invoice
// @route   POST /api/invoices/project
// @access  Private/Admin
export const createProjectInvoice = asyncHandler(async (req, res) => {
  const {
    projectId,
    invoiceDate,
    dueDate,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    items,
    taxRate,
    discount,
    notes,
  } = req.body

  // If projectId provided, fetch project details
  let projectData = null
  if (projectId) {
    projectData = await Project.findById(projectId)
    if (!projectData) {
      res.status(404)
      throw new Error('Project not found')
    }
  }

  const invoice = await Invoice.create({
    invoiceType: 'project',
    projectId: projectId || null,
    invoiceDate: invoiceDate || new Date(),
    dueDate,
    // Project model stores `client` as a string and `clientContact` as an object
    clientName: clientName || projectData?.client,
    clientEmail: clientEmail || projectData?.clientContact?.email,
    clientPhone: clientPhone || projectData?.clientContact?.phone,
    clientAddress: clientAddress || {},
    items: items || [],
    taxRate: taxRate || 0,
    discount: discount || 0,
    notes,
    createdBy: req.user._id,
  })

  res.status(201).json({
    success: true,
    data: invoice,
    message: 'Project invoice created successfully',
  })
})

// @desc    Update project invoice
// @route   PUT /api/invoices/project/:id
// @access  Private/Admin
export const updateProjectInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    invoiceType: 'project',
  })

  if (!invoice) {
    res.status(404)
    throw new Error('Project invoice not found')
  }

  const {
    invoiceDate,
    dueDate,
    status,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    items,
    taxRate,
    discount,
    paidAmount,
    notes,
  } = req.body

  // Update fields
  if (invoiceDate) invoice.invoiceDate = invoiceDate
  if (dueDate) invoice.dueDate = dueDate
  if (status) invoice.status = status
  if (clientName !== undefined) invoice.clientName = clientName
  if (clientEmail !== undefined) invoice.clientEmail = clientEmail
  if (clientPhone !== undefined) invoice.clientPhone = clientPhone
  if (clientAddress) invoice.clientAddress = clientAddress
  if (items) invoice.items = items
  if (taxRate !== undefined) invoice.taxRate = taxRate
  if (discount !== undefined) invoice.discount = discount
  if (paidAmount !== undefined) invoice.paidAmount = paidAmount
  if (notes !== undefined) invoice.notes = notes

  await invoice.save()

  res.json({
    success: true,
    data: invoice,
    message: 'Project invoice updated successfully',
  })
})

// @desc    Delete project invoice
// @route   DELETE /api/invoices/project/:id
// @access  Private/Admin
export const deleteProjectInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    invoiceType: 'project',
  })

  if (!invoice) {
    res.status(404)
    throw new Error('Project invoice not found')
  }

  await invoice.deleteOne()

  res.json({
    success: true,
    message: 'Project invoice deleted successfully',
  })
})

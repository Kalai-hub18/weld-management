import Invoice from '../models/Invoice.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = asyncHandler(async (req, res) => {
  const { status, search, limit, page = 1 } = req.query

  const query = {}

  // Filter by status
  if (status && status !== 'all') {
    query.status = status
  }

  // Search by invoice number, client name, or worker name
  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
      { workerName: { $regex: search, $options: 'i' } },
    ]
  }

  const pageSize = limit ? parseInt(limit) : 50
  const skip = (parseInt(page) - 1) * pageSize

  const invoices = await Invoice.find(query)
    .populate('workerId', 'name email phone')
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

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('workerId', 'name email phone')
    .populate('createdBy', 'name email')

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  res.json({
    success: true,
    data: invoice,
  })
})

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private/Admin
export const createInvoice = asyncHandler(async (req, res) => {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    clientName,
    clientEmail,
    clientPhone,
    workerName,
    workerEmail,
    workerPhone,
    workerId,
    totalAmount,
    items,
    notes,
  } = req.body

  const invoice = await Invoice.create({
    invoiceNumber,
    invoiceDate: invoiceDate || new Date(),
    dueDate,
    clientName,
    clientEmail,
    clientPhone,
    workerName,
    workerEmail,
    workerPhone,
    workerId,
    totalAmount,
    items: items || [],
    notes,
    createdBy: req.user._id,
  })

  res.status(201).json({
    success: true,
    data: invoice,
    message: 'Invoice created successfully',
  })
})

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private/Admin
export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  const {
    invoiceDate,
    dueDate,
    status,
    clientName,
    clientEmail,
    clientPhone,
    workerName,
    workerEmail,
    workerPhone,
    workerId,
    totalAmount,
    paidAmount,
    items,
    notes,
  } = req.body

  // Update fields
  if (invoiceDate) invoice.invoiceDate = invoiceDate
  if (dueDate) invoice.dueDate = dueDate
  if (status) invoice.status = status
  if (clientName !== undefined) invoice.clientName = clientName
  if (clientEmail !== undefined) invoice.clientEmail = clientEmail
  if (clientPhone !== undefined) invoice.clientPhone = clientPhone
  if (workerName !== undefined) invoice.workerName = workerName
  if (workerEmail !== undefined) invoice.workerEmail = workerEmail
  if (workerPhone !== undefined) invoice.workerPhone = workerPhone
  if (workerId !== undefined) invoice.workerId = workerId
  if (totalAmount !== undefined) invoice.totalAmount = totalAmount
  if (paidAmount !== undefined) invoice.paidAmount = paidAmount
  if (items) invoice.items = items
  if (notes !== undefined) invoice.notes = notes

  await invoice.save()

  res.json({
    success: true,
    data: invoice,
    message: 'Invoice updated successfully',
  })
})

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  await invoice.deleteOne()

  res.json({
    success: true,
    message: 'Invoice deleted successfully',
  })
})

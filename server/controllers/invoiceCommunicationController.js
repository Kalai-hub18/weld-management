import Invoice from '../models/Invoice.js'
import InvoiceCommunication from '../models/InvoiceCommunication.js'
import CompanySettings from '../models/CompanySettings.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'
import { generateInvoicePDF } from '../utils/pdfGenerator.js'
import { sendInvoiceEmail } from '../utils/emailService.js'
import {
  generateWhatsAppLink,
  generateSecureInvoiceLink,
  formatWhatsAppMessage,
  validatePhoneNumber,
} from '../utils/whatsappService.js'
import path from 'path'

// @desc    Generate invoice PDF
// @route   POST /api/invoices/:id/generate-pdf
// @access  Private/Admin
export const generatePDF = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
  const companySettings = await CompanySettings.findOne()

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  if (!companySettings) {
    res.status(400)
    throw new Error('Company settings not configured')
  }

  const pdf = await generateInvoicePDF(invoice, companySettings)

  invoice.pdfUrl = pdf.url
  invoice.pdfGeneratedAt = new Date()
  await invoice.save()

  res.json({
    success: true,
    data: { pdfUrl: pdf.url },
  })
})

// @desc    Send invoice via email
// @route   POST /api/invoices/:id/send-email
// @access  Private/Admin
export const sendEmail = asyncHandler(async (req, res) => {
  const { subject, body, recipientEmail } = req.body
  const invoice = await Invoice.findById(req.params.id)
  const companySettings = await CompanySettings.findOne()

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  if (!companySettings) {
    res.status(400)
    throw new Error('Company settings not configured')
  }

  if (!recipientEmail) {
    res.status(400)
    throw new Error('Recipient email is required')
  }

  // Check if draft
  if (invoice.status === 'draft') {
    res.status(400)
    throw new Error('Cannot send draft invoices')
  }

  // Generate PDF if not exists
  if (!invoice.pdfUrl) {
    const pdf = await generateInvoicePDF(invoice, companySettings)
    invoice.pdfUrl = pdf.url
    invoice.pdfGeneratedAt = new Date()
    await invoice.save()
  }

  // Collect attachments
  const attachments = [path.join(process.cwd(), invoice.pdfUrl.replace(/^\//, ''))]
  
  if (invoice.attachments && invoice.attachments.length > 0) {
    invoice.attachments.forEach((att) => {
      const attPath = path.join(process.cwd(), att.url.replace(/^\//, ''))
      attachments.push(attPath)
    })
  }

  // Send email
  try {
    await sendInvoiceEmail({
      to: recipientEmail,
      subject,
      body,
      attachments,
      companySettings,
      invoice,
    })

    // Log communication
    await InvoiceCommunication.create({
      invoiceId: invoice._id,
      type: 'email',
      recipient: {
        email: recipientEmail,
        name: invoice.clientName || invoice.workerName,
      },
      status: 'sent',
      sentAt: new Date(),
      sentBy: req.user._id,
      emailSubject: subject,
      emailBody: body,
      emailAttachments: attachments.map((a) => path.basename(a)),
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    })

    res.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    // Log failed communication
    await InvoiceCommunication.create({
      invoiceId: invoice._id,
      type: 'email',
      recipient: {
        email: recipientEmail,
        name: invoice.clientName || invoice.workerName,
      },
      status: 'failed',
      sentAt: new Date(),
      sentBy: req.user._id,
      emailSubject: subject,
      emailBody: body,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        errorMessage: error.message,
      },
    })

    res.status(500)
    throw new Error(`Failed to send email: ${error.message}`)
  }
})

// @desc    Send invoice via WhatsApp
// @route   POST /api/invoices/:id/send-whatsapp
// @access  Private/Admin
export const sendWhatsApp = asyncHandler(async (req, res) => {
  const { phone } = req.body
  const invoice = await Invoice.findById(req.params.id)
  const companySettings = await CompanySettings.findOne()

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  if (!companySettings) {
    res.status(400)
    throw new Error('Company settings not configured')
  }

  if (!phone) {
    res.status(400)
    throw new Error('Phone number is required')
  }

  if (!validatePhoneNumber(phone)) {
    res.status(400)
    throw new Error('Invalid phone number format')
  }

  // Check if draft
  if (invoice.status === 'draft') {
    res.status(400)
    throw new Error('Cannot send draft invoices')
  }

  // Generate secure public link
  const publicLink = generateSecureInvoiceLink(invoice._id)
  invoice.publicLink = publicLink
  await invoice.save()

  // Format WhatsApp message
  const message = formatWhatsAppMessage(invoice, companySettings, publicLink.url)
  const whatsappLink = generateWhatsAppLink(phone, message)

  // Log communication
  await InvoiceCommunication.create({
    invoiceId: invoice._id,
    type: 'whatsapp',
    recipient: {
      phone,
      name: invoice.clientName || invoice.workerName,
    },
    status: 'sent',
    sentAt: new Date(),
    sentBy: req.user._id,
    whatsappMessage: message,
    whatsappLink,
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
  })

  res.json({
    success: true,
    data: { whatsappLink },
  })
})

// @desc    Get communication history
// @route   GET /api/invoices/:id/communications
// @access  Private
export const getCommunicationHistory = asyncHandler(async (req, res) => {
  const communications = await InvoiceCommunication.find({ invoiceId: req.params.id })
    .populate('sentBy', 'name email')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    data: communications,
  })
})

// @desc    Upload invoice attachment
// @route   POST /api/invoices/:id/attachments
// @access  Private/Admin
export const uploadAttachment = asyncHandler(async (req, res) => {
  const { type } = req.body
  const invoice = await Invoice.findById(req.params.id)

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  if (!req.file) {
    res.status(400)
    throw new Error('No file uploaded')
  }

  const validTypes = ['work_proof', 'material', 'reference']
  if (!validTypes.includes(type)) {
    res.status(400)
    throw new Error('Invalid attachment type')
  }

  const attachment = {
    type,
    url: `/uploads/attachments/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    uploadedAt: new Date(),
  }

  if (!invoice.attachments) {
    invoice.attachments = []
  }

  invoice.attachments.push(attachment)
  await invoice.save()

  res.json({
    success: true,
    data: attachment,
  })
})

// @desc    Delete invoice attachment
// @route   DELETE /api/invoices/:id/attachments/:attachmentId
// @access  Private/Admin
export const deleteAttachment = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)

  if (!invoice) {
    res.status(404)
    throw new Error('Invoice not found')
  }

  const attachmentIndex = invoice.attachments.findIndex(
    (att) => att._id.toString() === req.params.attachmentId
  )

  if (attachmentIndex === -1) {
    res.status(404)
    throw new Error('Attachment not found')
  }

  invoice.attachments.splice(attachmentIndex, 1)
  await invoice.save()

  res.json({
    success: true,
    message: 'Attachment deleted successfully',
  })
})

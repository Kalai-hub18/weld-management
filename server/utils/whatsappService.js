import crypto from 'crypto'

/**
 * Generate WhatsApp deep link
 * @param {string} phone - Phone number
 * @param {string} message - Message to send
 * @returns {string} WhatsApp link
 */
export const generateWhatsAppLink = (phone, message) => {
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '')

  // Add country code if not present (assuming India +91)
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)

  return `https://wa.me/${fullPhone}?text=${encodedMessage}`
}

/**
 * Generate secure invoice public link
 * @param {string} invoiceId - Invoice ID
 * @returns {object} Token, expiry, and URL
 */
export const generateSecureInvoiceLink = (invoiceId) => {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  return {
    token,
    expiresAt,
    url: `${process.env.FRONTEND_URL}/invoice/public/${token}`,
  }
}

/**
 * Format WhatsApp message for invoice
 * @param {object} invoice - Invoice object
 * @param {object} companySettings - Company settings
 * @param {string} pdfLink - PDF download link
 * @returns {string} Formatted message
 */
export const formatWhatsAppMessage = (invoice, companySettings, pdfLink) => {
  const recipientName = invoice.clientName || invoice.workerName || 'Customer'
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `Hello ${recipientName},

${companySettings.companyName} has sent you an invoice.

*Invoice #:* ${invoice.invoiceNumber}
*Amount:* ₹${invoice.totalAmount.toLocaleString('en-IN')}
*Due Date:* ${dueDate}

View & Download Invoice:
${pdfLink}

Thank you for your business!

${companySettings.companyName}
${companySettings.phone || ''}`
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} Is valid
 */
export const validatePhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length >= 10 && cleanPhone.length <= 15
}

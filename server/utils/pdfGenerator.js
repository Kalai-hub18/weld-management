import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

/**
 * Generate invoice PDF
 * @param {object} invoice - Invoice object
 * @param {object} companySettings - Company settings
 * @returns {Promise<object>} PDF file info
 */
export const generateInvoicePDF = async (invoice, companySettings) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const filename = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`
      const uploadDir = path.join('uploads', 'invoices')
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      
      const filepath = path.join(uploadDir, filename)
      const stream = fs.createWriteStream(filepath)
      doc.pipe(stream)

      // Colors
      const primaryColor = '#FF6A00'
      const textColor = '#333333'
      const lightGray = '#999999'

      // Header with logo and company info
      let yPosition = 50

      if (companySettings.logo?.url) {
        try {
          const logoPath = path.join(process.cwd(), companySettings.logo.url.replace(/^\//, ''))
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, yPosition, { width: 100 })
          }
        } catch (err) {
          console.error('Logo load error:', err)
        }
      }

      // Company details (right side)
      doc.fontSize(16).fillColor(primaryColor).text(companySettings.companyName, 200, yPosition, { align: 'right' })
      yPosition += 20
      
      doc.fontSize(9).fillColor(lightGray)
      if (companySettings.address?.street) {
        doc.text(companySettings.address.street, 200, yPosition, { align: 'right' })
        yPosition += 12
      }
      if (companySettings.address?.city) {
        doc.text(`${companySettings.address.city}, ${companySettings.address.state || ''} ${companySettings.address.pincode || ''}`, 200, yPosition, { align: 'right' })
        yPosition += 12
      }
      if (companySettings.gstNumber) {
        doc.text(`GST: ${companySettings.gstNumber}`, 200, yPosition, { align: 'right' })
        yPosition += 12
      }
      if (companySettings.phone) {
        doc.text(`Phone: ${companySettings.phone}`, 200, yPosition, { align: 'right' })
        yPosition += 12
      }
      if (companySettings.email) {
        doc.text(`Email: ${companySettings.email}`, 200, yPosition, { align: 'right' })
      }

      // Invoice title
      yPosition = 150
      doc.fontSize(24).fillColor(primaryColor).text('INVOICE', 50, yPosition)
      
      // Invoice details
      yPosition += 40
      doc.fontSize(10).fillColor(textColor)
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 50, yPosition)
      yPosition += 15
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 50, yPosition)
      yPosition += 15
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 50, yPosition)
      yPosition += 15
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 50, yPosition)

      // Bill To section
      yPosition += 30
      doc.fontSize(12).fillColor(primaryColor).text('Bill To:', 50, yPosition)
      yPosition += 20
      doc.fontSize(10).fillColor(textColor)
      doc.text(invoice.clientName || invoice.workerName || 'N/A', 50, yPosition)
      yPosition += 15
      if (invoice.clientEmail || invoice.workerEmail) {
        doc.text(invoice.clientEmail || invoice.workerEmail, 50, yPosition)
        yPosition += 15
      }
      if (invoice.clientPhone || invoice.workerPhone) {
        doc.text(invoice.clientPhone || invoice.workerPhone, 50, yPosition)
      }

      // Line items table
      yPosition += 40
      const tableTop = yPosition
      const itemX = 50
      const descX = 150
      const qtyX = 350
      const rateX = 420
      const amountX = 490

      // Table header
      doc.fontSize(10).fillColor(primaryColor)
      doc.rect(50, tableTop, 495, 25).fill('#F5F5F5')
      doc.fillColor(textColor).text('Item', itemX + 5, tableTop + 8)
      doc.text('Description', descX, tableTop + 8)
      doc.text('Qty', qtyX, tableTop + 8)
      doc.text('Rate', rateX, tableTop + 8)
      doc.text('Amount', amountX, tableTop + 8)

      // Table rows
      yPosition = tableTop + 30
      const lineItems = invoice.lineItems || []
      
      lineItems.forEach((item, index) => {
        doc.fontSize(9).fillColor(textColor)
        doc.text(item.item || item.description || '-', itemX + 5, yPosition)
        doc.text(item.description || '-', descX, yPosition, { width: 180 })
        doc.text(item.quantity || 1, qtyX, yPosition)
        doc.text(`₹${(item.rate || 0).toLocaleString('en-IN')}`, rateX, yPosition)
        doc.text(`₹${(item.amount || 0).toLocaleString('en-IN')}`, amountX, yPosition)
        
        yPosition += 25
        
        // Add new page if needed
        if (yPosition > 700) {
          doc.addPage()
          yPosition = 50
        }
      })

      // Totals section
      yPosition += 20
      const totalsX = 400

      doc.fontSize(10).fillColor(textColor)
      
      if (invoice.subtotal) {
        doc.text('Subtotal:', totalsX, yPosition)
        doc.text(`₹${invoice.subtotal.toLocaleString('en-IN')}`, amountX, yPosition)
        yPosition += 20
      }

      if (invoice.tax) {
        doc.text(`Tax (${invoice.taxRate || 0}%):`, totalsX, yPosition)
        doc.text(`₹${invoice.tax.toLocaleString('en-IN')}`, amountX, yPosition)
        yPosition += 20
      }

      if (invoice.discount) {
        doc.text('Discount:', totalsX, yPosition)
        doc.text(`-₹${invoice.discount.toLocaleString('en-IN')}`, amountX, yPosition)
        yPosition += 20
      }

      // Total
      doc.fontSize(12).fillColor(primaryColor)
      doc.rect(totalsX - 10, yPosition - 5, 155, 30).fill('#FFF5F0')
      doc.text('Total Amount:', totalsX, yPosition + 5)
      doc.text(`₹${invoice.totalAmount.toLocaleString('en-IN')}`, amountX, yPosition + 5)

      // Notes section
      if (invoice.notes) {
        yPosition += 60
        doc.fontSize(10).fillColor(primaryColor).text('Notes:', 50, yPosition)
        yPosition += 15
        doc.fontSize(9).fillColor(textColor).text(invoice.notes, 50, yPosition, { width: 495 })
      }

      // Footer
      doc.fontSize(8).fillColor(lightGray)
      doc.text('Thank you for your business!', 50, 750, { align: 'center', width: 495 })

      doc.end()

      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          url: `/uploads/invoices/${filename}`,
        })
      })

      stream.on('error', reject)
    } catch (error) {
      reject(error)
    }
  })
}

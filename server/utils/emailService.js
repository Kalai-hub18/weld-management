import nodemailer from 'nodemailer'
import path from 'path'

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * Generate email HTML template
 * @param {object} params - Template parameters
 * @returns {string} HTML template
 */
const generateEmailTemplate = ({ body, companySettings, invoice }) => {
  const logoUrl = companySettings.logo?.url
    ? `${process.env.BACKEND_URL || 'http://localhost:5000'}${companySettings.logo.url}`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding: 30px 20px;
          background: linear-gradient(135deg, #FF6A00 0%, #CC5500 100%);
          color: white;
        }
        .logo {
          max-width: 150px;
          max-height: 80px;
          margin-bottom: 15px;
        }
        .header h2 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
        }
        .content p {
          margin: 0 0 15px 0;
        }
        .invoice-summary {
          background: #f9f9f9;
          padding: 20px;
          margin: 25px 0;
          border-radius: 8px;
          border-left: 4px solid #FF6A00;
        }
        .invoice-summary h3 {
          margin: 0 0 15px 0;
          color: #FF6A00;
          font-size: 18px;
        }
        .invoice-detail {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .invoice-detail:last-child {
          border-bottom: none;
        }
        .invoice-detail strong {
          color: #333;
        }
        .invoice-detail span {
          color: #666;
        }
        .amount {
          font-size: 24px;
          font-weight: bold;
          color: #FF6A00;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background: #f9f9f9;
          font-size: 12px;
          color: #666;
        }
        .footer p {
          margin: 5px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background: #FF6A00;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="${companySettings.companyName}">` : ''}
          <h2>${companySettings.companyName}</h2>
        </div>
        
        <div class="content">
          <p>${body.replace(/\n/g, '<br>')}</p>
          
          <div class="invoice-summary">
            <h3>Invoice Summary</h3>
            <div class="invoice-detail">
              <strong>Invoice Number:</strong>
              <span>${invoice.invoiceNumber}</span>
            </div>
            <div class="invoice-detail">
              <strong>Invoice Date:</strong>
              <span>${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div class="invoice-detail">
              <strong>Due Date:</strong>
              <span>${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div class="invoice-detail">
              <strong>Amount:</strong>
              <span class="amount">₹${invoice.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <p style="text-align: center;">
            <em>Please find the invoice attached to this email.</em>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>${companySettings.companyName}</strong></p>
          ${companySettings.address?.street ? `<p>${companySettings.address.street}, ${companySettings.address.city}</p>` : ''}
          <p>${companySettings.email || ''} ${companySettings.phone ? `| ${companySettings.phone}` : ''}</p>
          ${companySettings.gstNumber ? `<p>GST: ${companySettings.gstNumber}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Send invoice email
 * @param {object} params - Email parameters
 * @returns {Promise} Email send result
 */
export const sendInvoiceEmail = async ({ to, subject, body, attachments, companySettings, invoice }) => {
  const transporter = createTransporter()

  const htmlTemplate = generateEmailTemplate({ body, companySettings, invoice })

  const mailOptions = {
    from: `${companySettings.companyName} <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlTemplate,
    attachments: attachments.map((file) => ({
      filename: path.basename(file),
      path: file,
    })),
  }

  return await transporter.sendMail(mailOptions)
}

/**
 * Verify email configuration
 * @returns {Promise<boolean>} Is configured
 */
export const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    return true
  } catch (error) {
    console.error('Email configuration error:', error)
    return false
  }
}

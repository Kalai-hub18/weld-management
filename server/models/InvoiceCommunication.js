import mongoose from 'mongoose'

const invoiceCommunicationSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    type: {
      type: String,
      enum: ['email', 'whatsapp'],
      required: true,
    },
    recipient: {
      name: String,
      email: String,
      phone: String,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered'],
      default: 'pending',
    },
    sentAt: Date,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Email specific
    emailSubject: String,
    emailBody: String,
    emailAttachments: [String],
    // WhatsApp specific
    whatsappMessage: String,
    whatsappLink: String,
    // Tracking
    metadata: {
      ipAddress: String,
      userAgent: String,
      errorMessage: String,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
invoiceCommunicationSchema.index({ invoiceId: 1, createdAt: -1 })
invoiceCommunicationSchema.index({ type: 1, status: 1 })
invoiceCommunicationSchema.index({ sentAt: -1 })

const InvoiceCommunication = mongoose.model('InvoiceCommunication', invoiceCommunicationSchema)

export default InvoiceCommunication

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import toast from 'react-hot-toast'
import invoiceService from '../../services/invoiceService'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

const SendEmailDialog = ({ open, onClose, invoice, onSent }) => {
  const { settings } = useSettings()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    recipientEmail: '',
    subject: '',
    body: '',
  })

  useEffect(() => {
    if (open && invoice) {
      const companyName = settings.companyName || 'Company'
      setFormData({
        recipientEmail: invoice.clientEmail || invoice.workerEmail || '',
        subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
        body: `Dear ${invoice.clientName || invoice.workerName},

Please find attached invoice ${invoice.invoiceNumber} for your review.

Invoice Details:
- Amount: ${formatCurrency(invoice.totalAmount, settings)}
- Due Date: ${formatDate(invoice.dueDate, settings)}

Thank you for your business!

Best regards,
${companyName}`,
      })
    }
  }, [open, invoice, settings])

  const handleSend = async () => {
    if (!formData.recipientEmail) {
      toast.error('Recipient email is required')
      return
    }

    setLoading(true)
    try {
      await invoiceService.sendEmail(invoice._id, formData)
      toast.success('Email sent successfully')
      onSent?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span>Send Invoice via Email</span>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="space-y-4 !pt-4">
        <TextField
          fullWidth
          label="Recipient Email"
          type="email"
          value={formData.recipientEmail}
          onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
          required
        />

        <TextField
          fullWidth
          label="Subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          required
        />

        <TextField
          fullWidth
          label="Message"
          multiline
          rows={8}
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          required
        />

        <div className="p-3 rounded-xl bg-info/10 text-sm">
          <p className="font-semibold mb-1">Attachments:</p>
          <ul className="list-disc list-inside">
            <li>Invoice PDF</li>
            {invoice.attachments?.map((att, idx) => (
              <li key={idx}>{att.filename}</li>
            ))}
          </ul>
        </div>
      </DialogContent>

      <DialogActions className="p-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleSend}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SendEmailDialog

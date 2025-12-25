import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import toast from 'react-hot-toast'
import invoiceService from '../../services/invoiceService'

const SendWhatsAppDialog = ({ open, onClose, invoice, onSent }) => {
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (open && invoice) {
      setPhone(invoice.clientPhone || invoice.workerPhone || '')
    }
  }, [open, invoice])

  const handleSend = async () => {
    if (!phone) {
      toast.error('Phone number is required')
      return
    }

    setLoading(true)
    try {
      const response = await invoiceService.sendWhatsApp(invoice._id, { phone })
      
      // Open WhatsApp link
      if (response.data?.whatsappLink) {
        window.open(response.data.whatsappLink, '_blank')
        toast.success('WhatsApp opened successfully')
        onSent?.()
        onClose()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate WhatsApp link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span>Send Invoice via WhatsApp</span>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="space-y-4 !pt-4">
        <TextField
          fullWidth
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 9876543210"
          required
          helperText="Include country code (e.g., +91 for India)"
        />

        <div className="p-3 rounded-xl bg-success/10 text-sm">
          <p className="font-semibold mb-2">What happens next?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>A secure invoice link will be generated</li>
            <li>WhatsApp will open with pre-filled message</li>
            <li>You can review and send the message</li>
          </ul>
        </div>
      </DialogContent>

      <DialogActions className="p-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<WhatsAppIcon />}
          onClick={handleSend}
          disabled={loading}
          className="btn-primary !bg-success hover:!bg-success/90"
        >
          {loading ? 'Opening...' : 'Open WhatsApp'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SendWhatsAppDialog

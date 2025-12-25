import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EmailIcon from '@mui/icons-material/Email'
import DownloadIcon from '@mui/icons-material/Download'
import SendEmailDialog from './SendEmailDialog'
import SendWhatsAppDialog from './SendWhatsAppDialog'

const InvoiceCommunicationButtons = ({ invoice, onSent }) => {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false)

  const canSendCommunication = invoice.status !== 'draft'

  const handleDownload = () => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Download PDF */}
      <Tooltip title="Download PDF">
        <IconButton
          onClick={handleDownload}
          className="!bg-neutral-100 dark:!bg-neutral-800"
        >
          <DownloadIcon />
        </IconButton>
      </Tooltip>

      {/* Send via Email */}
      {canSendCommunication && (
        <Tooltip title="Send via Email">
          <IconButton
            onClick={() => setEmailDialogOpen(true)}
            className="!bg-info/10 !text-info"
          >
            <EmailIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Send via WhatsApp */}
      {canSendCommunication && (
        <Tooltip title="Send via WhatsApp">
          <IconButton
            onClick={() => setWhatsappDialogOpen(true)}
            className="!bg-success/10 !text-success"
          >
            <WhatsAppIcon />
          </IconButton>
        </Tooltip>
      )}

      <SendEmailDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        invoice={invoice}
        onSent={onSent}
      />

      <SendWhatsAppDialog
        open={whatsappDialogOpen}
        onClose={() => setWhatsappDialogOpen(false)}
        invoice={invoice}
        onSent={onSent}
      />
    </div>
  )
}

export default InvoiceCommunicationButtons

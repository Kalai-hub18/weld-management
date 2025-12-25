import { useState } from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import ImageIcon from '@mui/icons-material/Image'
import ConstructionIcon from '@mui/icons-material/Construction'
import DescriptionIcon from '@mui/icons-material/Description'
import toast from 'react-hot-toast'
import invoiceService from '../../services/invoiceService'

const InvoiceAttachments = ({ invoice, onUpdate, readOnly = false }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const [uploading, setUploading] = useState(false)

  const attachmentTypes = [
    { value: 'work_proof', label: 'Work Proof', icon: <ConstructionIcon /> },
    { value: 'material', label: 'Material Photo', icon: <ImageIcon /> },
    { value: 'reference', label: 'Reference', icon: <DescriptionIcon /> },
  ]

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleFileSelect = async (type) => {
    handleMenuClose()

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File must be less than 5MB')
        return
      }

      setUploading(true)
      try {
        await invoiceService.uploadAttachment(invoice._id, file, type)
        toast.success('Attachment uploaded successfully')
        onUpdate?.()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to upload attachment')
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleDelete = async (attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      await invoiceService.deleteAttachment(invoice._id, attachmentId)
      toast.success('Attachment deleted successfully')
      onUpdate?.()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete attachment')
    }
  }

  const handleDownload = (url) => {
    window.open(url, '_blank')
  }

  const getTypeIcon = (type) => {
    const typeConfig = attachmentTypes.find((t) => t.value === type)
    return typeConfig?.icon || <AttachFileIcon />
  }

  const getTypeLabel = (type) => {
    const typeConfig = attachmentTypes.find((t) => t.value === type)
    return typeConfig?.label || type
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Attachments</h3>
        {!readOnly && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AttachFileIcon />}
            onClick={handleMenuOpen}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Add Attachment'}
          </Button>
        )}
      </div>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {attachmentTypes.map((type) => (
          <MenuItem key={type.value} onClick={() => handleFileSelect(type.value)}>
            <span className="flex items-center gap-2">
              {type.icon}
              {type.label}
            </span>
          </MenuItem>
        ))}
      </Menu>

      {invoice.attachments && invoice.attachments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {invoice.attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-primary">{getTypeIcon(attachment.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.filename}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip label={getTypeLabel(attachment.type)} size="small" />
                    <span className="text-xs text-neutral-500">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButton size="small" onClick={() => handleDownload(attachment.url)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
                {!readOnly && (
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(attachment._id)}
                    className="!text-error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500">
          <AttachFileIcon sx={{ fontSize: 48, opacity: 0.3 }} />
          <p className="mt-2">No attachments yet</p>
        </div>
      )}
    </div>
  )
}

export default InvoiceAttachments

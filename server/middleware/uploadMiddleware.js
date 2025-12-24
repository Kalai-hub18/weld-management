import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Storage configuration for logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/logos'
    ensureDirectoryExists(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname))
  },
})

// Storage configuration for invoice attachments
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/attachments'
    ensureDirectoryExists(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname))
  },
})

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG) are allowed'))
  }
}

// Logo upload middleware
export const uploadLogo = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: imageFileFilter,
}).single('logo')

// Attachment upload middleware
export const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
}).single('attachment')

// Multiple attachments upload
export const uploadMultipleAttachments = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // Max 5 files
  },
  fileFilter: imageFileFilter,
}).array('attachments', 5)

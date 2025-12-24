import express from 'express'
import cors from 'cors'

// Import Routes
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import workerRoutes from './routes/workerRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'
import salaryRoutes from './routes/salaryRoutes.js'
import costRoutes from './routes/costRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import companySettingsRoutes from './routes/companySettingsRoutes.js'
import invoiceRoutes from './routes/invoiceRoutes.js'
import projectInvoiceRoutes from './routes/projectInvoiceRoutes.js'
import salaryInvoiceRoutes from './routes/salaryInvoiceRoutes.js'
import invoiceCommunicationRoutes from './routes/invoiceCommunicationRoutes.js'

// Import Middleware
import { errorHandler, notFound } from './middleware/errorMiddleware.js'

const app = express()

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files for uploads
app.use('/uploads', express.static('uploads'))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/salary', salaryRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/company-settings', companySettingsRoutes)
// Register specific invoice routes BEFORE general invoice routes
app.use('/api/invoices/project', projectInvoiceRoutes)
app.use('/api/invoices/salary', salaryInvoiceRoutes)
app.use('/api/invoices', invoiceCommunicationRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api', costRoutes)

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Weld Management API is running',
    timestamp: new Date().toISOString(),
  })
})

// Error Handling Middleware
app.use(notFound)
app.use(errorHandler)

export default app



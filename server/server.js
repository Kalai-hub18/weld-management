import dotenv from 'dotenv'
import connectDB from './config/db.js'
import app from './app.js'

// Load environment variables
dotenv.config()

// Connect to MongoDB
connectDB()

// Start Server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`
  🔥 ========================================
  🔥 Weld Management System API
  🔥 ========================================
  🚀 Server running on port ${PORT}
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  📡 API URL: http://localhost:${PORT}/api
  🔥 ========================================
  `)
})

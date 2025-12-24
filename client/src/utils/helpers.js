// Date formatting utilities
export const formatDate = (date, options = {}) => {
  if (!date) return '-'
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatTime = (time) => {
  if (!time) return '--:--'
  return time
}

// Currency formatting
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '-'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Number formatting
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('en-US').format(num)
}

// Percentage formatting
export const formatPercentage = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(decimals)}%`
}

// String utilities
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const truncate = (str, length = 50) => {
  if (!str) return ''
  if (str.length <= length) return str
  return `${str.slice(0, length)}...`
}

export const getInitials = (name) => {
  if (!name) return ''
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Status utilities
export const getStatusColor = (status) => {
  const statusColors = {
    active: 'success',
    inactive: 'neutral',
    suspended: 'danger',
    'on-leave': 'warning',
    present: 'success',
    absent: 'danger',
    'half-day': 'warning',
    pending: 'warning',
    'in-progress': 'info',
    completed: 'success',
    cancelled: 'neutral',
    paid: 'success',
    partial: 'warning',
    high: 'danger',
    medium: 'warning',
    low: 'success',
    urgent: 'danger',
  }
  
  return statusColors[status] || 'neutral'
}

// Validation utilities
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const isValidPhone = (phone) => {
  const re = /^[\d\s\-\+\(\)]+$/
  return re.test(phone)
}

// Array utilities
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key]
    result[group] = result[group] || []
    result[group].push(item)
    return result
  }, {})
}

export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1
    return 0
  })
}

// Date utilities
export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate()
}

export const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return months[month]
}

export const getDayName = (day) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[day]
}

export const isToday = (date) => {
  const today = new Date()
  const compareDate = new Date(date)
  return (
    today.getDate() === compareDate.getDate() &&
    today.getMonth() === compareDate.getMonth() &&
    today.getFullYear() === compareDate.getFullYear()
  )
}

export const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.round((d2 - d1) / oneDay)
}

// File utilities
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Generate unique ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

// Debounce function
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Deep clone object
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

// Check if object is empty
export const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true
  if (Array.isArray(obj)) return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  if (typeof obj === 'string') return obj.trim().length === 0
  return false
}

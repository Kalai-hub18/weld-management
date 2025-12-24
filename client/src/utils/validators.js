/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  if (!email) return true // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  if (!phone) return true // Empty is valid (optional field)
  const digitsOnly = phone.replace(/[^0-9]/g, '')
  return digitsOnly.length === 10
}

/**
 * Round currency to 2 decimal places
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
export const roundCurrency = (amount) => {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * Validate invoice form data
 * @param {Object} formData - Invoice form data
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateInvoiceForm = (formData) => {
  const errors = []

  // Date validation
  if (!formData.invoiceDate) {
    errors.push('Invoice date is required')
  }
  
  if (!formData.dueDate) {
    errors.push('Due date is required')
  }
  
  if (formData.invoiceDate && formData.dueDate) {
    const invoiceDate = new Date(formData.invoiceDate)
    const dueDate = new Date(formData.dueDate)
    
    if (dueDate < invoiceDate) {
      errors.push('Due date must be on or after invoice date')
    }
  }

  // Client validation (Project invoices should always have a client name)
  // If a projectId is provided, enforce clientName and ignore any worker fields.
  if (formData.projectId) {
    if (!formData.clientName || !String(formData.clientName).trim()) {
      errors.push('Client name is required')
    }
  } else {
    // Legacy/other invoice forms (fallback)
    if (!formData.clientName && !formData.workerName) {
      errors.push('Client or worker name is required')
    }
  }

  // Email validation
  const email = formData.clientEmail || formData.workerEmail
  if (email && !isValidEmail(email)) {
    errors.push('Invalid email format')
  }

  // Phone validation
  const phone = formData.clientPhone || formData.workerPhone
  if (phone && !isValidPhone(phone)) {
    errors.push('Phone number must be 10 digits')
  }

  // Line items validation
  if (!formData.items || formData.items.length === 0) {
    errors.push('At least one line item is required')
  } else {
    formData.items.forEach((item, index) => {
      if (!item.description || !item.description.trim()) {
        errors.push(`Item ${index + 1}: Description is required`)
      }
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
      }
      if (item.rate < 0) {
        errors.push(`Item ${index + 1}: Rate cannot be negative`)
      }
    })
  }

  // Payment validation
  if (formData.paidAmount < 0) {
    errors.push('Paid amount cannot be negative')
  }
  
  if (formData.paidAmount > formData.totalAmount) {
    errors.push('Paid amount cannot exceed total amount')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate salary invoice generation data
 * @param {Object} data - Salary invoice data
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateSalaryInvoiceData = (data) => {
  const errors = []

  if (!data.workerId) {
    errors.push('Worker selection is required')
  }

  if (!data.periodFrom) {
    errors.push('Period start date is required')
  }

  if (!data.periodTo) {
    errors.push('Period end date is required')
  }

  if (data.periodFrom && data.periodTo) {
    const from = new Date(data.periodFrom)
    const to = new Date(data.periodTo)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today

    if (from > to) {
      errors.push('Period start date must be before end date')
    }

    if (to > today) {
      errors.push('Period end date cannot be in the future')
    }

    const daysDiff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1
    if (daysDiff > 31) {
      errors.push('Salary period cannot exceed 31 days')
    }

    if (daysDiff < 1) {
      errors.push('Salary period must be at least 1 day')
    }
  }

  if (data.deductions && data.deductions < 0) {
    errors.push('Deductions cannot be negative')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate worker salary data
 * @param {Object} data - Worker salary data
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateWorkerSalary = (data) => {
  const errors = []

  if (data.paymentType === 'Daily' && (!data.salaryDaily || data.salaryDaily <= 0)) {
    errors.push('Daily salary must be greater than 0')
  }

  if (data.paymentType === 'Monthly' && (!data.salaryMonthly || data.salaryMonthly <= 0)) {
    errors.push('Monthly salary must be greater than 0')
  }

  if (data.hourlyRate && data.hourlyRate < 0) {
    errors.push('Hourly rate cannot be negative')
  }

  if (data.overtimeRate && data.overtimeRate < 0) {
    errors.push('Overtime rate cannot be negative')
  }

  if (data.workingDaysPerMonth && (data.workingDaysPerMonth < 1 || data.workingDaysPerMonth > 31)) {
    errors.push('Working days per month must be between 1 and 31')
  }

  if (data.workingHoursPerDay && (data.workingHoursPerDay < 1 || data.workingHoursPerDay > 24)) {
    errors.push('Working hours per day must be between 1 and 24')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

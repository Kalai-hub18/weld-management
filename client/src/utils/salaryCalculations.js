/**
 * Salary Calculation Utilities
 * Handles automatic salary breakdown calculations based on payment type
 */

/**
 * Calculate salary breakdown based on payment type
 * @param {string} paymentType - 'Daily' or 'Monthly'
 * @param {number} primaryValue - The base salary value (daily rate or monthly salary)
 * @param {number} workingDaysPerMonth - Number of working days per month (default: 26)
 * @param {number} workingHoursPerDay - Number of working hours per day (default: 8)
 * @returns {object} Salary breakdown with dailyRate, monthlyRate, hourlyRate, overtimeRate
 */
export const calculateSalaryBreakdown = (
  paymentType,
  primaryValue,
  workingDaysPerMonth = 26,
  workingHoursPerDay = 8
) => {
  const value = parseFloat(primaryValue) || 0

  if (paymentType === 'Daily') {
    // Primary input is daily rate
    const dailyRate = value
    const monthlyRate = dailyRate * workingDaysPerMonth
    const hourlyRate = dailyRate / workingHoursPerDay
    const overtimeRate = hourlyRate * 1.5

    return {
      dailyRate: parseFloat(dailyRate.toFixed(2)),
      monthlyRate: parseFloat(monthlyRate.toFixed(2)),
      hourlyRate: parseFloat(hourlyRate.toFixed(2)),
      overtimeRate: parseFloat(overtimeRate.toFixed(2)),
    }
  } else {
    // Monthly - Primary input is monthly salary
    const monthlyRate = value
    const dailyRate = monthlyRate / workingDaysPerMonth
    const hourlyRate = dailyRate / workingHoursPerDay
    const overtimeRate = hourlyRate * 1.5

    return {
      dailyRate: parseFloat(dailyRate.toFixed(2)),
      monthlyRate: parseFloat(monthlyRate.toFixed(2)),
      hourlyRate: parseFloat(hourlyRate.toFixed(2)),
      overtimeRate: parseFloat(overtimeRate.toFixed(2)),
    }
  }
}

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {number|null} Age in years, or null if invalid date
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null

  const today = new Date()
  const birthDate = new Date(dateOfBirth)

  // Validate date
  if (isNaN(birthDate.getTime())) return null

  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  // Adjust age if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age >= 0 ? age : null
}

/**
 * Format salary for display
 * @param {number} value - Salary value
 * @param {string} currencySymbol - Currency symbol (default: ₹)
 * @returns {string} Formatted salary string
 */
export const formatSalary = (value, currencySymbol = '₹') => {
  if (!value || isNaN(value)) return `${currencySymbol}0`
  return `${currencySymbol}${parseFloat(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Validate salary values
 * @param {object} salaryData - Salary data object
 * @returns {object} Validation result with isValid and errors
 */
export const validateSalaryData = (salaryData) => {
  const errors = {}

  if (!salaryData.paymentType) {
    errors.paymentType = 'Payment type is required'
  }

  if (!salaryData.baseSalary || parseFloat(salaryData.baseSalary) <= 0) {
    errors.baseSalary = 'Base salary must be greater than 0'
  }

  if (salaryData.workingDaysPerMonth && (salaryData.workingDaysPerMonth < 1 || salaryData.workingDaysPerMonth > 31)) {
    errors.workingDaysPerMonth = 'Working days must be between 1 and 31'
  }

  if (salaryData.workingHoursPerDay && (salaryData.workingHoursPerDay < 1 || salaryData.workingHoursPerDay > 24)) {
    errors.workingHoursPerDay = 'Working hours must be between 1 and 24'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Get salary field label based on payment type
 * @param {string} paymentType - 'Daily' or 'Monthly'
 * @returns {string} Label for the primary salary input field
 */
export const getSalaryFieldLabel = (paymentType) => {
  return paymentType === 'Daily' ? 'Daily Rate' : 'Monthly Salary'
}

/**
 * Get salary field helper text
 * @param {string} paymentType - 'Daily' or 'Monthly'
 * @returns {string} Helper text for the salary field
 */
export const getSalaryFieldHelperText = (paymentType) => {
  return paymentType === 'Daily'
    ? 'Enter daily rate (monthly salary will be auto-calculated)'
    : 'Enter monthly salary (daily rate will be auto-calculated)'
}

/**
 * Date Utility Functions
 * 
 * These functions handle date formatting and parsing without timezone issues.
 * Always use these instead of .toISOString() for date-only values.
 */

/**
 * Format a Date object to YYYY-MM-DD string without timezone conversion
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {string} Date string in YYYY-MM-DD format
 * 
 * @example
 * formatDateToYYYYMMDD(new Date(2024, 11, 17)) // "2024-12-17"
 */
export const formatDateToYYYYMMDD = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD string to Date object in local timezone
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} JavaScript Date object
 * 
 * @example
 * parseYYYYMMDD('2024-12-17') // Date object for Dec 17, 2024 (local)
 */
export const parseYYYYMMDD = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Check if a string is in valid YYYY-MM-DD format
 * 
 * @param {string} dateStr - String to validate
 * @returns {boolean} True if valid YYYY-MM-DD format
 * 
 * @example
 * isValidDateString('2024-12-17') // true
 * isValidDateString('12/17/2024') // false
 */
export const isValidDateString = (dateStr) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
}

/**
 * Get today's date as YYYY-MM-DD string
 * 
 * @returns {string} Today's date in YYYY-MM-DD format
 * 
 * @example
 * getTodayString() // "2024-12-17"
 */
export const getTodayString = () => {
  return formatDateToYYYYMMDD(new Date())
}

/**
 * Get yesterday's date as YYYY-MM-DD string
 * 
 * @returns {string} Yesterday's date in YYYY-MM-DD format
 */
export const getYesterdayString = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatDateToYYYYMMDD(yesterday)
}

/**
 * Get tomorrow's date as YYYY-MM-DD string
 * 
 * @returns {string} Tomorrow's date in YYYY-MM-DD format
 */
export const getTomorrowString = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDateToYYYYMMDD(tomorrow)
}

/**
 * Add days to a date string
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} New date string in YYYY-MM-DD format
 * 
 * @example
 * addDays('2024-12-17', 5) // "2024-12-22"
 * addDays('2024-12-17', -5) // "2024-12-12"
 */
export const addDays = (dateStr, days) => {
  const date = parseYYYYMMDD(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateToYYYYMMDD(date)
}

/**
 * Get the first day of the month for a given date
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} First day of month in YYYY-MM-DD format
 * 
 * @example
 * getFirstDayOfMonth('2024-12-17') // "2024-12-01"
 */
export const getFirstDayOfMonth = (dateStr) => {
  const date = parseYYYYMMDD(dateStr)
  return formatDateToYYYYMMDD(new Date(date.getFullYear(), date.getMonth(), 1))
}

/**
 * Get the last day of the month for a given date
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Last day of month in YYYY-MM-DD format
 * 
 * @example
 * getLastDayOfMonth('2024-12-17') // "2024-12-31"
 */
export const getLastDayOfMonth = (dateStr) => {
  const date = parseYYYYMMDD(dateStr)
  return formatDateToYYYYMMDD(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

/**
 * Compare two date strings
 * 
 * @param {string} dateStr1 - First date string in YYYY-MM-DD format
 * @param {string} dateStr2 - Second date string in YYYY-MM-DD format
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 * 
 * @example
 * compareDates('2024-12-17', '2024-12-18') // -1
 * compareDates('2024-12-17', '2024-12-17') // 0
 * compareDates('2024-12-18', '2024-12-17') // 1
 */
export const compareDates = (dateStr1, dateStr2) => {
  if (dateStr1 === dateStr2) return 0
  return dateStr1 < dateStr2 ? -1 : 1
}

/**
 * Check if a date is today
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is today
 * 
 * @example
 * isToday('2024-12-17') // true (if today is Dec 17, 2024)
 */
export const isToday = (dateStr) => {
  return dateStr === getTodayString()
}

/**
 * Check if a date is in the past
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is before today
 */
export const isPast = (dateStr) => {
  return compareDates(dateStr, getTodayString()) < 0
}

/**
 * Check if a date is in the future
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is after today
 */
export const isFuture = (dateStr) => {
  return compareDates(dateStr, getTodayString()) > 0
}

/**
 * Get the number of days between two dates
 * 
 * @param {string} dateStr1 - First date string in YYYY-MM-DD format
 * @param {string} dateStr2 - Second date string in YYYY-MM-DD format
 * @returns {number} Number of days between dates (can be negative)
 * 
 * @example
 * daysBetween('2024-12-17', '2024-12-22') // 5
 * daysBetween('2024-12-22', '2024-12-17') // -5
 */
export const daysBetween = (dateStr1, dateStr2) => {
  const date1 = parseYYYYMMDD(dateStr1)
  const date2 = parseYYYYMMDD(dateStr2)
  const diffTime = date2.getTime() - date1.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format date for display (e.g., "Dec 17, 2024")
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 * 
 * @example
 * formatDateForDisplay('2024-12-17') // "Dec 17, 2024"
 * formatDateForDisplay('2024-12-17', { weekday: 'long' }) // "Tuesday, Dec 17, 2024"
 */
export const formatDateForDisplay = (dateStr, options = {}) => {
  const date = parseYYYYMMDD(dateStr)
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }
  return date.toLocaleDateString('en-US', defaultOptions)
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {number} Day of week (0-6)
 * 
 * @example
 * getDayOfWeek('2024-12-17') // 2 (Tuesday)
 */
export const getDayOfWeek = (dateStr) => {
  return parseYYYYMMDD(dateStr).getDay()
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if weekend
 * 
 * @example
 * isWeekend('2024-12-21') // true (Saturday)
 * isWeekend('2024-12-17') // false (Tuesday)
 */
export const isWeekend = (dateStr) => {
  const day = getDayOfWeek(dateStr)
  return day === 0 || day === 6
}

/**
 * Get month name from date string
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Month name
 * 
 * @example
 * getMonthName('2024-12-17') // "December"
 */
export const getMonthName = (dateStr) => {
  const date = parseYYYYMMDD(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long' })
}

/**
 * Get year from date string
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {number} Year
 * 
 * @example
 * getYear('2024-12-17') // 2024
 */
export const getYear = (dateStr) => {
  return parseYYYYMMDD(dateStr).getFullYear()
}

/**
 * Get month number (1-12) from date string
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {number} Month number (1-12)
 * 
 * @example
 * getMonth('2024-12-17') // 12
 */
export const getMonth = (dateStr) => {
  return parseYYYYMMDD(dateStr).getMonth() + 1
}

/**
 * Get day of month from date string
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {number} Day of month (1-31)
 * 
 * @example
 * getDay('2024-12-17') // 17
 */
export const getDay = (dateStr) => {
  return parseYYYYMMDD(dateStr).getDate()
}

// Centralized formatting based on workspace settings using Intl.*

export const DEFAULT_SETTINGS = {
  currency: { code: 'USD', symbol: '$', position: 'prefix', decimals: 2 },
  dateTime: { timezone: 'UTC', dateFormat: 'YYYY-MM-DD', timeFormat: '24h' },
}

function safeTz(tz) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return tz
  } catch {
    return 'UTC'
  }
}

export function formatNumber(value, opts = {}, settings = DEFAULT_SETTINGS) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, ...opts })
  return nf.format(Number(value))
}

export function formatCurrency(value, settings = DEFAULT_SETTINGS) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  const c = settings?.currency || DEFAULT_SETTINGS.currency
  const nf = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: c.code || 'USD',
    minimumFractionDigits: c.decimals ?? 2,
    maximumFractionDigits: c.decimals ?? 2,
  })
  const s = nf.format(Number(value))
  // Intl already positions based on locale; if user wants explicit symbol position, enforce lightly.
  if (!c.symbol) return s
  const stripped = s.replace(/[^\d.,\- ]/g, '').trim()
  return c.position === 'suffix' ? `${stripped} ${c.symbol}` : `${c.symbol} ${stripped}`
}

function datePartsByFormat(date, dateFormat, timeZone) {
  const tz = safeTz(timeZone)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const m = {}
  for (const p of parts) if (p.type !== 'literal') m[p.type] = p.value
  const Y = m.year
  const M = m.month
  const D = m.day
  if (dateFormat === 'DD-MM-YYYY') return `${D}-${M}-${Y}`
  if (dateFormat === 'MM-DD-YYYY') return `${M}-${D}-${Y}`
  return `${Y}-${M}-${D}`
}

export function formatDate(isoOrDate, settings = DEFAULT_SETTINGS) {
  if (!isoOrDate) return '-'
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return '-'
  const dt = settings?.dateTime || DEFAULT_SETTINGS.dateTime
  return datePartsByFormat(d, dt.dateFormat, dt.timezone)
}

export function formatTime(isoOrDate, settings = DEFAULT_SETTINGS) {
  if (!isoOrDate) return '-'
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return '-'
  const dt = settings?.dateTime || DEFAULT_SETTINGS.dateTime
  const tz = safeTz(dt.timezone)
  const hour12 = dt.timeFormat === '12h'
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  }).format(d)
}

export function formatDateTime(isoOrDate, settings = DEFAULT_SETTINGS) {
  if (!isoOrDate) return '-'
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return '-'
  return `${formatDate(d, settings)} ${formatTime(d, settings)}`
}




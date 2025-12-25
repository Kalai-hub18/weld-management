// Timezone utilities using Intl (no external deps)

export function isValidIanaTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return false
  try {
    // Throws RangeError if invalid
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

function partsToObj(parts) {
  const out = {}
  for (const p of parts) {
    if (p.type !== 'literal') out[p.type] = p.value
  }
  return out
}

// Convert a local date+time in a specific IANA timezone into a UTC Date.
// - dateStr: 'YYYY-MM-DD'
// - timeStr: 'HH:MM'
// Uses an iterative correction approach (handles DST).
export function zonedLocalToUtcDate({ dateStr, timeStr, timeZone }) {
  if (!dateStr || !timeStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)

  // initial guess: treat local time as UTC
  let guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0)

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const targetMinutes = (((y * 12 + m) * 31 + d) * 24 + hh) * 60 + mm

  for (let i = 0; i < 3; i++) {
    const parts = partsToObj(fmt.formatToParts(new Date(guess)))
    const ly = Number(parts.year)
    const lm = Number(parts.month)
    const ld = Number(parts.day)
    const lhh = Number(parts.hour)
    const lmm = Number(parts.minute)
    const localMinutes = (((ly * 12 + lm) * 31 + ld) * 24 + lhh) * 60 + lmm
    const delta = localMinutes - targetMinutes
    if (delta === 0) break
    guess -= delta * 60 * 1000
  }

  return new Date(guess)
}

export function minutesBetween(a, b) {
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 60000)
}




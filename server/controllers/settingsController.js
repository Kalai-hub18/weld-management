import Settings from '../models/Settings.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'
import { isValidIanaTimeZone } from '../utils/dateTime.js'

export const DEFAULT_WORKSPACE_ID = 'default'

export function getDefaultSettingsDoc(workspaceId) {
  return {
    workspaceId,
    currency: { code: 'USD', symbol: '$', position: 'prefix', decimals: 2 },
    dateTime: { timezone: 'UTC', dateFormat: 'YYYY-MM-DD', timeFormat: '24h' },
    theme: { primary: '#FF6A00', secondary: '#1E293B', accent: '#0EA5E9', background: '#F8FAFC', fontSize: 14 },
  }
}

async function findOrCreateSettings(workspaceId) {
  const existing = await Settings.findOne({ workspaceId })
  if (existing) return existing
  return await Settings.create(getDefaultSettingsDoc(workspaceId))
}

function sanitizeSettings(settings) {
  // Ensure we never send mongoose internals in a "settings export"
  return {
    workspaceId: settings.workspaceId,
    currency: settings.currency,
    dateTime: settings.dateTime,
    theme: settings.theme,
  }
}

function validateTimezoneOrThrow(tz) {
  if (!tz) return
  if (!isValidIanaTimeZone(tz)) {
    const err = new Error('Invalid timezone')
    err.statusCode = 400
    throw err
  }
}

function buildPreviewPayload(settings) {
  // For now: return settings + computed css vars; frontend can apply immediately.
  return {
    settings: sanitizeSettings(settings),
    cssVars: {
      '--wm-primary': settings.theme?.primary,
      '--wm-secondary': settings.theme?.secondary,
      '--wm-accent': settings.theme?.accent,
      '--wm-bg': settings.theme?.background,
      '--wm-font-size': `${settings.theme?.fontSize || 14}px`,
    },
  }
}

// GET /api/settings/:workspaceId
export const getSettings = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId || DEFAULT_WORKSPACE_ID
  const settings = await findOrCreateSettings(workspaceId)
  return res.json({
    success: true,
    data: sanitizeSettings(settings),
  })
})

// PUT /api/settings/:workspaceId
export const updateSettings = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId || DEFAULT_WORKSPACE_ID

  validateTimezoneOrThrow(req.body?.dateTime?.timezone)

  const existing = await findOrCreateSettings(workspaceId)
  const next = {
    currency: req.body.currency ?? existing.currency,
    dateTime: req.body.dateTime ?? existing.dateTime,
    theme: req.body.theme ?? existing.theme,
    updatedBy: req.user?._id,
  }

  const updated = await Settings.findOneAndUpdate(
    { workspaceId },
    { $set: next },
    { new: true, runValidators: true }
  )

  return res.json({
    success: true,
    data: sanitizeSettings(updated),
    message: 'Settings saved',
  })
})

// POST /api/settings/:workspaceId/preview
export const previewSettings = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId || DEFAULT_WORKSPACE_ID

  validateTimezoneOrThrow(req.body?.dateTime?.timezone)

  const existing = await findOrCreateSettings(workspaceId)
  const merged = {
    ...existing.toObject(),
    currency: req.body.currency ?? existing.currency,
    dateTime: req.body.dateTime ?? existing.dateTime,
    theme: req.body.theme ?? existing.theme,
  }

  return res.json({
    success: true,
    data: buildPreviewPayload(merged),
  })
})




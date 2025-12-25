import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import BusinessIcon from '@mui/icons-material/Business'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { CURRENCY_OPTIONS } from '../../constants/currencies'
import { contrastRatio, isHex6 } from '../../utils/color'
import { formatCurrency } from '../../utils/formatters'
import { formatDateTime } from '../../utils/formatters'

const DATE_FORMATS = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']
const TIME_FORMATS = ['12h', '24h']

const DEFAULT_CURRENCY = { code: 'USD', symbol: '$', position: 'prefix', decimals: 2 }

const isValidCurrencyCode = (code) => /^[A-Z]{3}$/.test(code || '')

const applyThemeCssVars = (theme = {}) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme.primary) root.style.setProperty('--wm-primary', String(theme.primary))
  if (theme.secondary) root.style.setProperty('--wm-secondary', String(theme.secondary))
  if (theme.accent) root.style.setProperty('--wm-accent', String(theme.accent))
  if (theme.background) root.style.setProperty('--wm-bg', String(theme.background))
  if (theme.fontSize) root.style.setProperty('--wm-font-size', `${Number(theme.fontSize)}px`)
}

const ColorField = ({ label, value, onChange }) => {
  const safe = isHex6(value) ? value : '#000000'
  return (
    <div className="flex items-center gap-3">
      <input
        aria-label={`${label} color picker`}
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-10 w-12 rounded-lg border border-light-border dark:border-dark-border bg-transparent"
      />
      <TextField
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="#RRGGBB"
        error={Boolean(value) && !isHex6(value)}
        helperText={Boolean(value) && !isHex6(value) ? 'Use #RRGGBB' : ' '}
        fullWidth
      />
    </div>
  )
}

const SettingsPage = () => {
  const navigate = useNavigate()
  const { hasPermission, user } = useAuth()
  const { settings, save, preview } = useSettings()
  const [draft, setDraft] = useState(settings)
  const [savingSection, setSavingSection] = useState(null) // 'currency' | 'dateTime' | 'theme' | null
  const [previewing, setPreviewing] = useState(false)
  const [livePreview, setLivePreview] = useState(true)
  const savedThemeRef = useRef(settings?.theme)
  const canManageSettings = hasPermission('canManageSettings')

  useEffect(() => setDraft(settings), [settings])
  useEffect(() => {
    savedThemeRef.current = settings?.theme
  }, [settings?.theme])

  const timeZones = useMemo(() => {
    // supportedValuesOf is not available in all browsers; keep fallback.
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return ['UTC']
    }
  }, [])

  const selectedTimezone = useMemo(() => {
    const tz = draft?.dateTime?.timezone || 'UTC'
    return tz
  }, [draft?.dateTime?.timezone])

  const validateCurrency = () => {
    const c = draft.currency || DEFAULT_CURRENCY
    if (!isValidCurrencyCode(c.code)) return 'Currency code must be 3 uppercase letters (e.g., INR, USD)'
    if (!c.symbol) return 'Currency symbol is required'
    if (!['prefix', 'suffix'].includes(c.position)) return 'Currency position must be prefix or suffix'
    if (c.decimals < 0 || c.decimals > 6) return 'Currency decimals must be 0-6'
    return null
  }

  const validateDateTime = () => {
    const dt = draft.dateTime || {}
    if (!dt.timezone) return 'Timezone is required'
    if (!DATE_FORMATS.includes(dt.dateFormat)) return 'Date format is invalid'
    if (!TIME_FORMATS.includes(dt.timeFormat)) return 'Time format is invalid'
    return null
  }

  const validateTheme = () => {
    const t = draft.theme || {}
    if (t.primary && !isHex6(t.primary)) return 'Primary color must be hex (#RRGGBB)'
    if (t.secondary && !isHex6(t.secondary)) return 'Secondary color must be hex (#RRGGBB)'
    if (t.accent && !isHex6(t.accent)) return 'Accent color must be hex (#RRGGBB)'
    if (t.background && !isHex6(t.background)) return 'Background color must be hex (#RRGGBB)'
    if (t.fontSize && (t.fontSize < 10 || t.fontSize > 22)) return 'Font size must be 10-22'
    return null
  }

  // Backward compatible: validate everything (used by Import, etc.)
  const validateDraft = () => validateCurrency() || validateDateTime() || validateTheme()

  const handleExport = () => {
    const data = JSON.stringify(draft, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workspace-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      setDraft((prev) => ({
        ...prev,
        ...json,
        currency: { ...(prev.currency || {}), ...(json.currency || {}) },
        dateTime: { ...(prev.dateTime || {}), ...(json.dateTime || {}) },
        theme: { ...(prev.theme || {}), ...(json.theme || {}) },
      }))
      toast.success('Imported settings into draft (not saved yet)')
    } catch {
      toast.error('Invalid settings JSON file')
    }
  }

  const applyPreviewCssVars = (cssVars) => {
    if (!cssVars || typeof document === 'undefined') return
    for (const [k, v] of Object.entries(cssVars)) {
      document.documentElement.style.setProperty(k, String(v))
    }
  }

  const themePreviewSafe = useMemo(() => {
    const t = draft?.theme || {}
    // Only feed MUI valid values to avoid hard crashes while the user is typing.
    return {
      ...(isHex6(t.primary) ? { primary: t.primary } : {}),
      ...(isHex6(t.secondary) ? { secondary: t.secondary } : {}),
      ...(isHex6(t.accent) ? { accent: t.accent } : {}),
      ...(isHex6(t.background) ? { background: t.background } : {}),
      ...(typeof t.fontSize === 'number' && t.fontSize >= 10 && t.fontSize <= 22 ? { fontSize: t.fontSize } : {}),
    }
  }, [draft?.theme])

  // Live preview: apply theme changes instantly (no save).
  useEffect(() => {
    if (!livePreview) return
    applyThemeCssVars(themePreviewSafe)
  }, [livePreview, themePreviewSafe])

  // On unmount, revert any preview back to saved settings.
  useEffect(() => {
    return () => {
      applyThemeCssVars(savedThemeRef.current || {})
    }
  }, [])

  const contrast = useMemo(() => {
    const t = draft?.theme || {}
    const bg = t.background
    if (!isHex6(bg)) return { ok: true, rows: [] }

    const rows = [
      { label: 'Primary vs Background', ratio: contrastRatio(t.primary, bg) },
      { label: 'Secondary vs Background', ratio: contrastRatio(t.secondary, bg) },
      { label: 'Accent vs Background', ratio: contrastRatio(t.accent, bg) },
    ]
      .filter((r) => typeof r.ratio === 'number')
      .map((r) => ({ ...r, ratio: Number(r.ratio.toFixed(2)) }))

    // Basic enterprise safety check (UI tokens): require >= 3.0 contrast.
    const ok = rows.every((r) => r.ratio >= 3.0)
    return { ok, rows }
  }, [draft?.theme])

  const selectedCurrencyOption = useMemo(() => {
    const code = draft?.currency?.code
    if (!code) return null
    return CURRENCY_OPTIONS.find((o) => o.code === code) || null
  }, [draft?.currency?.code])

  const handlePreview = async () => {
    const err = validateTheme()
    if (err) return toast.error(err)
    if (!canManageSettings) return toast.error('You do not have permission to preview/save settings')
    setPreviewing(true)
    try {
      const res = await preview({
        theme: draft.theme,
      })
      applyPreviewCssVars(res.data?.cssVars)
      toast.success('Preview applied')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  const saveCurrency = async () => {
    const err = validateCurrency()
    if (err) return toast.error(err)
    if (!canManageSettings) return toast.error('You do not have permission to save settings')
    setSavingSection('currency')
    try {
      await save({ currency: draft.currency })
      toast.success('Currency saved')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed')
    } finally {
      setSavingSection(null)
    }
  }

  const saveDateTime = async () => {
    const err = validateDateTime()
    if (err) return toast.error(err)
    if (!canManageSettings) return toast.error('You do not have permission to save settings')
    setSavingSection('dateTime')
    try {
      await save({ dateTime: draft.dateTime })
      toast.success('Date & time saved')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed')
    } finally {
      setSavingSection(null)
    }
  }

  const saveTheme = async () => {
    const err = validateTheme()
    if (err) return toast.error(err)
    if (!canManageSettings) return toast.error('You do not have permission to save settings')
    setSavingSection('theme')
    try {
      await save({ theme: draft.theme })
      toast.success(!contrast.ok ? 'Theme saved (contrast warning)' : 'Theme saved')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed')
    } finally {
      setSavingSection(null)
    }
  }

  const handleRevertPreview = () => {
    applyThemeCssVars(savedThemeRef.current || {})
    toast.success('Preview reverted')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">Settings</h1>
          <p className="text-neutral-500">Currency, date/time, theme & export/import</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outlined" onClick={handleExport}>Export JSON</Button>
          <Button variant="outlined" component="label">
            Import JSON
            <input hidden type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
          </Button>
        </div>
      </div>

      {/* Company Settings Card */}
      {canManageSettings && (
        <Card
          className="premium-card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/settings/company')}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <BusinessIcon className="text-primary" sx={{ fontSize: 32 }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                  Company Settings
                </h3>
                <p className="text-sm text-neutral-500">
                  Manage company branding, logo, and business details
                </p>
              </div>
            </div>
            <ChevronRightIcon className="text-neutral-400" />
          </CardContent>
        </Card>
      )}

      <div className="premium-card p-6 space-y-6">
        {!canManageSettings && (
          <Alert severity="info">
            You are logged in as <b>{user?.role || 'Unknown'}</b>. Only <b>Admin</b> can change workspace settings.
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Currency</h2>
          <Button variant="contained" onClick={saveCurrency} disabled={!canManageSettings || savingSection === 'currency'}>
            {savingSection === 'currency' ? 'Saving…' : 'Save Currency'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Autocomplete
            options={CURRENCY_OPTIONS}
            value={selectedCurrencyOption}
            onChange={(_, opt) => {
              if (!opt) return
              setDraft((p) => ({
                ...p,
                currency: {
                  ...(p.currency || {}),
                  code: opt.code,
                  symbol: opt.symbol,
                  decimals: opt.decimals,
                  position: opt.position || 'prefix',
                },
              }))
            }}
            getOptionLabel={(o) => `${o.code} — ${o.name}`}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            renderInput={(params) => (
              <TextField {...params} label="Currency" placeholder="Search: INR, USD, Rupee…" />
            )}
            disabled={!canManageSettings}
          />
          <TextField
            label="Symbol"
            value={draft.currency?.symbol || ''}
            onChange={(e) => setDraft((p) => ({ ...p, currency: { ...(p.currency || {}), symbol: e.target.value } }))}
            placeholder="$"
            disabled={!canManageSettings}
          />
          <FormControl>
            <InputLabel>Position</InputLabel>
            <Select
              label="Position"
              value={draft.currency?.position || 'prefix'}
              onChange={(e) => setDraft((p) => ({ ...p, currency: { ...(p.currency || {}), position: e.target.value } }))}
              disabled={!canManageSettings}
            >
              <MenuItem value="prefix">Prefix</MenuItem>
              <MenuItem value="suffix">Suffix</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Decimals"
            type="number"
            value={draft.currency?.decimals ?? 2}
            onChange={(e) => setDraft((p) => ({ ...p, currency: { ...(p.currency || {}), decimals: Number(e.target.value) } }))}
            inputProps={{ min: 0, max: 6 }}
            disabled={!canManageSettings}
          />
        </div>
        <div className="text-sm text-neutral-500">
          Example: <span className="font-semibold text-light-text dark:text-dark-text">{formatCurrency(1234567.89, draft)}</span>
        </div>

        <Divider />

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Date & Time</h2>
          <Button variant="contained" onClick={saveDateTime} disabled={!canManageSettings || savingSection === 'dateTime'}>
            {savingSection === 'dateTime' ? 'Saving…' : 'Save Date & Time'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Autocomplete
            options={timeZones}
            value={selectedTimezone}
            onChange={(_, tz) => {
              if (!tz) return
              setDraft((p) => ({ ...p, dateTime: { ...(p.dateTime || {}), timezone: tz } }))
            }}
            renderInput={(params) => (
              <TextField {...params} label="Timezone" placeholder="Search timezone (e.g., Asia/Kolkata)" />
            )}
            disabled={!canManageSettings}
            autoHighlight
          />
          <FormControl>
            <InputLabel>Date Format</InputLabel>
            <Select
              label="Date Format"
              value={draft.dateTime?.dateFormat || 'YYYY-MM-DD'}
              onChange={(e) => setDraft((p) => ({ ...p, dateTime: { ...(p.dateTime || {}), dateFormat: e.target.value } }))}
              disabled={!canManageSettings}
            >
              {DATE_FORMATS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Time Format</InputLabel>
            <Select
              label="Time Format"
              value={draft.dateTime?.timeFormat || '24h'}
              onChange={(e) => setDraft((p) => ({ ...p, dateTime: { ...(p.dateTime || {}), timeFormat: e.target.value } }))}
              disabled={!canManageSettings}
            >
              {TIME_FORMATS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
        </div>
        <div className="text-sm text-neutral-500">
          Example: <span className="font-semibold text-light-text dark:text-dark-text">{formatDateTime(new Date(), draft)}</span>
        </div>

        <Divider />

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Theme</h2>
          <Button variant="contained" onClick={saveTheme} disabled={!canManageSettings || savingSection === 'theme'}>
            {savingSection === 'theme' ? 'Saving…' : 'Save Theme'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField
            label="Primary"
            value={draft.theme?.primary || ''}
            onChange={(v) => setDraft((p) => ({ ...p, theme: { ...(p.theme || {}), primary: v } }))}
          />
          <ColorField
            label="Secondary"
            value={draft.theme?.secondary || ''}
            onChange={(v) => setDraft((p) => ({ ...p, theme: { ...(p.theme || {}), secondary: v } }))}
          />
          <ColorField
            label="Accent"
            value={draft.theme?.accent || ''}
            onChange={(v) => setDraft((p) => ({ ...p, theme: { ...(p.theme || {}), accent: v } }))}
          />
          <ColorField
            label="Background"
            value={draft.theme?.background || ''}
            onChange={(v) => setDraft((p) => ({ ...p, theme: { ...(p.theme || {}), background: v } }))}
          />
          <TextField
            label="Font Size"
            type="number"
            value={draft.theme?.fontSize ?? 14}
            onChange={(e) => setDraft((p) => ({ ...p, theme: { ...(p.theme || {}), fontSize: Number(e.target.value) } }))}
            inputProps={{ min: 10, max: 22 }}
          />
          <FormControlLabel
            control={<Switch checked={livePreview} onChange={(e) => setLivePreview(e.target.checked)} />}
            label="Live preview"
          />
        </div>

        {!contrast.ok && contrast.rows.length > 0 && (
          <Alert severity="warning">
            Contrast warning (target ≥ 3.0). This will not block saving Currency/Date-Time:{' '}
            {contrast.rows.map((r) => `${r.label}: ${r.ratio}`).join(' • ')}
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outlined" onClick={handlePreview} disabled={previewing || !canManageSettings}>
            {previewing ? 'Previewing…' : 'Preview'}
          </Button>
          <Button variant="outlined" onClick={handleRevertPreview}>
            Revert preview
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage




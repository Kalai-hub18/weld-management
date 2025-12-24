import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import settingsService from '../services/settingsService'
import { DEFAULT_SETTINGS } from '../utils/formatters'

const SettingsContext = createContext(null)

export const useSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}

const mergeSettings = (base, next) => ({
  currency: { ...(base?.currency || {}), ...(next?.currency || {}) },
  dateTime: { ...(base?.dateTime || {}), ...(next?.dateTime || {}) },
  theme: { ...(base?.theme || {}), ...(next?.theme || {}) },
})

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)

  const workspaceId = settingsService.workspaceId

  const refresh = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      // settingsService returns backend payload: { success, data: { currency, dateTime, theme, workspaceId } }
      const res = await settingsService.getSettings(workspaceId)
      setSettings((prev) => mergeSettings(prev, res?.data))
    } finally {
      setLoading(false)
    }
  }

  const save = async (partial) => {
    const res = await settingsService.updateSettings(workspaceId, partial)
    setSettings((prev) => mergeSettings(prev, res?.data))
    return res
  }

  const preview = async (partial) => {
    const res = await settingsService.previewSettings(workspaceId, partial)
    return res
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const value = useMemo(
    () => ({
      workspaceId,
      settings,
      setSettings,
      loading,
      refresh,
      save,
      preview,
    }),
    [workspaceId, settings, loading]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}




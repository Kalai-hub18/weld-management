import { Toaster } from 'react-hot-toast'
import { useEffect, useMemo, useState } from 'react'
import { useTheme } from './context/ThemeContext'
import { useSettings } from './context/SettingsContext'
import AppRouter from './router/AppRouter'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

function App() {
  const { isDarkMode } = useTheme()
  const { settings } = useSettings()

  const HEX6_RE = /^#([0-9a-fA-F]{6})$/
  const [cssVarsTheme, setCssVarsTheme] = useState(null)

  // Apply saved settings to CSS variables (once per settings change).
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const baseFontSize = settings?.theme?.fontSize || 14
    root.style.setProperty('--wm-primary', settings?.theme?.primary || '#FF6A00')
    root.style.setProperty('--wm-secondary', settings?.theme?.secondary || '#1E293B')
    root.style.setProperty('--wm-accent', settings?.theme?.accent || '#0EA5E9')
    root.style.setProperty('--wm-bg', settings?.theme?.background || '#F8FAFC')
    root.style.setProperty('--wm-font-size', `${baseFontSize}px`)
  }, [
    settings?.theme?.primary,
    settings?.theme?.secondary,
    settings?.theme?.accent,
    settings?.theme?.background,
    settings?.theme?.fontSize,
  ])

  // Observe CSS variable changes (Settings live preview) and feed *real* hex values into MUI.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const read = () => {
      const cs = getComputedStyle(root)
      const primary = cs.getPropertyValue('--wm-primary').trim()
      const secondary = cs.getPropertyValue('--wm-secondary').trim()
      const bg = cs.getPropertyValue('--wm-bg').trim()
      const fontSizeRaw = cs.getPropertyValue('--wm-font-size').trim()
      const fontSize = Number.parseInt(fontSizeRaw, 10)
      setCssVarsTheme({
        primary: HEX6_RE.test(primary) ? primary : null,
        secondary: HEX6_RE.test(secondary) ? secondary : null,
        background: HEX6_RE.test(bg) ? bg : null,
        fontSize: Number.isFinite(fontSize) ? fontSize : null,
      })
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(root, { attributes: true, attributeFilter: ['style'] })
    return () => obs.disconnect()
  }, [])

  const primaryMain = cssVarsTheme?.primary || settings?.theme?.primary || '#FF6A00'
  const secondaryMain = cssVarsTheme?.secondary || settings?.theme?.secondary || '#1E293B'
  const bgDefault = isDarkMode ? '#0F172A' : (cssVarsTheme?.background || settings?.theme?.background || '#F8FAFC')
  const bgPaper = isDarkMode ? '#1E293B' : '#FFFFFF'
  const baseFontSize = cssVarsTheme?.fontSize || settings?.theme?.fontSize || 14

  // MUI Theme Configuration
  const muiTheme = useMemo(() => createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: primaryMain,
        dark: '#CC5500',
        light: '#FF8533',
      },
      secondary: {
        main: secondaryMain,
        dark: '#0F172A',
        light: '#334155',
      },
      success: {
        main: '#22C55E',
      },
      error: {
        main: '#EF4444',
      },
      warning: {
        main: '#F59E0B',
      },
      info: {
        main: '#0EA5E9',
      },
      background: {
        default: bgDefault,
        paper: bgPaper,
      },
      text: {
        primary: isDarkMode ? '#F1F5F9' : '#0F172A',
        secondary: isDarkMode ? '#94A3B8' : '#64748B',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: baseFontSize,
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '12px',
            padding: '10px 24px',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '16px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
            },
          },
        },
      },
    },
  }), [isDarkMode, primaryMain, secondaryMain, bgDefault, bgPaper, baseFontSize])

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: isDarkMode ? '#1E293B' : '#FFFFFF',
                color: isDarkMode ? '#F1F5F9' : '#0F172A',
                borderRadius: '12px',
                border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
              },
              success: {
                iconTheme: {
                  primary: '#22C55E',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </div>
      </div>
    </MuiThemeProvider>
  )
}

export default App

import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => createTheme({
    palette: {
        mode,
        primary: {
            main: '#FF6A00',
            contrastText: '#fff',
        },
        secondary: {
            main: '#1E293B',
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
            default: mode === 'dark' ? '#0F172A' : '#F8FAFC',
            paper: mode === 'dark' ? '#1E293B' : '#FFFFFF',
        },
        text: {
            primary: mode === 'dark' ? '#F1F5F9' : '#1E293B',
            secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 12, // xl rounded corners
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '12px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
                    },
                },
                containedPrimary: {
                    color: '#fff',
                }
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Remove default gradient in dark mode
                },
                rounded: {
                    borderRadius: '16px', // Slightly larger for cards
                }
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '16px',
                    boxShadow: mode === 'dark'
                        ? '0px 4px 20px rgba(0,0,0,0.4)'
                        : '0px 4px 20px rgba(0,0,0,0.05)',
                }
            }
        }
    },
});

export default getTheme;


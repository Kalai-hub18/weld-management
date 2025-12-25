// Brand Colors
export const colors = {
  // Primary Brand Color
  primary: {
    DEFAULT: '#FF6A00',
    dark: '#CC5500',
    light: '#FF8533',
    50: '#FFF5EB',
    100: '#FFE6CC',
    200: '#FFCC99',
    300: '#FFB366',
    400: '#FF9933',
    500: '#FF6A00',
    600: '#CC5500',
    700: '#994000',
    800: '#662A00',
    900: '#331500',
  },

  // Secondary Color
  secondary: {
    DEFAULT: '#1E293B',
    light: '#334155',
    dark: '#0F172A',
  },

  // Status Colors
  success: {
    DEFAULT: '#22C55E',
    light: '#4ADE80',
    dark: '#16A34A',
  },

  danger: {
    DEFAULT: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
  },

  warning: {
    DEFAULT: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },

  info: {
    DEFAULT: '#0EA5E9',
    light: '#38BDF8',
    dark: '#0284C7',
  },

  // Neutral Colors
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Theme-specific
  light: {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
  },

  dark: {
    bg: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    border: '#334155',
  },
}

// Chart Colors
export const chartColors = [
  '#FF6A00', // Primary
  '#0EA5E9', // Info
  '#22C55E', // Success
  '#F59E0B', // Warning
  '#EF4444', // Danger
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
]

// Status Color Map
export const statusColorMap = {
  // User Status
  active: colors.success.DEFAULT,
  inactive: colors.neutral[400],
  suspended: colors.danger.DEFAULT,
  'on-leave': colors.warning.DEFAULT,

  // Task/Project Status
  pending: colors.warning.DEFAULT,
  'in-progress': colors.info.DEFAULT,
  completed: colors.success.DEFAULT,
  cancelled: colors.neutral[400],
  'on-hold': colors.neutral[500],

  // Attendance Status
  present: colors.success.DEFAULT,
  absent: colors.danger.DEFAULT,
  'half-day': colors.warning.DEFAULT,

  // Payment Status
  paid: colors.success.DEFAULT,
  partial: colors.warning.DEFAULT,

  // Priority
  low: colors.success.DEFAULT,
  medium: colors.warning.DEFAULT,
  high: colors.danger.light,
  urgent: colors.danger.DEFAULT,
}

export default colors

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LEAVE: 'on-leave',
  HALF_DAY: 'half-day',
  // UI-only (we persist as status=present + overtime hours)
  OVERTIME: 'overtime',
  NOT_MARKED: 'not-marked',
}

export const STATUS_COLORS = {
  present: { bg: '#22c55e', light: 'rgba(34, 197, 94, 0.15)', text: '#16a34a', label: 'Present' },
  absent: { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.15)', text: '#dc2626', label: 'Absent' },
  'on-leave': { bg: '#f59e0b', light: 'rgba(245, 158, 11, 0.15)', text: '#d97706', label: 'On Leave' },
  'half-day': { bg: '#3b82f6', light: 'rgba(59, 130, 246, 0.15)', text: '#2563eb', label: 'Half Day' },
  overtime: { bg: '#a855f7', light: 'rgba(168, 85, 247, 0.15)', text: '#9333ea', label: 'Overtime' },
  'not-marked': { bg: '#94a3b8', light: 'rgba(148, 163, 184, 0.15)', text: '#64748b', label: 'Not Marked' },
  weekend: { bg: '#cbd5e1', light: 'rgba(203, 213, 225, 0.2)', text: '#64748b', label: 'Weekend' },
  holiday: { bg: '#fb7185', light: 'rgba(251, 113, 133, 0.15)', text: '#e11d48', label: 'Holiday' },
}

export const leaveTypes = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
]



import { useMemo } from 'react'
import { motion } from 'framer-motion'
import DayCell from './DayCell'

// Helper function to format date string (defined outside component)
const formatDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const CalendarGrid = ({
  year,
  month,
  attendanceData,
  onDateClick,
  selectedDate,
}) => {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      const prevMonthDay = new Date(year, month, -startingDay + i + 1)
      days.push({
        date: prevMonthDay,
        dateStr: formatDateStr(prevMonthDay),
        isCurrentMonth: false,
        dayNumber: prevMonthDay.getDate(),
      })
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({
        date,
        dateStr: formatDateStr(date),
        isCurrentMonth: true,
        dayNumber: day,
      })
    }

    // Add empty cells for days after the last of the month to complete the grid
    const remainingDays = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = new Date(year, month + 1, i)
      days.push({
        date: nextMonthDay,
        dateStr: formatDateStr(nextMonthDay),
        isCurrentMonth: false,
        dayNumber: i,
      })
    }

    return days
  }, [year, month])

  const isToday = (dateStr) => {
    const today = new Date()
    return formatDateStr(today) === dateStr
  }

  return (
    <div className="premium-card overflow-hidden">
      {/* Week Day Headers */}
      <div className="grid grid-cols-7 bg-neutral-50 dark:bg-neutral-800/50 border-b border-light-border dark:border-dark-border">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`p-3 text-center text-sm font-semibold ${
              index === 0 || index === 6
                ? 'text-danger/70'
                : 'text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayData = attendanceData[day.dateStr]
          
          return (
            <motion.div
              key={`${day.dateStr}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.01 }}
            >
              <DayCell
                day={day}
                dayData={dayData}
                isToday={isToday(day.dateStr)}
                isSelected={selectedDate === day.dateStr}
                onClick={() => day.isCurrentMonth && onDateClick(day.dateStr)}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarGrid

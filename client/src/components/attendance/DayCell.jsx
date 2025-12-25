import { useMemo } from 'react'
import Tooltip from '@mui/material/Tooltip'
import { ATTENDANCE_STATUS, STATUS_COLORS } from '../../constants/attendance'

const DayCell = ({
  day,
  dayData,
  isToday,
  isSelected,
  onClick,
}) => {
  // Calculate status summary for the day
  const statusSummary = useMemo(() => {
    if (!dayData || !dayData.workers.length) return null

    const summary = {
      present: 0,
      absent: 0,
      'on-leave': 0,
      'half-day': 0,
      overtime: 0,
      total: dayData.workers.length,
    }

    dayData.workers.forEach(worker => {
      if (worker.status === ATTENDANCE_STATUS.PRESENT) summary.present++
      else if (worker.status === ATTENDANCE_STATUS.ABSENT) summary.absent++
      else if (worker.status === ATTENDANCE_STATUS.LEAVE) summary['on-leave']++
      else if (worker.status === ATTENDANCE_STATUS.HALF_DAY) summary['half-day']++
      else if (worker.status === ATTENDANCE_STATUS.OVERTIME) {
        summary.present++
        summary.overtime++
      }
    })

    return summary
  }, [dayData])

  // Determine dominant status for cell background
  const getDominantStatus = () => {
    if (!statusSummary) return null
    if (dayData?.isWeekend) return 'weekend'
    if (dayData?.isHoliday) return 'holiday'

    const { present, absent } = statusSummary
    const onLeave = statusSummary['on-leave']
    const total = present + absent + onLeave + statusSummary['half-day']

    if (total === 0) return 'not-marked'
    if (present === total) return 'present'
    if (absent > 0 && absent >= present) return 'absent'
    if (onLeave > 0 && onLeave >= present) return 'on-leave'
    return 'present'
  }

  const dominantStatus = getDominantStatus()
  const statusColor = dominantStatus ? STATUS_COLORS[dominantStatus] : STATUS_COLORS['not-marked']

  const TooltipContent = () => (
    <div className="p-2 min-w-[150px]">
      <p className="font-semibold mb-2">{formatDate(day.dateStr)}</p>
      {dayData?.isWeekend ? (
        <p className="text-neutral-400">Weekend</p>
      ) : dayData?.isHoliday ? (
        <p className="text-pink-400">{dayData.holidayName}</p>
      ) : statusSummary ? (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-green-400">Present:</span>
            <span>{statusSummary.present}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-400">Absent:</span>
            <span>{statusSummary.absent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yellow-400">Leave:</span>
            <span>{statusSummary['on-leave']}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-400">Half Day:</span>
            <span>{statusSummary['half-day']}</span>
          </div>
          {statusSummary.overtime > 0 && (
            <div className="flex justify-between">
              <span className="text-purple-400">OT:</span>
              <span>{statusSummary.overtime}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-neutral-400">No data</p>
      )}
    </div>
  )

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <Tooltip
      title={day.isCurrentMonth ? <TooltipContent /> : ''}
      arrow
      placement="top"
    >
      <div
        onClick={onClick}
        className={`
          relative min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-light-border dark:border-dark-border
          transition-all duration-200
          ${day.isCurrentMonth ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : 'bg-neutral-50/50 dark:bg-neutral-900/30'}
          ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
          ${isToday ? 'bg-primary/5' : ''}
        `}
      >
        {/* Day Number */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={`
              w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
              ${!day.isCurrentMonth ? 'text-neutral-300 dark:text-neutral-600' : ''}
              ${isToday ? 'bg-primary text-white' : ''}
              ${day.date.getDay() === 0 || day.date.getDay() === 6 ? 'text-danger/70' : 'text-light-text dark:text-dark-text'}
            `}
          >
            {day.dayNumber}
          </span>
          
          {/* OT indicator */}
          {statusSummary?.overtime > 0 && day.isCurrentMonth && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600">
              +OT
            </span>
          )}
        </div>

        {/* Status Indicators */}
        {day.isCurrentMonth && statusSummary && !dayData?.isWeekend && (
          <div className="space-y-1">
            {/* Status Bars */}
            <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {statusSummary.present > 0 && (
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(statusSummary.present / statusSummary.total) * 100}%`,
                    backgroundColor: STATUS_COLORS.present.bg,
                  }}
                />
              )}
              {statusSummary.absent > 0 && (
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(statusSummary.absent / statusSummary.total) * 100}%`,
                    backgroundColor: STATUS_COLORS.absent.bg,
                  }}
                />
              )}
              {statusSummary['on-leave'] > 0 && (
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(statusSummary['on-leave'] / statusSummary.total) * 100}%`,
                    backgroundColor: STATUS_COLORS['on-leave'].bg,
                  }}
                />
              )}
              {statusSummary['half-day'] > 0 && (
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(statusSummary['half-day'] / statusSummary.total) * 100}%`,
                    backgroundColor: STATUS_COLORS['half-day'].bg,
                  }}
                />
              )}
            </div>

            {/* Mini Stats */}
            <div className="hidden md:flex flex-wrap gap-1">
              {statusSummary.present > 0 && (
                <span
                  className="px-1 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: STATUS_COLORS.present.light,
                    color: STATUS_COLORS.present.text,
                  }}
                >
                  {statusSummary.present}P
                </span>
              )}
              {statusSummary.absent > 0 && (
                <span
                  className="px-1 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: STATUS_COLORS.absent.light,
                    color: STATUS_COLORS.absent.text,
                  }}
                >
                  {statusSummary.absent}A
                </span>
              )}
              {statusSummary['on-leave'] > 0 && (
                <span
                  className="px-1 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: STATUS_COLORS['on-leave'].light,
                    color: STATUS_COLORS['on-leave'].text,
                  }}
                >
                  {statusSummary['on-leave']}L
                </span>
              )}
              {statusSummary['half-day'] > 0 && (
                <span
                  className="px-1 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: STATUS_COLORS['half-day'].light,
                    color: STATUS_COLORS['half-day'].text,
                  }}
                >
                  {statusSummary['half-day']}H
                </span>
              )}
            </div>
          </div>
        )}

        {/* Weekend/Holiday Indicator */}
        {day.isCurrentMonth && dayData?.isWeekend && (
          <div className="absolute inset-x-0 bottom-2 px-2">
            <span className="block text-center text-[10px] text-neutral-400 uppercase tracking-wider">
              Weekend
            </span>
          </div>
        )}

        {dayData?.isHoliday && (
          <div className="absolute inset-x-0 bottom-2 px-2">
            <span className="block text-center text-[10px] text-pink-500 font-medium truncate">
              {dayData.holidayName}
            </span>
          </div>
        )}
      </div>
    </Tooltip>
  )
}

export default DayCell

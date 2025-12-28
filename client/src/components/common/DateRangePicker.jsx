import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CloseIcon from '@mui/icons-material/Close'

const DateRangePicker = ({ value, onChange, className = '' }) => {
    const [showPicker, setShowPicker] = useState(false)
    const [selectedPreset, setSelectedPreset] = useState('this-month')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    // Calculate date ranges based on preset
    const getDateRange = (preset) => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        switch (preset) {
            case 'today':
                return {
                    start: new Date(today),
                    end: new Date(today),
                    label: 'Today'
                }

            case 'yesterday':
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                return {
                    start: yesterday,
                    end: yesterday,
                    label: 'Yesterday'
                }

            case 'this-week':
                const dayOfWeek = now.getDay()
                const monday = new Date(today)
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
                return {
                    start: monday,
                    end: today,
                    label: 'This Week'
                }

            case 'last-week':
                const lastWeekEnd = new Date(today)
                lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
                const lastWeekStart = new Date(lastWeekEnd)
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
                return {
                    start: lastWeekStart,
                    end: lastWeekEnd,
                    label: 'Last Week'
                }

            case 'this-month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                return {
                    start: monthStart,
                    end: today,
                    label: 'This Month'
                }

            case 'last-month':
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
                return {
                    start: lastMonthStart,
                    end: lastMonthEnd,
                    label: 'Last Month'
                }

            case 'this-quarter':
                const quarter = Math.floor(now.getMonth() / 3)
                const quarterStart = new Date(now.getFullYear(), quarter * 3, 1)
                return {
                    start: quarterStart,
                    end: today,
                    label: 'This Quarter'
                }

            case 'custom':
                if (customStart && customEnd) {
                    return {
                        start: new Date(customStart),
                        end: new Date(customEnd),
                        label: 'Custom Range'
                    }
                }
                return null

            default:
                return null
        }
    }

    const presets = [
        { value: 'today', label: 'Today', icon: '📅' },
        { value: 'yesterday', label: 'Yesterday', icon: '📆' },
        { value: 'this-week', label: 'This Week', icon: '📊' },
        { value: 'last-week', label: 'Last Week', icon: '📋' },
        { value: 'this-month', label: 'This Month', icon: '🗓️' },
        { value: 'last-month', label: 'Last Month', icon: '📖' },
        { value: 'this-quarter', label: 'This Quarter', icon: '📈' },
        { value: 'custom', label: 'Custom Range', icon: '⚙️' }
    ]

    const handlePresetClick = (presetValue) => {
        setSelectedPreset(presetValue)

        if (presetValue !== 'custom') {
            const range = getDateRange(presetValue)
            if (range && onChange) {
                onChange(range)
            }
            setShowPicker(false)
        }
    }

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            const range = getDateRange('custom')
            if (range && onChange) {
                onChange(range)
            }
            setShowPicker(false)
        }
    }

    const formatDateDisplay = (range) => {
        if (!range) return 'Select Date Range'

        const formatDate = (date) => {
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        }

        if (range.start.toDateString() === range.end.toDateString()) {
            return formatDate(range.start)
        }

        return `${formatDate(range.start)} - ${formatDate(range.end)}`
    }

    return (
        <div className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-primary transition-colors"
            >
                <CalendarTodayIcon className="text-primary" fontSize="small" />
                <span className="text-sm font-medium text-light-text dark:text-dark-text">
                    {formatDateDisplay(value)}
                </span>
            </button>

            {/* Dropdown Picker */}
            <AnimatePresence>
                {showPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-96 bg-light-card dark:bg-dark-card rounded-xl shadow-2xl border border-light-border dark:border-dark-border z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
                            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                                Select Date Range
                            </h3>
                            <button
                                onClick={() => setShowPicker(false)}
                                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <CloseIcon fontSize="small" className="text-neutral-500" />
                            </button>
                        </div>

                        {/* Preset Options */}
                        <div className="p-4 space-y-2">
                            {presets.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => handlePresetClick(preset.value)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${selectedPreset === preset.value
                                        ? 'bg-primary/10 border-2 border-primary text-primary'
                                        : 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-2 border-transparent text-neutral-600 dark:text-neutral-300'
                                        }`}
                                >
                                    <span className="text-xl">{preset.icon}</span>
                                    <span className="font-medium">{preset.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Custom Date Inputs */}
                        {selectedPreset === 'custom' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="p-4 border-t border-light-border dark:border-dark-border space-y-3"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        max={customEnd || new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        min={customStart}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <button
                                    onClick={handleCustomApply}
                                    disabled={!customStart || !customEnd}
                                    className="w-full px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply Custom Range
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            {showPicker && (
                <div
                    onClick={() => setShowPicker(false)}
                    className="fixed inset-0 z-40"
                />
            )}
        </div>
    )
}

export default DateRangePicker

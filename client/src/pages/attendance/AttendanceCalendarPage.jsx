import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

// MUI Components
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

// MUI Icons
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import FilterListIcon from '@mui/icons-material/FilterList'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import PeopleIcon from '@mui/icons-material/People'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import ScheduleIcon from '@mui/icons-material/Schedule'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

// Components
import CalendarGrid from '../../components/attendance/CalendarGrid'
import AttendanceDrawer from '../../components/attendance/AttendanceDrawer'

import { ATTENDANCE_STATUS, STATUS_COLORS } from '../../constants/attendance'
import { attendanceService } from '../../services/attendanceService'
import workerService from '../../services/workerService'
import projectService from '../../services/projectService'

/**
 * Format date to YYYY-MM-DD without timezone conversion
 * Prevents "previous day" bug caused by UTC conversion
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
const formatDateToYYYYMMDD = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const AttendanceCalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [attendanceData, setAttendanceData] = useState({})
  const [workers, setWorkers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  
  // Filters
  const [selectedWorker, setSelectedWorker] = useState('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Get filtered data
  const filteredData = useMemo(() => {
    if (selectedWorker === 'all' && selectedProject === 'all' && selectedStatus === 'all') {
      return attendanceData
    }

    const filtered = {}
    Object.keys(attendanceData).forEach(dateKey => {
      const dayData = attendanceData[dateKey]
      const filteredWorkers = dayData.workers.filter(w => {
        const workerMatch = selectedWorker === 'all' || w.workerId === selectedWorker
        const projectMatch = selectedProject === 'all' || w.projectId === selectedProject
        const statusMatch = selectedStatus === 'all' || w.status === selectedStatus
        return workerMatch && projectMatch && statusMatch
      })
      
      filtered[dateKey] = {
        ...dayData,
        workers: filteredWorkers,
      }
    })
    return filtered
  }, [attendanceData, selectedWorker, selectedProject, selectedStatus])

  const summary = useMemo(() => {
    const allDays = Object.values(filteredData || {})
    const totals = {
      totalWorkers: workers.length,
      totalPresent: 0,
      totalAbsent: 0,
      totalLeave: 0,
      totalHalfDay: 0,
      totalOvertimeHours: 0,
      totalWorkingDays: 0,
    }

    allDays.forEach((day) => {
      if (!day?.workers?.length) return
      totals.totalWorkingDays += 1
      day.workers.forEach((w) => {
        if (w.status === ATTENDANCE_STATUS.PRESENT || w.status === ATTENDANCE_STATUS.OVERTIME) totals.totalPresent += 1
        else if (w.status === ATTENDANCE_STATUS.ABSENT) totals.totalAbsent += 1
        else if (w.status === ATTENDANCE_STATUS.LEAVE) totals.totalLeave += 1
        else if (w.status === ATTENDANCE_STATUS.HALF_DAY) totals.totalHalfDay += 1
        totals.totalOvertimeHours += Number(w.overtimeHours || 0)
      })
    })
    return totals
  }, [filteredData, workers.length])

  const normalizeId = (x) => x?.id || x?._id || x

  const buildMonthCalendar = (year, monthIndex, workerList, records) => {
    const month = monthIndex + 1
    const lastDay = new Date(year, monthIndex + 1, 0).getDate()
    const mapByDate = {}

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, monthIndex, day)
      const dateStr = formatDateToYYYYMMDD(date) // ✅ Fixed: No timezone conversion
      
      // ENTERPRISE RULE: Date-based worker filtering
      // Show worker ONLY IF:
      // - worker.status = 'active'
      // OR
      // - worker.status = 'inactive' AND date < worker.inactiveFrom
      const eligibleWorkers = workerList.filter((w) => {
        // Active workers always visible
        if (w.status === 'active') return true
        
        // Inactive workers: only show if date is before inactiveFrom
        if (w.status === 'inactive' && w.inactiveFrom) {
          const currentDate = new Date(dateStr)
          const inactiveFromDate = new Date(w.inactiveFrom)
          currentDate.setHours(0, 0, 0, 0)
          inactiveFromDate.setHours(0, 0, 0, 0)
          return currentDate < inactiveFromDate
        }
        
        // Hide other inactive workers
        return false
      })

      // ENTERPRISE UX: Track workers hidden by the inactiveFrom cut-off so the UI can explain it
      const hiddenWorkers = workerList
        .filter((w) => w?.status === 'inactive')
        .filter((w) => {
          if (!w.inactiveFrom) return true // inactive date not set -> hidden (and needs admin action)
          const currentDate = new Date(dateStr)
          const inactiveFromDate = new Date(w.inactiveFrom)
          currentDate.setHours(0, 0, 0, 0)
          inactiveFromDate.setHours(0, 0, 0, 0)
          return currentDate >= inactiveFromDate
        })
        .map((w) => ({
          workerId: normalizeId(w),
          name: w.name,
          inactiveFrom: w.inactiveFrom || null,
          reason: w.inactiveFrom ? 'inactive_cutoff' : 'inactive_date_missing',
        }))
      
      mapByDate[dateStr] = {
        date: dateStr,
        hiddenWorkers,
        workers: eligibleWorkers.map((w) => ({
          workerId: normalizeId(w),
          name: w.name,
          workerName: w.name, // legacy UI field expected by drawer
          workerStatus: w.status || 'active', // ENTERPRISE: Pass worker status for inactive filtering
          workerInactiveFrom: w.inactiveFrom || null, // ENTERPRISE: Pass inactiveFrom date
          status: ATTENDANCE_STATUS.NOT_MARKED,
          checkIn: '',
          checkOut: '',
          overtimeHours: 0,
          notes: '',
          projectId: '',
          attendanceId: null,
        })),
      }
    }

    records.forEach((rec) => {
      // ✅ Fixed: Parse date safely without timezone conversion
      const dateStr = typeof rec.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rec.date)
        ? rec.date // Already in correct format
        : formatDateToYYYYMMDD(new Date(rec.date))
      const workerId = normalizeId(rec.worker)
      if (!mapByDate[dateStr]) return
      const list = mapByDate[dateStr].workers
      const idx = list.findIndex((w) => w.workerId === workerId)
      if (idx === -1) return

      const overtimeHours = Number(rec.overtime || 0)
      const uiStatus = overtimeHours > 0 ? ATTENDANCE_STATUS.OVERTIME : rec.status
      list[idx] = {
        ...list[idx],
        status: uiStatus,
        checkIn: rec.checkIn || '',
        checkOut: rec.checkOut || '',
        overtimeHours,
        notes: rec.notes || '',
        projectId: normalizeId(rec.project) || '',
        workerName: rec.worker?.name || list[idx].workerName || list[idx].name || '',
        workerStatus: rec.worker?.status || list[idx].workerStatus || 'active', // ENTERPRISE: Preserve worker status
        attendanceId: normalizeId(rec),
      }
    })

    return mapByDate
  }

  useEffect(() => {
    const fetchMonth = async () => {
      try {
        setLoading(true)
        setLoadError('')
        const year = currentDate.getFullYear()
        const monthIndex = currentDate.getMonth()

        // ENTERPRISE RULE: For date-based filtering, we need to fetch workers for each day
        // For now, fetch all workers and filter client-side based on inactiveFrom
        // TODO: Optimize by fetching workers per-day if performance becomes an issue
        const [workersRes, projectsRes, attendanceRes] = await Promise.all([
          workerService.getAllWorkers({ 
            limit: 1000,
            // ENTERPRISE RULE: Always load ALL workers. Visibility is computed per-date.
            // This preserves historical attendance for workers who are inactive today.
            activeOnly: 'false',
          }),
          projectService.getAllProjects({ limit: 1000 }),
          attendanceService.getMonthlyAttendance(year, monthIndex + 1),
        ])

        const workerList = workersRes.data || []
        const projectList = projectsRes.data || []
        const records = attendanceRes.success ? (attendanceRes.data?.data || []) : []

        setWorkers(workerList)
        setProjects(projectList)
        setAttendanceData(buildMonthCalendar(year, monthIndex, workerList, records))
        if (!attendanceRes.success) {
          toast.error(attendanceRes.message || 'Failed to fetch attendance')
        }
      } catch (e) {
        console.error(e)
        const msg = e.response?.data?.message || e.message || 'Failed to load attendance data'
        setLoadError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }

    fetchMonth()
  }, [currentDate, reloadKey])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="premium-card p-6">
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">Unable to load attendance</h2>
        <p className="text-neutral-500 mt-2">{loadError}</p>
        <button className="btn-primary mt-4" onClick={handleRefresh}>Retry</button>
      </div>
    )
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleRefresh = () => {
    setReloadKey((k) => k + 1)
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setSelectedDate(null)
  }

  const handleAttendanceUpdate = async (dateStr, workerId, updates) => {
    const payload = {
      status: updates.status === ATTENDANCE_STATUS.OVERTIME ? ATTENDANCE_STATUS.PRESENT : updates.status,
      // Zod schema expects string|undefined (null will 400)
      checkIn: updates.checkIn ? updates.checkIn : undefined,
      checkOut: updates.checkOut ? updates.checkOut : undefined,
      overtime: Number(updates.overtimeHours || 0),
      notes: updates.notes || '',
      project: updates.projectId || undefined,
    }

    const result = await attendanceService.upsertAttendance(dateStr, workerId, payload)
    
    if (result.success) {
      const saved = result.data?.data
      const attendanceId = normalizeId(saved)
      // Update local state
      setAttendanceData(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          workers: prev[dateStr].workers.map(w =>
            w.workerId === workerId
              ? {
                ...w,
                ...updates,
                status: updates.status,
                projectId: updates.projectId || w.projectId || '',
                attendanceId: attendanceId || w.attendanceId || null,
              }
              : w
          ),
        },
      }))
    }
    
    return result
  }

  const handleBulkUpdate = async (dateStr, updates) => {
    const results = await Promise.all(
      updates.map((u) =>
        attendanceService.upsertAttendance(dateStr, u.workerId, {
          status: u.status === ATTENDANCE_STATUS.OVERTIME ? ATTENDANCE_STATUS.PRESENT : u.status,
          checkIn: u.checkIn ? u.checkIn : undefined,
          checkOut: u.checkOut ? u.checkOut : undefined,
          overtime: Number(u.overtimeHours || 0),
          notes: u.notes || '',
          project: u.projectId || undefined,
        })
      )
    )

    const success = results.every((r) => r.success)
    if (success) {
      const idMap = new Map()
      results.forEach((r) => {
        const saved = r.data?.data
        const wid = normalizeId(saved?.worker) || normalizeId(saved?.workerId)
        if (wid) idMap.set(wid, normalizeId(saved))
      })
      setAttendanceData(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          workers: prev[dateStr].workers.map(w => {
            const update = updates.find(u => u.workerId === w.workerId)
            return update
              ? {
                ...w,
                ...update,
                status: update.status,
                attendanceId: idMap.get(w.workerId) || w.attendanceId || null,
              }
              : w
          }),
        },
      }))
      toast.success(`Updated attendance for ${updates.length} workers`)
    } else {
      toast.error('Some attendance updates failed')
    }

    return { success }
  }

  const handleAttendanceDelete = async (dateStr, workerId, attendanceId) => {
    if (!attendanceId) return { success: false, message: 'No record to delete' }
    const result = await attendanceService.deleteAttendanceById(attendanceId)
    if (result.success) {
      setAttendanceData(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          workers: prev[dateStr].workers.map(w =>
            w.workerId === workerId
              ? {
                ...w,
                status: ATTENDANCE_STATUS.NOT_MARKED,
                checkIn: '',
                checkOut: '',
                overtimeHours: 0,
                notes: '',
                projectId: '',
                attendanceId: null,
              }
              : w
          ),
        },
      }))
      toast.success('Attendance record deleted')
    } else {
      toast.error(result.message || 'Failed to delete attendance record')
    }
    return result
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
            Attendance Calendar
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Track and manage workforce attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title="Export">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              showFilters ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <FilterListIcon fontSize="small" />
            Filters
          </button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={PeopleIcon}
          label="Total Workers"
          value={summary.totalWorkers}
          color="primary"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Present"
          value={summary.totalPresent}
          color="success"
        />
        <StatCard
          icon={CancelIcon}
          label="Absent"
          value={summary.totalAbsent}
          color="danger"
        />
        <StatCard
          icon={EventBusyIcon}
          label="On Leave"
          value={summary.totalLeave}
          color="warning"
        />
        <StatCard
          icon={ScheduleIcon}
          label="Half Days"
          value={summary.totalHalfDay}
          color="info"
        />
        <StatCard
          icon={TrendingUpIcon}
          label="OT Hours"
          value={`${summary.totalOvertimeHours}h`}
          color="purple"
        />
      </motion.div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="premium-card p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormControl fullWidth size="small">
              <InputLabel>Worker</InputLabel>
              <Select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                label="Worker"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="all">All Workers</MenuItem>
                {workers.map(worker => {
                  const wid = normalizeId(worker)
                  return (
                    <MenuItem key={wid} value={wid}>{worker.name}</MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Project</InputLabel>
              <Select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                label="Project"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="all">All Projects</MenuItem>
                {projects.map(project => {
                  const pid = normalizeId(project)
                  return (
                    <MenuItem key={pid} value={pid}>{project.name}</MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="Status"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value={ATTENDANCE_STATUS.PRESENT}>Present</MenuItem>
                <MenuItem value={ATTENDANCE_STATUS.ABSENT}>Absent</MenuItem>
                <MenuItem value={ATTENDANCE_STATUS.LEAVE}>Leave</MenuItem>
                <MenuItem value={ATTENDANCE_STATUS.HALF_DAY}>Half Day</MenuItem>
                <MenuItem value={ATTENDANCE_STATUS.OVERTIME}>Overtime</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Active Filters */}
          {(selectedWorker !== 'all' || selectedProject !== 'all' || selectedStatus !== 'all') && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-light-border dark:border-dark-border">
              <span className="text-sm text-neutral-500">Active:</span>
              {selectedWorker !== 'all' && (
                <Chip
                  size="small"
                  label={workers.find(w => normalizeId(w) === selectedWorker)?.name}
                  onDelete={() => setSelectedWorker('all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedProject !== 'all' && (
                <Chip
                  size="small"
                  label={projects.find(p => normalizeId(p) === selectedProject)?.name}
                  onDelete={() => setSelectedProject('all')}
                  color="secondary"
                  variant="outlined"
                />
              )}
              {selectedStatus !== 'all' && (
                <Chip
                  size="small"
                  label={selectedStatus}
                  onDelete={() => setSelectedStatus('all')}
                  color="info"
                  variant="outlined"
                  className="capitalize"
                />
              )}
              <button
                onClick={() => {
                  setSelectedWorker('all')
                  setSelectedProject('all')
                  setSelectedStatus('all')
                }}
                className="text-sm text-primary hover:underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Month Navigation & Legend */}
      <motion.div variants={itemVariants} className="premium-card p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Month Switcher */}
          <div className="flex items-center gap-4">
            <IconButton onClick={handlePrevMonth} className="!bg-neutral-100 dark:!bg-neutral-800">
              <ChevronLeftIcon />
            </IconButton>
            <div className="text-center min-w-[200px]">
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <p className="text-sm text-neutral-500">
                {summary.totalWorkingDays} working days
              </p>
            </div>
            <IconButton onClick={handleNextMonth} className="!bg-neutral-100 dark:!bg-neutral-800">
              <ChevronRightIcon />
            </IconButton>
            <Tooltip title="Go to Today">
              <IconButton onClick={handleToday} className="!bg-primary/10 !text-primary">
                <TodayIcon />
              </IconButton>
            </Tooltip>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(STATUS_COLORS).slice(0, 6).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: colors.bg }}
                />
                <span className="text-xs text-neutral-500 capitalize">
                  {status.replace('-', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div variants={itemVariants}>
        <CalendarGrid
          year={currentYear}
          month={currentMonth}
          attendanceData={filteredData}
          onDateClick={handleDateClick}
          selectedDate={selectedDate}
        />
      </motion.div>

      {/* Attendance Drawer */}
      <AttendanceDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        date={selectedDate}
        attendanceData={selectedDate ? filteredData[selectedDate] : null}
        workers={workers}
        projects={projects}
        onUpdateAttendance={handleAttendanceUpdate}
        onBulkUpdate={handleBulkUpdate}
        onDeleteAttendance={handleAttendanceDelete}
      />
    </motion.div>
  )
}

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20 text-primary',
    success: 'from-success/10 to-success/5 border-success/20 text-success',
    danger: 'from-danger/10 to-danger/5 border-danger/20 text-danger',
    warning: 'from-warning/10 to-warning/5 border-warning/20 text-warning',
    info: 'from-info/10 to-info/5 border-info/20 text-info',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-500',
  }

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon fontSize="small" />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default AttendanceCalendarPage

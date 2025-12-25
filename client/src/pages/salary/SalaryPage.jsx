import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// MUI Components
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'

// MUI Icons
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import DownloadIcon from '@mui/icons-material/Download'
import PrintIcon from '@mui/icons-material/Print'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableChartIcon from '@mui/icons-material/TableChart'
import RefreshIcon from '@mui/icons-material/Refresh'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PeopleIcon from '@mui/icons-material/People'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

// Components
import SalarySummaryCard from '../../components/salary/SalarySummaryCard'
import SalaryTable from '../../components/salary/SalaryTable'
import SalaryDetailsModal from '../../components/salary/SalaryDetailsModal'

import { STATUS_COLORS } from '../../constants/salary'
import salaryService from '../../services/salaryService'
import workerService from '../../services/workerService'
import { useSettings } from '../../context/SettingsContext'
import { formatDate } from '../../utils/formatters'

const SalaryPage = () => {
  const { settings } = useSettings()
  const getId = (x) => x?.id || x?._id || x

  const generateMonths = (count = 12) => {
    const list = []
    const now = new Date()
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      // Respect workspace date format (timezone also applied via settings)
      // Showing "month label" as date formatted value is a simple user-friendly improvement without adding a month formatter utility yet.
      const label = formatDate(d, settings)
      list.push({ value, label })
    }
    return list
  }

  const months = generateMonths()
  const todayYmd = new Date().toISOString().split('T')[0]
  const thisMonth = months[0]?.value
  const thisYear = String(new Date().getFullYear())

  const [period, setPeriod] = useState('monthly') // daily | weekly | monthly | yearly
  const [selectedDate, setSelectedDate] = useState(todayYmd) // daily/weekly
  const [selectedMonth, setSelectedMonth] = useState(thisMonth) // monthly
  const [selectedYear, setSelectedYear] = useState(thisYear) // yearly
  const [workerFilter, setWorkerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSalary, setSelectedSalary] = useState(null)
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null)
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)

  const toUiSalary = (s) => {
    const worker = s.worker || {}
    const monthLabel = months.find(m => m.value === s.month)?.label || s.month
    const dailyRate = worker.hourlyRate ? worker.hourlyRate * 8 : 0
    const otRate = worker.hourlyRate ? worker.hourlyRate * 1.5 : 0

    return {
      id: getId(s),
      salaryId: s._id?.slice(-6)?.toUpperCase() || getId(s),
      month: s.month,
      monthLabel,
      worker: {
        id: getId(worker),
        name: worker.name,
        employeeId: worker.employeeId,
        position: worker.position,
        department: worker.department,
        bankAccount: worker.accountNumber || worker.bankAccount,
      },
      attendance: {
        // Backend doesn't provide day counts yet; approximate from hoursWorked
        workingDays: 26,
        daysPresent: Math.round((s.hoursWorked || 0) / 8),
        daysAbsent: 0,
      },
      earnings: {
        baseSalary: s.baseSalary || 0,
        dailyRate,
        otHours: s.overtimeHours || 0,
        otRate,
        otEarnings: s.overtime || 0,
        bonus: s.bonus || 0,
        allowances: 0,
      },
      deductions: {
        pf: 0,
        esi: 0,
        tax: 0,
        advances: 0,
        halfDayDeduction: 0,
        otherDeductions: 0,
        totalDeductions: s.deductions || 0,
      },
      grossSalary: (s.baseSalary || 0) + (s.overtime || 0) + (s.bonus || 0),
      netSalary: s.netSalary || 0,
      status: s.status || 'pending',
      paidDate: s.paidDate,
      paymentMethod: s.paymentMethod,
      paidAmount: s.paidAmount,
      notes: s.notes,
      _raw: s,
    }
  }

  const toUiPayrollRow = (r) => {
    const worker = r.worker || {}
    const dailyRate = worker.paymentType === 'Monthly'
      ? ((worker.salaryMonthly || 0) / (worker.workingDaysPerMonth || 26))
      : (worker.salaryDaily || 0)

    const otRate = worker.overtimeRate || (worker.hourlyRate ? worker.hourlyRate * 1.5 : 0)

    return {
      id: getId(r) || `${getId(worker)}-${period}-${selectedMonth || selectedDate || selectedYear}`,
      salaryId: String(getId(r) || getId(worker) || '').slice(-6).toUpperCase() || 'PAY',
      month: r.month,
      monthLabel: r.month || '',
      worker: {
        id: getId(worker),
        name: worker.name,
        employeeId: worker.employeeId,
        position: worker.position,
        department: worker.department,
        bankAccount: worker.accountNumber || worker.bankAccount,
      },
      attendance: {
        workingDays: 0,
        daysPresent: r.attendance?.presentDays || 0,
        daysAbsent: 0,
      },
      earnings: {
        baseSalary: r.baseSalary || 0,
        dailyRate,
        otHours: r.overtime?.hours || 0,
        otRate,
        otEarnings: r.overtime?.amount || 0,
        bonus: r.bonus || 0,
        allowances: 0,
      },
      deductions: {
        pf: 0,
        esi: 0,
        tax: 0,
        advances: 0,
        halfDayDeduction: 0,
        otherDeductions: 0,
        totalDeductions: r.deductions || 0,
      },
      grossSalary: r.grossSalary || 0,
      netSalary: r.netSalary || 0,
      status: r.status || 'pending',
      paidDate: r.paidDate,
      paymentMethod: r.paymentMethod,
      paidAmount: r.paidAmount,
      notes: r.notes,
      _raw: r,
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [workersRes, salariesRes] = await Promise.all([
          workerService.getAllWorkers({ limit: 1000 }),
          salaryService.getPayrollView({
            period,
            date: period === 'daily' || period === 'weekly'
              ? selectedDate
              : period === 'yearly'
                ? selectedYear
                : selectedMonth,
            ...(workerFilter !== 'all' ? { worker: workerFilter } : {}),
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            workspaceId: 'default',
          }),
        ])

        setWorkers(workersRes.data || [])
        // All periods now use the payroll view format (rows)
        const rows = salariesRes.data?.rows || []
        setRecords(rows.map(toUiPayrollRow))
      } catch (e) {
        console.error(e)
        toast.error('Failed to load salary records')
      } finally {
        setLoading(false)
      }
    }

    if (period === 'monthly' && selectedMonth) fetchData()
    if ((period === 'daily' || period === 'weekly') && selectedDate) fetchData()
    if (period === 'yearly' && selectedYear) fetchData()
  }, [period, selectedMonth, selectedDate, selectedYear, workerFilter, statusFilter])

  // Filter salary records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesWorker = workerFilter === 'all' || record.worker.id === workerFilter
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      const matchesSearch =
        record.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.worker.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.salaryId.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesWorker && matchesStatus && matchesSearch
    })
  }, [records, workerFilter, statusFilter, searchTerm])

  const summary = useMemo(() => {
    const totalWorkers = filteredRecords.length
    const totalGross = filteredRecords.reduce((s, r) => s + (r.grossSalary || 0), 0)
    const totalDeductions = filteredRecords.reduce((s, r) => s + (r.deductions.totalDeductions || 0), 0)
    const totalNet = filteredRecords.reduce((s, r) => s + (r.netSalary || 0), 0)
    const totalOTHours = filteredRecords.reduce((s, r) => s + (r.earnings.otHours || 0), 0)
    const totalOTAmount = filteredRecords.reduce((s, r) => s + (r.earnings.otEarnings || 0), 0)
    const totalBonus = filteredRecords.reduce((s, r) => s + (r.earnings.bonus || 0), 0)
    const avgSalary = totalWorkers ? Math.round(totalNet / totalWorkers) : 0
    const paid = filteredRecords.filter(r => r.status === 'paid').length
    const processing = filteredRecords.filter(r => r.status === 'partial').length
    const pending = filteredRecords.filter(r => r.status === 'pending').length
    return {
      totalWorkers,
      totalGross,
      totalDeductions,
      totalNet,
      totalOTHours,
      totalOTAmount,
      totalBonus,
      avgSalary,
      paid,
      processing,
      pending,
    }
  }, [filteredRecords])

  // Header label for the selected period
  const currentMonthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth || ''
  const periodLabel = useMemo(() => {
    if (period === 'daily') return `Date: ${selectedDate}`
    if (period === 'weekly') return `Week of: ${selectedDate}`
    if (period === 'yearly') return `Year: ${selectedYear}`
    return currentMonthLabel
  }, [period, selectedDate, selectedYear, currentMonthLabel])

  const handleExportClick = (event) => {
    setExportMenuAnchor(event.currentTarget)
  }

  const handleExportClose = () => {
    setExportMenuAnchor(null)
  }

  const handleExport = (format) => {
    // In real app, would generate actual export
    console.log(`Exporting to ${format}...`)
    handleExportClose()
    // Show toast notification
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
      {loading && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
            Payroll Management
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage worker salaries and payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip title="Refresh Data">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <button
            onClick={handleExportClick}
            className="btn-primary flex items-center gap-2"
          >
            <DownloadIcon fontSize="small" />
            Export
          </button>
          {/* Export Menu */}
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportClose}
            PaperProps={{
              sx: { borderRadius: '12px', minWidth: 180 },
            }}
          >
            <MenuItem onClick={() => handleExport('pdf')}>
              <PictureAsPdfIcon fontSize="small" className="mr-2 text-danger" />
              Export as PDF
            </MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>
              <TableChartIcon fontSize="small" className="mr-2 text-success" />
              Export as Excel
            </MenuItem>
            <MenuItem onClick={() => handleExport('print')}>
              <PrintIcon fontSize="small" className="mr-2 text-info" />
              Print Report
            </MenuItem>
          </Menu>
        </div>
      </motion.div>

      {/* Period Selector & Quick Stats */}
      <motion.div variants={itemVariants} className="premium-card p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                label="Filter"
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>

            {period === 'monthly' && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Month</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  label="Select Month"
                  sx={{ borderRadius: '12px' }}
                >
                  {months.map(month => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {(period === 'daily' || period === 'weekly') && (
              <TextField
                size="small"
                label={period === 'daily' ? 'Select Date' : 'Select Any Date (Week)'}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 220 }}
              />
            )}

            {period === 'yearly' && (
              <TextField
                size="small"
                label="Select Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
                placeholder="YYYY"
              />
            )}

            <div className="hidden md:block">
              <p className="text-sm text-neutral-500">
                Showing payroll for <span className="font-semibold text-primary">{periodLabel}</span>
              </p>
              {period === 'weekly' && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tip: pick any date and we’ll calculate the full week automatically
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <QuickStat icon={PeopleIcon} label="Workers" value={summary.totalWorkers} />
            <QuickStat icon={CheckCircleIcon} label="Paid" value={summary.paid} color="success" />
            <QuickStat icon={PendingActionsIcon} label="Pending" value={summary.pending + summary.processing} color="warning" />
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants}>
        <SalarySummaryCard summary={summary} month={periodLabel} />
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <TextField
          placeholder="Search by name, employee ID..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon className="text-neutral-400" />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px' },
          }}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${showFilters
              ? 'bg-primary text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
        >
          <FilterListIcon fontSize="small" />
          Filters
        </button>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="premium-card p-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormControl fullWidth size="small">
                <InputLabel>Worker</InputLabel>
                <Select
                  value={workerFilter}
                  onChange={(e) => setWorkerFilter(e.target.value)}
                  label="Worker"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="all">All Workers</MenuItem>
                  {workers.map(worker => {
                    const wid = getId(worker)
                    return (
                      <MenuItem key={wid} value={wid}>
                        {worker.name} - {worker.position}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {Object.entries(STATUS_COLORS).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {(workerFilter !== 'all' || statusFilter !== 'all') && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-light-border dark:border-dark-border">
                <span className="text-sm text-neutral-500">Active filters:</span>
                <button
                  onClick={() => {
                    setWorkerFilter('all')
                    setStatusFilter('all')
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Salary Table */}
      <motion.div variants={itemVariants}>
        <SalaryTable
          records={filteredRecords}
          onRowClick={(record) => setSelectedSalary(record)}
        />
      </motion.div>

      {/* Empty State */}
      {filteredRecords.length === 0 && (
        <motion.div variants={itemVariants} className="premium-card p-12 text-center">
          <AccountBalanceWalletIcon className="text-neutral-300 dark:text-neutral-600 mx-auto mb-4" sx={{ fontSize: 64 }} />
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
            No payroll records found
          </h3>
          <p className="text-neutral-500 mb-4">
            Try adjusting your filters or select a different month
          </p>
        </motion.div>
      )}

      {/* Salary Details Modal */}
      <SalaryDetailsModal
        open={!!selectedSalary}
        onClose={() => setSelectedSalary(null)}
        salary={selectedSalary}
      />
    </motion.div>
  )
}

// Quick Stat Component
const QuickStat = ({ icon: Icon, label, value, color = 'primary' }) => {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }

  return (
    <div className="flex items-center gap-2">
      <Icon fontSize="small" className={colorClasses[color]} />
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className={`text-lg font-bold ${colorClasses[color]}`}>{value}</p>
      </div>
    </div>
  )
}

export default SalaryPage

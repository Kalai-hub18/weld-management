import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'

// MUI Components
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'

// MUI Icons
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BadgeIcon from '@mui/icons-material/Badge'
import CakeIcon from '@mui/icons-material/Cake'
import WorkIcon from '@mui/icons-material/Work'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ArchiveIcon from '@mui/icons-material/Archive'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupIcon from '@mui/icons-material/Group'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import StarIcon from '@mui/icons-material/Star'
import PrintIcon from '@mui/icons-material/Print'
import ShareIcon from '@mui/icons-material/Share'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

// Components
import EditWorkerDialog from '../../components/workers/EditWorkerDialog'
import DeleteWorkerDialog from '../../components/workers/DeleteWorkerDialog'
import SalaryPaymentModal from '../../components/workers/SalaryPaymentModal'

import workerService from '../../services/workerService'
import salaryService from '../../services/salaryService'
import toast from 'react-hot-toast'
import { useSettings } from '../../context/SettingsContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

const WorkerProfilePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()

  const [worker, setWorker] = useState(null)
  const [tasks, setTasks] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false)
  const [ledgerEditOpen, setLedgerEditOpen] = useState(false)
  const [ledgerVoidOpen, setLedgerVoidOpen] = useState(false)
  const [ledgerSelected, setLedgerSelected] = useState(null)
  const [ledgerNote, setLedgerNote] = useState('')
  const [ledgerPayDate, setLedgerPayDate] = useState('')
  const [ledgerVoidReason, setLedgerVoidReason] = useState('')
  const [anchorEl, setAnchorEl] = useState(null)

  const menuOpen = Boolean(anchorEl)

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    setEditDialogOpen(true)
    handleMenuClose()
  }

  const handleDelete = () => {
    setDeleteDialogOpen(true)
    handleMenuClose()
  }

  const handleArchive = () => {
    // Archive = mark inactive
    if (!id) return
    const inactiveFrom = window.prompt(
      'From (YYYY-MM-DD), this worker will be inactive. Attendance/salary/invoices will be blocked from this date. Past records remain unchanged.',
      new Date().toISOString().split('T')[0]
    )
    if (!inactiveFrom) return
    workerService
      .updateWorker(id, { status: 'inactive', inactiveFrom })
      .then((response) => {
        const saved = response.data?.worker || response.data
        setWorker(normalizeWorker(saved))
        toast.success('Worker archived')
      })
      .catch((error) => {
        console.error('Error archiving worker', error)
        toast.error(error.response?.data?.message || 'Failed to archive worker')
      })
      .finally(() => {
        handleMenuClose()
      })
  }

  const escapeHtml = (str) => {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  const buildWorkerProfilePrintHtml = (w) => {
    const todayStr = new Date().toISOString().split('T')[0]

    const title = `${w?.name || 'Worker'} — Profile`
    const meta = [
      { label: 'Employee ID', value: w?.employeeId || '-' },
      { label: 'Status', value: (w?.status || '-').toString() },
      { label: 'Position', value: w?.position || w?.role || '-' },
      { label: 'Department', value: w?.department || '-' },
      { label: 'Phone', value: w?.phone || '-' },
      { label: 'Email', value: w?.email || '-' },
      { label: 'Join Date', value: w?.joinDate ? formatDate(w.joinDate, settings) : '-' },
      { label: 'Inactive From', value: w?.inactiveFrom ? formatDate(w.inactiveFrom, settings) : '-' },
    ]

    const salaryMeta = [
      { label: 'Payment Type', value: w?.paymentType || '-' },
      { label: 'Monthly Salary', value: formatCurrency(w?.salaryMonthly || 0, settings) },
      { label: 'Daily Salary', value: formatCurrency(w?.salaryDaily || 0, settings) },
      { label: 'Hourly Rate', value: formatCurrency(w?.hourlyRate || 0, settings) },
      { label: 'Overtime Rate', value: formatCurrency(w?.overtimeRate || 0, settings) },
    ]

    const toGrid = (rows) =>
      rows
        .map(
          (r) => `
          <div class="row">
            <div class="label">${escapeHtml(r.label)}</div>
            <div class="value">${escapeHtml(r.value)}</div>
          </div>
        `
        )
        .join('')

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px; }
      .h1 { font-size: 20px; font-weight: 800; margin: 0; }
      .sub { margin-top: 4px; font-size: 12px; color: #6B7280; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #FFF5EB; color: #CC5500; font-weight: 700; font-size: 12px; }
      .section { margin-top: 16px; }
      .sectionTitle { font-size: 12px; letter-spacing: .08em; color: #6B7280; font-weight: 800; margin: 0 0 10px; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
      .row { display: flex; gap: 10px; }
      .label { width: 120px; font-size: 12px; color: #6B7280; font-weight: 700; }
      .value { font-size: 12px; color: #111827; font-weight: 600; word-break: break-word; }
      .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; display: flex; justify-content: space-between; }
      .note { font-size: 11px; color: #6B7280; margin-top: 8px; }
      @media print {
        .noPrint { display: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1 class="h1">${escapeHtml(title)}</h1>
        <div class="sub">Generated on ${escapeHtml(todayStr)}</div>
      </div>
      <div class="badge">${escapeHtml((w?.status || 'unknown').toString())}</div>
    </div>

    <div class="section">
      <h2 class="sectionTitle">Worker Information</h2>
      <div class="grid">
        ${toGrid(meta)}
      </div>
    </div>

    <div class="section">
      <h2 class="sectionTitle">Salary Configuration</h2>
      <div class="grid">
        ${toGrid(salaryMeta)}
      </div>
      <div class="note">Note: Payable amounts are calculated in Project Budget screens based on attendance and approved overtime.</div>
    </div>

    <div class="footer">
      <div>Workforce Management</div>
      <div>Worker ID: ${escapeHtml(w?._id || w?.id || '')}</div>
    </div>
  </body>
</html>`
  }

  const handleDownloadPdf = () => {
    if (!worker) {
      toast.error('Worker profile is not loaded')
      return
    }
    const html = buildWorkerProfilePrintHtml(worker)
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) {
      toast.error('Popup blocked. Please allow popups to download PDF.')
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    // Give the browser a moment to render before printing
    setTimeout(() => {
      win.print()
    }, 250)
    handleMenuClose()
  }

  const handleShareProfile = async () => {
    try {
      const url = window.location.href
      if (navigator.share) {
        await navigator.share({ title: worker?.name ? `${worker.name} — Profile` : 'Worker Profile', url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('Profile link copied')
    } catch (e) {
      console.error(e)
      toast.error('Failed to share')
    }
  }

  const taskCounts = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  }

  const attendanceSummaryData = (() => {
    if (!attendance.length) return null
    const totalWorkingDays = attendance.length
    const daysPresent = attendance.filter(a => a.status === 'present').length
    const daysAbsent = attendance.filter(a => a.status === 'absent').length
    const daysOnLeave = attendance.filter(a => a.status === 'on-leave').length
    const totalHoursWorked = attendance.reduce((sum, a) => sum + (a.hours || 0), 0)
    const totalOvertimeHours = attendance.reduce((sum, a) => sum + (a.overtime || 0), 0)
    const attendancePercentage = totalWorkingDays ? (daysPresent / totalWorkingDays) * 100 : 0
    return {
      totalWorkingDays,
      daysPresent,
      daysAbsent,
      daysOnLeave,
      totalHoursWorked,
      totalOvertimeHours,
      attendancePercentage,
      recentAttendance: attendance.slice(0, 5),
    }
  })()

  const currentProjectDerived = (() => {
    const taskWithProject = tasks.find(t => t.project || t.projectName)
    if (!taskWithProject) return null
    const name = taskWithProject.project?.name || taskWithProject.projectName || 'Project'
    const client = taskWithProject.project?.client || ''
    const status = taskWithProject.status || ''
    return {
      name,
      client,
      status,
      progress: status === 'completed' ? 100 : (
        taskCounts.total > 0
          ? Math.round((taskCounts.completed / taskCounts.total) * 100)
          : (status === 'in-progress' ? 50 : 0)
      ),
    }
  })()

  const normalizeWorker = (apiWorker) => {
    if (!apiWorker) return null
    return {
      id: apiWorker.id || apiWorker._id || '',
      employeeId: apiWorker.employeeId || apiWorker.employeeID || '',
      name: apiWorker.name || '',
      email: apiWorker.email || '',
      phone: apiWorker.phone || '',
      department: apiWorker.department || '',
      position: apiWorker.position || '',
      status: apiWorker.status || '',
      inactiveFrom: apiWorker.inactiveFrom || null,
      joiningDate: apiWorker.joiningDate || apiWorker.joinDate || '',
      address: apiWorker.address || '',
      skills: apiWorker.skills || apiWorker.skillSet || [],
      certifications: apiWorker.certifications || [],
      emergencyContact: apiWorker.emergencyContact || {},
      stats: apiWorker.stats || {},
      salary: apiWorker.salary || {},
      salaryMonthly: apiWorker.salaryMonthly || 0,
      salaryDaily: apiWorker.salaryDaily || 0,
      advanceBalance: apiWorker.advanceBalance || 0,
      bankDetails: apiWorker.bankDetails || {},
      currentProject: apiWorker.currentProject || null,
      attendanceSummary: apiWorker.attendanceSummary || null,
      photo: apiWorker.photo || null,
      age: apiWorker.age || '',
      gender: apiWorker.gender || '',
      experience: apiWorker.experience || '',
      aadhaar: apiWorker.aadhaar || '',
    }
  }

  useEffect(() => {
    const fetchWorker = async () => {
      if (!id) return
      try {
        setLoading(true)
        const [workerRes, tasksRes, attendanceRes] = await Promise.all([
          workerService.getWorker(id),
          workerService.getWorkerTasks(id).catch(() => ({ data: [] })),
          workerService.getWorkerAttendance(id).catch(() => ({ data: [] })),
        ])
        // workerService returns the already-unwrapped JSON: { success, data, message? }
        // For GET /api/workers/:id, backend returns data: { worker, stats }
        const payload = workerRes?.data?.worker
          ? { ...workerRes.data.worker, stats: workerRes.data.stats }
          : workerRes?.data
        setWorker(normalizeWorker(payload))
        setTasks(tasksRes.data || [])
        setAttendance(attendanceRes.data || [])
      } catch (error) {
        console.error('Error loading worker', error)
        toast.error(error.response?.data?.message || 'Failed to load worker profile')
      } finally {
        setLoading(false)
      }
    }
    fetchWorker()
  }, [id])

  const refreshWorkerAndLedger = async () => {
    if (!id) return
    try {
      const workerRes = await workerService.getWorker(id)
      const payload = workerRes?.data?.worker
        ? { ...workerRes.data.worker, stats: workerRes.data.stats }
        : workerRes?.data
      setWorker(normalizeWorker(payload))
    } catch { }

    try {
      const res = await salaryService.getPaymentHistory(id, { limit: 50 })
      setPaymentHistory(res.data || [])
    } catch { }
  }

  useEffect(() => {
    const fetchHistory = async () => {
      if (!id) return
      setPaymentHistoryLoading(true)
      try {
        const res = await salaryService.getPaymentHistory(id, { limit: 50 })
        setPaymentHistory(res.data || [])
      } catch {
        setPaymentHistory([])
      } finally {
        setPaymentHistoryLoading(false)
      }
    }
    fetchHistory()
  }, [id])

  const handleSaveWorker = async (updatedWorker) => {
    try {
      const workerId = updatedWorker?.id || updatedWorker?._id || id
      if (!workerId) throw new Error('Missing worker id')

      // Send only backend-supported fields (prevents "edited but not saved" issues)
      const payload = {
        name: updatedWorker.name,
        email: updatedWorker.email,
        phone: updatedWorker.phone,
        alternatePhone: updatedWorker.alternatePhone,
        department: updatedWorker.department,
        position: updatedWorker.position,
        status: updatedWorker.status,
        inactiveFrom: updatedWorker.inactiveFrom ?? null,
        // Salary config (Edit Worker -> Salary tab)
        paymentType: updatedWorker.paymentType,
        baseSalary: updatedWorker.baseSalary,
        overtimeRate: updatedWorker.overtimeRate,
        workingDaysPerMonth: updatedWorker.workingDaysPerMonth,
        workingHoursPerDay: updatedWorker.workingHoursPerDay,
        salaryMonthly: updatedWorker.salaryMonthly,
        salaryDaily: updatedWorker.salaryDaily,
        skills: updatedWorker.skills,
        certifications: updatedWorker.certifications,
        address: updatedWorker.address,
        employmentType: updatedWorker.employmentType,
        experience: updatedWorker.experience,
        dateOfBirth: updatedWorker.dateOfBirth,
        gender: updatedWorker.gender,
        aadhaar: updatedWorker.aadhaar,
        pan: updatedWorker.pan,
        age: updatedWorker.age,
        maritalStatus: updatedWorker.maritalStatus,
        bloodGroup: updatedWorker.bloodGroup,
        bankDetails: updatedWorker.bankDetails,
        salary: updatedWorker.salary,
        pfNumber: updatedWorker.pfNumber,
        emergencyContact: updatedWorker.emergencyContact,
        hourlyRate: updatedWorker.hourlyRate,
      }

      const response = await workerService.updateWorker(workerId, payload)
      const saved = response.data?.worker || response.data
      setWorker(normalizeWorker(saved))
      setEditDialogOpen(false)
      toast.success('Worker updated successfully')
    } catch (error) {
      console.error('Error updating worker', error)
      toast.error(error.response?.data?.message || 'Failed to update worker')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'default'
      case 'on-leave': return 'warning'
      case 'suspended': return 'error'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!worker || !worker.name) {
    return (
      <div className="premium-card p-6 text-center">
        <p className="text-neutral-500">Worker not found.</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/workers')}>
          Back to Workers
        </button>
      </div>
    )
  }

  const stats = worker.stats || {}
  const salary = worker.salary || {}
  const bankDetails = worker.bankDetails || {}
  const emergency = worker.emergencyContact || {}
  const certifications = worker.certifications || []
  const skills = worker.skills || []
  const currentProjectFromApi = worker.currentProject
  const attendanceSummaryFromApi = worker.attendanceSummary
  const currentProject = currentProjectFromApi || currentProjectDerived
  const attendanceSummary = attendanceSummaryFromApi || attendanceSummaryData

  const getCertStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20'
      case 'expiring-soon': return 'bg-warning/10 text-warning border-warning/20'
      case 'expired': return 'bg-danger/10 text-danger border-danger/20'
      default: return 'bg-neutral-100 text-neutral-600'
    }
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
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowBackIcon className="text-neutral-600 dark:text-neutral-300" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
              Worker Profile
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Employee ID: {worker.employeeId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title="Print Profile">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800" onClick={handleDownloadPdf}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share">
            <IconButton className="!bg-neutral-100 dark:!bg-neutral-800" onClick={handleShareProfile}>
              <ShareIcon />
            </IconButton>
          </Tooltip>
          <button
            onClick={handleEdit}
            className="btn-primary flex items-center gap-2"
          >
            <EditIcon fontSize="small" />
            <span className="hidden sm:inline">Edit Worker</span>
          </button>
          <IconButton onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleDownloadPdf}>
              <PictureAsPdfIcon fontSize="small" className="mr-2" />
              Download PDF
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleArchive}>
              <ArchiveIcon fontSize="small" className="mr-2" />
              Archive Worker
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDelete} className="!text-danger">
              <DeleteIcon fontSize="small" className="mr-2" />
              Delete Worker
            </MenuItem>
          </Menu>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
          {/* Main Profile Card */}
          <div className="premium-card p-6">
            <div className="flex flex-col items-center text-center">
              {/* Photo */}
              <div className="relative mb-4">
                <Avatar
                  src={worker.photo}
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: '2.5rem',
                    background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                  }}
                >
                  {worker.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white dark:border-dark-card ${worker.status === 'active' ? 'bg-success' : worker.status === 'on-leave' ? 'bg-warning' : 'bg-neutral-400'
                  }`} />
              </div>

              {/* Name & Position */}
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                {worker.name}
              </h2>
              <p className="text-primary font-medium">{worker.position}</p>
              <Chip
                label={worker.status}
                color={getStatusColor(worker.status)}
                size="small"
                className="mt-2 capitalize"
              />

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 w-full mt-6 pt-6 border-t border-light-border dark:border-dark-border">
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.totalProjects || 0}</p>
                  <p className="text-xs text-neutral-500">Projects</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{stats.completedTasks || 0}</p>
                  <p className="text-xs text-neutral-500">Tasks Done</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center">
                    <StarIcon className="text-warning" fontSize="small" />
                    <span className="text-2xl font-bold ml-1">{stats.avgRating || 0}</span>
                  </div>
                  <p className="text-xs text-neutral-500">Rating</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="premium-card p-6">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Contact Details
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PhoneIcon className="text-primary" fontSize="small" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Phone</p>
                  <p className="font-medium text-light-text dark:text-dark-text">{worker.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <EmailIcon className="text-info" fontSize="small" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Email</p>
                  <p className="font-medium text-light-text dark:text-dark-text text-sm">{worker.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <LocationOnIcon className="text-success" fontSize="small" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Address</p>
                  <p className="font-medium text-light-text dark:text-dark-text text-sm">{worker.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="premium-card p-6">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Emergency Contact
            </h3>
            <div className="p-4 rounded-xl bg-danger/5 border border-danger/20">
              <p className="font-semibold text-light-text dark:text-dark-text">
                {worker.emergencyContact.name}
              </p>
              <p className="text-sm text-neutral-500">{worker.emergencyContact.relationship}</p>
              <p className="text-primary font-medium mt-2">{worker.emergencyContact.phone}</p>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Details */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Basic Details Card */}
          <div className="premium-card p-6">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-6">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <InfoItem icon={CakeIcon} label="Age" value={worker.age ? `${worker.age} years` : '--'} color="primary" />
              <InfoItem icon={BadgeIcon} label="Aadhaar" value={worker.aadhaar || '--'} color="info" />
              <InfoItem icon={WorkIcon} label="Experience" value={worker.experience || '--'} color="success" />
              <InfoItem icon={CalendarTodayIcon} label="Joining Date" value={worker.joiningDate ? formatDate(worker.joiningDate, settings) : '--'} color="warning" />
              <InfoItem icon={PersonIcon} label="Gender" value={worker.gender || '--'} color="secondary" />
              <InfoItem icon={GroupIcon} label="Department" value={worker.department || '--'} color="primary" />
            </div>
          </div>

          {/* Skills & Certifications */}
          <div className="premium-card p-6">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Skills & Certifications
            </h3>

            {/* Skills */}
            <div className="mb-6">
              <p className="text-sm text-neutral-500 mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <p className="text-sm text-neutral-500 mb-3">Certifications</p>
              <div className="space-y-3">
                {certifications.map((cert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border ${getCertStatusColor(cert.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {cert.status === 'active' ? (
                          <VerifiedIcon fontSize="small" className="text-success" />
                        ) : (
                          <WarningIcon fontSize="small" className="text-warning" />
                        )}
                        <span className="font-semibold">{cert.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${cert.status === 'active' ? 'bg-success/20' : 'bg-warning/20'
                        }`}>
                        {cert.status === 'expiring-soon' ? 'Expiring Soon' : 'Active'}
                      </span>
                    </div>
                    <p className="text-sm mt-1 opacity-80">
                      {cert.issuedBy} • Valid till {formatDate(cert.validTill, settings)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Salary Card */}
          {salary && (
            <div className="premium-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <AccountBalanceWalletIcon className="text-primary" />
                  Salary & Advance
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                    {salary.paymentType || 'N/A'}
                  </span>
                  <button className="btn-primary px-4 py-2" onClick={() => setPayModalOpen(true)}>
                    Pay
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <p className="text-sm text-neutral-500 mb-1">Monthly</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(Number(worker.salaryMonthly || 0), settings)}
                  </p>
                  <p className="text-xs text-neutral-400">salaryMonthly</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
                  <p className="text-sm text-neutral-500 mb-1">Daily</p>
                  <p className="text-xl font-bold text-info">
                    {formatCurrency(Number(worker.salaryDaily || 0), settings)}
                  </p>
                  <p className="text-xs text-neutral-400">salaryDaily</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
                  <p className="text-sm text-neutral-500 mb-1">Advance Balance</p>
                  <p className="text-xl font-bold text-warning">
                    {formatCurrency(Number(worker.advanceBalance || 0), settings)}
                  </p>
                  <p className="text-xs text-neutral-400">outstanding</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                  <p className="text-sm text-neutral-500 mb-1">Last Payment</p>
                  <p className="text-xl font-bold text-success">
                    {paymentHistory?.[0]?.netAmount ? formatCurrency(Number(paymentHistory[0].netAmount), settings) : '—'}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {paymentHistory?.[0]?.payDate ? formatDate(paymentHistory[0].payDate, settings) : '--'}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <span>Bank:</span>
                  <span className="font-medium text-light-text dark:text-dark-text">{bankDetails.bankName || '--'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <span>A/C:</span>
                  <span className="font-medium text-light-text dark:text-dark-text">{bankDetails.accountNumber || '--'}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-light-text dark:text-dark-text mb-2">Advance Ledger (date-wise)</p>
                <div className="overflow-auto rounded-xl border border-light-border dark:border-dark-border">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-right p-3">Gross</th>
                        <th className="text-right p-3">Deduct</th>
                        <th className="text-right p-3">Net</th>
                        <th className="text-right p-3">Balance After</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistoryLoading ? (
                        <tr><td className="p-3 text-neutral-500" colSpan={7}>Loading…</td></tr>
                      ) : (paymentHistory || []).length === 0 ? (
                        <tr>
                          <td className="p-3 text-neutral-500" colSpan={7}>
                            No payments yet.
                            {Number(worker.advanceBalance || 0) > 0
                              ? ` (Note: current advance balance ${formatCurrency(Number(worker.advanceBalance || 0), settings)} has no ledger entries—likely legacy/manual data.)`
                              : ''}
                          </td>
                        </tr>
                      ) : (
                        paymentHistory.map((p) => (
                          <tr key={p._id} className="border-t border-light-border dark:border-dark-border">
                            <td className="p-3">{p.payDate ? formatDate(p.payDate, settings) : '--'}</td>
                            <td className="p-3 capitalize">{p.type}</td>
                            <td className="p-3 text-right">{formatCurrency(Number(p.amountGross || 0), settings)}</td>
                            <td className="p-3 text-right">{formatCurrency((Number(p.advanceDeducted || 0) + Number(p.dailyDeduction || 0)), settings)}</td>
                            <td className="p-3 text-right">{formatCurrency(Number(p.netAmount || 0), settings)}</td>
                            <td className="p-3 text-right">{formatCurrency(Number(p.advanceBalanceAfter ?? 0), settings)}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                {p.dailyPaymentDetails?.length > 0 && (
                                  <button
                                    className="px-3 py-1 rounded-lg bg-info/10 text-info text-sm"
                                    onClick={() => setLedgerSelected(p)}
                                  >
                                    View
                                  </button>
                                )}
                                <button
                                  className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm"
                                  onClick={() => {
                                    setLedgerSelected(p)
                                    setLedgerNote(p.note || '')
                                    setLedgerPayDate(p.payDate ? new Date(p.payDate).toISOString().split('T')[0] : '')
                                    setLedgerEditOpen(true)
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg bg-danger/10 text-danger text-sm"
                                  onClick={() => {
                                    setLedgerSelected(p)
                                    setLedgerVoidReason('')
                                    setLedgerVoidOpen(true)
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Project Assigned Card */}
          {currentProject && (
            <div className="premium-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <AssignmentIcon className="text-primary" />
                  Current Project
                </h3>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-info/10 text-info">
                  {currentProject.status?.replace('-', ' ') || 'in-progress'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-light-text dark:text-dark-text">
                      {currentProject.name}
                    </h4>
                    <p className="text-sm text-neutral-500">{currentProject.client}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-500">Project Progress</span>
                    <span className="text-sm font-bold text-primary">{currentProject.progress || 0}%</span>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={currentProject.progress || 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 106, 0, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#FF6A00',
                        borderRadius: 4,
                      },
                    }}
                  />
                </div>

                {/* Tasks Summary */}
                <div className="flex items-center gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="text-success" fontSize="small" />
                    <span className="text-sm">{taskCounts.completed} Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AccessTimeIcon className="text-info" fontSize="small" />
                    <span className="text-sm">{taskCounts.inProgress} In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CancelIcon className="text-warning" fontSize="small" />
                    <span className="text-sm">{taskCounts.pending} Pending</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Summary Card */}
          {attendanceSummary && (
            <div className="premium-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <EventAvailableIcon className="text-primary" />
                  Attendance Summary
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${attendanceSummary.attendancePercentage >= 90
                  ? 'bg-success/10 text-success'
                  : attendanceSummary.attendancePercentage >= 75
                    ? 'bg-warning/10 text-warning'
                    : 'bg-danger/10 text-danger'
                  }`}>
                  {attendanceSummary.attendancePercentage.toFixed(1)}%
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={EventAvailableIcon}
                  label="Days Present"
                  value={attendanceSummary.daysPresent}
                  total={attendanceSummary.totalWorkingDays}
                  color="success"
                />
                <StatCard
                  icon={EventBusyIcon}
                  label="Days Absent"
                  value={attendanceSummary.daysAbsent}
                  total={attendanceSummary.totalWorkingDays}
                  color="danger"
                />
                <StatCard
                  icon={AccessTimeIcon}
                  label="Hours Worked"
                  value={attendanceSummary.totalHoursWorked}
                  suffix="hrs"
                  color="info"
                />
                <StatCard
                  icon={TrendingUpIcon}
                  label="Overtime"
                  value={attendanceSummary.totalOvertimeHours}
                  suffix="hrs"
                  color="warning"
                />
              </div>

              {/* Recent Attendance */}
              <div>
                <p className="text-sm text-neutral-500 mb-3">Recent Attendance</p>
                <div className="space-y-2">
                  {attendanceSummary.recentAttendance.slice(0, 5).map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${record.status === 'present' ? 'bg-success' :
                          record.status === 'on-leave' ? 'bg-warning' :
                            record.status === 'absent' ? 'bg-danger' : 'bg-neutral-400'
                          }`} />
                        <span className="text-sm font-medium">
                          {formatDate(record.date, settings)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {record.checkIn && (
                          <span className="text-xs text-neutral-500">
                            {record.checkIn} - {record.checkOut}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${record.status === 'present' ? 'bg-success/10 text-success' :
                          record.status === 'on-leave' ? 'bg-warning/10 text-warning' :
                            record.status === 'weekend' ? 'bg-neutral-200 text-neutral-500' :
                              'bg-danger/10 text-danger'
                          }`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <EditWorkerDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        worker={worker}
        onSave={handleSaveWorker}
      />

      {/* Delete Dialog */}
      <DeleteWorkerDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        worker={worker}
        onConfirm={async ({ action, inactiveFrom }) => {
          try {
            if (!id) throw new Error('Missing worker id')

            if (action === 'archive') {
              const response = await workerService.updateWorker(id, { status: 'inactive', inactiveFrom })
              const saved = response.data?.worker || response.data
              setWorker(normalizeWorker(saved))
              toast.success('Worker archived')
            } else {
              await workerService.deleteWorker(id)
              toast.success('Worker deleted')
              navigate('/workers')
            }
          } catch (error) {
            console.error('Error deleting worker', error)
            toast.error(error.response?.data?.message || 'Failed to delete worker')
            throw error
          } finally {
            setDeleteDialogOpen(false)
          }
        }}
      />

      <SalaryPaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        worker={worker}
        onPaid={refreshWorkerAndLedger}
      />

      {/* Ledger Edit Dialog */}
      <Dialog open={ledgerEditOpen} onClose={() => setLedgerEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Ledger Entry</DialogTitle>
        <DialogContent className="space-y-4 !pt-4">
          <TextField
            label="Pay Date"
            type="date"
            value={ledgerPayDate}
            onChange={(e) => setLedgerPayDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Note"
            value={ledgerNote}
            onChange={(e) => setLedgerNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions className="p-4 flex gap-2">
          <button className="px-4 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setLedgerEditOpen(false)}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-primary text-white"
            onClick={async () => {
              try {
                if (!ledgerSelected?._id) return
                await salaryService.updatePayment(ledgerSelected._id, {
                  payDate: ledgerPayDate,
                  note: ledgerNote,
                })
                toast.success('Ledger updated')
                setLedgerEditOpen(false)
                await refreshWorkerAndLedger()
              } catch (e) {
                toast.error(e.response?.data?.message || 'Failed to update ledger')
              }
            }}
          >
            Save
          </button>
        </DialogActions>
      </Dialog>

      {/* Ledger Delete (Void) Dialog */}
      <Dialog open={ledgerVoidOpen} onClose={() => setLedgerVoidOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Ledger Entry</DialogTitle>
        <DialogContent className="space-y-4 !pt-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            This will <b>void</b> the entry (audit-safe) and recompute advance balances date-wise.
          </p>
          <TextField
            label="Reason (optional)"
            value={ledgerVoidReason}
            onChange={(e) => setLedgerVoidReason(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions className="p-4 flex gap-2">
          <button className="px-4 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setLedgerVoidOpen(false)}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-danger text-white"
            onClick={async () => {
              try {
                if (!ledgerSelected?._id) return
                await salaryService.voidPayment(ledgerSelected._id, { reason: ledgerVoidReason })
                toast.success('Ledger deleted')
                setLedgerVoidOpen(false)
                await refreshWorkerAndLedger()
              } catch (e) {
                toast.error(e.response?.data?.message || 'Failed to delete ledger')
              }
            }}
          >
            Delete
          </button>
        </DialogActions>
      </Dialog>
      {/* Daily Details View Dialog */}
      <Dialog open={Boolean(ledgerSelected && !ledgerEditOpen && !ledgerVoidOpen)} onClose={() => setLedgerSelected(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="flex justify-between items-center">
          <span>Payment Details</span>
          <IconButton size="small" onClick={() => setLedgerSelected(null)}><CancelIcon /></IconButton>
        </DialogTitle>
        <DialogContent className="!pt-4">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Date</span>
              <span className="font-medium">{ledgerSelected?.payDate ? formatDate(ledgerSelected.payDate, settings) : '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Type</span>
              <span className="font-medium capitalize">{ledgerSelected?.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Amount</span>
              <span className="font-medium text-primary">{formatCurrency(Number(ledgerSelected?.amountGross || 0), settings)}</span>
            </div>

            {/* Daily Payments List */}
            {ledgerSelected?.dailyPaymentDetails?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                <p className="text-sm font-semibold mb-2">Daily Payments Included</p>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden">
                  {ledgerSelected.dailyPaymentDetails.map((d, i) => (
                    <div key={i} className="flex justify-between p-2 text-sm border-b border-light-border dark:border-dark-border last:border-0">
                      <span className="text-neutral-600 dark:text-neutral-300">{formatDate(d.date, settings)}</span>
                      <span className="font-medium">{formatCurrency(Number(d.amount), settings)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2 text-sm font-bold bg-neutral-100 dark:bg-neutral-800">
                    <span>Total Daily Deducted</span>
                    <span>{formatCurrency(ledgerSelected.dailyPaymentDetails.reduce((sum, d) => sum + Number(d.amount), 0), settings)}</span>
                  </div>
                </div>
              </div>
            )}

            {ledgerSelected?.note && (
              <div className="mt-4 pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500 mb-1">Note</p>
                <p className="text-sm italic text-neutral-600 dark:text-neutral-400">{ledgerSelected.note}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  )
}

// Info Item Component
const InfoItem = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-start gap-3">
    <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
      <Icon className={`text-${color}`} fontSize="small" />
    </div>
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-medium text-light-text dark:text-dark-text">{value}</p>
    </div>
  </div>
)

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, total, suffix, color }) => (
  <div className={`p-4 rounded-xl bg-${color}/5 border border-${color}/20`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`text-${color}`} fontSize="small" />
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
    <p className={`text-2xl font-bold text-${color}`}>
      {value}
      {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
      {total && <span className="text-sm font-normal text-neutral-400">/{total}</span>}
    </p>
  </div>
)

export default WorkerProfilePage

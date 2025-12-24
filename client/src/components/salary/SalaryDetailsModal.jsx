import { motion } from 'framer-motion'

// MUI Components
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import PrintIcon from '@mui/icons-material/Print'
import DownloadIcon from '@mui/icons-material/Download'
import SendIcon from '@mui/icons-material/Send'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

import { STATUS_COLORS, PAYMENT_METHODS } from '../../constants/salary'

const SalaryDetailsModal = ({ open, onClose, salary }) => {
  if (!salary) return null

  const statusColor = STATUS_COLORS[salary.status]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // In real app, would generate PDF
    console.log('Downloading payslip...')
  }

  const handleSendEmail = () => {
    // In real app, would send email
    console.log('Sending payslip via email...')
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px', maxHeight: '90vh' },
      }}
    >
      <DialogTitle className="border-b border-light-border dark:border-dark-border pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              sx={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                fontSize: '1.25rem',
              }}
            >
              {salary.worker.name.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                Payslip - {salary.monthLabel}
              </h2>
              <p className="text-sm text-neutral-500">{salary.salaryId}</p>
              <Chip
                size="small"
                label={statusColor?.label}
                sx={{
                  backgroundColor: statusColor?.light,
                  color: statusColor?.text,
                  fontWeight: 600,
                  mt: 0.5,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton onClick={handlePrint} className="!bg-neutral-100 dark:!bg-neutral-800">
              <PrintIcon />
            </IconButton>
            <IconButton onClick={handleDownload} className="!bg-neutral-100 dark:!bg-neutral-800">
              <DownloadIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      </DialogTitle>

      <DialogContent className="!py-6">
        <div className="space-y-6">
          {/* Employee Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
              icon={PersonIcon}
              title="Employee Details"
              items={[
                { label: 'Name', value: salary.worker.name },
                { label: 'Employee ID', value: salary.worker.employeeId },
                { label: 'Position', value: salary.worker.position || '--' },
                { label: 'Department', value: salary.worker.department || '--' },
              ]}
            />
            <InfoCard
              icon={CalendarTodayIcon}
              title="Pay Period"
              items={[
                { label: 'Month', value: salary.monthLabel },
                { label: 'Working Days', value: salary.attendance.workingDays },
                { label: 'Days Present', value: salary.attendance.daysPresent },
                { label: 'Days Absent', value: salary.attendance.daysAbsent },
              ]}
            />
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="premium-card p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUpIcon className="text-success" />
                <h3 className="text-sm font-semibold text-success uppercase">Earnings</h3>
              </div>
              <div className="space-y-3">
                <SalaryRow label="Base Salary" value={formatCurrency(salary.earnings.baseSalary)} />
                <SalaryRow 
                  label={`Overtime (${salary.earnings.otHours}h × ${formatCurrency(salary.earnings.otRate)})`} 
                  value={formatCurrency(salary.earnings.otEarnings)} 
                  highlight
                />
                {salary.earnings.bonus > 0 && (
                  <SalaryRow label="Bonus" value={formatCurrency(salary.earnings.bonus)} highlight />
                )}
                {salary.earnings.allowances > 0 && (
                  <SalaryRow label="Allowances" value={formatCurrency(salary.earnings.allowances)} />
                )}
                <Divider />
                <SalaryRow label="Gross Salary" value={formatCurrency(salary.grossSalary)} bold />
              </div>
            </div>

            {/* Deductions */}
            <div className="premium-card p-4 bg-gradient-to-br from-danger/5 to-danger/10 border-danger/20">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDownIcon className="text-danger" />
                <h3 className="text-sm font-semibold text-danger uppercase">Deductions</h3>
              </div>
              <div className="space-y-3">
                <SalaryRow label="Provident Fund (PF)" value={formatCurrency(salary.deductions.pf)} />
                <SalaryRow label="ESI" value={formatCurrency(salary.deductions.esi)} />
                {salary.deductions.tax > 0 && (
                  <SalaryRow label="Tax" value={formatCurrency(salary.deductions.tax)} />
                )}
                {salary.deductions.advances > 0 && (
                  <SalaryRow label="Advances" value={formatCurrency(salary.deductions.advances)} />
                )}
                {salary.deductions.halfDayDeduction > 0 && (
                  <SalaryRow label="Half Day Deduction" value={formatCurrency(salary.deductions.halfDayDeduction)} />
                )}
                {salary.deductions.otherDeductions > 0 && (
                  <SalaryRow label="Other Deductions" value={formatCurrency(salary.deductions.otherDeductions)} />
                )}
                <Divider />
                <SalaryRow label="Total Deductions" value={formatCurrency(salary.deductions.totalDeductions)} bold danger />
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="premium-card p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 text-center">
            <p className="text-sm text-neutral-500 mb-2">Net Payable Amount</p>
            <p className="text-4xl font-bold text-primary mb-2">
              {formatCurrency(salary.netSalary)}
            </p>
            <p className="text-sm text-neutral-500">
              ({numberToWords(salary.netSalary)} Rupees Only)
            </p>
          </div>

          {/* Payment Info */}
          {salary.status === 'paid' && (
            <div className="premium-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <AccountBalanceIcon className="text-success" />
                <h3 className="text-sm font-semibold text-neutral-500 uppercase">Payment Details</h3>
                <CheckCircleIcon className="text-success ml-auto" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-neutral-500">Payment Method</p>
                  <p className="font-medium text-light-text dark:text-dark-text capitalize">
                    {PAYMENT_METHODS.find(m => m.id === salary.paymentMethod)?.label || salary.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Bank Account</p>
                  <p className="font-medium text-light-text dark:text-dark-text">
                    {salary.worker.bankAccount || '--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Payment Date</p>
                  <p className="font-medium text-light-text dark:text-dark-text">
                    {new Date(salary.paidDate).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Transaction ID</p>
                  <p className="font-medium text-light-text dark:text-dark-text text-xs">
                    {salary.transactionId}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Summary */}
          <div className="premium-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <AccessTimeIcon className="text-info" />
              <h3 className="text-sm font-semibold text-neutral-500 uppercase">Attendance Summary</h3>
            </div>
            <div className="grid grid-cols-5 gap-4 text-center">
              <AttendanceStat label="Working Days" value={salary.attendance.workingDays} />
              <AttendanceStat label="Present" value={salary.attendance.daysPresent} color="success" />
              <AttendanceStat label="Absent" value={salary.attendance.daysAbsent} color="danger" />
              <AttendanceStat label="Half Days" value={salary.attendance.halfDays} color="warning" />
              <AttendanceStat label="Leave" value={salary.attendance.leaveDays} color="info" />
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogActions className="border-t border-light-border dark:border-dark-border p-4">
        <button
          onClick={handleSendEmail}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-info bg-info/10 hover:bg-info/20 transition-colors"
        >
          <SendIcon fontSize="small" />
          Send to Employee
        </button>
        <button
          onClick={handleDownload}
          className="btn-primary flex items-center gap-2"
        >
          <DownloadIcon fontSize="small" />
          Download Payslip
        </button>
      </DialogActions>
    </Dialog>
  )
}

// Info Card Component
const InfoCard = ({ icon: Icon, title, items }) => (
  <div className="premium-card p-4">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="text-primary" fontSize="small" />
      <h3 className="text-sm font-semibold text-neutral-500 uppercase">{title}</h3>
    </div>
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">{item.label}</span>
          <span className="text-sm font-medium text-light-text dark:text-dark-text">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
)

// Salary Row Component
const SalaryRow = ({ label, value, bold = false, highlight = false, danger = false }) => (
  <div className="flex items-center justify-between">
    <span className={`text-sm ${bold ? 'font-semibold' : ''} text-neutral-600 dark:text-neutral-300`}>
      {label}
    </span>
    <span className={`text-sm ${
      bold 
        ? danger 
          ? 'font-bold text-danger' 
          : 'font-bold text-light-text dark:text-dark-text'
        : highlight 
          ? 'font-medium text-primary' 
          : ''
    }`}>
      {value}
    </span>
  </div>
)

// Attendance Stat Component
const AttendanceStat = ({ label, value, color = 'neutral' }) => {
  const colorClasses = {
    neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  }

  return (
    <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  )
}

// Number to words (simplified for Indian currency)
const numberToWords = (num) => {
  if (num === 0) return 'Zero'
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  const numToWords = (n) => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '')
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '')
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '')
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '')
  }
  
  return numToWords(Math.floor(num))
}

export default SalaryDetailsModal

import { motion } from 'framer-motion'

// MUI Icons
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

const SalarySummaryCard = ({ summary, month }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const stats = [
    {
      icon: TrendingUpIcon,
      label: 'Gross Salary',
      value: formatCurrency(summary.totalGross),
      color: 'primary',
      bgClass: 'from-primary/10 to-primary/5',
    },
    {
      icon: RemoveCircleOutlineIcon,
      label: 'Total Deductions',
      value: formatCurrency(summary.totalDeductions),
      color: 'danger',
      bgClass: 'from-danger/10 to-danger/5',
    },
    {
      icon: AccountBalanceWalletIcon,
      label: 'Net Payable',
      value: formatCurrency(summary.totalNet),
      color: 'success',
      bgClass: 'from-success/10 to-success/5',
    },
    {
      icon: AccessTimeIcon,
      label: 'Total OT Hours',
      value: `${summary.totalOTHours}h`,
      subValue: formatCurrency(summary.totalOTAmount),
      color: 'info',
      bgClass: 'from-info/10 to-info/5',
    },
    {
      icon: CardGiftcardIcon,
      label: 'Total Bonus',
      value: formatCurrency(summary.totalBonus),
      color: 'warning',
      bgClass: 'from-warning/10 to-warning/5',
    },
    {
      icon: AttachMoneyIcon,
      label: 'Avg. Salary',
      value: formatCurrency(summary.avgSalary),
      color: 'secondary',
      bgClass: 'from-secondary/10 to-secondary/5',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className={`premium-card p-4 bg-gradient-to-br ${stat.bgClass} border-none`}
          >
            <div className={`flex items-center gap-2 mb-2 text-${stat.color}`}>
              <stat.icon fontSize="small" />
              <span className="text-xs text-neutral-500 font-medium">{stat.label}</span>
            </div>
            <p className={`text-lg md:text-xl font-bold text-${stat.color}`}>
              {stat.value}
            </p>
            {stat.subValue && (
              <p className="text-xs text-neutral-500 mt-1">{stat.subValue}</p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Detailed Summary Card */}
      <motion.div
        variants={itemVariants}
        className="premium-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-light-text dark:text-dark-text">
            Payroll Summary - {month}
          </h3>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {summary.totalWorkers} Workers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Earnings Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-success uppercase flex items-center gap-2">
              <TrendingUpIcon fontSize="small" />
              Earnings
            </h4>
            <div className="space-y-2">
              <SummaryRow label="Base Salaries" value={formatCurrency(summary.totalGross - summary.totalOTAmount - summary.totalBonus)} />
              <SummaryRow label="Overtime Pay" value={formatCurrency(summary.totalOTAmount)} highlight />
              <SummaryRow label="Bonuses" value={formatCurrency(summary.totalBonus)} />
              <div className="pt-2 border-t border-light-border dark:border-dark-border">
                <SummaryRow label="Total Gross" value={formatCurrency(summary.totalGross)} bold />
              </div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-danger uppercase flex items-center gap-2">
              <TrendingDownIcon fontSize="small" />
              Deductions
            </h4>
            <div className="space-y-2">
              <SummaryRow label="PF Contribution" value={formatCurrency(summary.totalDeductions * 0.45)} />
              <SummaryRow label="ESI" value={formatCurrency(summary.totalDeductions * 0.05)} />
              <SummaryRow label="Tax" value={formatCurrency(summary.totalDeductions * 0.35)} />
              <SummaryRow label="Other" value={formatCurrency(summary.totalDeductions * 0.15)} />
              <div className="pt-2 border-t border-light-border dark:border-dark-border">
                <SummaryRow label="Total Deductions" value={formatCurrency(summary.totalDeductions)} bold danger />
              </div>
            </div>
          </div>

          {/* Net Pay & Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary uppercase flex items-center gap-2">
              <AccountBalanceWalletIcon fontSize="small" />
              Net Payable
            </h4>
            <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
              <p className="text-sm text-neutral-500 mb-1">Total Net Salary</p>
              <p className="text-3xl font-bold text-success">
                {formatCurrency(summary.totalNet)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-success/10">
                <p className="text-lg font-bold text-success">{summary.paid}</p>
                <p className="text-xs text-neutral-500">Paid</p>
              </div>
              <div className="p-2 rounded-lg bg-info/10">
                <p className="text-lg font-bold text-info">{summary.processing}</p>
                <p className="text-xs text-neutral-500">Processing</p>
              </div>
              <div className="p-2 rounded-lg bg-warning/10">
                <p className="text-lg font-bold text-warning">{summary.pending}</p>
                <p className="text-xs text-neutral-500">Pending</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Summary Row Component
const SummaryRow = ({ label, value, bold = false, highlight = false, danger = false }) => (
  <div className="flex items-center justify-between">
    <span className={`text-sm ${bold ? 'font-semibold text-light-text dark:text-dark-text' : 'text-neutral-500'}`}>
      {label}
    </span>
    <span className={`text-sm ${
      bold 
        ? danger 
          ? 'font-bold text-danger' 
          : 'font-bold text-light-text dark:text-dark-text'
        : highlight 
          ? 'font-medium text-primary' 
          : 'text-neutral-600 dark:text-neutral-300'
    }`}>
      {value}
    </span>
  </div>
)

export default SalarySummaryCard

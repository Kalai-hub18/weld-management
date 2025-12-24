import { useState } from 'react'
import { motion } from 'framer-motion'

// MUI Components
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'

// MUI Icons
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PrintIcon from '@mui/icons-material/Print'
import SendIcon from '@mui/icons-material/Send'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'

import { STATUS_COLORS } from '../../constants/salary'

const SalaryTable = ({ records, onRowClick }) => {
  const [selectedRecords, setSelectedRecords] = useState([])
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [activeRecordId, setActiveRecordId] = useState(null)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRecords(records.map(r => r.id))
    } else {
      setSelectedRecords([])
    }
  }

  const handleSelectRecord = (recordId) => {
    setSelectedRecords(prev =>
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    )
  }

  const handleMenuOpen = (event, recordId) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setActiveRecordId(recordId)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setActiveRecordId(null)
  }

  if (records.length === 0) {
    return null
  }

  return (
    <div className="premium-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="border-b border-light-border dark:border-dark-border bg-neutral-50 dark:bg-neutral-800/50">
              <th className="p-4 w-12">
                <Checkbox
                  checked={selectedRecords.length === records.length && records.length > 0}
                  indeterminate={selectedRecords.length > 0 && selectedRecords.length < records.length}
                  onChange={handleSelectAll}
                  sx={{ '&.Mui-checked': { color: '#FF6A00' } }}
                />
              </th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Employee</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Days</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Base</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">OT</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Deductions</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Net Salary</th>
              <th className="text-left p-4 text-sm font-semibold text-neutral-500">Status</th>
              <th className="text-center p-4 text-sm font-semibold text-neutral-500 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const statusColor = STATUS_COLORS[record.status]

              return (
                <motion.tr
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onRowClick(record)}
                  className={`border-b border-light-border dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors ${
                    selectedRecords.includes(record.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      sx={{ '&.Mui-checked': { color: '#FF6A00' } }}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          fontSize: '0.875rem',
                          background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                        }}
                      >
                        {record.worker.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      <div>
                        <p className="font-medium text-light-text dark:text-dark-text">
                          {record.worker.name}
                        </p>
                        <p className="text-xs text-neutral-500">{record.worker.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-light-text dark:text-dark-text">
                        {record.attendance.daysPresent}
                        <span className="text-xs text-neutral-400">/{record.attendance.workingDays}</span>
                      </p>
                      {record.attendance.daysAbsent > 0 && (
                        <p className="text-xs text-danger">
                          {record.attendance.daysAbsent} absent
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-light-text dark:text-dark-text">
                      {formatCurrency(record.earnings.baseSalary)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatCurrency(record.earnings.dailyRate)}/day
                    </p>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-primary">
                        {record.earnings.otHours}h
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatCurrency(record.earnings.otEarnings)}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Tooltip
                      title={
                        <div className="p-1">
                          <p>PF: {formatCurrency(record.deductions.pf)}</p>
                          <p>ESI: {formatCurrency(record.deductions.esi)}</p>
                          <p>Tax: {formatCurrency(record.deductions.tax)}</p>
                          {record.deductions.advances > 0 && (
                            <p>Advances: {formatCurrency(record.deductions.advances)}</p>
                          )}
                        </div>
                      }
                      arrow
                    >
                      <p className="font-medium text-danger cursor-help">
                        -{formatCurrency(record.deductions.totalDeductions)}
                      </p>
                    </Tooltip>
                  </td>
                  <td className="p-4">
                    <p className="text-lg font-bold text-success">
                      {formatCurrency(record.netSalary)}
                    </p>
                  </td>
                  <td className="p-4">
                    <Chip
                      size="small"
                      label={statusColor?.label}
                      sx={{
                        backgroundColor: statusColor?.light,
                        color: statusColor?.text,
                        fontWeight: 600,
                        fontSize: '11px',
                      }}
                    />
                    {record.paidDate && (
                      <p className="text-xs text-neutral-400 mt-1">
                        {new Date(record.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, record.id)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: '12px', minWidth: 180 },
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <VisibilityIcon fontSize="small" className="mr-2" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <PrintIcon fontSize="small" className="mr-2" />
          Print Payslip
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <SendIcon fontSize="small" className="mr-2" />
          Send Payslip
        </MenuItem>
        <MenuItem onClick={handleMenuClose} className="!text-success">
          <CheckCircleIcon fontSize="small" className="mr-2" />
          Mark as Paid
        </MenuItem>
        <MenuItem onClick={handleMenuClose} className="!text-warning">
          <PauseCircleIcon fontSize="small" className="mr-2" />
          Put on Hold
        </MenuItem>
      </Menu>

      {/* Bulk Actions */}
      {selectedRecords.length > 0 && (
        <div className="p-4 bg-primary/5 border-t border-light-border dark:border-dark-border flex items-center justify-between">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            {selectedRecords.length} record(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
              Process Payment
            </button>
            <button className="px-3 py-1.5 text-sm rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors">
              Export Selected
            </button>
          </div>
        </div>
      )}

      {/* Table Footer */}
      <div className="p-4 border-t border-light-border dark:border-dark-border flex items-center justify-between text-sm text-neutral-500">
        <span>Showing {records.length} records</span>
        <span>
          Total: <strong className="text-success">{formatCurrency(records.reduce((sum, r) => sum + r.netSalary, 0))}</strong>
        </span>
      </div>
    </div>
  )
}

export default SalaryTable

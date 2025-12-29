import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'

import salaryService from '../../services/salaryService'

const TYPE_TABS = [
  { key: 'full', label: 'Full (Monthly)' },
  { key: 'partial', label: 'Partial (Days)' },
  { key: 'advance', label: 'Advance' },
  { key: 'adhoc', label: 'Adhoc' },
]

export default function SalaryPaymentModal({ open, onClose, worker, onPaid }) {
  const workerId = worker?.id || worker?._id

  const [activeTab, setActiveTab] = useState(0)
  const type = TYPE_TABS[activeTab]?.key || 'full'

  const [daysPaid, setDaysPaid] = useState(1)
  const [amount, setAmount] = useState('')
  const [dailyPayments, setDailyPayments] = useState([])
  const [overtimePayments, setOvertimePayments] = useState([])
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  const [preview, setPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingPay, setLoadingPay] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setActiveTab(0)
    setDaysPaid(1)
    setAmount('')
    setDailyPayments([])
    setOvertimePayments([])
    setPayDate(new Date().toISOString().split('T')[0])
    setNote('')
    setPreview(null)
    setError('')
  }, [open, workerId])

  const canPreview = useMemo(() => {
    if (!workerId) return false
    if (type === 'partial') return Number(daysPaid) > 0
    if (type === 'advance' || type === 'adhoc') return Number(amount) > 0
    return true
  }, [workerId, type, daysPaid, amount])

  const handlePreview = async () => {
    if (!workerId) return
    setError('')
    setLoadingPreview(true)
    try {
      const payload = {
        workerId,
        type,
        ...(type === 'partial' ? { daysPaid: Number(daysPaid) } : {}),
        ...(type === 'advance' || type === 'adhoc' ? { amount: Number(amount) } : {}),
        ...(type === 'full' ? { dailyPayments } : {}),
        ...(overtimePayments.length > 0 ? { overtimePayments: overtimePayments.filter(ot => ot.amount && Number(ot.amount) > 0) } : {}),
        payDate,
        note,
      }
      const res = await salaryService.previewPayment(payload)
      setPreview(res.data)
    } catch (e) {
      setPreview(null)
      setError(e.response?.data?.message || 'Preview failed')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handlePay = async () => {
    if (!workerId) return
    setError('')
    setLoadingPay(true)
    try {
      const payload = {
        workerId,
        type,
        ...(type === 'partial' ? { daysPaid: Number(daysPaid) } : {}),
        ...(type === 'advance' || type === 'adhoc' ? { amount: Number(amount) } : {}),
        ...(type === 'full' ? { dailyPayments } : {}),
        ...(overtimePayments.length > 0 ? { overtimePayments: overtimePayments.filter(ot => ot.amount && Number(ot.amount) > 0) } : {}),
        payDate,
        note,
      }
      const res = await salaryService.payPayment(payload)
      if (onPaid) onPaid(res.data)
      onClose?.()
    } catch (e) {
      setError(e.response?.data?.message || 'Payment failed')
    } finally {
      setLoadingPay(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle>
        Pay Worker
        <div className="text-sm text-neutral-500 mt-1">
          {worker?.name || 'Worker'} {worker?.employeeId ? `(${worker.employeeId})` : ''}
        </div>
      </DialogTitle>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
        {TYPE_TABS.map(t => (
          <Tab key={t.key} label={t.label} />
        ))}
      </Tabs>
      <Divider />

      <DialogContent className="space-y-4 !pt-4">
        {error && <Alert severity="error">{error}</Alert>}

        {type === 'partial' && (
          <TextField
            label="Days Paid"
            type="number"
            value={daysPaid}
            onChange={(e) => setDaysPaid(e.target.value)}
            fullWidth
            inputProps={{ min: 1, max: 31 }}
          />
        )}

        {(type === 'advance' || type === 'adhoc') && (
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            inputProps={{ min: 0, step: '0.01' }}
          />
        )}

        {type === 'full' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-600">Daily Payments</div>
              <button
                className="text-primary text-sm flex items-center gap-1 hover:underline"
                onClick={() => setDailyPayments([...dailyPayments, { date: payDate, amount: '' }])}
              >
                <AddIcon fontSize="small" /> Add Payment
              </button>
            </div>

            {dailyPayments.length === 0 && (
              <div className="text-sm text-neutral-400 italic bg-neutral-50 p-2 rounded text-center">
                No daily payments added
              </div>
            )}

            <div className="space-y-2">
              {dailyPayments.map((dp, idx) => (
                <div key={idx} className="flex gap-2">
                  <TextField
                    type="date"
                    size="small"
                    value={dp.date}
                    onChange={(e) => {
                      const newPayments = dailyPayments.map((p, i) =>
                        i === idx ? { ...p, date: e.target.value } : p
                      )
                      setDailyPayments(newPayments)
                    }}
                    InputLabelProps={{ shrink: true }}
                    className="flex-1"
                  />
                  <TextField
                    placeholder="Amount"
                    type="number"
                    size="small"
                    value={dp.amount}
                    onChange={(e) => {
                      const newPayments = dailyPayments.map((p, i) =>
                        i === idx ? { ...p, amount: e.target.value } : p
                      )
                      setDailyPayments(newPayments)
                    }}
                    className="flex-1"
                    inputProps={{ min: 0 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      const newPayments = dailyPayments.filter((_, i) => i !== idx)
                      setDailyPayments(newPayments)
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overtime Payments Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-neutral-600">Overtime Payments</div>
            <button
              className="text-primary text-sm flex items-center gap-1 hover:underline"
              onClick={() => setOvertimePayments([...overtimePayments, { date: payDate, amount: '', hours: '' }])}
            >
              <AddIcon fontSize="small" /> Add Overtime
            </button>
          </div>

          {overtimePayments.length === 0 && (
            <div className="text-sm text-neutral-400 italic bg-neutral-50 p-2 rounded text-center">
              No overtime payments added
            </div>
          )}

          <div className="space-y-2">
            {overtimePayments.map((ot, idx) => (
              <div key={idx} className="flex gap-2">
                <TextField
                  type="date"
                  size="small"
                  value={ot.date}
                  onChange={(e) => {
                    const newPayments = overtimePayments.map((p, i) =>
                      i === idx ? { ...p, date: e.target.value } : p
                    )
                    setOvertimePayments(newPayments)
                  }}
                  InputLabelProps={{ shrink: true }}
                  className="flex-1"
                />
                <TextField
                  placeholder="Amount"
                  type="number"
                  size="small"
                  value={ot.amount}
                  onChange={(e) => {
                    const newPayments = overtimePayments.map((p, i) =>
                      i === idx ? { ...p, amount: e.target.value } : p
                    )
                    setOvertimePayments(newPayments)
                  }}
                  className="flex-1"
                  inputProps={{ min: 0, step: '0.01' }}
                />
                <TextField
                  placeholder="Hours"
                  type="number"
                  size="small"
                  value={ot.hours}
                  onChange={(e) => {
                    const newPayments = overtimePayments.map((p, i) =>
                      i === idx ? { ...p, hours: e.target.value } : p
                    )
                    setOvertimePayments(newPayments)
                  }}
                  className="flex-1"
                  inputProps={{ min: 0, step: '0.5' }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newPayments = overtimePayments.filter((_, i) => i !== idx)
                    setOvertimePayments(newPayments)
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>
            ))}
          </div>
        </div>

        <TextField
          label="Pay Date"
          type="date"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />

        <Divider />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-xs text-neutral-500">Gross</div>
            <div className="text-lg font-bold">
              {preview?.calculation ? `₹${preview.calculation.amountGross}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-xs text-neutral-500">Advance Deducted</div>
            <div className="text-lg font-bold">
              {preview?.calculation ? `₹${preview.calculation.advanceDeducted}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-xs text-neutral-500">Overtime Deducted</div>
            <div className="text-lg font-bold text-warning">
              {preview?.calculation ? `₹${preview.calculation.overtimePaymentsTotal || 0}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-xs text-neutral-500">Net Pay</div>
            <div className="text-lg font-bold text-success">
              {preview?.calculation ? `₹${preview.calculation.netAmount}` : '—'}
            </div>
          </div>
        </div>

        {preview?.worker && (
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            Current advance balance: <b>₹{preview.worker.advanceBalance}</b> → After: <b>₹{preview.projected?.advanceBalance}</b>
          </div>
        )}
      </DialogContent>

      <DialogActions className="p-4 flex gap-2">
        <button className="px-4 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={onClose}>
          Cancel
        </button>
        <button
          className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 disabled:opacity-50"
          disabled={!canPreview || loadingPreview}
          onClick={handlePreview}
        >
          {loadingPreview ? 'Previewing…' : 'Preview'}
        </button>
        <button
          className="px-4 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
          disabled={!preview || loadingPay}
          onClick={handlePay}
        >
          {loadingPay ? 'Paying…' : 'Confirm Pay'}
        </button>
      </DialogActions>
    </Dialog>
  )
}



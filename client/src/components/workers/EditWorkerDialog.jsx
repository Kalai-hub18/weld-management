import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// MUI Components
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Avatar from '@mui/material/Avatar'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import BadgeIcon from '@mui/icons-material/Badge'
import WorkIcon from '@mui/icons-material/Work'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'

// Utilities
import { calculateSalaryBreakdown, calculateAge } from '../../utils/salaryCalculations'
import { useSettings } from '../../context/SettingsContext'

const EditWorkerDialog = ({ open, onClose, worker, onSave }) => {
  const { settings } = useSettings()
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState({
    // Personal
    firstName: '',
    lastName: '',
    name: '',
    age: '',
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    bloodGroup: '',

    // Contact
    phone: '',
    alternatePhone: '',
    email: '',
    address: '',

    // Identity
    aadhaar: '',
    pan: '',

    // Professional
    department: '',
    position: '',
    experience: '',
    status: 'active',
    inactiveFrom: '', // ENTERPRISE: Date when worker became inactive

    // Skills
    skills: [],
    newSkill: '',

    // Salary
    paymentType: 'Monthly',
    baseSalary: '',
    salaryMonthly: '',
    salaryDaily: '',
    hourlyRate: '',
    overtimeRate: '',
    workingDaysPerMonth: '26',
    workingHoursPerDay: '8',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    pfNumber: '',

    // Emergency
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    emergencyAddress: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (worker && open) {
      const safeNum = (v) => {
        const n = Number(v)
        return Number.isFinite(n) ? n : null
      }
      const toDateOnly = (d) => (d ? new Date(d).toISOString().split('T')[0] : '')

      // Prefer saved salary config; fall back to derived fields to avoid "0" overwriting real data.
      const paymentType = worker.paymentType || worker.salary?.paymentType || 'Monthly'
      const savedMonthly = safeNum(worker.salaryMonthly)
      const savedDaily = safeNum(worker.salaryDaily)
      const savedHourly = safeNum(worker.hourlyRate)
      const savedOT = safeNum(worker.overtimeRate)
      const workingDays = safeNum(worker.workingDaysPerMonth) ?? 26
      const workingHours = safeNum(worker.workingHoursPerDay) ?? 8
      const rawBase = safeNum(worker.baseSalary ?? worker.salary?.baseSalary)

      let baseForUI = rawBase
      // If baseSalary is missing/0 but derived salaries exist, use derived as primary input
      if ((!baseForUI || baseForUI <= 0) && paymentType === 'Monthly' && savedMonthly && savedMonthly > 0) {
        baseForUI = savedMonthly
      }
      if ((!baseForUI || baseForUI <= 0) && paymentType === 'Daily' && savedDaily && savedDaily > 0) {
        baseForUI = savedDaily
      }

      const breakdown = calculateSalaryBreakdown(
        paymentType,
        baseForUI || 0,
        workingDays,
        workingHours
      )

      setFormData({
        firstName: worker.firstName || '',
        lastName: worker.lastName || '',
        name: worker.name || '',
        age: worker.age?.toString() || '',
        gender: worker.gender || '',
        dateOfBirth: toDateOnly(worker.dateOfBirth),
        maritalStatus: worker.maritalStatus || '',
        bloodGroup: worker.bloodGroup || '',
        phone: worker.phone || '',
        alternatePhone: worker.alternatePhone || '',
        email: worker.email || '',
        address: worker.address || '',
        aadhaar: worker.aadhaar || '',
        pan: worker.pan || '',
        department: worker.department || '',
        position: worker.position || '',
        experience: worker.experience?.toString() || '',
        status: worker.status || 'active',
        inactiveFrom: worker.inactiveFrom ? new Date(worker.inactiveFrom).toISOString().split('T')[0] : '',
        skills: worker.skills || [],
        newSkill: '',
        paymentType,
        baseSalary: baseForUI !== null && baseForUI !== undefined ? String(baseForUI) : '',
        salaryMonthly: savedMonthly !== null && savedMonthly !== undefined ? String(savedMonthly) : String(breakdown.monthlyRate),
        salaryDaily: savedDaily !== null && savedDaily !== undefined ? String(savedDaily) : String(breakdown.dailyRate),
        hourlyRate: savedHourly !== null && savedHourly !== undefined ? String(savedHourly) : String(breakdown.hourlyRate),
        overtimeRate: savedOT !== null && savedOT !== undefined ? String(savedOT) : String(breakdown.overtimeRate),
        workingDaysPerMonth: String(workingDays),
        workingHoursPerDay: String(workingHours),
        bankName: worker.bankDetails?.bankName || '',
        accountNumber: worker.bankDetails?.accountNumber || '',
        ifscCode: worker.bankDetails?.ifscCode || '',
        pfNumber: worker.pfNumber || '',
        emergencyName: worker.emergencyContact?.name || '',
        emergencyRelation: worker.emergencyContact?.relation || '',
        emergencyPhone: worker.emergencyContact?.phone || '',
        emergencyAddress: worker.emergencyContact?.address || '',
      })
    }
  }, [worker, open])

  // Auto-calculate age when DOB changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth)
      setFormData(prev => ({ ...prev, age: age !== null ? age.toString() : '' }))
    }
  }, [formData.dateOfBirth])

  // Auto-calculate salary breakdown when relevant fields change
  useEffect(() => {
    if (formData.baseSalary && formData.paymentType) {
      const breakdown = calculateSalaryBreakdown(
        formData.paymentType,
        parseFloat(formData.baseSalary) || 0,
        parseInt(formData.workingDaysPerMonth) || 26,
        parseInt(formData.workingHoursPerDay) || 8
      )

      setFormData(prev => ({
        ...prev,
        salaryMonthly: breakdown.monthlyRate.toString(),
        salaryDaily: breakdown.dailyRate.toString(),
        hourlyRate: breakdown.hourlyRate.toString(),
        overtimeRate: breakdown.overtimeRate.toString(),
      }))
    }
  }, [formData.baseSalary, formData.paymentType, formData.workingDaysPerMonth, formData.workingHoursPerDay])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddSkill = () => {
    if (formData.newSkill.trim() && !formData.skills.includes(formData.newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, prev.newSkill.trim()],
        newSkill: '',
      }))
    }
  }

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
    }))
  }

  const handleSubmit = async () => {
    // ENTERPRISE RULE: Validate inactiveFrom is required when status is inactive
    if (formData.status === 'inactive' && !formData.inactiveFrom) {
      toast.error('Inactive From Date is required when status is Inactive')
      return
    }
    
    // ENTERPRISE RULE: Admin safety confirmation when marking worker inactive
    if (formData.status === 'inactive' && worker.status !== 'inactive') {
      const inactiveDateFormatted = new Date(formData.inactiveFrom).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      const confirmed = window.confirm(
        `⚠️ IMPORTANT: Mark ${formData.name || worker.name} as Inactive?\n\n` +
        `Inactive From: ${inactiveDateFormatted}\n\n` +
        `This will:\n` +
        `✓ Stop attendance marking from ${inactiveDateFormatted}\n` +
        `✓ Stop salary calculation from ${inactiveDateFormatted}\n` +
        `✓ Stop invoice generation from ${inactiveDateFormatted}\n\n` +
        `Past records will remain unchanged and accessible.\n\n` +
        `Do you want to continue?`
      )
      
      if (!confirmed) {
        return
      }
    }
    
    setLoading(true)

    const toNumberOrUndefined = (value) => {
      const n = Number(value)
      return Number.isFinite(n) && n >= 0 ? n : undefined
    }

    const updatedWorker = {
      ...worker,
      firstName: formData.firstName,
      lastName: formData.lastName,
      name: formData.name || `${formData.firstName} ${formData.lastName}`.trim(),
      age: toNumberOrUndefined(formData.age),
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      maritalStatus: formData.maritalStatus,
      bloodGroup: formData.bloodGroup,
      phone: formData.phone,
      alternatePhone: formData.alternatePhone,
      email: formData.email,
      address: formData.address,
      aadhaar: formData.aadhaar,
      pan: formData.pan,
      department: formData.department,
      position: formData.position,
      experience: toNumberOrUndefined(formData.experience),
      status: formData.status,
      inactiveFrom: formData.status === 'inactive' ? formData.inactiveFrom : null, // ENTERPRISE: Only set if inactive
      skills: formData.skills,
      paymentType: formData.paymentType,
      baseSalary: toNumberOrUndefined(formData.baseSalary),
      salaryMonthly: toNumberOrUndefined(formData.salaryMonthly),
      salaryDaily: toNumberOrUndefined(formData.salaryDaily),
      hourlyRate: toNumberOrUndefined(formData.hourlyRate),
      overtimeRate: toNumberOrUndefined(formData.overtimeRate),
      workingDaysPerMonth: toNumberOrUndefined(formData.workingDaysPerMonth),
      workingHoursPerDay: toNumberOrUndefined(formData.workingHoursPerDay),
      bankDetails: {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
      },
      pfNumber: formData.pfNumber,
      emergencyContact: {
        name: formData.emergencyName,
        relation: formData.emergencyRelation,
        phone: formData.emergencyPhone,
        address: formData.emergencyAddress,
      },
    }

    onSave(updatedWorker)
    setLoading(false)
  }

  const tabPanels = [
    { label: 'Personal', icon: PersonIcon },
    { label: 'Professional', icon: WorkIcon },
    { label: 'Salary', icon: AccountBalanceWalletIcon },
    { label: 'Emergency', icon: PhoneIcon },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              src={worker?.photo}
              sx={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
              }}
            >
              {worker?.name?.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <IconButton
              size="small"
              className="!absolute -bottom-1 -right-1 !bg-primary !text-white"
              sx={{ width: 24, height: 24 }}
            >
              <CameraAltIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </div>
          <div>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
              Edit Worker
            </h2>
            <p className="text-sm text-neutral-500">{worker?.employeeId}</p>
          </div>
        </div>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
        className="border-b border-light-border dark:border-dark-border"
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
          },
          '& .Mui-selected': {
            color: '#FF6A00',
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#FF6A00',
          },
        }}
      >
        {tabPanels.map((tab, index) => (
          <Tab key={index} label={tab.label} icon={<tab.icon fontSize="small" />} iconPosition="start" />
        ))}
      </Tabs>

      <DialogContent className="!py-6">
        <AnimatePresence mode="wait">
          {/* Personal Tab */}
          {activeTab === 0 && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon className="text-neutral-400" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                helperText="Age will be auto-calculated"
              />
              <TextField
                fullWidth
                label="Age"
                name="age"
                value={formData.age}
                InputProps={{
                  readOnly: true,
                }}
                helperText="Auto-calculated from DOB"
                disabled
              />
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  label="Gender"
                >
                  <MenuItem value="">Select Gender</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon className="text-neutral-400" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon className="text-neutral-400" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Aadhaar Number"
                name="aadhaar"
                value={formData.aadhaar}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon className="text-neutral-400" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="PAN Number"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                multiline
                rows={2}
                className="md:col-span-2"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnIcon className="text-neutral-400" />
                    </InputAdornment>
                  ),
                }}
              />
            </motion.div>
          )}

          {/* Professional Tab */}
          {activeTab === 1 && (
            <motion.div
              key="professional"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    label="Department"
                  >
                    <MenuItem value="Field Operations">Field Operations</MenuItem>
                    <MenuItem value="Shop Operations">Shop Operations</MenuItem>
                    <MenuItem value="Quality Control">Quality Control</MenuItem>
                    <MenuItem value="Maintenance">Maintenance</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  label="Experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g., 8 years"
                />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="on-leave">On Leave</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
                
                {/* ENTERPRISE: Inactive From Date - Required when status is inactive */}
                {formData.status === 'inactive' && (
                  <>
                    <TextField
                      fullWidth
                      label="Inactive From Date *"
                      type="date"
                      name="inactiveFrom"
                      value={formData.inactiveFrom || ''}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      helperText="First day the worker is NOT active. Attendance cannot be marked on or after this date."
                      required
                    />
                    
                    {/* Info Banner */}
                    <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-warning text-lg">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-warning mb-1">
                            Inactive Worker - Limited Operations
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            • Attendance marking will stop from the inactive date<br/>
                            • Salary calculation will exclude days after inactive date<br/>
                            • Invoice generation will be blocked from inactive date<br/>
                            • Past records remain unchanged and accessible
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Skills */}
              <div className="mt-6">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2 block">
                  Skills
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.skills.map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      onDelete={() => handleRemoveSkill(skill)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <TextField
                    size="small"
                    placeholder="Add a skill..."
                    name="newSkill"
                    value={formData.newSkill}
                    onChange={handleChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    className="flex-1"
                  />
                  <IconButton
                    onClick={handleAddSkill}
                    className="!bg-primary !text-white"
                  >
                    <AddIcon />
                  </IconButton>
                </div>
              </div>
            </motion.div>
          )}

          {/* Salary Tab */}
          {activeTab === 2 && (
            <motion.div
              key="salary"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div>
                <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                  Salary Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormControl fullWidth>
                    <InputLabel>Payment Type</InputLabel>
                    <Select
                      name="paymentType"
                      value={formData.paymentType}
                      onChange={handleChange}
                      label="Payment Type"
                    >
                      <MenuItem value="Daily">Daily</MenuItem>
                      <MenuItem value="Monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label={formData.paymentType === 'Daily' ? 'Daily Salary' : 'Monthly Salary'}
                    name="baseSalary"
                    type="number"
                    value={formData.baseSalary}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">{settings?.currency?.symbol || '₹'}</InputAdornment>,
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Working Days/Month"
                    name="workingDaysPerMonth"
                    type="number"
                    value={formData.workingDaysPerMonth}
                    onChange={handleChange}
                    inputProps={{ min: 1, max: 31 }}
                  />
                  <TextField
                    fullWidth
                    label="Working Hours/Day"
                    name="workingHoursPerDay"
                    type="number"
                    value={formData.workingHoursPerDay}
                    onChange={handleChange}
                    inputProps={{ min: 1, max: 24 }}
                  />
                </div>
              </div>

              {/* Auto-calculated fields */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20">
                <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  <CheckIcon fontSize="small" />
                  Auto-Calculated Salary Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    fullWidth
                    label="Monthly Salary"
                    value={formData.salaryMonthly}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <InputAdornment position="start">{settings?.currency?.symbol || '₹'}</InputAdornment>,
                    }}
                    disabled
                  />
                  <TextField
                    fullWidth
                    label="Daily Salary"
                    value={formData.salaryDaily}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <InputAdornment position="start">{settings?.currency?.symbol || '₹'}</InputAdornment>,
                    }}
                    disabled
                  />
                  <TextField
                    fullWidth
                    label="Hourly Rate"
                    value={formData.hourlyRate}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <InputAdornment position="start">{settings?.currency?.symbol || '₹'}</InputAdornment>,
                    }}
                    disabled
                  />
                  <TextField
                    fullWidth
                    label="Overtime Rate"
                    value={formData.overtimeRate}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <InputAdornment position="start">{settings?.currency?.symbol || '₹'}</InputAdornment>,
                    }}
                    disabled
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                  Bank Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    fullWidth
                    label="Bank Name"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                  />
                  <TextField
                    fullWidth
                    label="Account Number"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                  />
                  <TextField
                    fullWidth
                    label="IFSC Code"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleChange}
                  />
                  <TextField
                    fullWidth
                    label="PF Number"
                    name="pfNumber"
                    value={formData.pfNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Emergency Tab */}
          {activeTab === 3 && (
            <motion.div
              key="emergency"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-xl bg-info/10 border border-info/20 mb-4">
                <p className="text-sm text-info">
                  Emergency contact information is optional but recommended for workplace safety.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Contact Name"
                  name="emergencyName"
                  value={formData.emergencyName}
                  onChange={handleChange}
                />
                <FormControl fullWidth>
                  <InputLabel>Relationship</InputLabel>
                  <Select
                    name="emergencyRelation"
                    value={formData.emergencyRelation}
                    onChange={handleChange}
                    label="Relationship"
                  >
                    <MenuItem value="">Select Relationship</MenuItem>
                    <MenuItem value="spouse">Spouse</MenuItem>
                    <MenuItem value="parent">Parent</MenuItem>
                    <MenuItem value="sibling">Sibling</MenuItem>
                    <MenuItem value="child">Child</MenuItem>
                    <MenuItem value="friend">Friend</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon className="text-neutral-400" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Address"
                  name="emergencyAddress"
                  value={formData.emergencyAddress}
                  onChange={handleChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions className="border-t border-light-border dark:border-dark-border p-4">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </DialogActions>
    </Dialog>
  )
}

export default EditWorkerDialog



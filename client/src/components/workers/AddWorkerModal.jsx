import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

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
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import FormHelperText from '@mui/material/FormHelperText'

// MUI Icons
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonIcon from '@mui/icons-material/Person'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckIcon from '@mui/icons-material/Check'

// Utilities
import { calculateSalaryBreakdown, calculateAge } from '../../utils/salaryCalculations'
import { useSettings } from '../../context/SettingsContext'

// Available options
const DEPARTMENTS = [
  'Field Operations',
  'Shop Operations',
  'Quality Control',
  'Maintenance',
  'Safety',
  'Administration',
]

const POSITIONS = [
  'Junior Welder',
  'Welder',
  'Senior Welder',
  'Lead Welder',
  'Helper',
  'Painter',
  'Pipe Welder',
  'Shop Welder',
  'Weld Inspector',
  'Supervisor',
]

const SKILLS = [
  'MIG Welding',
  'TIG Welding',
  'Arc Welding',
  'Pipe Welding',
  'Structural Welding',
  'Aluminum Welding',
  'Stainless Steel',
  'Spot Welding',
  'Plasma Cutting',
  'NDT Inspection',
]

// Certifications removed - not needed for welding management system

const steps = ['Personal Info', 'Professional', 'Salary', 'Emergency Contact']

const AddWorkerModal = ({ open, onClose, onAdd }) => {
  const { settings } = useSettings()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  // Only mark "typed" when user actually types/pastes (NOT when browser autofills silently).
  const [emailTyped, setEmailTyped] = useState(false)

  const [formData, setFormData] = useState({
    // Personal Info (Step 0)
    firstName: '',
    lastName: '',
    // NOTE: named differently to prevent browser autofill into a field literally named "email"
    workerEmail: '',
    phone: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    address: '',
    aadhaar: '',

    // Professional (Step 1)
    department: '',
    position: '',
    joinDate: new Date().toISOString().split('T')[0],
    employmentType: 'full-time',
    skills: [],
    // certifications removed - not needed
    experience: '',

    // Salary (Step 2)
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

    // Emergency Contact (Step 3)
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    emergencyAddress: '',
  })

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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const markEmailTyped = () => setEmailTyped(true)

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  // Certification toggle removed - not needed

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 0) {
      // Only firstName and phone are required
      if (!formData.firstName || !formData.firstName.trim()) {
        newErrors.firstName = 'First name is required'
      }
      if (!formData.phone || !formData.phone.trim()) {
        newErrors.phone = 'Phone is required'
      }
    } else if (step === 1) {
      if (!formData.department) newErrors.department = 'Department is required'
      if (!formData.position) newErrors.position = 'Position is required'
    } else if (step === 2) {
      if (!formData.baseSalary) newErrors.baseSalary = 'Base salary is required'
    }
    // Step 3 (Emergency Contact) - all fields are optional

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(activeStep)) {
      // Extra safety: if browser auto-filled the email but user didn't type, clear it
      // when leaving step 0.
      if (activeStep === 0 && !emailTyped && formData.workerEmail?.trim()) {
        setFormData(prev => ({ ...prev, workerEmail: '' }))
      }
      setActiveStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return

    setLoading(true)

    try {
      const safeEmail = (v) => {
        const s = typeof v === 'string' ? v.trim() : ''
        if (!s) return null
        const lower = s.toLowerCase()
        if (lower === 'undefined' || lower === 'null') return null
        return lower
      }

      // Generate username from firstName + random number (with safety check)
      const username = formData.firstName 
        ? `${formData.firstName.toLowerCase().replace(/\s+/g, '')}${Math.floor(Math.random() * 1000)}`
        : `worker${Math.floor(Math.random() * 10000)}`
      const password = 'Welcome@123' // Default password

      // ENTERPRISE UX: Email is optional.
      // - If user did NOT type/paste into Email: send null (ignore silent autofill)
      // - If user typed but left it blank: send null
      // - If user typed a value: send normalized email
      const email = emailTyped ? safeEmail(formData.workerEmail) : null

      const workerData = {
        username,
        password,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName || undefined,
        email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        aadhaar: formData.aadhaar || undefined,
        department: formData.department,
        position: formData.position,
        skills: formData.skills,
        // certifications removed - not needed
        employmentType: formData.employmentType,
        experience: formData.experience ? Number(formData.experience) : undefined,
        paymentType: formData.paymentType,
        baseSalary: Number(formData.baseSalary),
        salaryMonthly: Number(formData.salaryMonthly),
        salaryDaily: Number(formData.salaryDaily),
        hourlyRate: Number(formData.hourlyRate),
        overtimeRate: Number(formData.overtimeRate),
        workingDaysPerMonth: Number(formData.workingDaysPerMonth),
        workingHoursPerDay: Number(formData.workingHoursPerDay),
        bankDetails: {
          bankName: formData.bankName || undefined,
          accountNumber: formData.accountNumber || undefined,
          ifscCode: formData.ifscCode || undefined,
        },
        pfNumber: formData.pfNumber || undefined,
        emergencyContact: {
          name: formData.emergencyName || undefined,
          relation: formData.emergencyRelation || undefined,
          phone: formData.emergencyPhone || undefined,
          address: formData.emergencyAddress || undefined,
        },
        role: 'Worker',
        status: 'active',
      }

      if (onAdd) {
        await onAdd(workerData)
      }
      handleClose()
    } catch (error) {
      console.error('Error adding worker:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setActiveStep(0)
    setEmailTyped(false)
    setFormData({
      firstName: '',
      lastName: '',
      workerEmail: '',
      phone: '',
      dateOfBirth: '',
      age: '',
      gender: '',
      address: '',
      aadhaar: '',
      department: '',
      position: '',
      joinDate: new Date().toISOString().split('T')[0],
      employmentType: 'full-time',
      skills: [],
      // certifications removed
      experience: '',
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
      emergencyName: '',
      emergencyRelation: '',
      emergencyPhone: '',
      emergencyAddress: '',
    })
    setErrors({})
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px', maxHeight: '90vh' },
      }}
    >
      <DialogTitle className="border-b border-light-border dark:border-dark-border pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <PersonAddIcon className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                Add New Worker
              </h2>
              <p className="text-sm text-neutral-500">Fill in the worker details</p>
            </div>
          </div>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </div>
      </DialogTitle>

      {/* Stepper */}
      <div className="px-6 py-4 border-b border-light-border dark:border-dark-border">
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '&.Mui-active': { color: '#FF6A00' },
                    '&.Mui-completed': { color: '#22C55E' },
                  },
                }}
              >
                <span className="text-xs">{label}</span>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>

      <DialogContent className="!py-6">
        {/* Step 0: Personal Info */}
        {activeStep === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Avatar Preview */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                    fontSize: '1.5rem',
                  }}
                >
                  {formData.firstName && formData.lastName
                    ? `${formData.firstName[0]}${formData.lastName[0]}`
                    : formData.firstName
                    ? formData.firstName[0]
                    : <PersonIcon sx={{ fontSize: 40 }} />
                  }
                </Avatar>
                <IconButton
                  size="small"
                  className="!absolute !bottom-0 !right-0 !bg-primary !text-white"
                >
                  <CameraAltIcon fontSize="small" />
                </IconButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={!!errors.firstName}
                helperText={errors.firstName}
                required
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
                label="Email (Optional)"
                name="workerEmail"
                // Use text to further reduce aggressive browser autofill on email inputs
                type="text"
                value={formData.workerEmail}
                onChange={handleChange}
                onKeyDown={markEmailTyped}
                onPaste={markEmailTyped}
                helperText="Optional. Leave empty if not needed."
                autoComplete="off"
                inputProps={{ inputMode: 'email' }}
              />
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={!!errors.phone}
                helperText={errors.phone || 'Required'}
                required
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
                label="Aadhaar Number"
                name="aadhaar"
                value={formData.aadhaar}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="md:col-span-2"
                multiline
                rows={2}
              />
            </div>
          </motion.div>
        )}

        {/* Step 1: Professional */}
        {activeStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormControl fullWidth error={!!errors.department} required>
                <InputLabel>Department</InputLabel>
                <Select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  label="Department"
                >
                  {DEPARTMENTS.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
                {errors.department && <FormHelperText>{errors.department}</FormHelperText>}
              </FormControl>
              <FormControl fullWidth error={!!errors.position} required>
                <InputLabel>Position</InputLabel>
                <Select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  label="Position"
                >
                  {POSITIONS.map(pos => (
                    <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                  ))}
                </Select>
                {errors.position && <FormHelperText>{errors.position}</FormHelperText>}
              </FormControl>
              <TextField
                fullWidth
                label="Join Date"
                name="joinDate"
                type="date"
                value={formData.joinDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  label="Employment Type"
                >
                  <MenuItem value="full-time">Full Time</MenuItem>
                  <MenuItem value="part-time">Part Time</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Experience (Years)"
                name="experience"
                type="number"
                value={formData.experience}
                onChange={handleChange}
                inputProps={{ min: 0, max: 50 }}
              />
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-3">
                Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(skill => (
                  <Chip
                    key={skill}
                    label={skill}
                    onClick={() => handleSkillToggle(skill)}
                    color={formData.skills.includes(skill) ? 'primary' : 'default'}
                    variant={formData.skills.includes(skill) ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
            </div>

            {/* Certifications section removed - not needed for welding management */}
          </motion.div>
        )}

        {/* Step 2: Salary */}
        {activeStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                Salary Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormControl fullWidth required>
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
                  <FormHelperText>Select how salary is calculated</FormHelperText>
                </FormControl>
                <TextField
                  fullWidth
                  label={formData.paymentType === 'Daily' ? 'Daily Salary' : 'Monthly Salary'}
                  name="baseSalary"
                  type="number"
                  value={formData.baseSalary}
                  onChange={handleChange}
                  error={!!errors.baseSalary}
                  helperText={errors.baseSalary || 'Enter base salary amount'}
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">{settings?.currency?.symbol || '₹'}</InputAdornment>,
                  }}
                />
                {/* <TextField
                  fullWidth
                  label="Working Days/Month"
                  name="workingDaysPerMonth"
                  type="number"
                  value={formData.workingDaysPerMonth}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: 31 }}
                  helperText="Used for salary calculations"
                /> */}
                {/* <TextField
                  fullWidth
                  label="Working Hours/Day"
                  name="workingHoursPerDay"
                  type="number"
                  value={formData.workingHoursPerDay}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: 24 }}
                  helperText="Used for hourly rate calculation"
                /> */}
              </div>
            </div>

            {/* Auto-calculated fields (read-only) */}
            {/* <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20">
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
                  helperText="Auto-calculated"
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
                  helperText="Auto-calculated"
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
                  helperText="Daily ÷ Working Hours"
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
                  helperText="Hourly × 1.5"
                  disabled
                />
              </div>
            </div> */}

            <div>
              <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                Bank Details (Optional)
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

        {/* Step 3: Emergency Contact */}
        {activeStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-xl bg-info/10 border border-info/20 mb-6">
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
                helperText="Optional"
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
                label="Phone Number"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleChange}
                helperText="Optional"
              />
              <TextField
                fullWidth
                label="Address"
                name="emergencyAddress"
                value={formData.emergencyAddress}
                onChange={handleChange}
                helperText="Optional"
              />
            </div>

            {/* Summary Preview */}
            <div className="mt-6 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-3">
                Worker Summary
              </h4>
              <div className="flex items-center gap-4 mb-4">
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    background: 'linear-gradient(135deg, #FF6A00 0%, #CC5500 100%)',
                  }}
                >
                  {formData.firstName && formData.lastName
                    ? `${formData.firstName[0]}${formData.lastName[0]}`
                    : formData.firstName
                    ? formData.firstName[0]
                    : <PersonIcon />
                  }
                </Avatar>
                <div>
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {formData.firstName} {formData.lastName}
                  </p>
                  <p className="text-sm text-primary">{formData.position}</p>
                  <p className="text-xs text-neutral-500">{formData.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-neutral-500">Phone:</span>{' '}
                  <span className="text-light-text dark:text-dark-text">{formData.phone}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Age:</span>{' '}
                  <span className="text-light-text dark:text-dark-text">{formData.age || '--'}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Payment:</span>{' '}
                  <span className="text-light-text dark:text-dark-text">{formData.paymentType}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Base Salary:</span>{' '}
                  <span className="text-success font-semibold">{settings?.currency?.symbol || '₹'}{formData.baseSalary}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Skills:</span>{' '}
                  <span className="text-light-text dark:text-dark-text">{formData.skills.length}</span>
                </div>
                {/* Certifications removed - not needed */}
              </div>
            </div>
          </motion.div>
        )}
      </DialogContent>

      <DialogActions className="border-t border-light-border dark:border-dark-border p-4">
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Cancel
        </button>
        <div className="flex-1" />
        {activeStep > 0 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowBackIcon fontSize="small" />
            Back
          </button>
        )}
        {activeStep < steps.length - 1 ? (
          <button
            onClick={handleNext}
            className="btn-primary flex items-center gap-1"
          >
            Next
            <ArrowForwardIcon fontSize="small" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckIcon fontSize="small" />
                Add Worker
              </>
            )}
          </button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default AddWorkerModal



import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import BusinessIcon from '@mui/icons-material/Business'
import UploadIcon from '@mui/icons-material/Upload'
import SaveIcon from '@mui/icons-material/Save'
import toast from 'react-hot-toast'
import companySettingsService from '../../services/companySettingsService'

const CompanySettingsPage = () => {
  const [settings, setSettings] = useState({
    companyName: '',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    gstNumber: '',
    taxNumber: '',
    phone: '',
    email: '',
    website: '',
    logo: null,
  })
  const [loading, setLoading] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await companySettingsService.getSettings()
      setSettings(response.data)
      if (response.data.logo?.url) {
        setLogoPreview(response.data.logo.url)
      }
    } catch (error) {
      toast.error('Failed to load settings')
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo must be less than 2MB')
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload logo if changed
      if (logoFile) {
        await companySettingsService.uploadLogo(logoFile)
      }

      // Update settings
      await companySettingsService.updateSettings(settings)
      toast.success('Settings saved successfully')
      fetchSettings()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
          Company Settings
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="premium-card p-6 space-y-6">
        {/* Logo Upload */}
        <div className="flex items-center gap-6">
          <Avatar src={logoPreview} sx={{ width: 120, height: 120 }}>
            <BusinessIcon sx={{ fontSize: 60 }} />
          </Avatar>
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
              id="logo-upload"
            />
            <label htmlFor="logo-upload">
              <Button component="span" variant="outlined" startIcon={<UploadIcon />}>
                Upload Logo
              </Button>
            </label>
            <p className="text-sm text-neutral-500 mt-2">PNG or JPG, max 2MB</p>
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            fullWidth
            label="Company Name"
            value={settings.companyName}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="GST Number"
            value={settings.gstNumber}
            onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
          />
          <TextField
            fullWidth
            label="Phone"
            value={settings.phone}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
          />
          <TextField
            fullWidth
            label="Website"
            value={settings.website}
            onChange={(e) => setSettings({ ...settings, website: e.target.value })}
            className="md:col-span-2"
          />
        </div>

        {/* Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            fullWidth
            label="Street Address"
            value={settings.address.street}
            onChange={(e) =>
              setSettings({
                ...settings,
                address: { ...settings.address, street: e.target.value },
              })
            }
            className="md:col-span-2"
          />
          <TextField
            fullWidth
            label="City"
            value={settings.address.city}
            onChange={(e) =>
              setSettings({
                ...settings,
                address: { ...settings.address, city: e.target.value },
              })
            }
          />
          <TextField
            fullWidth
            label="State"
            value={settings.address.state}
            onChange={(e) =>
              setSettings({
                ...settings,
                address: { ...settings.address, state: e.target.value },
              })
            }
          />
          <TextField
            fullWidth
            label="Pincode"
            value={settings.address.pincode}
            onChange={(e) =>
              setSettings({
                ...settings,
                address: { ...settings.address, pincode: e.target.value },
              })
            }
          />
          <TextField
            fullWidth
            label="Country"
            value={settings.address.country}
            onChange={(e) =>
              setSettings({
                ...settings,
                address: { ...settings.address, country: e.target.value },
              })
            }
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

export default CompanySettingsPage

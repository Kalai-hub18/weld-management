import CompanySettings from '../models/CompanySettings.js'
import { asyncHandler } from '../middleware/errorMiddleware.js'
import fs from 'fs'
import path from 'path'

// @desc    Get company settings
// @route   GET /api/company-settings
// @access  Private
export const getCompanySettings = asyncHandler(async (req, res) => {
  let settings = await CompanySettings.findOne()

  if (!settings) {
    // Create default settings if none exist
    settings = await CompanySettings.create({
      companyName: 'Your Company Name',
      address: { country: 'India' },
    })
  }

  res.json({
    success: true,
    data: settings,
  })
})

// @desc    Update company settings
// @route   PUT /api/company-settings
// @access  Private/Admin
export const updateCompanySettings = asyncHandler(async (req, res) => {
  const { companyName, address, gstNumber, taxNumber, phone, email, website } = req.body

  let settings = await CompanySettings.findOne()

  if (!settings) {
    settings = await CompanySettings.create(req.body)
  } else {
    settings.companyName = companyName || settings.companyName
    settings.address = address || settings.address
    settings.gstNumber = gstNumber !== undefined ? gstNumber : settings.gstNumber
    settings.taxNumber = taxNumber !== undefined ? taxNumber : settings.taxNumber
    settings.phone = phone !== undefined ? phone : settings.phone
    settings.email = email !== undefined ? email : settings.email
    settings.website = website !== undefined ? website : settings.website

    await settings.save()
  }

  res.json({
    success: true,
    data: settings,
  })
})

// @desc    Upload company logo
// @route   POST /api/company-settings/logo
// @access  Private/Admin
export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('No file uploaded')
  }

  let settings = await CompanySettings.findOne()

  if (!settings) {
    settings = await CompanySettings.create({
      companyName: 'Your Company Name',
      address: { country: 'India' },
    })
  }

  // Delete old logo if exists
  if (settings.logo?.filename) {
    const oldLogoPath = path.join('uploads', 'logos', settings.logo.filename)
    if (fs.existsSync(oldLogoPath)) {
      fs.unlinkSync(oldLogoPath)
    }
  }

  settings.logo = {
    url: `/uploads/logos/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    uploadedAt: new Date(),
  }

  await settings.save()

  res.json({
    success: true,
    data: settings.logo,
  })
})

// @desc    Delete company logo
// @route   DELETE /api/company-settings/logo
// @access  Private/Admin
export const deleteLogo = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.findOne()

  if (!settings || !settings.logo) {
    res.status(404)
    throw new Error('No logo found')
  }

  // Delete file from filesystem
  const logoPath = path.join('uploads', 'logos', settings.logo.filename)
  if (fs.existsSync(logoPath)) {
    fs.unlinkSync(logoPath)
  }

  settings.logo = undefined
  await settings.save()

  res.json({
    success: true,
    message: 'Logo deleted successfully',
  })
})

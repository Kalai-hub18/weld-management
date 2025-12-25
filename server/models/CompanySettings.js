import mongoose from 'mongoose'

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    logo: {
      url: String,
      filename: String,
      size: Number,
      uploadedAt: Date,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India',
      },
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    taxNumber: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    website: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
companySettingsSchema.index({ createdAt: 1 })

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema)

export default CompanySettings

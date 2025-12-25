import mongoose from 'mongoose'

const currencySchema = new mongoose.Schema(
  {
    code: { type: String, default: 'USD', trim: true },
    symbol: { type: String, default: '$', trim: true },
    position: { type: String, enum: ['prefix', 'suffix'], default: 'prefix' },
    decimals: { type: Number, default: 2, min: 0, max: 6 },
  },
  { _id: false }
)

const dateTimeSchema = new mongoose.Schema(
  {
    timezone: { type: String, default: 'UTC', trim: true }, // IANA tz
    dateFormat: { type: String, enum: ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'], default: 'YYYY-MM-DD' },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '24h' },
  },
  { _id: false }
)

const themeSchema = new mongoose.Schema(
  {
    primary: { type: String, default: '#FF6A00', trim: true },
    secondary: { type: String, default: '#1E293B', trim: true },
    accent: { type: String, default: '#0EA5E9', trim: true },
    background: { type: String, default: '#F8FAFC', trim: true },
    fontSize: { type: Number, default: 14, min: 10, max: 22 },
  },
  { _id: false }
)

const settingsSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true, unique: true, trim: true },
    currency: { type: currencySchema, default: () => ({}) },
    dateTime: { type: dateTimeSchema, default: () => ({}) },
    theme: { type: themeSchema, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

const Settings = mongoose.model('Settings', settingsSchema)

export default Settings




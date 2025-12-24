import dotenv from 'dotenv'
import mongoose from 'mongoose'
import User from '../models/User.js'

dotenv.config()

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment/.env')
  }

  await mongoose.connect(uri)
  console.log('✅ Connected')

  // 1) Clean legacy "blank" emails that should not participate in uniqueness
  const cleanResult = await User.updateMany(
    { email: { $type: 'string', $regex: /^\s*$/ } },
    { $unset: { email: 1 } }
  )
  console.log(`🧹 Unset blank-string emails: matched=${cleanResult.matchedCount} modified=${cleanResult.modifiedCount}`)

  const nullResult = await User.updateMany(
    { email: null },
    { $unset: { email: 1 } }
  )
  console.log(`🧹 Unset null emails: matched=${nullResult.matchedCount} modified=${nullResult.modifiedCount}`)

  // 2) Drop any old unique email index (field-level unique/sparse creates email_1)
  const indexes = await User.collection.indexes()
  const emailIndexNames = indexes
    .filter((idx) => idx.key && idx.key.email === 1)
    .map((idx) => idx.name)

  for (const name of emailIndexNames) {
    if (name === '_id_') continue
    console.log(`🗑️ Dropping index: ${name}`)
    await User.collection.dropIndex(name)
  }

  // 3) Create the correct unique index that IGNORE blanks
  console.log('🛠️ Creating partial unique index: email_unique_nonempty')
  await User.collection.createIndex(
    { email: 1 },
    {
      unique: true,
      name: 'email_unique_nonempty',
      // Compatibility: avoid $ne in partialFilterExpression (unsupported on some MongoDB versions).
      // App layer guarantees we never store "" for email.
      partialFilterExpression: { email: { $type: 'string' } },
    }
  )

  console.log('✅ Done. Restart backend after this.')
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('❌ Failed:', err)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore
  }
  process.exit(1)
})



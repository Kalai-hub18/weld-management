import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Check actual status values in MongoDB (raw query)
 */
const checkStatusValues = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db
    const usersCollection = db.collection('users')

    console.log('\n📊 Checking all users with their actual status values...\n')
    
    const users = await usersCollection.find(
      { role: 'Worker' },
      { projection: { name: 1, status: 1, role: 1, _id: 1 } }
    ).toArray()

    console.log(`Found ${users.length} workers:\n`)
    
    users.forEach((user, index) => {
      const statusValue = user.status
      const statusType = typeof statusValue
      const statusBytes = Buffer.from(statusValue || '', 'utf8').toString('hex')
      
      console.log(`${index + 1}. ${user.name}`)
      console.log(`   Status: "${statusValue}"`)
      console.log(`   Type: ${statusType}`)
      console.log(`   Hex: ${statusBytes}`)
      console.log(`   Match lowercase: ${statusValue === statusValue?.toLowerCase()}`)
      console.log('')
    })

    // Check unique status values
    console.log('\n📊 Unique status values in database:')
    const uniqueStatuses = await usersCollection.distinct('status')
    uniqueStatuses.forEach(status => {
      console.log(`   - "${status}" (${typeof status})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkStatusValues()

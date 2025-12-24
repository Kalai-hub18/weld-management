import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

/**
 * Fix status field case sensitivity issue
 * MongoDB has "Inactive" (capital I) but schema expects "inactive" (lowercase)
 */
const fixStatusCase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('\n📊 Checking for status case issues...')
    
    // Find all users with incorrect case status
    const usersWithWrongCase = await User.find({
      status: { $in: ['Inactive', 'Active', 'Suspended', 'On-leave', 'On-Leave'] }
    }).select('_id name status role')

    console.log(`\n🔍 Found ${usersWithWrongCase.length} users with incorrect status case:`)
    usersWithWrongCase.forEach(user => {
      console.log(`   - ${user.name} (${user.role}): "${user.status}"`)
    })

    if (usersWithWrongCase.length === 0) {
      console.log('\n✅ All status values are already in correct case!')
      process.exit(0)
    }

    console.log('\n🔧 Fixing status case...')
    
    // Update all incorrect cases
    const bulkOps = usersWithWrongCase.map(user => ({
      updateOne: {
        filter: { _id: user._id },
        update: { 
          $set: { 
            status: user.status.toLowerCase() 
          } 
        }
      }
    }))

    const result = await User.bulkWrite(bulkOps)
    
    console.log(`\n✅ Fixed ${result.modifiedCount} users`)
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...')
    const stillWrong = await User.find({
      status: { $in: ['Inactive', 'Active', 'Suspended', 'On-leave', 'On-Leave'] }
    }).countDocuments()

    if (stillWrong === 0) {
      console.log('✅ All status values are now in correct case!')
    } else {
      console.log(`⚠️  Warning: ${stillWrong} users still have incorrect case`)
    }

    // Show summary
    console.log('\n📊 Current status distribution:')
    const statusCounts = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    statusCounts.forEach(({ _id, count }) => {
      console.log(`   - ${_id}: ${count}`)
    })

    console.log('\n✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixStatusCase()

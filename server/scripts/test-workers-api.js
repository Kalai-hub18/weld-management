import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

/**
 * Test the workers query logic directly
 */
const testWorkersQuery = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Test 1: Default query (should show active only)
    console.log('TEST 1: Default query (no parameters)')
    console.log('Query: { role: "Worker", status: "active" }')
    const test1 = await User.find({ role: 'Worker', status: 'active' })
      .select('name status role')
    console.log(`Result: ${test1.length} workers`)
    test1.forEach(w => console.log(`  - ${w.name}: ${w.status}`))
    console.log('')

    // Test 2: Show all workers (activeOnly=false)
    console.log('TEST 2: Show all workers (activeOnly=false)')
    console.log('Query: { role: "Worker" }')
    const test2 = await User.find({ role: 'Worker' })
      .select('name status role')
    console.log(`Result: ${test2.length} workers`)
    test2.forEach(w => console.log(`  - ${w.name}: ${w.status}`))
    console.log('')

    // Test 3: Show only inactive
    console.log('TEST 3: Show only inactive')
    console.log('Query: { role: "Worker", status: "inactive" }')
    const test3 = await User.find({ role: 'Worker', status: 'inactive' })
      .select('name status role')
    console.log(`Result: ${test3.length} workers`)
    test3.forEach(w => console.log(`  - ${w.name}: ${w.status}`))
    console.log('')

    // Test 4: Count by status
    console.log('TEST 4: Count by status')
    const counts = await User.aggregate([
      { $match: { role: 'Worker' } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    counts.forEach(({ _id, count }) => {
      console.log(`  - ${_id}: ${count}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testWorkersQuery()

import request from 'supertest'
import app from '../app.js'
import User from '../models/User.js'

async function registerAndLoginAdmin() {
  await request(app).post('/api/auth/register').send({
    username: 'admin',
    password: 'password123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'Admin',
  })

  const loginRes = await request(app).post('/api/auth/login').send({
    username: 'admin',
    password: 'password123',
  })

  return loginRes.body.data.token
}

describe('Salary advance/partial pay APIs', () => {
  test('preview rejects unauthenticated', async () => {
    const res = await request(app).post('/api/salary/preview').send({
      workerId: '507f1f77bcf86cd799439011',
      type: 'full',
    })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  test('pay rejects manager (no canManageSalary permission)', async () => {
    // create Manager user
    const mgr = await User.create({
      username: 'manager',
      password: 'password123',
      name: 'Mgr',
      email: 'mgr@example.com',
      role: 'Manager',
      status: 'active',
    })

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'manager',
      password: 'password123',
    })
    const token = loginRes.body.data.token

    // create worker
    const worker = await User.create({
      username: 'worker1',
      password: 'password123',
      name: 'Worker One',
      email: 'w1@example.com',
      role: 'Worker',
      status: 'active',
      salaryMonthly: 30000,
      salaryDaily: 1000,
      advanceBalance: 5000,
    })

    const res = await request(app)
      .post('/api/salary/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: worker._id.toString(), type: 'full' })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  test('preview and pay full salary (deducts advance)', async () => {
    const token = await registerAndLoginAdmin()

    const worker = await User.create({
      username: 'worker1',
      password: 'password123',
      name: 'Worker One',
      email: 'w1@example.com',
      role: 'Worker',
      status: 'active',
      salaryMonthly: 30000,
      salaryDaily: 1000,
      advanceBalance: 5000,
    })

    const previewRes = await request(app)
      .post('/api/salary/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: worker._id.toString(), type: 'full' })

    expect(previewRes.status).toBe(200)
    expect(previewRes.body.success).toBe(true)
    expect(previewRes.body.data.calculation.amountGross).toBe(30000)
    expect(previewRes.body.data.calculation.advanceDeducted).toBe(5000)
    expect(previewRes.body.data.calculation.netAmount).toBe(25000)

    const payRes = await request(app)
      .post('/api/salary/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: worker._id.toString(), type: 'full', note: 'Dec salary' })

    expect(payRes.status).toBe(201)
    expect(payRes.body.success).toBe(true)
    expect(payRes.body.data.payment.type).toBe('full')
    expect(payRes.body.data.payment.netAmount).toBe(25000)
    expect(payRes.body.data.payment.advanceBalanceBefore).toBe(5000)
    expect(payRes.body.data.payment.advanceBalanceAfter).toBe(0)
    expect(payRes.body.data.worker.advanceBalance).toBe(0)
  })

  test('advance payment increases advanceBalance', async () => {
    const token = await registerAndLoginAdmin()

    const worker = await User.create({
      username: 'worker2',
      password: 'password123',
      name: 'Worker Two',
      email: 'w2@example.com',
      role: 'Worker',
      status: 'active',
      salaryMonthly: 30000,
      salaryDaily: 1000,
      advanceBalance: 1000,
    })

    const payRes = await request(app)
      .post('/api/salary/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: worker._id.toString(), type: 'advance', amount: 2000 })

    expect(payRes.status).toBe(201)
    expect(payRes.body.success).toBe(true)
    expect(payRes.body.data.worker.advanceBalance).toBe(3000)
  })

  test('can update payDate/note and balances are recomputed', async () => {
    const token = await registerAndLoginAdmin()

    const worker = await User.create({
      username: 'worker3',
      password: 'password123',
      name: 'Worker Three',
      email: 'w3@example.com',
      role: 'Worker',
      status: 'active',
      salaryMonthly: 30000,
      salaryDaily: 1000,
      advanceBalance: 0,
    })

    // Create an advance on day 2
    const adv = await request(app)
      .post('/api/salary/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: worker._id.toString(), type: 'advance', amount: 2000, payDate: '2025-12-02' })
    expect(adv.status).toBe(201)
    const advId = adv.body.data.payment._id

    // Create a full payment on day 3 (should deduct 2000)
    const full = await request(app)
      .post('/api/salary/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: worker._id.toString(), type: 'full', payDate: '2025-12-03' })
    expect(full.status).toBe(201)

    // Now move advance to AFTER full payment (day 4) => full should no longer deduct it
    const upd = await request(app)
      .put(`/api/salary/payments/${advId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ payDate: '2025-12-04', note: 'moved' })
    expect(upd.status).toBe(200)
    expect(upd.body.success).toBe(true)

    const hist = await request(app)
      .get(`/api/salary/history/${worker._id.toString()}?limit=10`)
      .set('Authorization', `Bearer ${token}`)
    expect(hist.status).toBe(200)
    expect(hist.body.success).toBe(true)
    // Latest by date desc should be the moved advance
    expect(hist.body.data[0].type).toBe('advance')

    const workerAfter = await User.findById(worker._id)
    expect(workerAfter.advanceBalance).toBe(2000)
  })

  test('voiding a payment removes it from history and recomputes balance', async () => {
    const token = await registerAndLoginAdmin()

    const worker = await User.create({
      username: 'worker4',
      password: 'password123',
      name: 'Worker Four',
      email: 'w4@example.com',
      role: 'Worker',
      status: 'active',
      salaryMonthly: 30000,
      salaryDaily: 1000,
      advanceBalance: 0,
    })

    const adv = await request(app)
      .post('/api/salary/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: worker._id.toString(), type: 'advance', amount: 1500, payDate: '2025-12-01' })
    expect(adv.status).toBe(201)
    const advId = adv.body.data.payment._id

    const voidRes = await request(app)
      .delete(`/api/salary/payments/${advId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'mistake' })
    expect(voidRes.status).toBe(200)
    expect(voidRes.body.success).toBe(true)

    const hist = await request(app)
      .get(`/api/salary/history/${worker._id.toString()}?limit=10`)
      .set('Authorization', `Bearer ${token}`)
    expect(hist.status).toBe(200)
    expect(hist.body.data.length).toBe(0)

    const workerAfter = await User.findById(worker._id)
    expect(workerAfter.advanceBalance).toBe(0)
  })
})



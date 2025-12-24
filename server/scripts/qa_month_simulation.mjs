import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import request from 'supertest'

import app from '../app.js'
import User from '../models/User.js'
import Project from '../models/Project.js'
import Task from '../models/Task.js'
import Attendance from '../models/Attendance.js'
import Salary from '../models/Salary.js'
import SalaryPayment from '../models/SalaryPayment.js'
import Invoice from '../models/Invoice.js'
import InvoiceCommunication from '../models/InvoiceCommunication.js'

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`Missing env var ${name}. Add it to backend/.env`)
  return process.env[name]
}

function safeDbUriForQa(uri) {
  // Keep credentials/host, but force DB name suffix to avoid destroying real data.
  // Supports both "mongodb://.../db" and "mongodb+srv://.../db?..."
  const u = new URL(uri)
  const pathname = u.pathname || '/'
  const db = pathname.replace(/^\//, '') || 'weldms'
  const qaDb = db.endsWith('_qa') ? db : `${db}_qa`
  u.pathname = `/${qaDb}`
  return u.toString()
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

function isoDateOnly(d) {
  return d.toISOString().slice(0, 10)
}

function startOfDayUTC(year, month1to12, day) {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0))
}

function utcWithTime(dateUtcMidnight, hh, mm) {
  return new Date(Date.UTC(
    dateUtcMidnight.getUTCFullYear(),
    dateUtcMidnight.getUTCMonth(),
    dateUtcMidnight.getUTCDate(),
    hh,
    mm,
    0,
    0
  ))
}

async function run() {
  const startedAt = new Date()
  const report = {
    meta: {
      product: 'WeldMS',
      startedAt: startedAt.toISOString(),
      env: process.env.NODE_ENV || 'development',
    },
    created: {},
    testCases: [],
    dbSnapshot: {},
    knownGaps: [],
  }

  const rawUri = requireEnv('MONGODB_URI')
  const qaUri = safeDbUriForQa(rawUri)

  await mongoose.connect(qaUri)

  // Clean slate
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Attendance.deleteMany({}),
    Salary.deleteMany({}),
    SalaryPayment.deleteMany({}),
    Invoice.deleteMany({}),
    InvoiceCommunication.deleteMany({}),
  ])

  const api = request(app)

  const tc = async (name, fn) => {
    const entry = { name, status: 'pending', error: null }
    report.testCases.push(entry)
    try {
      await fn()
      entry.status = 'pass'
    } catch (e) {
      entry.status = 'fail'
      entry.error = e?.message || String(e)
    }
  }

  let adminToken = null
  let managerToken = null
  let workerToken = null
  let adminUser = null
  let managerUser = null
  let workerUser = null
  let project = null
  const tasks = []

  await tc('Create Admin user (Arul Admin) via /api/auth/register', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({
        username: 'arul.admin',
        password: 'Admin@123',
        name: 'Arul Admin',
        email: 'arul.admin@example.com',
        role: 'Admin',
      })
    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}: ${JSON.stringify(res.body)}`)
    adminToken = res.body?.data?.token
    adminUser = res.body?.data?.user
    if (!adminToken) throw new Error('Admin token missing from register response')
  })

  await tc('Create Supervisor user (requested) -> uses Manager role (Kumar Supervisor)', async () => {
    // NOTE: System role enum does not include Supervisor; we create Manager to simulate.
    const res = await api
      .post('/api/auth/register')
      .send({
        username: 'kumar.supervisor',
        password: 'Manager@123',
        name: 'Kumar Supervisor',
        email: 'kumar.supervisor@example.com',
        role: 'Manager',
      })
    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}: ${JSON.stringify(res.body)}`)
    managerToken = res.body?.data?.token
    managerUser = res.body?.data?.user
    if (!managerToken) throw new Error('Manager token missing from register response')
  })

  await tc('Create Worker user (Ramesh Worker) via /api/workers (Admin)', async () => {
    const res = await api
      .post('/api/workers')
      .set(authHeader(adminToken))
      .send({
        name: 'Ramesh Worker',
        email: 'ramesh.worker@example.com',
        phone: '9876543210',
        department: 'Welding',
        position: 'Welder',
        skills: ['MIG', 'Arc'],
      })
    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}: ${JSON.stringify(res.body)}`)
    workerUser = res.body?.data
    report.created.workerDefaultPassword = 'worker123'

    // Set daily salary using API (allowed), but paymentType is NOT allowed via worker update route.
    const upd = await api
      .put(`/api/workers/${workerUser._id}`)
      .set(authHeader(adminToken))
      .send({ salaryDaily: 700 })
    if (upd.statusCode !== 200) throw new Error(`Worker update failed: ${upd.statusCode}: ${JSON.stringify(upd.body)}`)

    // Direct DB update to align with requested "Daily wage" and salary invoice calculator usage.
    await User.updateOne({ _id: workerUser._id }, { $set: { paymentType: 'Daily' } })
  })

  await tc('Verify users exist in DB and roles are correct', async () => {
    const [uAdmin, uManager, uWorker] = await Promise.all([
      User.findOne({ username: 'arul.admin' }),
      User.findOne({ username: 'kumar.supervisor' }),
      User.findOne({ email: 'ramesh.worker@example.com' }),
    ])
    if (!uAdmin || uAdmin.role !== 'Admin') throw new Error('Admin user not found or wrong role')
    if (!uManager || uManager.role !== 'Manager') throw new Error('Supervisor/Manager user not found or wrong role')
    if (!uWorker || uWorker.role !== 'Worker') throw new Error('Worker user not found or wrong role')
  })

  await tc('Permission check: Manager cannot create project (should be 403)', async () => {
    const res = await api
      .post('/api/projects')
      .set(authHeader(managerToken))
      .send({
        name: 'Should Fail',
        client: 'X',
        startDate: '2025-11-01',
        endDate: '2025-11-30',
        budget: 0,
      })
    if (res.statusCode !== 403) throw new Error(`Expected 403, got ${res.statusCode}`)
  })

  await tc('Create Project (Factory Welding Work) as Admin', async () => {
    const res = await api
      .post('/api/projects')
      .set(authHeader(adminToken))
      .send({
        name: 'Factory Welding Work',
        client: 'ABC Industries',
        clientContact: { name: 'ABC Accounts', email: 'accounts@abc.example', phone: '9123456789' },
        startDate: '2025-11-01',
        endDate: '2025-11-30',
        budget: 0,
        manager: managerUser?._id,
        assignedWorkers: [workerUser?._id],
      })
    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}: ${JSON.stringify(res.body)}`)
    project = res.body?.data
    if (!project?._id) throw new Error('Project id missing')
  })

  await tc('Create Tasks across 4 weeks as Manager', async () => {
    const taskDefs = [
      { title: 'Weld section A', due: '2025-11-05', status: 'completed' },
      { title: 'Weld section B', due: '2025-11-10', status: 'in-progress' },
      { title: 'Material prep', due: '2025-11-12', status: 'completed' },
      { title: 'Site inspection fixes', due: '2025-11-18', status: 'pending' },
      { title: 'Final pass welding', due: '2025-11-24', status: 'pending' },
      { title: 'Quality check', due: '2025-11-27', status: 'pending' },
    ]

    for (const def of taskDefs) {
      const res = await api
        .post('/api/tasks')
        .set(authHeader(managerToken))
        .send({
          title: def.title,
          description: 'QA simulated task',
          projectId: project._id,
          assignedTo: workerUser._id,
          priority: 'medium',
          dueDate: def.due,
        })
      if (res.statusCode !== 201) throw new Error(`Task create failed: ${res.statusCode}: ${JSON.stringify(res.body)}`)
      const t = res.body?.data
      tasks.push(t)

      if (def.status !== 'pending') {
        const upd = await api
          .put(`/api/tasks/${t._id}`)
          .set(authHeader(managerToken))
          .send({ status: def.status })
        if (upd.statusCode !== 200) throw new Error(`Task update failed: ${upd.statusCode}: ${JSON.stringify(upd.body)}`)
      }
    }
  })

  await tc('Worker can only see assigned tasks', async () => {
    // Login worker using default password from createWorker
    const login = await api
      .post('/api/auth/login')
      .send({ username: 'ramesh.worker', password: 'worker123' })
    if (login.statusCode !== 200) throw new Error(`Worker login failed: ${login.statusCode}`)
    workerToken = login.body?.data?.token

    const list = await api
      .get('/api/tasks?limit=100')
      .set(authHeader(workerToken))
    if (list.statusCode !== 200) throw new Error(`Worker tasks list failed: ${list.statusCode}`)
    const data = list.body?.data || []
    if (data.length === 0) throw new Error('Expected worker to see tasks, saw 0')
    const foreign = data.find(t => String(t.assignedTo?._id || t.assignedTo) !== String(workerUser._id))
    if (foreign) throw new Error('Worker can see tasks not assigned to them')
  })

  await tc('Insert 1 month attendance (26 present, 4 absent) with overtime, linked to project (DB insert)', async () => {
    const year = 2025
    const month = 11 // November
    const daysInMonth = 30
    const presentDaysTarget = 26

    let present = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const date = startOfDayUTC(year, month, day)
      const isPresent = present < presentDaysTarget
      if (isPresent) present++

      const checkInAt = isPresent ? utcWithTime(date, 9, 0) : null
      const checkOutAt = isPresent ? utcWithTime(date, 18, 0) : null

      // Add overtime on 6 random-ish days (2 extra hours)
      const overtimeDay = isPresent && [3, 7, 11, 15, 19, 23].includes(day)
      const checkOutAtFinal = overtimeDay ? utcWithTime(date, 20, 0) : checkOutAt

      await Attendance.create({
        worker: workerUser._id,
        project: project._id, // NOTE: API currently does NOT allow setting project; this is DB-level insert
        date,
        status: isPresent ? 'present' : 'absent',
        checkInAt: checkInAt || undefined,
        checkOutAt: checkOutAtFinal || undefined,
      })
    }

    const count = await Attendance.countDocuments({ worker: workerUser._id })
    if (count !== 30) throw new Error(`Expected 30 attendance records, got ${count}`)
  })

  await tc('Salary invoice calculation uses attendance + daily wage (expect 26 × 700 = 18200)', async () => {
    const res = await api
      .post('/api/invoices/salary/calculate')
      .set(authHeader(adminToken))
      .send({
        workerId: workerUser._id,
        periodFrom: '2025-11-01',
        periodTo: '2025-11-30',
      })
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`)
    const calc = res.body?.data
    const base = calc?.salaryBreakdown?.baseSalaryAmount
    if (base !== 18200) {
      throw new Error(`Expected baseSalaryAmount=18200, got ${base}`)
    }
  })

  let salaryInvoiceId = null
  await tc('Generate salary invoice (Admin)', async () => {
    const res = await api
      .post('/api/invoices/salary')
      .set(authHeader(adminToken))
      .send({
        workerId: workerUser._id,
        periodFrom: '2025-11-01',
        periodTo: '2025-11-30',
        deductions: 0,
        deductionNotes: '',
        notes: 'QA simulated salary invoice',
      })
    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}: ${JSON.stringify(res.body)}`)
    salaryInvoiceId = res.body?.data?._id
    if (!salaryInvoiceId) throw new Error('salary invoice id missing')
  })

  await tc('Record salary payment (Admin) as partial daysPaid=26 -> 18200', async () => {
    // Preview
    const preview = await api
      .post('/api/salary/preview')
      .set(authHeader(adminToken))
      .send({ workerId: workerUser._id, type: 'partial', daysPaid: 26 })
    if (preview.statusCode !== 200) throw new Error(`Preview failed: ${preview.statusCode}`)
    if (preview.body?.data?.calculation?.amountGross !== 18200) {
      throw new Error(`Expected preview gross 18200, got ${preview.body?.data?.calculation?.amountGross}`)
    }

    // Pay
    const pay = await api
      .post('/api/salary/pay')
      .set(authHeader(adminToken))
      .send({
        workerId: workerUser._id,
        type: 'partial',
        daysPaid: 26,
        payDate: '2025-12-01',
        note: 'QA simulated month-end salary payment',
      })
    if (pay.statusCode !== 201) throw new Error(`Pay failed: ${pay.statusCode}: ${JSON.stringify(pay.body)}`)
    const payment = pay.body?.data?.payment
    if (!payment?._id) throw new Error('Payment id missing')
    if (payment.netAmount !== 18200) throw new Error(`Expected netAmount 18200, got ${payment.netAmount}`)
  })

  await tc('Manager cannot pay salary (permission)', async () => {
    const pay = await api
      .post('/api/salary/pay')
      .set(authHeader(managerToken))
      .send({ workerId: workerUser._id, type: 'partial', daysPaid: 1 })
    if (pay.statusCode !== 403) throw new Error(`Expected 403, got ${pay.statusCode}`)
  })

  // Final DB snapshot
  report.created = {
    admin: adminUser,
    supervisorSimulatedAsManager: managerUser,
    worker: workerUser,
    project,
    tasksCreated: tasks.length,
    salaryInvoiceId,
  }

  report.dbSnapshot = {
    users: await User.countDocuments({}),
    workers: await User.countDocuments({ role: 'Worker' }),
    projects: await Project.countDocuments({}),
    tasks: await Task.countDocuments({}),
    attendance: await Attendance.countDocuments({}),
    salaries: await Salary.countDocuments({}),
    salary_payments: await SalaryPayment.countDocuments({}),
    invoices: await Invoice.countDocuments({}),
    invoice_communications: await InvoiceCommunication.countDocuments({}),
  }

  report.knownGaps.push(
    {
      id: 'role-supervisor-missing',
      severity: 'P0',
      note: 'Requested role "Supervisor" does not exist; system uses Manager. Impacts permissions + menu visibility spec.',
    },
    {
      id: 'attendance-project-link-missing',
      severity: 'P0',
      note: 'Attendance API does not allow setting `project`; controller removed project assignment. Requirement says attendance auto-links worker & project.',
    },
    {
      id: 'worker-soft-delete-missing',
      severity: 'P1',
      note: 'Worker delete is hard delete (no soft delete / restore). Requirement expects soft delete.',
    },
    {
      id: 'salary-module-daily-wage-mismatch',
      severity: 'P0',
      note: 'Salary module generation calculates baseSalary from hours * hourlyRate; requirement wants daily wage × present days. SalaryPayment supports daysPaid, but does not update Salary records.',
    },
    {
      id: 'worker-paymentType-update-gap',
      severity: 'P1',
      note: 'Worker update API allows salaryDaily but not paymentType; salary invoice calculator uses paymentType. QA script set paymentType directly in DB.',
    }
  )

  const endedAt = new Date()
  report.meta.endedAt = endedAt.toISOString()
  report.meta.durationMs = endedAt.getTime() - startedAt.getTime()
  // Do not include credentials in report output
  report.meta.db = new URL(qaUri).pathname.replace(/^\//, '')

  const outDir = path.join(process.cwd(), 'qa-reports')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `qa-month-simulation-${isoDateOnly(startedAt)}.json`)
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8')

  // Console summary
  const summary = report.testCases.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    },
    {}
  )
  console.log('=== WeldMS QA Month Simulation ===')
  console.log(`DB: ${qaUri}`)
  console.log(`Tests: ${JSON.stringify(summary)}`)
  console.log('DB Snapshot:', report.dbSnapshot)
  console.log(`Report written to: ${outFile}`)

  await mongoose.disconnect()
}

run().catch(async (e) => {
  console.error('QA simulation failed:', e)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})



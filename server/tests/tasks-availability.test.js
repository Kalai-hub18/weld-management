import request from 'supertest'
import { describe, it, expect } from 'vitest'
import app from '../app.js'
import Attendance from '../models/Attendance.js'
import Project from '../models/Project.js'
import User from '../models/User.js'

async function registerAndLoginAdmin() {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'admin',
      password: 'password123',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'Admin',
    })

  expect(registerRes.status).toBe(201)
  expect(registerRes.body.success).toBe(true)

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'password123' })

  expect(loginRes.status).toBe(200)
  expect(loginRes.body.success).toBe(true)
  return loginRes.body.data.token
}

describe('Task availability-based assignment (present/half-day)', () => {
  it('includes half-day workers in eligible list and enforces remaining-hours + overlap limits', async () => {
    const token = await registerAndLoginAdmin()

    // Create a worker
    const worker = await User.create({
      username: 'worker1',
      password: 'password123',
      name: 'Worker One',
      phone: '9999999999',
      role: 'Worker',
      status: 'active',
      workingHoursPerDay: 8,
    })

    // Create a project
    const project = await Project.create({
      name: 'P1',
      client: 'C1',
      startDate: new Date('2099-01-01'),
      endDate: new Date('2099-12-31'),
      budget: 1000,
      status: 'in-progress',
    })

    // Mark half-day attendance on the task date
    await Attendance.create({
      worker: worker._id,
      // Use local midnight to match backend local-day range logic
      date: new Date(2099, 5, 1),
      status: 'half-day',
    })

    // Eligible workers for a 2-hour slot should include the worker
    const eligibleRes = await request(app)
      .get('/api/tasks/eligible-workers?date=2099-06-01&startTime=08:00&endTime=10:00')
      .set('Authorization', `Bearer ${token}`)

    expect(eligibleRes.status).toBe(200)
    expect(eligibleRes.body.success).toBe(true)
    expect(Array.isArray(eligibleRes.body.data)).toBe(true)
    expect(eligibleRes.body.data.length).toBe(1)
    expect(eligibleRes.body.data[0].attendanceStatus).toBe('half-day')
    expect(eligibleRes.body.data[0].canAssign).toBe(true)

    // Create first 2-hour task (uses full half-day capacity = 4 hours total)
    const t1 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Task 1',
        description: 't1',
        projectId: project._id.toString(),
        dueDate: '2099-06-01',
        startTime: '08:00',
        endTime: '10:00',
        assignedWorkers: [worker._id.toString()],
        priority: 'medium',
      })

    expect(t1.status).toBe(201)
    expect(t1.body.success).toBe(true)

    // Create second 2-hour task (remaining = 2 hours, ok)
    const t2 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Task 2',
        description: 't2',
        projectId: project._id.toString(),
        dueDate: '2099-06-01',
        startTime: '10:00',
        endTime: '12:00',
        assignedWorkers: [worker._id.toString()],
      })
    expect(t2.status).toBe(201)

    // Third task should be blocked: half-day fully consumed (4 hours used)
    const t3 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Task 3',
        description: 't3',
        projectId: project._id.toString(),
        dueDate: '2099-06-01',
        startTime: '12:00',
        endTime: '13:00',
        assignedWorkers: [worker._id.toString()],
      })
    expect(t3.status).toBe(400)
    expect(t3.body.success).toBe(false)
    expect(String(t3.body.message || '')).toContain('half-day work')

    // Overlap should also be blocked (overlaps with Task 1)
    const overlap = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Overlap',
        projectId: project._id.toString(),
        dueDate: '2099-06-01',
        startTime: '09:30',
        endTime: '10:30',
        assignedWorkers: [worker._id.toString()],
      })
    expect(overlap.status).toBe(400)
    expect(String(overlap.body.message || '')).toContain('overlap')
  })
})



import request from 'supertest'
import { describe, it, expect } from 'vitest'
import app from '../app.js'

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
  expect(registerRes.body.data?.token).toBeTruthy()

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'password123' })

  expect(loginRes.status).toBe(200)
  expect(loginRes.body.success).toBe(true)
  expect(loginRes.body.data?.token).toBeTruthy()

  return loginRes.body.data.token
}

describe('Workers API (CRUD)', () => {
  it('rejects requests without auth token', async () => {
    const res = await request(app).get('/api/workers')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('creates, lists, updates, and deletes a worker', async () => {
    const token = await registerAndLoginAdmin()

    // Create
    const createRes = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'ravi',
        password: 'password123',
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
        phone: '9999999999',
        department: 'Field Operations',
        position: 'Welder',
        skills: ['MIG Welding'],
      })

    expect(createRes.status).toBe(201)
    expect(createRes.body.success).toBe(true)
    expect(createRes.body.data?.name).toBe('Ravi Kumar')
    const workerId = createRes.body.data?._id
    expect(workerId).toBeTruthy()

    // List
    const listRes = await request(app)
      .get('/api/workers?limit=50')
      .set('Authorization', `Bearer ${token}`)

    expect(listRes.status).toBe(200)
    expect(listRes.body.success).toBe(true)
    expect(Array.isArray(listRes.body.data)).toBe(true)
    expect(listRes.body.data.length).toBe(1)

    // Update
    const updateRes = await request(app)
      .put(`/api/workers/${workerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'inactive',
        inactiveFrom: '2099-01-01',
        phone: '8888888888',
      })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.success).toBe(true)
    expect(updateRes.body.data?._id).toBe(workerId)
    expect(updateRes.body.data?.status).toBe('inactive')
    expect(updateRes.body.data?.phone).toBe('8888888888')

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/workers/${workerId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.success).toBe(true)

    // List again
    const listRes2 = await request(app)
      .get('/api/workers?limit=50')
      .set('Authorization', `Bearer ${token}`)

    expect(listRes2.status).toBe(200)
    expect(listRes2.body.success).toBe(true)
    expect(listRes2.body.data.length).toBe(0)
  })
})



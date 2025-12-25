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

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'password123' })

  expect(loginRes.status).toBe(200)
  return loginRes.body.data.token
}

describe('Projects API (CRUD)', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('creates, lists, updates, and deletes a project', async () => {
    const token = await registerAndLoginAdmin()

    // Create
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pipeline Repair',
        client: 'ABC Corp',
        startDate: '2025-01-01',
        endDate: '2025-02-01',
        budget: 50000,
        priority: 'medium',
        status: 'pending',
      })

    expect(createRes.status).toBe(201)
    expect(createRes.body.success).toBe(true)
    const projectId = createRes.body.data?._id
    expect(projectId).toBeTruthy()

    // List
    const listRes = await request(app)
      .get('/api/projects?limit=100')
      .set('Authorization', `Bearer ${token}`)

    expect(listRes.status).toBe(200)
    expect(listRes.body.success).toBe(true)
    expect(Array.isArray(listRes.body.data)).toBe(true)
    expect(listRes.body.data.length).toBe(1)

    // Update
    const updateRes = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in-progress', spent: 1000 })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.success).toBe(true)
    expect(updateRes.body.data?.status).toBe('in-progress')

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.success).toBe(true)

    // List again
    const listRes2 = await request(app)
      .get('/api/projects?limit=100')
      .set('Authorization', `Bearer ${token}`)

    expect(listRes2.status).toBe(200)
    expect(listRes2.body.success).toBe(true)
    expect(listRes2.body.data.length).toBe(0)
  })
})



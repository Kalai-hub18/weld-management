/**
 * Full API connectivity QA (CRUD + key flows).
 *
 * Prereqs:
 * - Backend running (default: http://localhost:5000)
 *
 * Usage (PowerShell):
 *   cd D:\learn\weld-management\backend
 *   $env:BASE_URL="http://localhost:5000"
 *   $env:ADMIN_USERNAME="qa_admin"
 *   $env:ADMIN_PASSWORD="qa_admin123"
 *   node scripts/qa-full.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'qa_admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'qa_admin123'

const now = new Date()
const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const todayStr = now.toISOString().split('T')[0]

async function request(path, { method = 'GET', token, body, query } = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue
      url.searchParams.set(k, String(v))
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  return { ok: res.ok, status: res.status, json }
}

function okShape(json) {
  return Boolean(json && typeof json === 'object' && 'success' in json)
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function loginOrRegisterAdmin() {
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  })

  if (login.ok) {
    const token = login.json?.data?.token
    assert(token, 'Login response missing data.token')
    return token
  }

  // Attempt register as Admin (dev-only behavior)
  const reg = await request('/api/auth/register', {
    method: 'POST',
    body: {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      name: 'QA Admin',
      email: `${ADMIN_USERNAME}_${Date.now()}@example.com`,
      role: 'Admin',
    },
  })
  assert(reg.ok, `Register failed: ${reg.status} ${reg.json?.message || ''}`)
  const token = reg.json?.data?.token
  assert(token, 'Register response missing data.token')
  return token
}

async function runModule(name, fn) {
  const start = Date.now()
  try {
    const details = await fn()
    return { module: name, status: 'PASS', ms: Date.now() - start, details: details || '' }
  } catch (e) {
    return { module: name, status: 'FAIL', ms: Date.now() - start, details: e.message }
  }
}

async function main() {
  const results = []

  // Health
  results.push(await runModule('Health', async () => {
    const r = await request('/api/health')
    assert(r.ok, `GET /api/health failed (${r.status})`)
    return 'GET /api/health'
  }))

  // Auth
  let token = null
  results.push(await runModule('Auth', async () => {
    token = await loginOrRegisterAdmin()
    const me = await request('/api/auth/me', { token })
    assert(me.ok, `GET /api/auth/me failed (${me.status})`)
    assert(okShape(me.json), 'Response missing {success,...}')
    return 'login/register + me'
  }))

  // Workers CRUD
  let workerId = null
  results.push(await runModule('Workers', async () => {
    const email = `qa_worker_${Date.now()}@example.com`
    const create = await request('/api/workers', {
      method: 'POST',
      token,
      body: {
        name: 'QA Worker',
        email,
        department: 'QA',
        position: 'Welder',
        hourlyRate: 100,
        skills: ['SMAW'],
      },
    })
    assert(create.ok, `POST /api/workers failed (${create.status}): ${create.json?.message || ''}`)
    assert(okShape(create.json), 'Create worker response missing {success,...}')
    workerId = create.json?.data?._id
    assert(workerId, 'Create worker response missing data._id')

    const list = await request('/api/workers', { token, query: { limit: 5, page: 1, search: 'QA' } })
    assert(list.ok, `GET /api/workers failed (${list.status})`)

    const get = await request(`/api/workers/${workerId}`, { token })
    assert(get.ok, `GET /api/workers/:id failed (${get.status})`)

    const upd = await request(`/api/workers/${workerId}`, {
      method: 'PUT',
      token,
      body: { phone: '9999999999' },
    })
    assert(upd.ok, `PUT /api/workers/:id failed (${upd.status})`)

    const del = await request(`/api/workers/${workerId}`, { method: 'DELETE', token })
    assert(del.ok, `DELETE /api/workers/:id failed (${del.status})`)

    // recreate for downstream modules
    const create2 = await request('/api/workers', {
      method: 'POST',
      token,
      body: {
        name: 'QA Worker 2',
        email: `qa_worker2_${Date.now()}@example.com`,
        department: 'QA',
        position: 'Fitter',
        hourlyRate: 120,
      },
    })
    assert(create2.ok, `POST /api/workers (2) failed (${create2.status})`)
    workerId = create2.json?.data?._id
    assert(workerId, 'Create worker (2) missing data._id')
    return 'CRUD OK'
  }))

  // Projects CRUD + actions
  let projectId = null
  results.push(await runModule('Projects', async () => {
    const create = await request('/api/projects', {
      method: 'POST',
      token,
      body: {
        name: `QA Project ${Date.now()}`,
        client: 'QA Client',
        startDate: now.toISOString(),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        budget: 50000,
        priority: 'medium',
        status: 'pending',
      },
    })
    assert(create.ok, `POST /api/projects failed (${create.status}): ${create.json?.message || ''}`)
    projectId = create.json?.data?._id
    assert(projectId, 'Create project missing data._id')

    const list = await request('/api/projects', { token, query: { page: 1, limit: 5, search: 'QA' } })
    assert(list.ok, `GET /api/projects failed (${list.status})`)

    const stats = await request('/api/projects/stats', { token })
    assert(stats.ok, `GET /api/projects/stats failed (${stats.status})`)

    const assign = await request(`/api/projects/${projectId}/workers`, {
      method: 'PUT',
      token,
      body: { workerIds: [workerId] },
    })
    assert(assign.ok, `PUT /api/projects/:id/workers failed (${assign.status})`)

    const prog = await request(`/api/projects/${projectId}/progress`, {
      method: 'PUT',
      token,
      body: { progress: 25 },
    })
    assert(prog.ok, `PUT /api/projects/:id/progress failed (${prog.status})`)

    const get = await request(`/api/projects/${projectId}`, { token })
    assert(get.ok, `GET /api/projects/:id failed (${get.status})`)
    assert(get.json?.data?.project?._id, 'GET project missing data.project')

    const upd = await request(`/api/projects/${projectId}`, {
      method: 'PUT',
      token,
      body: { notes: 'Updated by QA' },
    })
    assert(upd.ok, `PUT /api/projects/:id failed (${upd.status})`)

    return 'CRUD + assign + progress OK'
  }))

  // Tasks CRUD + actions
  let taskId = null
  results.push(await runModule('Tasks', async () => {
    const create = await request('/api/tasks', {
      method: 'POST',
      token,
      body: {
        title: `QA Task ${Date.now()}`,
        projectId,
        assignedTo: workerId,
        priority: 'medium',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        tags: ['weld'],
      },
    })
    assert(create.ok, `POST /api/tasks failed (${create.status}): ${create.json?.message || ''}`)
    taskId = create.json?.data?._id
    assert(taskId, 'Create task missing data._id')

    // list using frontend-style filter `projectId`
    const list = await request('/api/tasks', { token, query: { projectId, page: 1, limit: 10 } })
    assert(list.ok, `GET /api/tasks failed (${list.status})`)

    const stats = await request('/api/tasks/stats', { token })
    assert(stats.ok, `GET /api/tasks/stats failed (${stats.status})`)

    const upd = await request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      token,
      body: { title: 'QA Task Updated' },
    })
    assert(upd.ok, `PUT /api/tasks/:id failed (${upd.status})`)

    const status = await request(`/api/tasks/${taskId}/status`, {
      method: 'PUT',
      token,
      body: { status: 'in-progress', completionPercentage: 20 },
    })
    assert(status.ok, `PUT /api/tasks/:id/status failed (${status.status})`)

    const comment = await request(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      token,
      body: { text: 'QA comment' },
    })
    assert(comment.ok, `POST /api/tasks/:id/comments failed (${comment.status})`)

    const del = await request(`/api/tasks/${taskId}`, { method: 'DELETE', token })
    assert(del.ok, `DELETE /api/tasks/:id failed (${del.status})`)

    return 'CRUD + status + comments OK'
  }))

  // Attendance
  let attendanceId = null
  results.push(await runModule('Attendance', async () => {
    const mark = await request('/api/attendance', {
      method: 'POST',
      token,
      body: {
        workerId,
        date: todayStr,
        status: 'present',
        checkIn: '09:00',
        checkOut: '18:00',
        notes: 'QA present',
        project: projectId,
      },
    })
    assert(mark.ok, `POST /api/attendance failed (${mark.status}): ${mark.json?.message || ''}`)
    attendanceId = mark.json?.data?._id
    assert(attendanceId, 'Attendance upsert missing data._id')

    // list using frontend-style `month/year` and `workerId`
    const list = await request('/api/attendance', {
      token,
      query: { month: now.getMonth() + 1, year: now.getFullYear(), workerId, limit: 100 },
    })
    assert(list.ok, `GET /api/attendance failed (${list.status})`)

    const get = await request(`/api/attendance/${attendanceId}`, { token })
    assert(get.ok, `GET /api/attendance/:id failed (${get.status})`)

    const upd = await request(`/api/attendance/${attendanceId}`, {
      method: 'PUT',
      token,
      body: { notes: 'QA updated note' },
    })
    assert(upd.ok, `PUT /api/attendance/:id failed (${upd.status})`)

    const del = await request(`/api/attendance/${attendanceId}`, { method: 'DELETE', token })
    // delete is Admin-only; if role/permission mismatch this will fail
    assert(del.ok, `DELETE /api/attendance/:id failed (${del.status})`)

    return 'mark + list + get + update + delete OK'
  }))

  // Salary (Payroll)
  let salaryId = null
  results.push(await runModule('Salary', async () => {
    const create = await request('/api/salary', {
      method: 'POST',
      token,
      body: {
        workerId,
        month: monthStr,
        baseSalary: 10000,
        overtime: 0,
        bonus: 0,
        deductions: 0,
        notes: 'QA salary',
      },
    })
    assert(create.ok, `POST /api/salary failed (${create.status}): ${create.json?.message || ''}`)
    salaryId = create.json?.data?._id
    assert(salaryId, 'Create salary missing data._id')

    const list = await request('/api/salary', { token, query: { workerId, month: monthStr, limit: 10 } })
    assert(list.ok, `GET /api/salary failed (${list.status})`)

    const pay = await request(`/api/salary/${salaryId}/pay`, {
      method: 'PUT',
      token,
      body: { amount: 1000, paymentMethod: 'cash' },
    })
    assert(pay.ok, `PUT /api/salary/:id/pay failed (${pay.status})`)

    const upd = await request(`/api/salary/${salaryId}`, {
      method: 'PUT',
      token,
      body: { notes: 'QA salary updated' },
    })
    assert(upd.ok, `PUT /api/salary/:id failed (${upd.status})`)

    const del = await request(`/api/salary/${salaryId}`, { method: 'DELETE', token })
    assert(del.ok, `DELETE /api/salary/:id failed (${del.status})`)

    return 'CRUD + pay OK'
  }))

  // Costs/Budget module
  results.push(await runModule('Cost/Budget', async () => {
    const mat = await request(`/api/projects/${projectId}/materials`, {
      method: 'POST',
      token,
      body: { materialName: 'Steel Rod', quantity: 10, unitPrice: 50, notes: 'QA material' },
    })
    assert(mat.ok, `POST /api/projects/:id/materials failed (${mat.status})`)
    const materialId = mat.json?.data?._id
    assert(materialId, 'Material create missing data._id')

    const mats = await request(`/api/projects/${projectId}/materials`, { token })
    assert(mats.ok, `GET /api/projects/:id/materials failed (${mats.status})`)

    const matUpd = await request(`/api/materials/${materialId}`, {
      method: 'PUT',
      token,
      body: { quantity: 12 },
    })
    assert(matUpd.ok, `PUT /api/materials/:id failed (${matUpd.status})`)

    const other = await request(`/api/projects/${projectId}/other-costs`, {
      method: 'POST',
      token,
      body: { title: 'Transport', amount: 500, description: 'QA transport' },
    })
    assert(other.ok, `POST /api/projects/:id/other-costs failed (${other.status})`)
    const otherId = other.json?.data?._id
    assert(otherId, 'OtherCost create missing data._id')

    const bud = await request(`/api/projects/${projectId}/budget-summary`, { token })
    assert(bud.ok, `GET /api/projects/:id/budget-summary failed (${bud.status})`)

    // Cleanup
    const matDel = await request(`/api/materials/${materialId}`, { method: 'DELETE', token })
    assert(matDel.ok, `DELETE /api/materials/:id failed (${matDel.status})`)

    const otherDel = await request(`/api/other-costs/${otherId}`, { method: 'DELETE', token })
    assert(otherDel.ok, `DELETE /api/other-costs/:id failed (${otherDel.status})`)

    return 'materials + other-costs + budget-summary OK'
  }))

  // Cleanup project + worker
  results.push(await runModule('Cleanup', async () => {
    const pDel = await request(`/api/projects/${projectId}`, { method: 'DELETE', token })
    assert(pDel.ok, `DELETE /api/projects/:id failed (${pDel.status})`)
    const wDel = await request(`/api/workers/${workerId}`, { method: 'DELETE', token })
    assert(wDel.ok, `DELETE /api/workers/:id failed (${wDel.status})`)
    return 'deleted QA project + worker'
  }))

  // Modules not implemented (Participants/Certificates) – check quickly
  results.push(await runModule('Participants (route check)', async () => {
    const r = await request('/api/participants', { token })
    assert(!r.ok && r.status === 404, 'Expected 404 (module not implemented) but got success')
    throw new Error('NOT IMPLEMENTED (404)')
  }))

  results.push(await runModule('Certificates (route check)', async () => {
    const r = await request('/api/certificates', { token })
    assert(!r.ok && r.status === 404, 'Expected 404 (module not implemented) but got success')
    throw new Error('NOT IMPLEMENTED (404)')
  }))

  // Print report
  console.log('\n=== QA REPORT ===')
  for (const r of results) {
    console.log(`${r.status.padEnd(4)} | ${r.module.padEnd(24)} | ${String(r.ms).padStart(5)}ms | ${r.details}`)
  }

  const failCount = results.filter(r => r.status === 'FAIL').length
  console.log(`\nTotal: ${results.length}, PASS: ${results.length - failCount}, FAIL: ${failCount}`)

  process.exit(failCount ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal QA error:', e)
  process.exit(2)
})



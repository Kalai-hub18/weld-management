/**
 * Simple API smoke test (no Postman needed).
 *
 * Usage (PowerShell):
 *   $env:BASE_URL="http://localhost:5000"
 *   $env:USERNAME="admin"
 *   $env:PASSWORD="admin123"
 *   node scripts/api-smoke-test.mjs
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'
const USERNAME = process.env.USERNAME
const PASSWORD = process.env.PASSWORD

if (!USERNAME || !PASSWORD) {
  console.error('Missing USERNAME/PASSWORD env vars')
  process.exit(1)
}

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
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

  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${json?.message || text}`)
  }
  return json
}

async function main() {
  console.log('1) Login...')
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { username: USERNAME, password: PASSWORD },
  })
  const token = login?.data?.token
  if (!token) throw new Error('Login did not return data.token')

  console.log('2) List projects...')
  await request('/api/projects?limit=3&page=1', { token })

  console.log('3) Create project...')
  const created = await request('/api/projects', {
    method: 'POST',
    token,
    body: {
      name: `Smoke Project ${Date.now()}`,
      client: 'Smoke Client',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      budget: 1000,
      priority: 'medium',
      status: 'pending',
    },
  })
  const projectId = created?.data?._id
  if (!projectId) throw new Error('Create project did not return data._id')

  console.log('4) Update project...')
  await request(`/api/projects/${projectId}`, {
    method: 'PUT',
    token,
    body: { notes: 'Updated by smoke test' },
  })

  console.log('5) Delete project...')
  await request(`/api/projects/${projectId}`, {
    method: 'DELETE',
    token,
  })

  console.log('✅ Smoke test passed')
}

main().catch((e) => {
  console.error('❌ Smoke test failed:', e.message)
  process.exit(1)
})



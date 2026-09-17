import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'

describe('GET /api/health', () => {
  it('returns a successful health payload in the standard envelope', async () => {
    const app = createApp()
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('ok')
    expect(typeof response.body.data.timestamp).toBe('string')
  })
})

describe('unknown route', () => {
  it('returns a 404 in the standard error envelope', async () => {
    const app = createApp()
    const response = await request(app).get('/api/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})

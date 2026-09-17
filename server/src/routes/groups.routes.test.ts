import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { TEST_ADMIN_PASSWORD } from '../test/setup.js'

const app = createApp()
const createdGroupIds: string[] = []

async function createTestGroup(name: string) {
  const response = await request(app).post('/api/groups').send({ name })
  createdGroupIds.push(response.body.data.id)
  return response.body.data
}

afterAll(async () => {
  for (const groupId of createdGroupIds) {
    await request(app).delete(`/api/groups/${groupId}`).set('X-Admin-Password', TEST_ADMIN_PASSWORD)
  }
})

describe('POST /api/groups', () => {
  it('creates a group with a valid name', async () => {
    const response = await request(app).post('/api/groups').send({ name: 'Groups Test — Create' })
    createdGroupIds.push(response.body.data?.id)

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.name).toBe('Groups Test — Create')
    expect(response.body.data.id).toBeTypeOf('string')
    expect(response.body.data.created_at).toBeTypeOf('string')
  })

  it('rejects a blank name', async () => {
    const response = await request(app).post('/api/groups').send({ name: '   ' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('allows duplicate group names across groups', async () => {
    const first = await createTestGroup('Groups Test — Duplicate Name')
    const second = await createTestGroup('Groups Test — Duplicate Name')

    expect(first.id).not.toBe(second.id)
  })
})

describe('GET /api/groups/:groupId', () => {
  it('returns the group', async () => {
    const group = await createTestGroup('Groups Test — Get')
    const response = await request(app).get(`/api/groups/${group.id}`)

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe(group.id)
  })

  it('returns 404 for an unknown group', async () => {
    const response = await request(app).get('/api/groups/00000000-0000-0000-0000-000000000000')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('GROUP_NOT_FOUND')
  })

  it('returns 404 for a malformed group id', async () => {
    const response = await request(app).get('/api/groups/not-a-uuid')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('GROUP_NOT_FOUND')
  })
})

describe('PATCH /api/groups/:groupId', () => {
  it('renames a group without requiring a password', async () => {
    const group = await createTestGroup('Groups Test — Rename Before')
    const response = await request(app)
      .patch(`/api/groups/${group.id}`)
      .send({ name: 'Groups Test — Rename After' })

    expect(response.status).toBe(200)
    expect(response.body.data.name).toBe('Groups Test — Rename After')
  })
})

describe('DELETE /api/groups/:groupId', () => {
  it('rejects deletion without an admin password', async () => {
    const group = await createTestGroup('Groups Test — Delete No Password')
    const response = await request(app).delete(`/api/groups/${group.id}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('ADMIN_PASSWORD_REQUIRED')
  })

  it('rejects deletion with an incorrect admin password', async () => {
    const group = await createTestGroup('Groups Test — Delete Wrong Password')
    const response = await request(app)
      .delete(`/api/groups/${group.id}`)
      .set('X-Admin-Password', 'not-the-password')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_ADMIN_PASSWORD')
  })

  it('deletes the group with the correct admin password', async () => {
    const group = await createTestGroup('Groups Test — Delete Success')
    const deleteResponse = await request(app)
      .delete(`/api/groups/${group.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)

    expect(deleteResponse.status).toBe(204)

    const getResponse = await request(app).get(`/api/groups/${group.id}`)
    expect(getResponse.status).toBe(404)
  })
})

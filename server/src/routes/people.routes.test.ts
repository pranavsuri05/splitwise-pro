import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { TEST_ADMIN_PASSWORD } from '../test/setup.js'

const app = createApp()
let groupId: string
let otherGroupId: string

beforeAll(async () => {
  const group = await request(app).post('/api/groups').send({ name: 'People Test Group' })
  groupId = group.body.data.id

  const otherGroup = await request(app)
    .post('/api/groups')
    .send({ name: 'People Test Other Group' })
  otherGroupId = otherGroup.body.data.id
})

afterAll(async () => {
  for (const id of [groupId, otherGroupId]) {
    await request(app).delete(`/api/groups/${id}`).set('X-Admin-Password', TEST_ADMIN_PASSWORD)
  }
})

describe('POST /api/groups/:groupId/people', () => {
  it('adds a person without requiring a password', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/people`)
      .send({ name: 'Sidhant' })

    expect(response.status).toBe(201)
    expect(response.body.data.name).toBe('Sidhant')
    expect(response.body.data.is_active).toBe(true)
    expect(response.body.data.group_id).toBeUndefined()
  })

  it('rejects a duplicate name within the same group', async () => {
    await request(app).post(`/api/groups/${groupId}/people`).send({ name: 'Rahul' })
    const response = await request(app)
      .post(`/api/groups/${groupId}/people`)
      .send({ name: 'Rahul' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('DUPLICATE_PERSON_NAME')
  })

  it('allows the same name in a different group', async () => {
    const response = await request(app)
      .post(`/api/groups/${otherGroupId}/people`)
      .send({ name: 'Rahul' })

    expect(response.status).toBe(201)
  })

  it('returns 404 for an unknown group', async () => {
    const response = await request(app)
      .post('/api/groups/00000000-0000-0000-0000-000000000000/people')
      .send({ name: 'Arjun' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('GROUP_NOT_FOUND')
  })
})

describe('GET /api/groups/:groupId/people', () => {
  it('lists only active people by default', async () => {
    const added = await request(app).post(`/api/groups/${groupId}/people`).send({ name: 'Arjun' })

    await request(app)
      .patch(`/api/groups/${groupId}/people/${added.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({ is_active: false })

    const response = await request(app).get(`/api/groups/${groupId}/people`)
    const names = response.body.data.map((p: { name: string }) => p.name)

    expect(names).not.toContain('Arjun')
  })

  it('includes inactive people when requested', async () => {
    const response = await request(app).get(`/api/groups/${groupId}/people?includeInactive=true`)
    const names = response.body.data.map((p: { name: string }) => p.name)

    expect(names).toContain('Arjun')
  })
})

describe('PATCH /api/groups/:groupId/people/:personId (remove)', () => {
  it('rejects removal without an admin password', async () => {
    const added = await request(app).post(`/api/groups/${groupId}/people`).send({ name: 'Varun' })
    const response = await request(app)
      .patch(`/api/groups/${groupId}/people/${added.body.data.id}`)
      .send({ is_active: false })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('ADMIN_PASSWORD_REQUIRED')
  })

  it('removes the person with the correct admin password', async () => {
    const added = await request(app).post(`/api/groups/${groupId}/people`).send({ name: 'Priya' })
    const response = await request(app)
      .patch(`/api/groups/${groupId}/people/${added.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({ is_active: false })

    expect(response.status).toBe(200)
    expect(response.body.data.is_active).toBe(false)
  })

  it('rejects a request that is not removal (is_active must be false)', async () => {
    const added = await request(app).post(`/api/groups/${groupId}/people`).send({ name: 'Karan' })
    const response = await request(app)
      .patch(`/api/groups/${groupId}/people/${added.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({ is_active: true })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for a person from a different group', async () => {
    const foreignPerson = await request(app)
      .post(`/api/groups/${otherGroupId}/people`)
      .send({ name: 'CrossGroupPerson' })

    const response = await request(app)
      .patch(`/api/groups/${groupId}/people/${foreignPerson.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({ is_active: false })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })
})

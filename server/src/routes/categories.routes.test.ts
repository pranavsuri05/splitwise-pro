import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { TEST_ADMIN_PASSWORD } from '../test/setup.js'

const app = createApp()
let groupId: string
let otherGroupId: string

beforeAll(async () => {
  const group = await request(app).post('/api/groups').send({ name: 'Categories Test Group' })
  groupId = group.body.data.id

  const otherGroup = await request(app)
    .post('/api/groups')
    .send({ name: 'Categories Test Other Group' })
  otherGroupId = otherGroup.body.data.id
})

afterAll(async () => {
  for (const id of [groupId, otherGroupId]) {
    await request(app).delete(`/api/groups/${id}`).set('X-Admin-Password', TEST_ADMIN_PASSWORD)
  }
})

describe('POST /api/groups/:groupId/categories', () => {
  it('adds a category without requiring a password', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/categories`)
      .send({ name: 'Food' })

    expect(response.status).toBe(201)
    expect(response.body.data.name).toBe('Food')
    expect(response.body.data.group_id).toBeUndefined()
  })

  it('rejects a duplicate name within the same group', async () => {
    await request(app).post(`/api/groups/${groupId}/categories`).send({ name: 'Travel' })
    const response = await request(app)
      .post(`/api/groups/${groupId}/categories`)
      .send({ name: 'Travel' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('DUPLICATE_CATEGORY_NAME')
  })

  it('allows the same name in a different group', async () => {
    const response = await request(app)
      .post(`/api/groups/${otherGroupId}/categories`)
      .send({ name: 'Travel' })

    expect(response.status).toBe(201)
  })
})

describe('GET /api/groups/:groupId/categories', () => {
  it('lists categories for the group', async () => {
    const response = await request(app).get(`/api/groups/${groupId}/categories`)
    const names = response.body.data.map((c: { name: string }) => c.name)

    expect(names).toEqual(expect.arrayContaining(['Food', 'Travel']))
  })
})

describe('DELETE /api/groups/:groupId/categories/:categoryId', () => {
  it('deletes a category without requiring a password', async () => {
    const added = await request(app)
      .post(`/api/groups/${groupId}/categories`)
      .send({ name: 'Rent' })

    const response = await request(app).delete(
      `/api/groups/${groupId}/categories/${added.body.data.id}`,
    )
    expect(response.status).toBe(204)

    const listResponse = await request(app).get(`/api/groups/${groupId}/categories`)
    const names = listResponse.body.data.map((c: { name: string }) => c.name)
    expect(names).not.toContain('Rent')
  })

  it('returns 404 for a category from a different group', async () => {
    const foreignCategory = await request(app)
      .post(`/api/groups/${otherGroupId}/categories`)
      .send({ name: 'CrossGroupCategory' })

    const response = await request(app).delete(
      `/api/groups/${groupId}/categories/${foreignCategory.body.data.id}`,
    )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND')
  })
})

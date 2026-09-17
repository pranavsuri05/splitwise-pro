import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { TEST_ADMIN_PASSWORD } from '../test/setup.js'

const app = createApp()

let groupId: string
let sidhant: string
let rahul: string
let arjun: string
let foodCategory: string

let otherGroupId: string
let otherPerson: string
let otherCategory: string

async function addPerson(gid: string, name: string): Promise<string> {
  const res = await request(app).post(`/api/groups/${gid}/people`).send({ name })
  return res.body.data.id
}

async function addCategory(gid: string, name: string): Promise<string> {
  const res = await request(app).post(`/api/groups/${gid}/categories`).send({ name })
  return res.body.data.id
}

async function removePerson(gid: string, personId: string): Promise<void> {
  await request(app)
    .patch(`/api/groups/${gid}/people/${personId}`)
    .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
    .send({ is_active: false })
}

beforeAll(async () => {
  const group = await request(app).post('/api/groups').send({ name: 'Expenses Test Group' })
  groupId = group.body.data.id
  sidhant = await addPerson(groupId, 'Sidhant')
  rahul = await addPerson(groupId, 'Rahul')
  arjun = await addPerson(groupId, 'Arjun')
  foodCategory = await addCategory(groupId, 'Food')

  const otherGroup = await request(app)
    .post('/api/groups')
    .send({ name: 'Expenses Test Other Group' })
  otherGroupId = otherGroup.body.data.id
  otherPerson = await addPerson(otherGroupId, 'Stranger')
  otherCategory = await addCategory(otherGroupId, 'Other Group Category')
})

afterAll(async () => {
  for (const id of [groupId, otherGroupId]) {
    await request(app).delete(`/api/groups/${id}`).set('X-Admin-Password', TEST_ADMIN_PASSWORD)
  }
})

describe('POST /api/groups/:groupId/expenses', () => {
  it('creates a valid equal-split expense', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Dinner',
        amount: 900,
        paid_by: sidhant,
        category_id: foodCategory,
        shares: [
          { person_id: sidhant, amount: 300 },
          { person_id: rahul, amount: 300 },
          { person_id: arjun, amount: 300 },
        ],
      })

    expect(response.status).toBe(201)
    expect(response.body.data.description).toBe('Dinner')
    expect(response.body.data.amount).toBe(900)
    expect(response.body.data.paid_by).toEqual({ id: sidhant, name: 'Sidhant' })
    expect(response.body.data.category).toEqual({ id: foodCategory, name: 'Food' })
    expect(response.body.data.shares).toHaveLength(3)
    expect(
      response.body.data.shares.reduce((s: number, sh: { amount: number }) => s + sh.amount, 0),
    ).toBe(900)
  })

  it('creates a valid equal-split expense using the deterministic remainder pattern (₹100 / 3)', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Remainder check',
        amount: 100,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 34 },
          { person_id: rahul, amount: 33 },
          { person_id: arjun, amount: 33 },
        ],
      })

    expect(response.status).toBe(201)
    const byPerson = Object.fromEntries(
      response.body.data.shares.map((s: { person_id: string; amount: number }) => [
        s.person_id,
        s.amount,
      ]),
    )
    expect(byPerson[sidhant]).toBe(34)
    expect(byPerson[rahul]).toBe(33)
    expect(byPerson[arjun]).toBe(33)
  })

  it('creates a valid unequal-split expense', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Unequal cab split',
        amount: 1000,
        paid_by: rahul,
        shares: [
          { person_id: sidhant, amount: 600 },
          { person_id: rahul, amount: 300 },
          { person_id: arjun, amount: 100 },
        ],
      })

    expect(response.status).toBe(201)
    expect(response.body.data.amount).toBe(1000)
  })

  it('allows the payer to be excluded from the participants', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Payer not participating',
        amount: 900,
        paid_by: rahul,
        shares: [
          { person_id: sidhant, amount: 450 },
          { person_id: arjun, amount: 450 },
        ],
      })

    expect(response.status).toBe(201)
    expect(response.body.data.shares.map((s: { person_id: string }) => s.person_id)).not.toContain(
      rahul,
    )
  })

  it('allows a one-participant expense', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Solo expense',
        amount: 500,
        paid_by: sidhant,
        shares: [{ person_id: sidhant, amount: 500 }],
      })

    expect(response.status).toBe(201)
  })

  it('allows creation without a category', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'No category',
        amount: 200,
        paid_by: sidhant,
        shares: [{ person_id: sidhant, amount: 200 }],
      })

    expect(response.status).toBe(201)
    expect(response.body.data.category).toBeNull()
  })

  it('rejects a missing description', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({ amount: 100, paid_by: sidhant, shares: [{ person_id: sidhant, amount: 100 }] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it.each([
    ['zero', 0],
    ['negative', -50],
    ['too large', 100000],
  ])('rejects an out-of-range amount (%s)', async (_label, amount) => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Bad amount',
        amount,
        paid_by: sidhant,
        shares: [{ person_id: sidhant, amount: Math.max(amount, 1) }],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_EXPENSE_AMOUNT')
  })

  it('rejects a decimal amount', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Decimal amount',
        amount: 100.5,
        paid_by: sidhant,
        shares: [{ person_id: sidhant, amount: 100 }],
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects shares that do not sum to the amount', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Bad total',
        amount: 1000,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 600 },
          { person_id: rahul, amount: 300 },
        ],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_EXPENSE_SHARES')
  })

  it('rejects a zero-value participant share', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Zero share',
        amount: 500,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 500 },
          { person_id: rahul, amount: 0 },
        ],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_EXPENSE_SHARES')
  })

  it('rejects a duplicate participant', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Duplicate participant',
        amount: 200,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 100 },
          { person_id: sidhant, amount: 100 },
        ],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_EXPENSE_SHARES')
  })

  it('rejects a nonexistent payer', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Bad payer',
        amount: 100,
        paid_by: '00000000-0000-0000-0000-000000000000',
        shares: [{ person_id: sidhant, amount: 100 }],
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects an inactive payer', async () => {
    const inactive = await addPerson(groupId, 'SoonInactivePayer')
    await removePerson(groupId, inactive)

    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Inactive payer',
        amount: 100,
        paid_by: inactive,
        shares: [{ person_id: sidhant, amount: 100 }],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INACTIVE_PERSON')
  })

  it('rejects a nonexistent participant', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Bad participant',
        amount: 100,
        paid_by: sidhant,
        shares: [{ person_id: '00000000-0000-0000-0000-000000000000', amount: 100 }],
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects an inactive participant', async () => {
    const inactive = await addPerson(groupId, 'SoonInactiveParticipant')
    await removePerson(groupId, inactive)

    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Inactive participant',
        amount: 100,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 50 },
          { person_id: inactive, amount: 50 },
        ],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INACTIVE_PERSON')
  })

  it('rejects a payer from a different group', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Cross-group payer',
        amount: 100,
        paid_by: otherPerson,
        shares: [{ person_id: sidhant, amount: 100 }],
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects a participant from a different group', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Cross-group participant',
        amount: 100,
        paid_by: sidhant,
        shares: [{ person_id: otherPerson, amount: 100 }],
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects a category from a different group', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Cross-group category',
        amount: 100,
        paid_by: sidhant,
        category_id: otherCategory,
        shares: [{ person_id: sidhant, amount: 100 }],
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND')
  })

  it('returns 404 for an unknown group', async () => {
    const response = await request(app)
      .post('/api/groups/00000000-0000-0000-0000-000000000000/expenses')
      .send({
        description: 'x',
        amount: 1,
        paid_by: sidhant,
        shares: [{ person_id: sidhant, amount: 1 }],
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('GROUP_NOT_FOUND')
  })

  it('allows two concurrent valid submissions to both succeed', async () => {
    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/groups/${groupId}/expenses`)
        .send({
          description: 'Concurrent A',
          amount: 111,
          paid_by: sidhant,
          shares: [{ person_id: sidhant, amount: 111 }],
        }),
      request(app)
        .post(`/api/groups/${groupId}/expenses`)
        .send({
          description: 'Concurrent B',
          amount: 222,
          paid_by: rahul,
          shares: [{ person_id: rahul, amount: 222 }],
        }),
    ])

    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(a.body.data.id).not.toBe(b.body.data.id)
  })
})

describe('GET /api/groups/:groupId/expenses/:expenseId', () => {
  it('retrieves expense details', async () => {
    const created = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Detail check',
        amount: 300,
        paid_by: arjun,
        shares: [{ person_id: arjun, amount: 300 }],
      })

    const response = await request(app).get(
      `/api/groups/${groupId}/expenses/${created.body.data.id}`,
    )

    expect(response.status).toBe(200)
    expect(response.body.data.description).toBe('Detail check')
  })

  it('returns 404 for an unknown expense', async () => {
    const response = await request(app).get(
      `/api/groups/${groupId}/expenses/00000000-0000-0000-0000-000000000000`,
    )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('EXPENSE_NOT_FOUND')
  })
})

describe('filtering and sorting', () => {
  let filterGroupId: string
  let a: string
  let b: string
  let catX: string
  let catY: string
  let lowId: string
  let midId: string
  let highId: string
  let afterFirst: string

  beforeAll(async () => {
    const group = await request(app).post('/api/groups').send({ name: 'Filter/Sort Test Group' })
    filterGroupId = group.body.data.id
    a = await addPerson(filterGroupId, 'FilterA')
    b = await addPerson(filterGroupId, 'FilterB')
    catX = await addCategory(filterGroupId, 'CatX')
    catY = await addCategory(filterGroupId, 'CatY')

    const low = await request(app)
      .post(`/api/groups/${filterGroupId}/expenses`)
      .send({
        description: 'Low',
        amount: 100,
        paid_by: a,
        category_id: catX,
        shares: [{ person_id: a, amount: 100 }],
      })
    lowId = low.body.data.id

    afterFirst = new Date().toISOString()
    await new Promise((r) => setTimeout(r, 20))

    const mid = await request(app)
      .post(`/api/groups/${filterGroupId}/expenses`)
      .send({
        description: 'Mid',
        amount: 500,
        paid_by: b,
        category_id: catY,
        shares: [{ person_id: b, amount: 500 }],
      })
    midId = mid.body.data.id

    const high = await request(app)
      .post(`/api/groups/${filterGroupId}/expenses`)
      .send({
        description: 'High',
        amount: 900,
        paid_by: a,
        category_id: catX,
        shares: [{ person_id: b, amount: 900 }],
      })
    highId = high.body.data.id
  })

  afterAll(async () => {
    await request(app)
      .delete(`/api/groups/${filterGroupId}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
  })

  it('filters by category', async () => {
    const response = await request(app).get(
      `/api/groups/${filterGroupId}/expenses?categoryId=${catX}`,
    )
    const ids = response.body.data.map((e: { id: string }) => e.id)
    expect(ids.sort()).toEqual([lowId, highId].sort())
  })

  it('filters by person (payer or participant)', async () => {
    const response = await request(app).get(`/api/groups/${filterGroupId}/expenses?personId=${b}`)
    const ids = response.body.data.map((e: { id: string }) => e.id)
    // b paid Mid, and participated (as the sole share) in High.
    expect(ids.sort()).toEqual([midId, highId].sort())
  })

  it('filters by date range (from)', async () => {
    const response = await request(app).get(
      `/api/groups/${filterGroupId}/expenses?from=${afterFirst}`,
    )
    const ids = response.body.data.map((e: { id: string }) => e.id)
    expect(ids.sort()).toEqual([midId, highId].sort())
    expect(ids).not.toContain(lowId)
  })

  it('sorts newest to oldest by default', async () => {
    const response = await request(app).get(`/api/groups/${filterGroupId}/expenses`)
    const ids = response.body.data.map((e: { id: string }) => e.id)
    expect(ids).toEqual([highId, midId, lowId])
  })

  it('sorts oldest to newest', async () => {
    const response = await request(app).get(`/api/groups/${filterGroupId}/expenses?sort=oldest`)
    const ids = response.body.data.map((e: { id: string }) => e.id)
    expect(ids).toEqual([lowId, midId, highId])
  })

  it('sorts highest amount to lowest', async () => {
    const response = await request(app).get(
      `/api/groups/${filterGroupId}/expenses?sort=amount_desc`,
    )
    const ids = response.body.data.map((e: { id: string }) => e.id)
    expect(ids).toEqual([highId, midId, lowId])
  })

  it('sorts lowest amount to highest', async () => {
    const response = await request(app).get(`/api/groups/${filterGroupId}/expenses?sort=amount_asc`)
    const ids = response.body.data.map((e: { id: string }) => e.id)
    expect(ids).toEqual([lowId, midId, highId])
  })

  it('rejects an invalid sort value', async () => {
    const response = await request(app).get(`/api/groups/${filterGroupId}/expenses?sort=sideways`)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/groups/:groupId/expenses/:expenseId', () => {
  it('rejects edit without an admin password', async () => {
    const created = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Edit me',
        amount: 100,
        paid_by: sidhant,
        shares: [{ person_id: sidhant, amount: 100 }],
      })

    const response = await request(app)
      .patch(`/api/groups/${groupId}/expenses/${created.body.data.id}`)
      .send({ amount: 200 })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('ADMIN_PASSWORD_REQUIRED')
  })

  it('edits an expense, preserving its ID and original created_at', async () => {
    const created = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Original',
        amount: 500,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 250 },
          { person_id: rahul, amount: 250 },
        ],
      })
    const originalId = created.body.data.id
    const originalCreatedAt = created.body.data.created_at

    await new Promise((r) => setTimeout(r, 20))

    const response = await request(app)
      .patch(`/api/groups/${groupId}/expenses/${originalId}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({
        description: 'Updated',
        amount: 700,
        shares: [
          { person_id: sidhant, amount: 350 },
          { person_id: rahul, amount: 350 },
        ],
      })

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe(originalId)
    expect(response.body.data.created_at).toBe(originalCreatedAt)
    expect(response.body.data.description).toBe('Updated')
    expect(response.body.data.amount).toBe(700)
  })

  it('recalculates balances after an edit', async () => {
    const created = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Balance edit check',
        amount: 200,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 100 },
          { person_id: rahul, amount: 100 },
        ],
      })

    const before = await request(app).get(`/api/groups/${groupId}/balances`)
    const rahulBefore = before.body.data.balances.find(
      (b: { person_id: string }) => b.person_id === rahul,
    ).balance

    await request(app)
      .patch(`/api/groups/${groupId}/expenses/${created.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({
        amount: 400,
        shares: [
          { person_id: sidhant, amount: 200 },
          { person_id: rahul, amount: 200 },
        ],
      })

    const after = await request(app).get(`/api/groups/${groupId}/balances`)
    const rahulAfter = after.body.data.balances.find(
      (b: { person_id: string }) => b.person_id === rahul,
    ).balance

    expect(rahulAfter).toBe(rahulBefore - 100)
  })

  it('re-validates only the fields present in the patch', async () => {
    const inactive = await addPerson(groupId, 'BecomesInactiveDuringEdit')
    const created = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Keeps an inactive participant untouched',
        amount: 200,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 100 },
          { person_id: inactive, amount: 100 },
        ],
      })

    await removePerson(groupId, inactive)

    // Editing only the description must not fail just because a
    // previously-valid, untouched participant later became inactive.
    const response = await request(app)
      .patch(`/api/groups/${groupId}/expenses/${created.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({ description: 'Description only edit' })

    expect(response.status).toBe(200)
    expect(response.body.data.description).toBe('Description only edit')
  })
})

describe('DELETE /api/groups/:groupId/expenses/:expenseId', () => {
  it('rejects deletion without an admin password', async () => {
    const created = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Delete me',
        amount: 50,
        paid_by: sidhant,
        shares: [{ person_id: sidhant, amount: 50 }],
      })

    const response = await request(app).delete(
      `/api/groups/${groupId}/expenses/${created.body.data.id}`,
    )

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('ADMIN_PASSWORD_REQUIRED')
  })

  it('deletes the expense and recalculates balances', async () => {
    const created = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'To be deleted',
        amount: 300,
        paid_by: sidhant,
        shares: [
          { person_id: sidhant, amount: 150 },
          { person_id: rahul, amount: 150 },
        ],
      })

    const before = await request(app).get(`/api/groups/${groupId}/balances`)
    const rahulBefore = before.body.data.balances.find(
      (b: { person_id: string }) => b.person_id === rahul,
    ).balance

    const deleteResponse = await request(app)
      .delete(`/api/groups/${groupId}/expenses/${created.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)

    expect(deleteResponse.status).toBe(204)

    const getResponse = await request(app).get(
      `/api/groups/${groupId}/expenses/${created.body.data.id}`,
    )
    expect(getResponse.status).toBe(404)

    const after = await request(app).get(`/api/groups/${groupId}/balances`)
    const rahulAfter = after.body.data.balances.find(
      (b: { person_id: string }) => b.person_id === rahul,
    ).balance

    expect(rahulAfter).toBe(rahulBefore + 150)
  })
})

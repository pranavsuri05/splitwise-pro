import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { TEST_ADMIN_PASSWORD } from '../test/setup.js'

const app = createApp()
const createdGroupIds: string[] = []

async function createGroup(name: string): Promise<string> {
  const res = await request(app).post('/api/groups').send({ name })
  createdGroupIds.push(res.body.data.id)
  return res.body.data.id
}

async function addPerson(groupId: string, name: string): Promise<string> {
  const res = await request(app).post(`/api/groups/${groupId}/people`).send({ name })
  return res.body.data.id
}

async function removePerson(groupId: string, personId: string): Promise<void> {
  const res = await request(app)
    .patch(`/api/groups/${groupId}/people/${personId}`)
    .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
    .send({ is_active: false })
  expect(res.status).toBe(200)
}

async function createExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  shares: { person_id: string; amount: number }[],
) {
  const res = await request(app)
    .post(`/api/groups/${groupId}/expenses`)
    .send({ description, amount, paid_by: paidBy, shares })
  expect(res.status).toBe(201)
  return res.body.data
}

async function getBalances(groupId: string) {
  const res = await request(app).get(`/api/groups/${groupId}/balances`)
  return res.body.data as {
    total_outstanding: number
    balances: { person_id: string; person_name: string; balance: number }[]
  }
}

function balanceOf(
  result: { balances: { person_id: string; balance: number }[] },
  personId: string,
): number {
  return result.balances.find((b) => b.person_id === personId)?.balance ?? 0
}

function sumOfBalances(result: { balances: { balance: number }[] }): number {
  return result.balances.reduce((sum, b) => sum + b.balance, 0)
}

async function logSettlement(
  groupId: string,
  fromPerson: string,
  toPerson: string,
  amount: number,
) {
  return request(app)
    .post(`/api/groups/${groupId}/settlements`)
    .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
    .send({ from_person: fromPerson, to_person: toPerson, amount })
}

async function getSuggestions(groupId: string) {
  const res = await request(app).get(`/api/groups/${groupId}/settlements/suggestions`)
  return res.body.data.suggestions as {
    from_person: { id: string }
    to_person: { id: string }
    amount: number
  }[]
}

async function getHistory(groupId: string) {
  const res = await request(app).get(`/api/groups/${groupId}/settlements`)
  return res.body.data as {
    id: string
    from_person: { id: string }
    to_person: { id: string }
    amount: number
    created_at: string
  }[]
}

afterAll(async () => {
  for (const groupId of createdGroupIds) {
    await request(app).delete(`/api/groups/${groupId}`).set('X-Admin-Password', TEST_ADMIN_PASSWORD)
  }
})

describe('GET /api/groups/:groupId/settlements/suggestions', () => {
  it('returns an empty list when the group has no expenses', async () => {
    const groupId = await createGroup('Settlements Suggestions Empty Group')
    await addPerson(groupId, 'Lonely')

    const suggestions = await getSuggestions(groupId)
    expect(suggestions).toEqual([])
  })

  it('generates deterministic multi-party suggestions matching the documented example', async () => {
    const groupId = await createGroup('Settlements Suggestions Multi Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    const c = await addPerson(groupId, 'C')
    const d = await addPerson(groupId, 'D')

    // Construct A=+1000, B=+500, C=-700, D=-800 directly via expenses.
    await createExpense(groupId, 'Seed A', 1000, a, [
      { person_id: c, amount: 700 },
      { person_id: d, amount: 300 },
    ])
    await createExpense(groupId, 'Seed B', 500, b, [{ person_id: d, amount: 500 }])

    const balancesBefore = await getBalances(groupId)
    expect(balanceOf(balancesBefore, a)).toBe(1000)
    expect(balanceOf(balancesBefore, b)).toBe(500)
    expect(balanceOf(balancesBefore, c)).toBe(-700)
    expect(balanceOf(balancesBefore, d)).toBe(-800)

    const suggestions = await getSuggestions(groupId)
    expect(suggestions).toEqual([
      { from_person: { id: c, name: 'C' }, to_person: { id: a, name: 'A' }, amount: 700 },
      { from_person: { id: d, name: 'D' }, to_person: { id: a, name: 'A' }, amount: 300 },
      { from_person: { id: d, name: 'D' }, to_person: { id: b, name: 'B' }, amount: 500 },
    ])
  })

  it('never modifies the database (calling it repeatedly is a no-op)', async () => {
    const groupId = await createGroup('Settlements Suggestions Idempotent Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'E', 100, a, [{ person_id: b, amount: 100 }])

    const first = await getSuggestions(groupId)
    const second = await getSuggestions(groupId)
    expect(first).toEqual(second)

    const history = await getHistory(groupId)
    expect(history).toEqual([])
  })
})

describe('GET /api/groups/:groupId/settlements', () => {
  it('returns an empty list when nothing has been logged', async () => {
    const groupId = await createGroup('Settlements History Empty Group')
    const history = await getHistory(groupId)
    expect(history).toEqual([])
  })

  it('lists settlements newest first', async () => {
    const groupId = await createGroup('Settlements History Order Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'E', 1000, a, [{ person_id: b, amount: 1000 }])

    const first = await logSettlement(groupId, b, a, 200)
    await new Promise((r) => setTimeout(r, 20))
    const second = await logSettlement(groupId, b, a, 300)

    const history = await getHistory(groupId)
    expect(history.map((h) => h.id)).toEqual([second.body.data.id, first.body.data.id])
  })
})

describe('POST /api/groups/:groupId/settlements — validation', () => {
  let groupId: string
  let a: string
  let b: string
  let inactive: string
  let otherGroupId: string
  let otherPerson: string

  beforeAll(async () => {
    groupId = await createGroup('Settlements Validation Group')
    a = await addPerson(groupId, 'A')
    b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 1000, a, [{ person_id: b, amount: 1000 }])
    inactive = await addPerson(groupId, 'SoonInactive')
    await removePerson(groupId, inactive)

    otherGroupId = await createGroup('Settlements Validation Other Group')
    otherPerson = await addPerson(otherGroupId, 'Stranger')
  })

  it('rejects a fractional amount', async () => {
    const response = await logSettlement(groupId, b, a, 10.5)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a zero amount', async () => {
    const response = await logSettlement(groupId, b, a, 0)
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_SETTLEMENT')
  })

  it('rejects a negative amount', async () => {
    const response = await logSettlement(groupId, b, a, -50)
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_SETTLEMENT')
  })

  it('rejects the same sender and receiver', async () => {
    const response = await logSettlement(groupId, a, a, 100)
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_SETTLEMENT')
  })

  it('rejects a nonexistent sender', async () => {
    const response = await logSettlement(groupId, '00000000-0000-0000-0000-000000000000', a, 100)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects a nonexistent receiver', async () => {
    const response = await logSettlement(groupId, b, '00000000-0000-0000-0000-000000000000', 100)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects a sender from a different group', async () => {
    const response = await logSettlement(groupId, otherPerson, a, 100)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects a receiver from a different group', async () => {
    const response = await logSettlement(groupId, b, otherPerson, 100)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PERSON_NOT_FOUND')
  })

  it('rejects an inactive sender', async () => {
    const response = await logSettlement(groupId, inactive, a, 100)
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INACTIVE_PERSON')
  })

  it('rejects an inactive receiver', async () => {
    const response = await logSettlement(groupId, b, inactive, 100)
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INACTIVE_PERSON')
  })

  it('rejects settlement creation without an admin password', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .send({ from_person: b, to_person: a, amount: 100 })
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('ADMIN_PASSWORD_REQUIRED')
  })

  it('rejects settlement creation with the wrong admin password', async () => {
    const response = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set('X-Admin-Password', 'not-the-password')
      .send({ from_person: b, to_person: a, amount: 100 })
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_ADMIN_PASSWORD')
  })

  it('has no settlement edit/delete endpoints (immutability)', async () => {
    const created = await logSettlement(groupId, b, a, 50)
    const patchResponse = await request(app)
      .patch(`/api/groups/${groupId}/settlements/${created.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
      .send({ amount: 999 })
    const deleteResponse = await request(app)
      .delete(`/api/groups/${groupId}/settlements/${created.body.data.id}`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)

    expect(patchResponse.status).toBe(404)
    expect(deleteResponse.status).toBe(404)
  })
})

describe('POST /api/groups/:groupId/settlements — success, balances, recalculation', () => {
  it('logs a settlement and immediately updates balances', async () => {
    const groupId = await createGroup('Settlements Success Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 1000, a, [{ person_id: b, amount: 1000 }])

    const before = await getBalances(groupId)
    expect(balanceOf(before, a)).toBe(1000)
    expect(balanceOf(before, b)).toBe(-1000)

    const response = await logSettlement(groupId, b, a, 400)
    expect(response.status).toBe(201)
    expect(response.body.data.from_person).toEqual({ id: b, name: 'B' })
    expect(response.body.data.to_person).toEqual({ id: a, name: 'A' })
    expect(response.body.data.amount).toBe(400)

    const after = await getBalances(groupId)
    expect(balanceOf(after, a)).toBe(600)
    expect(balanceOf(after, b)).toBe(-600)
    expect(sumOfBalances(after)).toBe(0)
  })

  it('recalculates smart-settlement suggestions after a settlement is logged', async () => {
    const groupId = await createGroup('Settlements Recalc Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    const c = await addPerson(groupId, 'C')
    const d = await addPerson(groupId, 'D')

    await createExpense(groupId, 'Seed A', 1000, a, [
      { person_id: c, amount: 700 },
      { person_id: d, amount: 300 },
    ])
    await createExpense(groupId, 'Seed B', 500, b, [{ person_id: d, amount: 500 }])

    const suggestionsBefore = await getSuggestions(groupId)
    expect(suggestionsBefore.map((s) => s.amount)).toEqual([700, 300, 500])

    await logSettlement(groupId, c, a, 700)

    const balancesAfter = await getBalances(groupId)
    expect(balanceOf(balancesAfter, a)).toBe(300)
    expect(balanceOf(balancesAfter, b)).toBe(500)
    expect(balanceOf(balancesAfter, c)).toBe(0)
    expect(balanceOf(balancesAfter, d)).toBe(-800)

    const suggestionsAfter = await getSuggestions(groupId)
    expect(suggestionsAfter).toEqual([
      { from_person: { id: d, name: 'D' }, to_person: { id: a, name: 'A' }, amount: 300 },
      { from_person: { id: d, name: 'D' }, to_person: { id: b, name: 'B' }, amount: 500 },
    ])
  })

  it('accumulates multiple settlements correctly', async () => {
    const groupId = await createGroup('Settlements Multiple Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 1000, a, [{ person_id: b, amount: 1000 }])

    await logSettlement(groupId, b, a, 300)
    await logSettlement(groupId, b, a, 200)
    await logSettlement(groupId, b, a, 500)

    const after = await getBalances(groupId)
    expect(balanceOf(after, a)).toBe(0)
    expect(balanceOf(after, b)).toBe(0)

    const history = await getHistory(groupId)
    expect(history).toHaveLength(3)
  })
})

describe('Overpayment protection', () => {
  it('accepts a settlement for exactly the outstanding debt', async () => {
    const groupId = await createGroup('Settlements Exact Debt Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 500, a, [{ person_id: b, amount: 500 }])

    const response = await logSettlement(groupId, b, a, 500)
    expect(response.status).toBe(201)

    const after = await getBalances(groupId)
    expect(balanceOf(after, a)).toBe(0)
    expect(balanceOf(after, b)).toBe(0)
  })

  it('rejects a settlement that exceeds the outstanding debt and leaves the database unchanged', async () => {
    const groupId = await createGroup('Settlements Overpayment Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 500, a, [{ person_id: b, amount: 500 }])

    const response = await logSettlement(groupId, b, a, 501)
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_SETTLEMENT')

    const balances = await getBalances(groupId)
    expect(balanceOf(balances, a)).toBe(500)
    expect(balanceOf(balances, b)).toBe(-500)

    const history = await getHistory(groupId)
    expect(history).toEqual([])
  })

  it('rejects any positive settlement from a person who is not currently in debt', async () => {
    const groupId = await createGroup('Settlements Not In Debt Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    // Everyone starts at zero — nobody owes anything yet.
    await addPerson(groupId, 'C')

    const response = await logSettlement(groupId, a, b, 1)
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('INVALID_SETTLEMENT')
  })

  it('rejects two concurrent settlements from the same debtor whose combined amount would overdraw', async () => {
    const groupId = await createGroup('Settlements Concurrency Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 500, a, [{ person_id: b, amount: 500 }])

    const [first, second] = await Promise.all([
      logSettlement(groupId, b, a, 400),
      logSettlement(groupId, b, a, 400),
    ])

    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 422])

    const successResponse = first.status === 201 ? first : second
    expect(successResponse.body.data.amount).toBe(400)

    const failureResponse = first.status === 422 ? first : second
    expect(failureResponse.body.error.code).toBe('INVALID_SETTLEMENT')

    const history = await getHistory(groupId)
    expect(history).toHaveLength(1)

    const balances = await getBalances(groupId)
    expect(balanceOf(balances, a)).toBe(100)
    expect(balanceOf(balances, b)).toBe(-100)
    expect(sumOfBalances(balances)).toBe(0)
  })
})

describe('Person removal interaction', () => {
  it('rejects a removed person as a new settlement sender or receiver', async () => {
    const groupId = await createGroup('Settlements Removal Guard Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 500, a, [{ person_id: b, amount: 500 }])
    await removePerson(groupId, b)

    const asSender = await logSettlement(groupId, b, a, 100)
    expect(asSender.status).toBe(422)
    expect(asSender.body.error.code).toBe('INACTIVE_PERSON')

    const c = await addPerson(groupId, 'C')
    const asReceiver = await logSettlement(groupId, c, b, 1)
    expect(asReceiver.status).toBe(422)
    expect(asReceiver.body.error.code).toBe('INACTIVE_PERSON')
  })

  it('historical settlements remain relevant to raw balances, and interact correctly with removal redistribution', async () => {
    const groupId = await createGroup('Settlements Removal Interaction Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    const c = await addPerson(groupId, 'C')

    await createExpense(groupId, 'Seed', 900, a, [
      { person_id: a, amount: 300 },
      { person_id: b, amount: 300 },
      { person_id: c, amount: 300 },
    ])
    // B pays down half their debt before being removed.
    await logSettlement(groupId, b, a, 150)

    const beforeRemoval = await getBalances(groupId)
    // A: +900 (paid) -300 (own share) -150 (received via settlement) = 450
    expect(balanceOf(beforeRemoval, a)).toBe(450)
    expect(balanceOf(beforeRemoval, b)).toBe(-150)
    expect(balanceOf(beforeRemoval, c)).toBe(-300)

    await removePerson(groupId, b)

    // B's remaining -150 raw balance (expense share minus the settlement
    // already made) is redistributed across A and C.
    const afterRemoval = await getBalances(groupId)
    expect(afterRemoval.balances.map((x) => x.person_id)).not.toContain(b)
    expect(balanceOf(afterRemoval, a)).toBe(450 - 75)
    expect(balanceOf(afterRemoval, c)).toBe(-300 - 75)
    expect(sumOfBalances(afterRemoval)).toBe(0)

    const history = await getHistory(groupId)
    expect(history).toHaveLength(1)
    expect(history[0].from_person.id).toBe(b)
  })
})

describe('Clear-transactions interaction', () => {
  it('preserves settlement history when expenses are cleared', async () => {
    const groupId = await createGroup('Settlements Clear Transactions Group')
    const a = await addPerson(groupId, 'A')
    const b = await addPerson(groupId, 'B')
    await createExpense(groupId, 'Seed', 500, a, [{ person_id: b, amount: 500 }])
    await logSettlement(groupId, b, a, 200)

    const clearResponse = await request(app)
      .delete(`/api/groups/${groupId}/expenses`)
      .set('X-Admin-Password', TEST_ADMIN_PASSWORD)
    expect(clearResponse.status).toBe(204)

    const expensesAfter = await request(app).get(`/api/groups/${groupId}/expenses`)
    expect(expensesAfter.body.data).toEqual([])

    const history = await getHistory(groupId)
    expect(history).toHaveLength(1)
    expect(history[0].amount).toBe(200)

    // With expenses gone but the settlement preserved, B now appears as a
    // creditor purely from the settlement's own effect.
    const balances = await getBalances(groupId)
    expect(balanceOf(balances, a)).toBe(-200)
    expect(balanceOf(balances, b)).toBe(200)
    expect(sumOfBalances(balances)).toBe(0)
  })
})

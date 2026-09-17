import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
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

afterAll(async () => {
  for (const groupId of createdGroupIds) {
    await request(app).delete(`/api/groups/${groupId}`).set('X-Admin-Password', TEST_ADMIN_PASSWORD)
  }
})

describe('GET /api/groups/:groupId/balances', () => {
  it('returns zero balances for a group with no expenses', async () => {
    const groupId = await createGroup('Balances Empty Group')
    await addPerson(groupId, 'Lonely')

    const result = await getBalances(groupId)

    expect(result.balances).toHaveLength(1)
    expect(result.balances[0].balance).toBe(0)
    expect(result.total_outstanding).toBe(0)
  })

  it('computes correct balances across multiple expenses with different payers', async () => {
    const groupId = await createGroup('Balances Multi-Expense Group')
    const sidhant = await addPerson(groupId, 'Sidhant')
    const rahul = await addPerson(groupId, 'Rahul')
    const arjun = await addPerson(groupId, 'Arjun')

    await createExpense(groupId, 'E1', 900, sidhant, [
      { person_id: sidhant, amount: 300 },
      { person_id: rahul, amount: 300 },
      { person_id: arjun, amount: 300 },
    ])
    await createExpense(groupId, 'E2', 800, rahul, [
      { person_id: rahul, amount: 400 },
      { person_id: arjun, amount: 400 },
    ])
    await createExpense(groupId, 'E3', 600, arjun, [
      { person_id: sidhant, amount: 200 },
      { person_id: arjun, amount: 400 },
    ])

    const result = await getBalances(groupId)

    // Sidhant: +900 -300 -200 = +400
    // Rahul:   +800 -300 -400 = +100
    // Arjun:   +600 -300 -400 -400 = -500
    expect(balanceOf(result, sidhant)).toBe(400)
    expect(balanceOf(result, rahul)).toBe(100)
    expect(balanceOf(result, arjun)).toBe(-500)
    expect(sumOfBalances(result)).toBe(0)
    expect(result.total_outstanding).toBe(500)
  })
})

describe('Person removal — negative balance (debtor)', () => {
  it('redistributes the removed debtor equally among remaining active people', async () => {
    const groupId = await createGroup('Removal Negative Balance Group')
    const sidhant = await addPerson(groupId, 'Sidhant')
    const rahul = await addPerson(groupId, 'Rahul')
    const arjun = await addPerson(groupId, 'Arjun')

    const expense = await createExpense(groupId, 'Dinner', 900, sidhant, [
      { person_id: sidhant, amount: 300 },
      { person_id: rahul, amount: 300 },
      { person_id: arjun, amount: 300 },
    ])

    const beforeRemoval = await getBalances(groupId)
    expect(balanceOf(beforeRemoval, sidhant)).toBe(600)
    expect(balanceOf(beforeRemoval, rahul)).toBe(-300)
    expect(balanceOf(beforeRemoval, arjun)).toBe(-300)

    await removePerson(groupId, rahul)

    const afterRemoval = await getBalances(groupId)
    expect(afterRemoval.balances.map((b) => b.person_id)).not.toContain(rahul)
    expect(balanceOf(afterRemoval, sidhant)).toBe(450)
    expect(balanceOf(afterRemoval, arjun)).toBe(-450)
    expect(sumOfBalances(afterRemoval)).toBe(0)

    // Historical record must remain intact and untouched.
    const expenseAfter = await request(app).get(`/api/groups/${groupId}/expenses/${expense.id}`)
    expect(expenseAfter.status).toBe(200)
    const rahulShare = expenseAfter.body.data.shares.find(
      (s: { person_id: string }) => s.person_id === rahul,
    )
    expect(rahulShare).toBeTruthy()
    expect(rahulShare.amount).toBe(300)
  })
})

describe('Person removal — positive balance (creditor)', () => {
  it('redistributes the removed creditor symmetrically among remaining active people', async () => {
    const groupId = await createGroup('Removal Positive Balance Group')
    const sidhant = await addPerson(groupId, 'Sidhant')
    const rahul = await addPerson(groupId, 'Rahul')
    const arjun = await addPerson(groupId, 'Arjun')

    await createExpense(groupId, 'Rahul pays for the others', 900, rahul, [
      { person_id: sidhant, amount: 450 },
      { person_id: arjun, amount: 450 },
    ])

    const beforeRemoval = await getBalances(groupId)
    expect(balanceOf(beforeRemoval, rahul)).toBe(900)
    expect(balanceOf(beforeRemoval, sidhant)).toBe(-450)
    expect(balanceOf(beforeRemoval, arjun)).toBe(-450)

    await removePerson(groupId, rahul)

    const afterRemoval = await getBalances(groupId)
    expect(afterRemoval.balances.map((b) => b.person_id)).not.toContain(rahul)
    expect(balanceOf(afterRemoval, sidhant)).toBe(0)
    expect(balanceOf(afterRemoval, arjun)).toBe(0)
    expect(sumOfBalances(afterRemoval)).toBe(0)
  })
})

describe('Person removal — later-added person', () => {
  it('a person added after a removal absorbs a share of the redistributed balance (dynamic recomputation)', async () => {
    const groupId = await createGroup('Removal Later Added Person Group')
    const sidhant = await addPerson(groupId, 'Sidhant')
    const rahul = await addPerson(groupId, 'Rahul')
    const arjun = await addPerson(groupId, 'Arjun')

    await createExpense(groupId, 'Dinner', 900, sidhant, [
      { person_id: sidhant, amount: 300 },
      { person_id: rahul, amount: 300 },
      { person_id: arjun, amount: 300 },
    ])

    await removePerson(groupId, rahul)

    const twoActive = await getBalances(groupId)
    expect(balanceOf(twoActive, sidhant)).toBe(450)
    expect(balanceOf(twoActive, arjun)).toBe(-450)

    const varun = await addPerson(groupId, 'Varun')

    const threeActive = await getBalances(groupId)
    // Rahul's -300 raw debt is now split three ways instead of two: -100 each.
    expect(balanceOf(threeActive, sidhant)).toBe(600 - 100)
    expect(balanceOf(threeActive, arjun)).toBe(-300 - 100)
    expect(balanceOf(threeActive, varun)).toBe(-100)
    expect(sumOfBalances(threeActive)).toBe(0)
  })
})

describe('Person removal — multiple removed people', () => {
  it('handles a removed debtor and a removed creditor together, remaining zero-sum', async () => {
    const groupId = await createGroup('Removal Multiple People Group')
    const sidhant = await addPerson(groupId, 'Sidhant')
    const rahul = await addPerson(groupId, 'Rahul')
    const arjun = await addPerson(groupId, 'Arjun')
    const varun = await addPerson(groupId, 'Varun')

    // Rahul ends up a debtor, Arjun ends up a creditor.
    await createExpense(groupId, 'Rahul owes', 400, sidhant, [{ person_id: rahul, amount: 400 }])
    await createExpense(groupId, 'Arjun is owed', 200, arjun, [{ person_id: varun, amount: 200 }])

    await removePerson(groupId, rahul)
    await removePerson(groupId, arjun)

    const result = await getBalances(groupId)
    expect(result.balances.map((b) => b.person_id).sort()).toEqual([sidhant, varun].sort())
    expect(sumOfBalances(result)).toBe(0)
  })
})

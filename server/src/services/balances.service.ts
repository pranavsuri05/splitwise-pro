import { applyRemovalAdjustments, computeRawBalances } from '../business/balances.js'
import { pool } from '../db/pool.js'

export interface BalanceEntry {
  person_id: string
  person_name: string
  balance: number
}

export interface BalancesResult {
  total_outstanding: number
  balances: BalanceEntry[]
}

export async function getGroupBalances(groupId: string): Promise<BalancesResult> {
  const [peopleResult, expensesResult, sharesResult, settlementsResult] = await Promise.all([
    pool.query<{ id: string; name: string; is_active: boolean }>(
      'SELECT id, name, is_active FROM people WHERE group_id = $1 ORDER BY created_at ASC',
      [groupId],
    ),
    pool.query<{ paid_by: string; amount: number }>(
      'SELECT paid_by, amount FROM expenses WHERE group_id = $1',
      [groupId],
    ),
    pool.query<{ person_id: string; amount: number }>(
      `SELECT es.person_id, es.amount
       FROM expense_shares es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = $1`,
      [groupId],
    ),
    pool.query<{ from_person: string; to_person: string; amount: number }>(
      'SELECT from_person, to_person, amount FROM settlements WHERE group_id = $1',
      [groupId],
    ),
  ])

  const people = peopleResult.rows
  const rawBalances = computeRawBalances({
    people,
    expenses: expensesResult.rows,
    shares: sharesResult.rows,
    settlements: settlementsResult.rows,
  })
  const adjusted = applyRemovalAdjustments(people, rawBalances)

  const nameById = new Map(people.map((p) => [p.id, p.name]))
  const balances: BalanceEntry[] = people
    .filter((p) => p.is_active)
    .map((p) => ({
      person_id: p.id,
      person_name: nameById.get(p.id) ?? '',
      balance: adjusted.get(p.id) ?? 0,
    }))

  const total_outstanding = balances
    .filter((b) => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0)

  return { total_outstanding, balances }
}

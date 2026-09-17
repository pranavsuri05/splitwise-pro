import type { Pool, PoolClient } from 'pg'
import { pool } from '../db/pool.js'
import { withTransaction } from '../db/transaction.js'
import { ApiError } from '../utils/apiError.js'
import { isUuid } from '../utils/uuid.js'
import {
  validateShareBusinessRules,
  type CreateExpenseInput,
  type ExpenseListFilters,
  type ExpensePatch,
  type ShareInput,
} from '../validators/expenses.js'

type Queryable = Pool | PoolClient

export interface ExpenseShareResponse {
  person_id: string
  person_name: string
  amount: number
}

export interface ExpenseResponse {
  id: string
  description: string
  amount: number
  paid_by: { id: string; name: string }
  category: { id: string; name: string } | null
  shares: ExpenseShareResponse[]
  created_at: string
}

interface ExpenseRow {
  id: string
  description: string
  amount: number
  created_at: string
  payer_id: string
  payer_name: string
  category_id: string | null
  category_name: string | null
}

async function requireActivePersonInGroup(
  db: Queryable,
  groupId: string,
  personId: string,
  fieldLabel: string,
): Promise<void> {
  if (!isUuid(personId)) {
    throw new ApiError(404, 'PERSON_NOT_FOUND', `${fieldLabel} not found.`)
  }

  const { rows } = await db.query<{ is_active: boolean }>(
    'SELECT is_active FROM people WHERE id = $1 AND group_id = $2',
    [personId, groupId],
  )

  if (rows.length === 0) {
    throw new ApiError(404, 'PERSON_NOT_FOUND', `${fieldLabel} not found.`)
  }

  if (!rows[0].is_active) {
    throw new ApiError(422, 'INACTIVE_PERSON', `${fieldLabel} is not active.`)
  }
}

async function requireCategoryInGroup(
  db: Queryable,
  groupId: string,
  categoryId: string | null,
): Promise<void> {
  if (categoryId === null) {
    return
  }

  if (!isUuid(categoryId)) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.')
  }

  const { rows } = await db.query('SELECT id FROM categories WHERE id = $1 AND group_id = $2', [
    categoryId,
    groupId,
  ])

  if (rows.length === 0) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.')
  }
}

async function fetchSharesForExpenses(
  db: Queryable,
  expenseIds: string[],
): Promise<Map<string, ExpenseShareResponse[]>> {
  if (expenseIds.length === 0) {
    return new Map()
  }

  const { rows } = await db.query<{
    expense_id: string
    person_id: string
    person_name: string
    amount: number
  }>(
    `SELECT es.expense_id, es.person_id, p.name AS person_name, es.amount
     FROM expense_shares es
     JOIN people p ON p.id = es.person_id
     WHERE es.expense_id = ANY($1::uuid[])
     ORDER BY p.name ASC`,
    [expenseIds],
  )

  const byExpense = new Map<string, ExpenseShareResponse[]>()
  for (const row of rows) {
    const list = byExpense.get(row.expense_id) ?? []
    list.push({ person_id: row.person_id, person_name: row.person_name, amount: row.amount })
    byExpense.set(row.expense_id, list)
  }
  return byExpense
}

function toExpenseResponse(row: ExpenseRow, shares: ExpenseShareResponse[]): ExpenseResponse {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    paid_by: { id: row.payer_id, name: row.payer_name },
    category: row.category_id ? { id: row.category_id, name: row.category_name as string } : null,
    shares,
    created_at: row.created_at,
  }
}

const EXPENSE_ROW_SELECT = `
  SELECT e.id, e.description, e.amount, e.created_at,
         e.paid_by AS payer_id, payer.name AS payer_name,
         e.category_id, cat.name AS category_name
  FROM expenses e
  JOIN people payer ON payer.id = e.paid_by
  LEFT JOIN categories cat ON cat.id = e.category_id
`

async function fetchExpenseRow(
  db: Queryable,
  groupId: string,
  expenseId: string,
): Promise<ExpenseRow> {
  if (!isUuid(expenseId)) {
    throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.')
  }

  const { rows } = await db.query<ExpenseRow>(
    `${EXPENSE_ROW_SELECT} WHERE e.id = $1 AND e.group_id = $2`,
    [expenseId, groupId],
  )

  if (rows.length === 0) {
    throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.')
  }

  return rows[0]
}

async function fetchExpenseResponse(
  db: Queryable,
  groupId: string,
  expenseId: string,
): Promise<ExpenseResponse> {
  const row = await fetchExpenseRow(db, groupId, expenseId)
  const sharesByExpense = await fetchSharesForExpenses(db, [expenseId])
  return toExpenseResponse(row, sharesByExpense.get(expenseId) ?? [])
}

export async function getExpenseById(groupId: string, expenseId: string): Promise<ExpenseResponse> {
  return fetchExpenseResponse(pool, groupId, expenseId)
}

const SORT_CLAUSES: Record<string, string> = {
  newest: 'e.created_at DESC, e.id DESC',
  oldest: 'e.created_at ASC, e.id ASC',
  amount_desc: 'e.amount DESC, e.created_at DESC, e.id DESC',
  amount_asc: 'e.amount ASC, e.created_at DESC, e.id DESC',
}

export async function listExpenses(
  groupId: string,
  filters: ExpenseListFilters,
): Promise<ExpenseResponse[]> {
  const conditions: string[] = ['e.group_id = $1']
  const params: unknown[] = [groupId]

  if (filters.categoryId) {
    params.push(filters.categoryId)
    conditions.push(`e.category_id = $${params.length}`)
  }
  if (filters.personId) {
    params.push(filters.personId)
    const index = params.length
    conditions.push(
      `(e.paid_by = $${index} OR EXISTS (SELECT 1 FROM expense_shares es2 WHERE es2.expense_id = e.id AND es2.person_id = $${index}))`,
    )
  }
  if (filters.from) {
    params.push(filters.from)
    conditions.push(`e.created_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    conditions.push(`e.created_at <= $${params.length}`)
  }

  const sql = `${EXPENSE_ROW_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY ${SORT_CLAUSES[filters.sort]}`
  const { rows } = await pool.query<ExpenseRow>(sql, params)

  const sharesByExpense = await fetchSharesForExpenses(
    pool,
    rows.map((r) => r.id),
  )
  return rows.map((row) => toExpenseResponse(row, sharesByExpense.get(row.id) ?? []))
}

export async function createExpense(
  groupId: string,
  input: CreateExpenseInput,
): Promise<ExpenseResponse> {
  return withTransaction(async (client) => {
    await requireActivePersonInGroup(client, groupId, input.paidBy, 'Payer')
    for (const share of input.shares) {
      await requireActivePersonInGroup(client, groupId, share.personId, 'Participant')
    }
    await requireCategoryInGroup(client, groupId, input.categoryId)

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO expenses (group_id, description, amount, paid_by, category_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [groupId, input.description, input.amount, input.paidBy, input.categoryId],
    )
    const expenseId = rows[0].id

    await insertShares(client, expenseId, input.shares)

    return fetchExpenseResponse(client, groupId, expenseId)
  })
}

async function insertShares(
  client: PoolClient,
  expenseId: string,
  shares: ShareInput[],
): Promise<void> {
  for (const share of shares) {
    await client.query(
      'INSERT INTO expense_shares (expense_id, person_id, amount) VALUES ($1, $2, $3)',
      [expenseId, share.personId, share.amount],
    )
  }
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  patch: ExpensePatch,
): Promise<ExpenseResponse> {
  return withTransaction(async (client) => {
    const existing = await fetchExpenseRow(client, groupId, expenseId)
    const existingShares = await fetchSharesForExpenses(client, [expenseId])
    const currentShares: ShareInput[] = (existingShares.get(expenseId) ?? []).map((s) => ({
      personId: s.person_id,
      amount: s.amount,
    }))

    const description = patch.description ?? existing.description
    const amount = patch.amount ?? existing.amount
    const paidBy = patch.paidBy ?? existing.payer_id
    const categoryId = patch.categoryId !== undefined ? patch.categoryId : existing.category_id
    const shares = patch.shares ?? currentShares

    // Business_Logic_Algorithms.md §9 says a payer/participant must be
    // active "at creation"; edits therefore only re-validate group
    // membership/active status for fields actually being changed in this
    // request. A field carried over unchanged from the existing (already
    // historically valid) expense is not re-litigated, consistent with
    // "do not rewrite history because someone became inactive."
    if (patch.paidBy !== undefined) {
      await requireActivePersonInGroup(client, groupId, paidBy, 'Payer')
    }
    if (patch.shares !== undefined) {
      for (const share of shares) {
        await requireActivePersonInGroup(client, groupId, share.personId, 'Participant')
      }
    }
    if (patch.categoryId !== undefined) {
      await requireCategoryInGroup(client, groupId, categoryId)
    }

    validateShareBusinessRules(amount, shares)

    await client.query(
      `UPDATE expenses SET description = $1, amount = $2, paid_by = $3, category_id = $4
       WHERE id = $5 AND group_id = $6`,
      [description, amount, paidBy, categoryId, expenseId, groupId],
    )
    await client.query('DELETE FROM expense_shares WHERE expense_id = $1', [expenseId])
    await insertShares(client, expenseId, shares)

    return fetchExpenseResponse(client, groupId, expenseId)
  })
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query('DELETE FROM expenses WHERE id = $1 AND group_id = $2', [
      expenseId,
      groupId,
    ])
    if ((result.rowCount ?? 0) === 0) {
      throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.')
    }
  })
}

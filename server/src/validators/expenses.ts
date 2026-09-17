import { ApiError } from '../utils/apiError.js'

const DESCRIPTION_MAX_LENGTH = 150
const MIN_AMOUNT = 1
const MAX_AMOUNT = 99999

export interface ShareInput {
  personId: string
  amount: number
}

export interface CreateExpenseInput {
  description: string
  amount: number
  paidBy: string
  categoryId: string | null
  shares: ShareInput[]
}

export interface ExpensePatch {
  description?: string
  amount?: number
  paidBy?: string
  categoryId?: string | null
  shares?: ShareInput[]
}

function failValidation(fields: Record<string, string>): never {
  throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', fields)
}

export function parseDescription(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    failValidation({ description: 'Description is required.' })
  }

  const trimmed = (value as string).trim()

  if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
    failValidation({
      description: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    })
  }

  return trimmed
}

export function parseAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    failValidation({ amount: 'Amount must be a whole number.' })
  }

  const amount = value as number

  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    throw new ApiError(
      422,
      'INVALID_EXPENSE_AMOUNT',
      `Amount must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT}.`,
    )
  }

  return amount
}

export function parsePersonIdField(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    failValidation({ [fieldName]: `${fieldName} is required.` })
  }
  return value as string
}

export function parseCategoryId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    failValidation({ category_id: 'category_id must be a string or null.' })
  }
  return value as string
}

export function parseShares(value: unknown): ShareInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    failValidation({ shares: 'At least one share is required.' })
  }

  return (value as unknown[]).map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      failValidation({ [`shares[${index}]`]: 'Each share must be an object.' })
    }

    const record = entry as Record<string, unknown>
    const personId = parsePersonIdField(record.person_id, `shares[${index}].person_id`)

    if (typeof record.amount !== 'number' || !Number.isInteger(record.amount)) {
      failValidation({ [`shares[${index}].amount`]: 'Share amount must be a whole number.' })
    }

    return { personId, amount: record.amount as number }
  })
}

// Business_Logic_Algorithms.md §8/§9 plus the zero-share-rejected decision:
// every included participant's share must be a whole rupee >= 1, no
// duplicate participants, and the total must equal the expense amount
// exactly.
export function validateShareBusinessRules(amount: number, shares: ShareInput[]): void {
  const seen = new Set<string>()

  for (const share of shares) {
    if (share.amount < 1) {
      throw new ApiError(
        422,
        'INVALID_EXPENSE_SHARES',
        'Each participant share must be at least ₹1.',
      )
    }
    if (seen.has(share.personId)) {
      throw new ApiError(
        422,
        'INVALID_EXPENSE_SHARES',
        'A participant cannot appear more than once.',
      )
    }
    seen.add(share.personId)
  }

  const total = shares.reduce((sum, share) => sum + share.amount, 0)

  if (total !== amount) {
    throw new ApiError(422, 'INVALID_EXPENSE_SHARES', `Shares must total ₹${amount}.`)
  }
}

export function parseCreateExpenseBody(body: unknown): CreateExpenseInput {
  const record = (body ?? {}) as Record<string, unknown>

  const description = parseDescription(record.description)
  const amount = parseAmount(record.amount)
  const paidBy = parsePersonIdField(record.paid_by, 'paid_by')
  const categoryId = parseCategoryId(record.category_id)
  const shares = parseShares(record.shares)

  validateShareBusinessRules(amount, shares)

  return { description, amount, paidBy, categoryId, shares }
}

export function parseUpdateExpenseBody(body: unknown): ExpensePatch {
  const record = (body ?? {}) as Record<string, unknown>
  const patch: ExpensePatch = {}

  if ('description' in record) patch.description = parseDescription(record.description)
  if ('amount' in record) patch.amount = parseAmount(record.amount)
  if ('paid_by' in record) patch.paidBy = parsePersonIdField(record.paid_by, 'paid_by')
  if ('category_id' in record) patch.categoryId = parseCategoryId(record.category_id)
  if ('shares' in record) patch.shares = parseShares(record.shares)

  return patch
}

const SORT_VALUES = ['newest', 'oldest', 'amount_desc', 'amount_asc'] as const
export type ExpenseSort = (typeof SORT_VALUES)[number]

export interface ExpenseListFilters {
  categoryId?: string
  personId?: string
  from?: string
  to?: string
  sort: ExpenseSort
}

function parseIsoTimestamp(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    failValidation({ [fieldName]: `${fieldName} must be a valid ISO timestamp.` })
  }
  return value as string
}

export function parseExpenseListQuery(query: Record<string, unknown>): ExpenseListFilters {
  const filters: ExpenseListFilters = { sort: 'newest' }

  if (typeof query.categoryId === 'string' && query.categoryId.length > 0) {
    filters.categoryId = query.categoryId
  }
  if (typeof query.personId === 'string' && query.personId.length > 0) {
    filters.personId = query.personId
  }
  if (query.from !== undefined) {
    filters.from = parseIsoTimestamp(query.from, 'from')
  }
  if (query.to !== undefined) {
    filters.to = parseIsoTimestamp(query.to, 'to')
  }
  if (query.sort !== undefined) {
    if (typeof query.sort !== 'string' || !SORT_VALUES.includes(query.sort as ExpenseSort)) {
      failValidation({ sort: `sort must be one of: ${SORT_VALUES.join(', ')}.` })
    }
    filters.sort = query.sort as ExpenseSort
  }

  return filters
}

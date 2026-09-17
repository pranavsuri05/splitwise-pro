import { ApiError } from '../utils/apiError.js'

export interface CreateSettlementInput {
  fromPersonId: string
  toPersonId: string
  amount: number
}

function failValidation(fields: Record<string, string>): never {
  throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', fields)
}

function parsePersonIdField(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    failValidation({ [fieldName]: `${fieldName} is required.` })
  }
  return value as string
}

// API_Design.md §19: the established request shape uses snake_case
// `from_person` / `to_person`, matching `paid_by`/`category_id` elsewhere —
// not a second naming convention.
export function parseCreateSettlementBody(body: unknown): CreateSettlementInput {
  const record = (body ?? {}) as Record<string, unknown>

  const fromPersonId = parsePersonIdField(record.from_person, 'from_person')
  const toPersonId = parsePersonIdField(record.to_person, 'to_person')

  if (typeof record.amount !== 'number' || !Number.isInteger(record.amount)) {
    failValidation({ amount: 'Amount must be a whole number.' })
  }
  const amount = record.amount as number

  if (amount < 1) {
    throw new ApiError(422, 'INVALID_SETTLEMENT', 'Amount must be at least ₹1.')
  }

  if (fromPersonId === toPersonId) {
    throw new ApiError(422, 'INVALID_SETTLEMENT', 'from_person and to_person must be different.')
  }

  return { fromPersonId, toPersonId, amount }
}

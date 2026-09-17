// PostgreSQL SQLSTATE error codes we handle specifically.
export const PG_UNIQUE_VIOLATION = '23505'

interface PossiblePgError {
  code?: unknown
}

export function pgErrorCode(err: unknown): string | undefined {
  const code = (err as PossiblePgError)?.code
  return typeof code === 'string' ? code : undefined
}

// PostgreSQL SQLSTATE codes are always 5 uppercase alphanumeric characters.
const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/

export function isDatabaseError(err: unknown): boolean {
  const code = pgErrorCode(err)
  return code !== undefined && SQLSTATE_PATTERN.test(code)
}

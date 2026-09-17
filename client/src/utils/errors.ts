import { ApiRequestError, NetworkError } from '../api/client.js'

// UI_UX_Specification.md §42: errors should be short and actionable, and
// must never leak technical/database internals — the backend already
// guarantees that for its `message`, so most codes can surface it directly.
export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  if (error instanceof ApiRequestError) {
    if (error.code === 'INVALID_ADMIN_PASSWORD') {
      return 'Incorrect admin password.'
    }
    if (error.code === 'ADMIN_PASSWORD_REQUIRED') {
      return 'Admin password is required for this action.'
    }
    if (error.code === 'RATE_LIMITED') {
      return 'Too many attempts. Please try again later.'
    }
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export function getFieldErrors(error: unknown): Record<string, string> | undefined {
  if (error instanceof ApiRequestError) {
    return error.fields
  }
  return undefined
}

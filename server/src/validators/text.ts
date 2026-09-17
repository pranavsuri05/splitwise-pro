import { ApiError } from '../utils/apiError.js'

export function requireNonBlankString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', {
      [fieldName]: `${fieldName} is required.`,
    })
  }

  const trimmed = value.trim()

  if (trimmed.length > maxLength) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', {
      [fieldName]: `${fieldName} must be at most ${maxLength} characters.`,
    })
  }

  return trimmed
}

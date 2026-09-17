import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/apiError.js'
import { isDatabaseError } from '../utils/pgErrors.js'
import { sendError } from '../utils/responses.js'

// Express identifies error-handling middleware by its four-argument arity,
// so `_next` must stay even though it's unused.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    sendError(res, err.statusCode, {
      code: err.code,
      message: err.message,
      fields: err.fields,
    })
    return
  }

  console.error(err)

  if (isDatabaseError(err)) {
    sendError(res, 500, {
      code: 'DATABASE_ERROR',
      message: 'A database error occurred.',
    })
    return
  }

  sendError(res, 500, {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong.',
  })
}

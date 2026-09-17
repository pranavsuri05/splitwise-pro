import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../utils/responses.js'

// Express identifies error-handling middleware by its four-argument arity,
// so `_next` must stay even though it's unused.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err)
  sendError(res, 500, {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong.',
  })
}

import type { Request, Response } from 'express'
import { sendError } from '../utils/responses.js'

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, {
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
  })
}

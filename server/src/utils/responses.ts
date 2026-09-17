import type { Response } from 'express'

export interface ApiErrorBody {
  code: string
  message: string
  fields?: Record<string, string>
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data })
}

export function sendError(res: Response, status: number, error: ApiErrorBody): void {
  res.status(status).json({ success: false, error })
}

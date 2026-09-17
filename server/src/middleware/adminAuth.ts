import bcrypt from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/apiError.js'

export async function requireAdminPassword(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const password = req.header('X-Admin-Password')

    if (!password) {
      throw new ApiError(401, 'ADMIN_PASSWORD_REQUIRED', 'Admin authorization failed.')
    }

    const hash = process.env.ADMIN_PASSWORD_HASH

    if (!hash) {
      // Misconfiguration, not a client error — never reveal this detail to the client.
      console.error('ADMIN_PASSWORD_HASH is not configured.')
      throw new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong.')
    }

    const isValid = await bcrypt.compare(password, hash)

    if (!isValid) {
      throw new ApiError(401, 'INVALID_ADMIN_PASSWORD', 'Admin authorization failed.')
    }

    next()
  } catch (err) {
    next(err)
  }
}

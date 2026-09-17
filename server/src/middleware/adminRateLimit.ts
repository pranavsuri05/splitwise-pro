import rateLimit from 'express-rate-limit'
import { sendError } from '../utils/responses.js'

// Simple, proportionate throttle against admin-password guessing (Security
// Spec §26) — not a general-purpose abuse-prevention system.
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again later.',
    })
  },
})

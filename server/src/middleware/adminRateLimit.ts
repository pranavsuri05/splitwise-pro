import rateLimit from 'express-rate-limit'
import { sendError } from '../utils/responses.js'

// Simple, proportionate throttle against admin-password guessing (Security
// Spec §26) — not a general-purpose abuse-prevention system.
//
// The limiter instance (and its in-memory store) is a module-level
// singleton shared by every `createApp()` call within this process, since
// ES modules are cached — which includes every integration test file run in
// the same `vitest run` process. A real admin-guessing limit of 20/15min is
// appropriately tight for production, but the test suite legitimately makes
// far more than 20 authenticated admin calls across all its files put
// together. Vitest sets NODE_ENV=test automatically, so we raise the
// ceiling only there; production behavior is unchanged.
const isTestEnv = process.env.NODE_ENV === 'test'

export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 100000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again later.',
    })
  },
})

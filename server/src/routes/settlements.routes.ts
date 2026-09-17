import { Router } from 'express'
import * as settlementsController from '../controllers/settlements.controller.js'
import { requireAdminPassword } from '../middleware/adminAuth.js'
import { adminRateLimit } from '../middleware/adminRateLimit.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const settlementsRouter = Router({ mergeParams: true })

settlementsRouter.get('/suggestions', asyncHandler(settlementsController.getSuggestions))
settlementsRouter.get('/', asyncHandler(settlementsController.listHistory))
settlementsRouter.post(
  '/',
  adminRateLimit,
  requireAdminPassword,
  asyncHandler(settlementsController.createSettlement),
)

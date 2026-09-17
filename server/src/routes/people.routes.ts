import { Router } from 'express'
import * as peopleController from '../controllers/people.controller.js'
import { requireAdminPassword } from '../middleware/adminAuth.js'
import { adminRateLimit } from '../middleware/adminRateLimit.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const peopleRouter = Router({ mergeParams: true })

peopleRouter.get('/', asyncHandler(peopleController.listPeople))
peopleRouter.post('/', asyncHandler(peopleController.addPerson))
peopleRouter.patch(
  '/:personId',
  adminRateLimit,
  requireAdminPassword,
  asyncHandler(peopleController.removePerson),
)

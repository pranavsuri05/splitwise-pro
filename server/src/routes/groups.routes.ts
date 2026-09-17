import { Router } from 'express'
import * as groupsController from '../controllers/groups.controller.js'
import { adminRateLimit } from '../middleware/adminRateLimit.js'
import { requireAdminPassword } from '../middleware/adminAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const groupsRouter = Router()

groupsRouter.get('/', asyncHandler(groupsController.listGroups))
groupsRouter.post('/', asyncHandler(groupsController.createGroup))
groupsRouter.get('/:groupId', asyncHandler(groupsController.getGroup))
groupsRouter.patch('/:groupId', asyncHandler(groupsController.renameGroup))
groupsRouter.delete(
  '/:groupId',
  adminRateLimit,
  requireAdminPassword,
  asyncHandler(groupsController.deleteGroup),
)

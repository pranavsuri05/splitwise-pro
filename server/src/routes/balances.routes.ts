import { Router } from 'express'
import * as balancesController from '../controllers/balances.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const balancesRouter = Router({ mergeParams: true })

balancesRouter.get('/', asyncHandler(balancesController.getBalances))

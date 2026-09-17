import { Router } from 'express'
import * as expensesController from '../controllers/expenses.controller.js'
import { requireAdminPassword } from '../middleware/adminAuth.js'
import { adminRateLimit } from '../middleware/adminRateLimit.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const expensesRouter = Router({ mergeParams: true })

expensesRouter.get('/', asyncHandler(expensesController.listExpenses))
expensesRouter.post('/', asyncHandler(expensesController.createExpense))
expensesRouter.get('/:expenseId', asyncHandler(expensesController.getExpense))
expensesRouter.patch(
  '/:expenseId',
  adminRateLimit,
  requireAdminPassword,
  asyncHandler(expensesController.updateExpense),
)
expensesRouter.delete(
  '/:expenseId',
  adminRateLimit,
  requireAdminPassword,
  asyncHandler(expensesController.deleteExpense),
)
expensesRouter.delete(
  '/',
  adminRateLimit,
  requireAdminPassword,
  asyncHandler(expensesController.clearAllExpenses),
)

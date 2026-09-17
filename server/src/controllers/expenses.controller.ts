import type { Request, Response } from 'express'
import * as expensesService from '../services/expenses.service.js'
import * as groupsService from '../services/groups.service.js'
import { ApiError } from '../utils/apiError.js'
import { sendSuccess } from '../utils/responses.js'
import { isUuid } from '../utils/uuid.js'
import {
  parseCreateExpenseBody,
  parseExpenseListQuery,
  parseUpdateExpenseBody,
} from '../validators/expenses.js'

async function requireGroupId(groupId: string): Promise<string> {
  if (!isUuid(groupId) || !(await groupsService.getGroupById(groupId))) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', 'Group not found.')
  }
  return groupId
}

export async function listExpenses(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const filters = parseExpenseListQuery(req.query as Record<string, unknown>)
  const expenses = await expensesService.listExpenses(groupId, filters)
  sendSuccess(res, expenses)
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const input = parseCreateExpenseBody(req.body)
  const expense = await expensesService.createExpense(groupId, input)
  sendSuccess(res, expense, 201)
}

export async function getExpense(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const expense = await expensesService.getExpenseById(groupId, req.params.expenseId)
  sendSuccess(res, expense)
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  const patch = parseUpdateExpenseBody(req.body)
  const expense = await expensesService.updateExpense(groupId, req.params.expenseId, patch)
  sendSuccess(res, expense)
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  const groupId = await requireGroupId(req.params.groupId)
  await expensesService.deleteExpense(groupId, req.params.expenseId)
  res.status(204).end()
}

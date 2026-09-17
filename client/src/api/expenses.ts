import { del, get, patch, post } from './client.js'
import type {
  CreateExpenseInput,
  Expense,
  ExpenseListFilters,
  UpdateExpenseInput,
} from './types.js'

export function listExpenses(
  groupId: string,
  filters: ExpenseListFilters = {},
): Promise<Expense[]> {
  return get<Expense[]>(`/groups/${groupId}/expenses`, {
    categoryId: filters.categoryId,
    personId: filters.personId,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
  })
}

export function getExpense(groupId: string, expenseId: string): Promise<Expense> {
  return get<Expense>(`/groups/${groupId}/expenses/${expenseId}`)
}

export function createExpense(groupId: string, input: CreateExpenseInput): Promise<Expense> {
  return post<Expense>(`/groups/${groupId}/expenses`, input)
}

export function updateExpense(
  groupId: string,
  expenseId: string,
  input: UpdateExpenseInput,
  adminPassword: string,
): Promise<Expense> {
  return patch<Expense>(`/groups/${groupId}/expenses/${expenseId}`, input, adminPassword)
}

export function deleteExpense(
  groupId: string,
  expenseId: string,
  adminPassword: string,
): Promise<void> {
  return del<void>(`/groups/${groupId}/expenses/${expenseId}`, adminPassword)
}

export function clearAllExpenses(groupId: string, adminPassword: string): Promise<void> {
  return del<void>(`/groups/${groupId}/expenses`, adminPassword)
}

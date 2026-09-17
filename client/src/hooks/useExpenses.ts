import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as expensesApi from '../api/expenses.js'
import type { CreateExpenseInput, ExpenseListFilters, UpdateExpenseInput } from '../api/types.js'

export function useExpensesQuery(groupId: string | null, filters: ExpenseListFilters) {
  return useQuery({
    queryKey: ['expenses', groupId, filters],
    queryFn: () => expensesApi.listExpenses(groupId as string, filters),
    enabled: groupId !== null,
  })
}

export function useExpenseQuery(groupId: string | null, expenseId: string | null) {
  return useQuery({
    queryKey: ['expense', groupId, expenseId],
    queryFn: () => expensesApi.getExpense(groupId as string, expenseId as string),
    enabled: groupId !== null && expenseId !== null,
  })
}

function invalidateAfterExpenseChange(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
  queryClient.invalidateQueries({ queryKey: ['expense', groupId] })
  queryClient.invalidateQueries({ queryKey: ['balances', groupId] })
  queryClient.invalidateQueries({ queryKey: ['settlementSuggestions', groupId] })
}

export function useCreateExpenseMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expensesApi.createExpense(groupId, input),
    onSuccess: () => invalidateAfterExpenseChange(queryClient, groupId),
  })
}

export function useUpdateExpenseMutation(groupId: string, expenseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, adminPassword }: { input: UpdateExpenseInput; adminPassword: string }) =>
      expensesApi.updateExpense(groupId, expenseId, input, adminPassword),
    onSuccess: () => invalidateAfterExpenseChange(queryClient, groupId),
  })
}

export function useDeleteExpenseMutation(groupId: string, expenseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (adminPassword: string) =>
      expensesApi.deleteExpense(groupId, expenseId, adminPassword),
    onSuccess: () => invalidateAfterExpenseChange(queryClient, groupId),
  })
}

export function useClearAllExpensesMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (adminPassword: string) => expensesApi.clearAllExpenses(groupId, adminPassword),
    onSuccess: () => invalidateAfterExpenseChange(queryClient, groupId),
  })
}

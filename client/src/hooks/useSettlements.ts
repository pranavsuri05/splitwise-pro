import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as settlementsApi from '../api/settlements.js'
import type { CreateSettlementInput } from '../api/types.js'

export function useSettlementSuggestionsQuery(groupId: string | null) {
  return useQuery({
    queryKey: ['settlementSuggestions', groupId],
    queryFn: () => settlementsApi.getSettlementSuggestions(groupId as string),
    enabled: groupId !== null,
  })
}

export function useSettlementHistoryQuery(groupId: string | null) {
  return useQuery({
    queryKey: ['settlementHistory', groupId],
    queryFn: () => settlementsApi.listSettlementHistory(groupId as string),
    enabled: groupId !== null,
  })
}

export function useCreateSettlementMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      input,
      adminPassword,
    }: {
      input: CreateSettlementInput
      adminPassword: string
    }) => settlementsApi.createSettlement(groupId, input, adminPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementSuggestions', groupId] })
      queryClient.invalidateQueries({ queryKey: ['settlementHistory', groupId] })
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] })
    },
  })
}

import { get, post } from './client.js'
import type { CreateSettlementInput, Settlement, SettlementSuggestion } from './types.js'

export async function getSettlementSuggestions(groupId: string): Promise<SettlementSuggestion[]> {
  const result = await get<{ suggestions: SettlementSuggestion[] }>(
    `/groups/${groupId}/settlements/suggestions`,
  )
  return result.suggestions
}

export function listSettlementHistory(groupId: string): Promise<Settlement[]> {
  return get<Settlement[]>(`/groups/${groupId}/settlements`)
}

export function createSettlement(
  groupId: string,
  input: CreateSettlementInput,
  adminPassword: string,
): Promise<Settlement> {
  return post<Settlement>(`/groups/${groupId}/settlements`, input, adminPassword)
}

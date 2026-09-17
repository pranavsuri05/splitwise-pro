import { get } from './client.js'
import type { BalancesResult } from './types.js'

export function getBalances(groupId: string): Promise<BalancesResult> {
  return get<BalancesResult>(`/groups/${groupId}/balances`)
}

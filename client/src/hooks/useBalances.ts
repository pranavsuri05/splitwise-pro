import { useQuery } from '@tanstack/react-query'
import * as balancesApi from '../api/balances.js'

export function useBalancesQuery(groupId: string | null) {
  return useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => balancesApi.getBalances(groupId as string),
    enabled: groupId !== null,
  })
}

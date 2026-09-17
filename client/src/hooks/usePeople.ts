import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as peopleApi from '../api/people.js'

export function usePeopleQuery(groupId: string | null, includeInactive = false) {
  return useQuery({
    queryKey: ['people', groupId, includeInactive],
    queryFn: () => peopleApi.listPeople(groupId as string, includeInactive),
    enabled: groupId !== null,
  })
}

function invalidateAfterPeopleChange(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['people', groupId] })
  queryClient.invalidateQueries({ queryKey: ['balances', groupId] })
  queryClient.invalidateQueries({ queryKey: ['settlementSuggestions', groupId] })
  queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
}

export function useAddPersonMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => peopleApi.addPerson(groupId, name),
    onSuccess: () => invalidateAfterPeopleChange(queryClient, groupId),
  })
}

export function useRemovePersonMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ personId, adminPassword }: { personId: string; adminPassword: string }) =>
      peopleApi.removePerson(groupId, personId, adminPassword),
    onSuccess: () => invalidateAfterPeopleChange(queryClient, groupId),
  })
}

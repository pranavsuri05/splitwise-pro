import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as groupsApi from '../api/groups.js'

export function useGroupsQuery() {
  return useQuery({ queryKey: ['groups'], queryFn: groupsApi.listGroups })
}

export function useGroupQuery(groupId: string | null) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroup(groupId as string),
    enabled: groupId !== null,
  })
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => groupsApi.createGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useRenameGroupMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => groupsApi.renameGroup(groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
    },
  })
}

export function useDeleteGroupMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (adminPassword: string) => groupsApi.deleteGroup(groupId, adminPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

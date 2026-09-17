import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as categoriesApi from '../api/categories.js'

export function useCategoriesQuery(groupId: string | null) {
  return useQuery({
    queryKey: ['categories', groupId],
    queryFn: () => categoriesApi.listCategories(groupId as string),
    enabled: groupId !== null,
  })
}

function invalidateAfterCategoryChange(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['categories', groupId] })
  queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
}

export function useAddCategoryMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => categoriesApi.addCategory(groupId, name),
    onSuccess: () => invalidateAfterCategoryChange(queryClient, groupId),
  })
}

export function useDeleteCategoryMutation(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (categoryId: string) => categoriesApi.deleteCategory(groupId, categoryId),
    onSuccess: () => invalidateAfterCategoryChange(queryClient, groupId),
  })
}

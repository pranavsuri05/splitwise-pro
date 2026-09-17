import { del, get, post } from './client.js'
import type { Category } from './types.js'

export function listCategories(groupId: string): Promise<Category[]> {
  return get<Category[]>(`/groups/${groupId}/categories`)
}

export function addCategory(groupId: string, name: string): Promise<Category> {
  return post<Category>(`/groups/${groupId}/categories`, { name })
}

export function deleteCategory(groupId: string, categoryId: string): Promise<void> {
  return del<void>(`/groups/${groupId}/categories/${categoryId}`)
}

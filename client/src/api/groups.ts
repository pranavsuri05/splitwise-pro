import { del, get, patch, post } from './client.js'
import type { Group } from './types.js'

export function listGroups(): Promise<Group[]> {
  return get<Group[]>('/groups')
}

export function createGroup(name: string): Promise<Group> {
  return post<Group>('/groups', { name })
}

export function getGroup(groupId: string): Promise<Group> {
  return get<Group>(`/groups/${groupId}`)
}

export function renameGroup(groupId: string, name: string): Promise<Group> {
  return patch<Group>(`/groups/${groupId}`, { name })
}

export function deleteGroup(groupId: string, adminPassword: string): Promise<void> {
  return del<void>(`/groups/${groupId}`, adminPassword)
}

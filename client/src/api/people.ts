import { get, patch, post } from './client.js'
import type { Person } from './types.js'

export function listPeople(groupId: string, includeInactive = false): Promise<Person[]> {
  return get<Person[]>(`/groups/${groupId}/people`, {
    includeInactive: includeInactive ? 'true' : undefined,
  })
}

export function addPerson(groupId: string, name: string): Promise<Person> {
  return post<Person>(`/groups/${groupId}/people`, { name })
}

export function removePerson(
  groupId: string,
  personId: string,
  adminPassword: string,
): Promise<Person> {
  return patch<Person>(`/groups/${groupId}/people/${personId}`, { is_active: false }, adminPassword)
}

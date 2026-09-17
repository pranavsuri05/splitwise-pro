import { pool } from '../db/pool.js'

export interface PersonRecord {
  id: string
  group_id: string
  name: string
  is_active: boolean
  created_at: string
}

export async function listPeople(
  groupId: string,
  includeInactive: boolean,
): Promise<PersonRecord[]> {
  const { rows } = await pool.query<PersonRecord>(
    includeInactive
      ? 'SELECT * FROM people WHERE group_id = $1 ORDER BY created_at ASC'
      : 'SELECT * FROM people WHERE group_id = $1 AND is_active = TRUE ORDER BY created_at ASC',
    [groupId],
  )
  return rows
}

export async function addPerson(groupId: string, name: string): Promise<PersonRecord> {
  const { rows } = await pool.query<PersonRecord>(
    'INSERT INTO people (group_id, name) VALUES ($1, $2) RETURNING *',
    [groupId, name],
  )
  return rows[0]
}

export async function getPersonById(
  groupId: string,
  personId: string,
): Promise<PersonRecord | null> {
  const { rows } = await pool.query<PersonRecord>(
    'SELECT * FROM people WHERE id = $1 AND group_id = $2',
    [personId, groupId],
  )
  return rows[0] ?? null
}

export async function setPersonActive(
  groupId: string,
  personId: string,
  isActive: boolean,
): Promise<PersonRecord | null> {
  const { rows } = await pool.query<PersonRecord>(
    'UPDATE people SET is_active = $3 WHERE id = $1 AND group_id = $2 RETURNING *',
    [personId, groupId, isActive],
  )
  return rows[0] ?? null
}

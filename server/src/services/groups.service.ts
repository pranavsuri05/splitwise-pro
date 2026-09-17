import { pool } from '../db/pool.js'
import { withTransaction } from '../db/transaction.js'

export interface GroupRecord {
  id: string
  name: string
  created_at: string
}

export async function listGroups(): Promise<GroupRecord[]> {
  const { rows } = await pool.query<GroupRecord>(
    'SELECT id, name, created_at FROM groups ORDER BY created_at ASC',
  )
  return rows
}

export async function createGroup(name: string): Promise<GroupRecord> {
  const { rows } = await pool.query<GroupRecord>(
    'INSERT INTO groups (name) VALUES ($1) RETURNING id, name, created_at',
    [name],
  )
  return rows[0]
}

export async function getGroupById(groupId: string): Promise<GroupRecord | null> {
  const { rows } = await pool.query<GroupRecord>(
    'SELECT id, name, created_at FROM groups WHERE id = $1',
    [groupId],
  )
  return rows[0] ?? null
}

export async function renameGroup(groupId: string, name: string): Promise<GroupRecord | null> {
  const { rows } = await pool.query<GroupRecord>(
    'UPDATE groups SET name = $2 WHERE id = $1 RETURNING id, name, created_at',
    [groupId, name],
  )
  return rows[0] ?? null
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const result = await client.query('DELETE FROM groups WHERE id = $1', [groupId])
    return (result.rowCount ?? 0) > 0
  })
}

import { pool } from '../db/pool.js'

export interface CategoryRecord {
  id: string
  group_id: string
  name: string
  created_at: string
}

export async function listCategories(groupId: string): Promise<CategoryRecord[]> {
  const { rows } = await pool.query<CategoryRecord>(
    'SELECT * FROM categories WHERE group_id = $1 ORDER BY created_at ASC',
    [groupId],
  )
  return rows
}

export async function addCategory(groupId: string, name: string): Promise<CategoryRecord> {
  const { rows } = await pool.query<CategoryRecord>(
    'INSERT INTO categories (group_id, name) VALUES ($1, $2) RETURNING *',
    [groupId, name],
  )
  return rows[0]
}

export async function getCategoryById(
  groupId: string,
  categoryId: string,
): Promise<CategoryRecord | null> {
  const { rows } = await pool.query<CategoryRecord>(
    'SELECT * FROM categories WHERE id = $1 AND group_id = $2',
    [categoryId, groupId],
  )
  return rows[0] ?? null
}

export async function deleteCategory(groupId: string, categoryId: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM categories WHERE id = $1 AND group_id = $2', [
    categoryId,
    groupId,
  ])
  return (result.rowCount ?? 0) > 0
}

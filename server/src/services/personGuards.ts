import type { Pool, PoolClient } from 'pg'
import { ApiError } from '../utils/apiError.js'
import { isUuid } from '../utils/uuid.js'

export type Queryable = Pool | PoolClient

// Shared by expenses and settlements: a referenced person must exist, belong
// to this group, and be active. Reused rather than duplicated per resource.
export async function requireActivePersonInGroup(
  db: Queryable,
  groupId: string,
  personId: string,
  fieldLabel: string,
): Promise<void> {
  if (!isUuid(personId)) {
    throw new ApiError(404, 'PERSON_NOT_FOUND', `${fieldLabel} not found.`)
  }

  const { rows } = await db.query<{ is_active: boolean }>(
    'SELECT is_active FROM people WHERE id = $1 AND group_id = $2',
    [personId, groupId],
  )

  if (rows.length === 0) {
    throw new ApiError(404, 'PERSON_NOT_FOUND', `${fieldLabel} not found.`)
  }

  if (!rows[0].is_active) {
    throw new ApiError(422, 'INACTIVE_PERSON', `${fieldLabel} is not active.`)
  }
}

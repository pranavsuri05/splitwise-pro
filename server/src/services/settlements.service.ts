import { computeSmartSettlement } from '../business/smartSettlement.js'
import { pool } from '../db/pool.js'
import { withTransaction } from '../db/transaction.js'
import { ApiError } from '../utils/apiError.js'
import { getGroupBalances } from './balances.service.js'
import { requireActivePersonInGroup } from './personGuards.js'
import type { CreateSettlementInput } from '../validators/settlements.js'

export interface PersonRef {
  id: string
  name: string
}

export interface SettlementResponse {
  id: string
  from_person: PersonRef
  to_person: PersonRef
  amount: number
  created_at: string
}

export interface SettlementSuggestionResponse {
  from_person: PersonRef
  to_person: PersonRef
  amount: number
}

interface SettlementRow {
  id: string
  amount: number
  created_at: string
  from_id: string
  from_name: string
  to_id: string
  to_name: string
}

const SETTLEMENT_SELECT = `
  SELECT s.id, s.amount, s.created_at,
         s.from_person AS from_id, fp.name AS from_name,
         s.to_person AS to_id, tp.name AS to_name
  FROM settlements s
  JOIN people fp ON fp.id = s.from_person
  JOIN people tp ON tp.id = s.to_person
`

function toSettlementResponse(row: SettlementRow): SettlementResponse {
  return {
    id: row.id,
    from_person: { id: row.from_id, name: row.from_name },
    to_person: { id: row.to_id, name: row.to_name },
    amount: row.amount,
    created_at: row.created_at,
  }
}

// Business_Logic_Algorithms.md §27/§31: derived from current balances only,
// never persisted, recalculated on every call. Reuses the exact same
// balance engine as GET /balances — no second calculation.
export async function getSettlementSuggestions(
  groupId: string,
): Promise<SettlementSuggestionResponse[]> {
  const { balances } = await getGroupBalances(groupId)
  const suggestions = computeSmartSettlement(
    balances.map((b) => ({ personId: b.person_id, balance: b.balance })),
  )

  const nameById = new Map(balances.map((b) => [b.person_id, b.person_name]))
  return suggestions.map((s) => ({
    from_person: { id: s.fromPersonId, name: nameById.get(s.fromPersonId) ?? '' },
    to_person: { id: s.toPersonId, name: nameById.get(s.toPersonId) ?? '' },
    amount: s.amount,
  }))
}

export async function listSettlementHistory(groupId: string): Promise<SettlementResponse[]> {
  const { rows } = await pool.query<SettlementRow>(
    `${SETTLEMENT_SELECT} WHERE s.group_id = $1 ORDER BY s.created_at DESC, s.id DESC`,
    [groupId],
  )
  return rows.map(toSettlementResponse)
}

export async function createSettlement(
  groupId: string,
  input: CreateSettlementInput,
): Promise<SettlementResponse> {
  return withTransaction(async (client) => {
    // Serialize concurrent settlement-creation attempts for the SAME sender
    // in the SAME group. Balances are derived, not stored, so there is no
    // row to lock directly — an advisory lock (transaction-scoped, released
    // automatically on COMMIT/ROLLBACK) provides the mutual exclusion
    // instead. A second concurrent request for this sender blocks here
    // until the first commits, then re-reads the balance fresh and sees the
    // first settlement's effect already applied — so two requests whose
    // combined amount would overdraw the sender's debt can never both pass
    // the check below, regardless of timing.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [
      groupId,
      input.fromPersonId,
    ])

    await requireActivePersonInGroup(client, groupId, input.fromPersonId, 'from_person')
    await requireActivePersonInGroup(client, groupId, input.toPersonId, 'to_person')

    const { balances } = await getGroupBalances(groupId)
    const senderBalance = balances.find((b) => b.person_id === input.fromPersonId)?.balance ?? 0
    const maxValidAmount = senderBalance < 0 ? -senderBalance : 0

    if (input.amount > maxValidAmount) {
      throw new ApiError(
        422,
        'INVALID_SETTLEMENT',
        `Settlement amount exceeds the sender's outstanding debt of ₹${maxValidAmount}.`,
      )
    }

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO settlements (group_id, from_person, to_person, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [groupId, input.fromPersonId, input.toPersonId, input.amount],
    )

    const { rows: settlementRows } = await client.query<SettlementRow>(
      `${SETTLEMENT_SELECT} WHERE s.id = $1`,
      [rows[0].id],
    )

    return toSettlementResponse(settlementRows[0])
  })
}

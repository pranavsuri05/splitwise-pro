import { distributeEqually } from './split.js'

export interface PersonForBalance {
  id: string
  is_active: boolean
}

export interface ExpenseForBalance {
  paid_by: string
  amount: number
}

export interface ShareForBalance {
  person_id: string
  amount: number
}

export interface SettlementForBalance {
  from_person: string
  to_person: string
  amount: number
}

export interface RawBalanceInputs {
  people: PersonForBalance[]
  expenses: ExpenseForBalance[]
  shares: ShareForBalance[]
  settlements: SettlementForBalance[]
}

// Business_Logic_Algorithms.md §3/§15: balance[payer] += amount,
// balance[participant] -= share, balance[sender] += amount,
// balance[receiver] -= amount. Computed over every person (active and
// inactive) so the removal adjustment below has a complete picture.
export function computeRawBalances(input: RawBalanceInputs): Map<string, number> {
  const balances = new Map<string, number>()

  for (const person of input.people) {
    balances.set(person.id, 0)
  }

  for (const expense of input.expenses) {
    balances.set(expense.paid_by, (balances.get(expense.paid_by) ?? 0) + expense.amount)
  }

  for (const share of input.shares) {
    balances.set(share.person_id, (balances.get(share.person_id) ?? 0) - share.amount)
  }

  for (const settlement of input.settlements) {
    balances.set(
      settlement.from_person,
      (balances.get(settlement.from_person) ?? 0) + settlement.amount,
    )
    balances.set(
      settlement.to_person,
      (balances.get(settlement.to_person) ?? 0) - settlement.amount,
    )
  }

  return balances
}

// Person-removal redistribution (Business_Logic_Algorithms.md §17-22, and the
// symmetric-redistribution decision resolving the positive-balance case):
//
// For every inactive person, their raw balance (whatever its sign) is
// redistributed as an equal, deterministic-remainder delta across the
// CURRENTLY active people — not negated, not dropped, just reassigned. Since
// sum(all raw balances) == 0 always, and each inactive person's exact raw
// balance is moved onto the active pool, sum(active adjusted balances) == 0
// always holds too, regardless of how many people have been removed.
//
// This is recomputed fresh from the live `people` table on every call (no
// snapshot is stored anywhere), so a person added after someone else's
// removal is still counted among "currently active people" and will absorb
// their share of that earlier removal's redistributed balance. This is a
// deliberate, accepted consequence of "balances are never stored" — there is
// nowhere to persist a removal-time snapshot without introducing a second
// mutable source of truth, which the schema explicitly forbids.
export function applyRemovalAdjustments(
  people: PersonForBalance[],
  rawBalances: Map<string, number>,
): Map<string, number> {
  const activeIds = people.filter((p) => p.is_active).map((p) => p.id)
  const inactiveIds = people.filter((p) => !p.is_active).map((p) => p.id)

  const adjusted = new Map<string, number>()
  for (const id of activeIds) {
    adjusted.set(id, rawBalances.get(id) ?? 0)
  }

  if (activeIds.length === 0) {
    return adjusted
  }

  for (const inactiveId of inactiveIds) {
    const amountToRedistribute = rawBalances.get(inactiveId) ?? 0
    const deltas = distributeEqually(amountToRedistribute, activeIds.length)

    activeIds.forEach((activeId, index) => {
      adjusted.set(activeId, (adjusted.get(activeId) ?? 0) + deltas[index])
    })
  }

  return adjusted
}

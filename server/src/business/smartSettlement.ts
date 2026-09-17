export interface BalanceForSettlement {
  personId: string
  balance: number
}

export interface SettlementSuggestion {
  fromPersonId: string
  toPersonId: string
  amount: number
}

interface RemainingParty {
  personId: string
  remaining: number
}

// Business_Logic_Algorithms.md §28-30 / Testing_Strategy.md §13: separate
// creditors (balance > 0) and debtors (balance < 0), preserving the input
// order (which callers derive from a stable DB ordering), then walk both
// lists with a two-pointer greedy match — the smallest of the two remaining
// amounts is settled each step, and whichever side hits zero advances.
// Deterministic for a given input order; never persisted; recomputed fresh
// from current balances on every call.
export function computeSmartSettlement(balances: BalanceForSettlement[]): SettlementSuggestion[] {
  const creditors: RemainingParty[] = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ personId: b.personId, remaining: b.balance }))
  const debtors: RemainingParty[] = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ personId: b.personId, remaining: -b.balance }))

  const suggestions: SettlementSuggestion[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const payment = Math.min(debtor.remaining, creditor.remaining)

    if (payment > 0) {
      suggestions.push({
        fromPersonId: debtor.personId,
        toPersonId: creditor.personId,
        amount: payment,
      })
    }

    debtor.remaining -= payment
    creditor.remaining -= payment

    if (debtor.remaining === 0) debtorIndex++
    if (creditor.remaining === 0) creditorIndex++
  }

  return suggestions
}

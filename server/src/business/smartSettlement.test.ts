import { describe, expect, it } from 'vitest'
import { computeSmartSettlement, type BalanceForSettlement } from './smartSettlement.js'

function applySuggestions(
  balances: BalanceForSettlement[],
  suggestions: ReturnType<typeof computeSmartSettlement>,
): Map<string, number> {
  const result = new Map(balances.map((b) => [b.personId, b.balance]))
  for (const s of suggestions) {
    result.set(s.fromPersonId, (result.get(s.fromPersonId) ?? 0) + s.amount)
    result.set(s.toPersonId, (result.get(s.toPersonId) ?? 0) - s.amount)
  }
  return result
}

describe('computeSmartSettlement', () => {
  it('returns no suggestions for an already-settled group (all zero)', () => {
    const suggestions = computeSmartSettlement([
      { personId: 'A', balance: 0 },
      { personId: 'B', balance: 0 },
    ])
    expect(suggestions).toEqual([])
  })

  it('returns no suggestions for an empty balance list', () => {
    expect(computeSmartSettlement([])).toEqual([])
  })

  it('matches a single debtor to a single creditor exactly', () => {
    const suggestions = computeSmartSettlement([
      { personId: 'A', balance: 100 },
      { personId: 'B', balance: -100 },
    ])
    expect(suggestions).toEqual([{ fromPersonId: 'B', toPersonId: 'A', amount: 100 }])
  })

  it('reproduces the documented multi-party example exactly (§28-30)', () => {
    const balances: BalanceForSettlement[] = [
      { personId: 'A', balance: 1000 },
      { personId: 'B', balance: 500 },
      { personId: 'C', balance: -700 },
      { personId: 'D', balance: -800 },
    ]

    const suggestions = computeSmartSettlement(balances)

    expect(suggestions).toEqual([
      { fromPersonId: 'C', toPersonId: 'A', amount: 700 },
      { fromPersonId: 'D', toPersonId: 'A', amount: 300 },
      { fromPersonId: 'D', toPersonId: 'B', amount: 500 },
    ])

    const final = applySuggestions(balances, suggestions)
    for (const balance of final.values()) {
      expect(balance).toBe(0)
    }
  })

  it('handles multiple creditors and multiple debtors of varied sizes', () => {
    const balances: BalanceForSettlement[] = [
      { personId: 'A', balance: 300 },
      { personId: 'B', balance: 200 },
      { personId: 'C', balance: 100 },
      { personId: 'D', balance: -250 },
      { personId: 'E', balance: -350 },
    ]

    const suggestions = computeSmartSettlement(balances)
    const final = applySuggestions(balances, suggestions)

    for (const balance of final.values()) {
      expect(balance).toBe(0)
    }
  })

  it('every suggestion satisfies the documented assertions', () => {
    const balances: BalanceForSettlement[] = [
      { personId: 'A', balance: 1000 },
      { personId: 'B', balance: 500 },
      { personId: 'C', balance: -700 },
      { personId: 'D', balance: -800 },
    ]
    const balanceOf = new Map(balances.map((b) => [b.personId, b.balance]))

    const suggestions = computeSmartSettlement(balances)

    for (const s of suggestions) {
      expect(balanceOf.get(s.fromPersonId)).toBeLessThan(0)
      expect(balanceOf.get(s.toPersonId)).toBeGreaterThan(0)
      expect(s.amount).toBeGreaterThan(0)
      expect(s.fromPersonId).not.toBe(s.toPersonId)
    }
  })

  it('produces no unnecessary payments (exactly creditors+debtors-1 in the worked example)', () => {
    const suggestions = computeSmartSettlement([
      { personId: 'A', balance: 1000 },
      { personId: 'B', balance: 500 },
      { personId: 'C', balance: -700 },
      { personId: 'D', balance: -800 },
    ])
    // 2 creditors + 2 debtors, one of whom is fully exhausted by the last
    // payment simultaneously with a creditor -> 3 payments, not 4.
    expect(suggestions).toHaveLength(3)
  })

  it('is deterministic for the same input', () => {
    const balances: BalanceForSettlement[] = [
      { personId: 'A', balance: 1000 },
      { personId: 'B', balance: 500 },
      { personId: 'C', balance: -700 },
      { personId: 'D', balance: -800 },
    ]
    expect(computeSmartSettlement(balances)).toEqual(computeSmartSettlement(balances))
  })

  it('preserves input order when separating creditors/debtors for tie-breaking', () => {
    const orderA = computeSmartSettlement([
      { personId: 'X', balance: 50 },
      { personId: 'Y', balance: 50 },
      { personId: 'Z', balance: -100 },
    ])
    const orderB = computeSmartSettlement([
      { personId: 'Y', balance: 50 },
      { personId: 'X', balance: 50 },
      { personId: 'Z', balance: -100 },
    ])

    expect(orderA[0].toPersonId).toBe('X')
    expect(orderB[0].toPersonId).toBe('Y')
  })

  it('handles a single exact partial-exhaustion step (creditor and debtor both hit zero together)', () => {
    const suggestions = computeSmartSettlement([
      { personId: 'A', balance: 200 },
      { personId: 'B', balance: -200 },
    ])
    expect(suggestions).toEqual([{ fromPersonId: 'B', toPersonId: 'A', amount: 200 }])
  })
})

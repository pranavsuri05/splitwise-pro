import { describe, expect, it } from 'vitest'
import { applyRemovalAdjustments, computeRawBalances } from './balances.js'

function sumOf(map: Map<string, number>): number {
  return Array.from(map.values()).reduce((sum, v) => sum + v, 0)
}

describe('computeRawBalances', () => {
  it('computes a simple equal expense', () => {
    const balances = computeRawBalances({
      people: [
        { id: 'A', is_active: true },
        { id: 'B', is_active: true },
      ],
      expenses: [{ paid_by: 'A', amount: 100 }],
      shares: [
        { person_id: 'A', amount: 50 },
        { person_id: 'B', amount: 50 },
      ],
      settlements: [],
    })

    expect(balances.get('A')).toBe(50)
    expect(balances.get('B')).toBe(-50)
    expect(sumOf(balances)).toBe(0)
  })

  it('gives the payer full credit even when they are not a participant', () => {
    const balances = computeRawBalances({
      people: [
        { id: 'Rahul', is_active: true },
        { id: 'Sidhant', is_active: true },
        { id: 'Arjun', is_active: true },
      ],
      expenses: [{ paid_by: 'Rahul', amount: 900 }],
      shares: [
        { person_id: 'Sidhant', amount: 450 },
        { person_id: 'Arjun', amount: 450 },
      ],
      settlements: [],
    })

    expect(balances.get('Rahul')).toBe(900)
    expect(balances.get('Sidhant')).toBe(-450)
    expect(balances.get('Arjun')).toBe(-450)
    expect(sumOf(balances)).toBe(0)
  })

  it('handles a one-person expense (net zero)', () => {
    const balances = computeRawBalances({
      people: [{ id: 'A', is_active: true }],
      expenses: [{ paid_by: 'A', amount: 500 }],
      shares: [{ person_id: 'A', amount: 500 }],
      settlements: [],
    })

    expect(balances.get('A')).toBe(0)
  })

  it('accumulates across multiple expenses with different payers', () => {
    const balances = computeRawBalances({
      people: [
        { id: 'A', is_active: true },
        { id: 'B', is_active: true },
      ],
      expenses: [
        { paid_by: 'A', amount: 100 },
        { paid_by: 'B', amount: 200 },
      ],
      shares: [
        { person_id: 'A', amount: 50 },
        { person_id: 'B', amount: 50 },
        { person_id: 'A', amount: 100 },
        { person_id: 'B', amount: 100 },
      ],
      settlements: [],
    })

    // A: +100 (paid) -50 -100 (shares) = -50
    // B: +200 (paid) -50 -100 (shares) = +50
    expect(balances.get('A')).toBe(-50)
    expect(balances.get('B')).toBe(50)
    expect(sumOf(balances)).toBe(0)
  })

  it('applies settlement effects (sender += amount, receiver -= amount)', () => {
    const balances = computeRawBalances({
      people: [
        { id: 'A', is_active: true },
        { id: 'B', is_active: true },
      ],
      expenses: [{ paid_by: 'A', amount: 100 }],
      shares: [
        { person_id: 'A', amount: 0 },
        { person_id: 'B', amount: 100 },
      ],
      settlements: [{ from_person: 'B', to_person: 'A', amount: 40 }],
    })

    expect(balances.get('A')).toBe(100 - 40)
    expect(balances.get('B')).toBe(-100 + 40)
    expect(sumOf(balances)).toBe(0)
  })
})

describe('applyRemovalAdjustments', () => {
  it('leaves balances untouched when nobody is inactive', () => {
    const raw = new Map([
      ['A', 100],
      ['B', -100],
    ])
    const people = [
      { id: 'A', is_active: true },
      { id: 'B', is_active: true },
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect(adjusted.get('A')).toBe(100)
    expect(adjusted.get('B')).toBe(-100)
  })

  it('redistributes a removed debtor evenly across remaining active people (§20 example)', () => {
    // Sidhant +300, Rahul -600, Arjun +300 -> remove Rahul.
    const raw = new Map([
      ['Sidhant', 300],
      ['Rahul', -600],
      ['Arjun', 300],
    ])
    const people = [
      { id: 'Sidhant', is_active: true },
      { id: 'Rahul', is_active: false },
      { id: 'Arjun', is_active: true },
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect(adjusted.get('Sidhant')).toBe(0)
    expect(adjusted.get('Arjun')).toBe(0)
    expect(adjusted.has('Rahul')).toBe(false)
    expect(sumOf(adjusted)).toBe(0)
  })

  it('redistributes a removed creditor symmetrically (§21 example)', () => {
    // Sidhant -300, Rahul +600, Arjun -300 -> remove Rahul.
    const raw = new Map([
      ['Sidhant', -300],
      ['Rahul', 600],
      ['Arjun', -300],
    ])
    const people = [
      { id: 'Sidhant', is_active: true },
      { id: 'Rahul', is_active: false },
      { id: 'Arjun', is_active: true },
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect(adjusted.get('Sidhant')).toBe(0)
    expect(adjusted.get('Arjun')).toBe(0)
    expect(sumOf(adjusted)).toBe(0)
  })

  it('does nothing for a removed person with a zero balance', () => {
    const raw = new Map([
      ['A', 0],
      ['B', 50],
      ['C', -50],
    ])
    const people = [
      { id: 'A', is_active: false },
      { id: 'B', is_active: true },
      { id: 'C', is_active: true },
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect(adjusted.get('B')).toBe(50)
    expect(adjusted.get('C')).toBe(-50)
    expect(sumOf(adjusted)).toBe(0)
  })

  it('uses deterministic remainder handling when redistributing (₹100 debt / 3 people)', () => {
    const raw = new Map([
      ['Removed', -100],
      ['A', 0],
      ['B', 0],
      ['C', 0],
    ])
    const people = [
      { id: 'Removed', is_active: false },
      { id: 'A', is_active: true },
      { id: 'B', is_active: true },
      { id: 'C', is_active: true },
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect([adjusted.get('A'), adjusted.get('B'), adjusted.get('C')]).toEqual([-34, -33, -33])
  })

  it('handles multiple removed people independently and still sums to zero', () => {
    const raw = new Map([
      ['RemovedDebtor', -90],
      ['RemovedCreditor', 60],
      ['A', 30],
      ['B', -30],
      ['C', 30],
    ])
    const people = [
      { id: 'RemovedDebtor', is_active: false },
      { id: 'RemovedCreditor', is_active: false },
      { id: 'A', is_active: true },
      { id: 'B', is_active: true },
      { id: 'C', is_active: true },
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect(adjusted.has('RemovedDebtor')).toBe(false)
    expect(adjusted.has('RemovedCreditor')).toBe(false)
    expect(sumOf(adjusted)).toBe(0)
  })

  it('a later-added active person absorbs a share of a prior removal (dynamic, no snapshot)', () => {
    // At removal time there were only A and B; a new person D joins later.
    // Because redistribution is always computed against the CURRENT active
    // set, D also absorbs a third of Removed's debt once they're active.
    const raw = new Map([
      ['Removed', -90],
      ['A', 0],
      ['B', 0],
      ['D', 0],
    ])
    const people = [
      { id: 'Removed', is_active: false },
      { id: 'A', is_active: true },
      { id: 'B', is_active: true },
      { id: 'D', is_active: true }, // added after Removed's removal
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect(adjusted.get('A')).toBe(-30)
    expect(adjusted.get('B')).toBe(-30)
    expect(adjusted.get('D')).toBe(-30)
  })

  it('returns an empty result when every person has been removed (no active people)', () => {
    const raw = new Map([
      ['A', 50],
      ['B', -50],
    ])
    const people = [
      { id: 'A', is_active: false },
      { id: 'B', is_active: false },
    ]

    const adjusted = applyRemovalAdjustments(people, raw)

    expect(adjusted.size).toBe(0)
  })

  it('never rewrites the raw balance map it was given', () => {
    const raw = new Map([
      ['A', 300],
      ['Removed', -300],
    ])
    const people = [
      { id: 'A', is_active: true },
      { id: 'Removed', is_active: false },
    ]

    applyRemovalAdjustments(people, raw)

    expect(raw.get('Removed')).toBe(-300)
  })
})

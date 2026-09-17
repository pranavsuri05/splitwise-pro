import { describe, expect, it } from 'vitest'
import { computeEqualSplit, distributeEqually } from './split.js'

describe('distributeEqually', () => {
  it('splits evenly when there is no remainder', () => {
    expect(distributeEqually(100, 2)).toEqual([50, 50])
  })

  it('distributes the remainder to the first entries in order (₹100 / 3)', () => {
    expect(distributeEqually(100, 3)).toEqual([34, 33, 33])
  })

  it('handles a remainder equal to count - 1 (₹10 / 4)', () => {
    expect(distributeEqually(10, 4)).toEqual([3, 3, 2, 2])
  })

  it('handles a single recipient', () => {
    expect(distributeEqually(1, 1)).toEqual([1])
  })

  it('handles more recipients than the amount (₹2 / 3)', () => {
    expect(distributeEqually(2, 3)).toEqual([1, 1, 0])
  })

  it('always sums to the original amount', () => {
    for (const [amount, count] of [
      [100, 3],
      [10, 4],
      [99999, 7],
      [1, 5],
    ]) {
      const shares = distributeEqually(amount, count)
      expect(shares.reduce((sum, s) => sum + s, 0)).toBe(amount)
    }
  })

  it('distributes negative amounts by magnitude, preserving sign (removal redistribution)', () => {
    expect(distributeEqually(-600, 3)).toEqual([-200, -200, -200])
    expect(distributeEqually(-100, 3)).toEqual([-34, -33, -33])
  })

  it('is deterministic for the same input', () => {
    expect(distributeEqually(100, 3)).toEqual(distributeEqually(100, 3))
  })
})

describe('computeEqualSplit', () => {
  it('assigns shares in participant-selection order', () => {
    const shares = computeEqualSplit(100, ['p1', 'p2', 'p3'])
    expect(shares).toEqual([
      { personId: 'p1', amount: 34 },
      { personId: 'p2', amount: 33 },
      { personId: 'p3', amount: 33 },
    ])
  })

  it('a different selection order changes who gets the extra rupee', () => {
    const shares = computeEqualSplit(100, ['p3', 'p1', 'p2'])
    expect(shares).toEqual([
      { personId: 'p3', amount: 34 },
      { personId: 'p1', amount: 33 },
      { personId: 'p2', amount: 33 },
    ])
  })
})

// Deterministic integer-rupee distribution: `base = floor(|amount| / n)`, and
// one extra rupee goes to each of the first `remainder` entries, in the order
// given. Handles negative amounts (used by person-removal redistribution) by
// distributing the magnitude and re-applying the sign, so -600 over 3 people
// is [-200, -200, -200], not a mix of signs.
export function distributeEqually(amount: number, count: number): number[] {
  if (count <= 0) {
    throw new Error('distributeEqually requires at least one recipient.')
  }

  const sign = amount < 0 ? -1 : 1
  const magnitude = Math.abs(amount)
  const base = Math.floor(magnitude / count)
  const remainder = magnitude % count

  return Array.from({ length: count }, (_, index) => sign * (base + (index < remainder ? 1 : 0)))
}

export interface EqualSplitShare {
  personId: string
  amount: number
}

// Business_Logic_Algorithms.md §7: equal split in participant-selection order.
export function computeEqualSplit(
  amount: number,
  participantIdsInOrder: string[],
): EqualSplitShare[] {
  const amounts = distributeEqually(amount, participantIdsInOrder.length)
  return participantIdsInOrder.map((personId, index) => ({ personId, amount: amounts[index] }))
}

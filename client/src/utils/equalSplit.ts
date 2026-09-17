// Mirrors server/src/business/split.ts exactly (Business_Logic_Algorithms.md
// §7): integer division, remainder to the first N participants in
// selection order. Used here only for the live UX preview — the backend
// independently validates and remains authoritative; this never bypasses
// that.
export function distributeEqually(amount: number, count: number): number[] {
  if (count <= 0) return []
  const sign = amount < 0 ? -1 : 1
  const magnitude = Math.abs(amount)
  const base = Math.floor(magnitude / count)
  const remainder = magnitude % count
  return Array.from({ length: count }, (_, index) => sign * (base + (index < remainder ? 1 : 0)))
}

export function computeEqualSplit(
  amount: number,
  participantIdsInOrder: string[],
): { personId: string; amount: number }[] {
  const amounts = distributeEqually(amount, participantIdsInOrder.length)
  return participantIdsInOrder.map((personId, index) => ({ personId, amount: amounts[index] }))
}

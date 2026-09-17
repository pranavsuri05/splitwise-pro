// The UI's month filter (e.g. "2026-09") is converted here into the API's
// documented from/to ISO range — there is no backend month-specific
// endpoint, and there shouldn't be one.
export function monthToRange(month: string | undefined): { from?: string; to?: string } {
  if (!month) return {}

  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return {}

  const from = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0)
  const to = new Date(year, monthNumber, 0, 23, 59, 59, 999)

  return { from: from.toISOString(), to: to.toISOString() }
}

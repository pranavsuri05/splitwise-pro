const inrFormatter = new Intl.NumberFormat('en-IN')

export function formatRupees(amount: number): string {
  return `₹${inrFormatter.format(Math.abs(amount))}`
}

export function formatSignedRupees(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${sign}₹${inrFormatter.format(Math.abs(amount))}`
}

export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  const datePart = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${datePart} · ${timePart}`
}

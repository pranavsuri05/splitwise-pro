import type { BalanceEntry } from '../api/types.js'
import { formatSignedRupees } from '../utils/format.js'
import { EmptyState } from './EmptyState.js'

export function BalanceList({ balances }: { balances: BalanceEntry[] }) {
  if (balances.length === 0) {
    return (
      <EmptyState title="No people yet" body="Add people in Settings to start tracking balances." />
    )
  }

  return (
    <div className="card">
      {balances.map((entry) => (
        <BalanceRow key={entry.person_id} entry={entry} />
      ))}
    </div>
  )
}

function BalanceRow({ entry }: { entry: BalanceEntry }) {
  const sign = entry.balance > 0 ? 'amount--positive' : entry.balance < 0 ? 'amount--negative' : ''
  return (
    <div className="list-row list-row--static">
      <span className="list-row__title">{entry.person_name}</span>
      <span className={`amount ${sign}`}>{formatSignedRupees(entry.balance)}</span>
    </div>
  )
}

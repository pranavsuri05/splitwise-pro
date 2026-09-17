import type { Expense } from '../api/types.js'
import { categoryIcon } from '../utils/categoryIcon.js'
import { formatDateTime, formatRupees } from '../utils/format.js'
import { EmptyState } from './EmptyState.js'

interface TransactionListProps {
  expenses: Expense[]
  emptyTitle?: string
  emptyBody?: string
  onSelect: (expenseId: string) => void
}

export function TransactionList({
  expenses,
  emptyTitle = 'No expenses yet',
  emptyBody = 'Add your first expense.',
  onSelect,
}: TransactionListProps) {
  if (expenses.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />
  }

  return (
    <div className="card">
      {expenses.map((expense) => (
        <TransactionRow key={expense.id} expense={expense} onClick={() => onSelect(expense.id)} />
      ))}
    </div>
  )
}

function TransactionRow({ expense, onClick }: { expense: Expense; onClick: () => void }) {
  const icon = categoryIcon(expense.category?.name)
  return (
    <button type="button" className="list-row" onClick={onClick}>
      <div className="list-row__main">
        <div className="list-row__title">
          {icon && <span aria-hidden="true">{icon} </span>}
          {expense.description}
        </div>
        <div className="list-row__subtitle">
          {expense.paid_by.name}
          {expense.category ? ` · ${expense.category.name}` : ''}
        </div>
        <div className="list-row__subtitle">{formatDateTime(expense.created_at)}</div>
      </div>
      <span className="amount">{formatRupees(expense.amount)}</span>
    </button>
  )
}

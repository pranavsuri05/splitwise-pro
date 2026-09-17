import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminPasswordSheet } from '../components/AdminPasswordSheet.js'
import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { ErrorState } from '../components/ErrorState.js'
import { ExpenseForm, type ExpenseFormValues } from '../components/ExpenseForm.js'
import { LoadingState } from '../components/LoadingState.js'
import { useCurrentGroup } from '../context/GroupContext.js'
import { useCategoriesQuery } from '../hooks/useCategories.js'
import {
  useDeleteExpenseMutation,
  useExpenseQuery,
  useUpdateExpenseMutation,
} from '../hooks/useExpenses.js'
import { usePeopleQuery } from '../hooks/usePeople.js'
import type { CreateExpenseInput, Expense } from '../api/types.js'
import { formatDateTime, formatRupees } from '../utils/format.js'
import { categoryIcon } from '../utils/categoryIcon.js'

function expenseToFormValues(expense: Expense): ExpenseFormValues {
  return {
    description: expense.description,
    amount: expense.amount,
    paidBy: expense.paid_by.id,
    participantIds: expense.shares.map((s) => s.person_id),
    shares: Object.fromEntries(expense.shares.map((s) => [s.person_id, s.amount])),
    categoryId: expense.category?.id ?? null,
  }
}

type Mode = 'view' | 'edit'
type Overlay = 'none' | 'confirmDelete' | 'deletePassword' | 'editPassword'

export function ExpenseDetailScreen() {
  const navigate = useNavigate()
  const { expenseId } = useParams<{ expenseId: string }>()
  const { currentGroupId } = useCurrentGroup()
  const groupId = currentGroupId as string

  const expenseQuery = useExpenseQuery(groupId, expenseId ?? null)
  const peopleQuery = usePeopleQuery(groupId, true)
  const categoriesQuery = useCategoriesQuery(groupId)
  const updateMutation = useUpdateExpenseMutation(groupId, expenseId ?? '')
  const deleteMutation = useDeleteExpenseMutation(groupId, expenseId ?? '')

  const [mode, setMode] = useState<Mode>('view')
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [pendingUpdate, setPendingUpdate] = useState<CreateExpenseInput | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  if (expenseQuery.isLoading || peopleQuery.isLoading || categoriesQuery.isLoading) {
    return <LoadingState label="Loading expense…" />
  }
  if (expenseQuery.isError) {
    return <ErrorState error={expenseQuery.error} onRetry={() => expenseQuery.refetch()} />
  }
  if (!expenseQuery.data) {
    return <ErrorState error={new Error('Expense not found.')} />
  }

  const expense = expenseQuery.data

  return (
    <div className="screen">
      <header className="screen__header">
        <button
          type="button"
          className="icon-button"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <span aria-hidden="true">←</span>
        </button>
        <span className="screen__title">{mode === 'edit' ? 'Edit Expense' : 'Expense'}</span>
        <button
          type="button"
          className="icon-button"
          onClick={() => (mode === 'edit' ? setMode('view') : navigate(-1))}
          aria-label={mode === 'edit' ? 'Cancel edit' : 'Close'}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <div className="screen__body">
        {mode === 'view' ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px' }}>
              {expense.description}
            </h1>
            <p style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
              {formatRupees(expense.amount)}
            </p>

            <div className="section">
              <h2 className="section__title">Paid by</h2>
              <p>{expense.paid_by.name}</p>
            </div>

            <div className="section">
              <h2 className="section__title">Split between</h2>
              <div className="card">
                {expense.shares.map((share) => (
                  <div className="list-row list-row--static" key={share.person_id}>
                    <span className="list-row__title">{share.person_name}</span>
                    <span className="amount">{formatRupees(share.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h2 className="section__title">Category</h2>
              <p>
                {expense.category ? (
                  <>
                    {categoryIcon(expense.category.name)} {expense.category.name}
                  </>
                ) : (
                  'Uncategorized'
                )}
              </p>
            </div>

            <div className="section">
              <h2 className="section__title">Recorded</h2>
              <p>{formatDateTime(expense.created_at)}</p>
            </div>

            <div className="section" style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setMode('edit')}
              >
                Edit
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => setOverlay('confirmDelete')}
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <ExpenseForm
            people={peopleQuery.data ?? []}
            categories={categoriesQuery.data ?? []}
            initialValues={expenseToFormValues(expense)}
            submitLabel="Save Changes"
            isSubmitting={updateMutation.isPending}
            submitError={editError}
            onSubmit={(input) => {
              setEditError(null)
              setPendingUpdate(input)
              setOverlay('editPassword')
            }}
          />
        )}
      </div>

      {overlay === 'confirmDelete' && (
        <ConfirmDialog
          title="Delete Expense?"
          body="This expense will be permanently removed."
          confirmLabel="Delete"
          destructive
          onConfirm={() => setOverlay('deletePassword')}
          onCancel={() => setOverlay('none')}
        />
      )}

      {overlay === 'deletePassword' && (
        <AdminPasswordSheet
          title="Admin Password"
          confirmLabel="Delete"
          onConfirm={async (password) => {
            await deleteMutation.mutateAsync(password)
            navigate('/')
          }}
          onCancel={() => setOverlay('none')}
        />
      )}

      {overlay === 'editPassword' && pendingUpdate && (
        <AdminPasswordSheet
          title="Admin Password"
          confirmLabel="Save Changes"
          onConfirm={async (password) => {
            await updateMutation.mutateAsync({ input: pendingUpdate, adminPassword: password })
            setOverlay('none')
            setMode('view')
          }}
          onCancel={() => setOverlay('none')}
        />
      )}
    </div>
  )
}

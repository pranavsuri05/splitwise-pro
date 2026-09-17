import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { emptyExpenseFormValues, ExpenseForm } from '../components/ExpenseForm.js'
import { ErrorState } from '../components/ErrorState.js'
import { LoadingState } from '../components/LoadingState.js'
import { useCurrentGroup } from '../context/GroupContext.js'
import { useCategoriesQuery } from '../hooks/useCategories.js'
import { useCreateExpenseMutation } from '../hooks/useExpenses.js'
import { usePeopleQuery } from '../hooks/usePeople.js'
import { getErrorMessage } from '../utils/errors.js'

export function AddExpenseScreen() {
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const groupId = currentGroupId as string
  const peopleQuery = usePeopleQuery(groupId)
  const categoriesQuery = useCategoriesQuery(groupId)
  const createExpenseMutation = useCreateExpenseMutation(groupId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (peopleQuery.isLoading || categoriesQuery.isLoading) {
    return <LoadingState label="Loading…" />
  }
  if (peopleQuery.isError) {
    return <ErrorState error={peopleQuery.error} onRetry={() => peopleQuery.refetch()} />
  }
  if (categoriesQuery.isError) {
    return <ErrorState error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} />
  }

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
        <span className="screen__title">Add Expense</span>
        <button
          type="button"
          className="icon-button"
          onClick={() => navigate(-1)}
          aria-label="Cancel"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <div className="screen__body">
        <ExpenseForm
          people={peopleQuery.data ?? []}
          categories={categoriesQuery.data ?? []}
          initialValues={emptyExpenseFormValues()}
          submitLabel="Add Expense"
          isSubmitting={createExpenseMutation.isPending}
          submitError={submitError}
          onSubmit={(input) => {
            setSubmitError(null)
            createExpenseMutation.mutate(input, {
              onSuccess: () => navigate('/'),
              onError: (error) => setSubmitError(getErrorMessage(error)),
            })
          }}
        />
      </div>
    </div>
  )
}

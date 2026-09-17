import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../components/BottomSheet.js'
import { ErrorState } from '../components/ErrorState.js'
import { LoadingState } from '../components/LoadingState.js'
import { useCurrentGroup } from '../context/GroupContext.js'
import {
  useAddCategoryMutation,
  useCategoriesQuery,
  useDeleteCategoryMutation,
} from '../hooks/useCategories.js'
import { categoryIcon } from '../utils/categoryIcon.js'
import { getErrorMessage } from '../utils/errors.js'

export function CategoriesScreen() {
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const groupId = currentGroupId as string
  const categoriesQuery = useCategoriesQuery(groupId)
  const addCategoryMutation = useAddCategoryMutation(groupId)
  const deleteCategoryMutation = useDeleteCategoryMutation(groupId)

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (categoriesQuery.isLoading) return <LoadingState />
  if (categoriesQuery.isError) {
    return <ErrorState error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} />
  }

  const categories = categoriesQuery.data ?? []

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
        <span className="screen__title">Categories</span>
        <span className="icon-button" aria-hidden="true" />
      </header>

      <div className="screen__body">
        <div className="card" style={{ marginTop: 'var(--space-2)' }}>
          {categories.length === 0 ? (
            <div className="list-row list-row--static">
              <span className="list-row__subtitle">No categories yet.</span>
            </div>
          ) : (
            categories.map((category) => (
              <div className="list-row" key={category.id}>
                <span className="list-row__title">
                  {categoryIcon(category.name)} {category.name}
                </span>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Remove ${category.name}`}
                  onClick={() => deleteCategoryMutation.mutate(category.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="text-button"
          style={{ marginTop: 'var(--space-4)' }}
          onClick={() => {
            setNewName('')
            setError(null)
            setShowAdd(true)
          }}
        >
          + Add Category
        </button>
      </div>

      {showAdd && (
        <BottomSheet title="Add Category" onClose={() => setShowAdd(false)}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-category-name">
              Name
            </label>
            <input
              id="new-category-name"
              className="form-input"
              autoFocus
              maxLength={50}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="sheet__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={addCategoryMutation.isPending}
              onClick={async () => {
                const trimmed = newName.trim()
                if (!trimmed) {
                  setError('Name is required.')
                  return
                }
                try {
                  await addCategoryMutation.mutateAsync(trimmed)
                  setShowAdd(false)
                } catch (err) {
                  setError(getErrorMessage(err))
                }
              }}
            >
              Add
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

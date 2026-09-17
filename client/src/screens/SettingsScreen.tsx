import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPasswordSheet } from '../components/AdminPasswordSheet.js'
import { BottomSheet } from '../components/BottomSheet.js'
import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { ErrorState } from '../components/ErrorState.js'
import { LoadingState } from '../components/LoadingState.js'
import { useCurrentGroup } from '../context/GroupContext.js'
import { useClearAllExpensesMutation } from '../hooks/useExpenses.js'
import {
  useDeleteGroupMutation,
  useGroupQuery,
  useRenameGroupMutation,
} from '../hooks/useGroups.js'
import { getErrorMessage } from '../utils/errors.js'

type Overlay =
  | 'none'
  | 'rename'
  | 'confirmClear'
  | 'clearPassword'
  | 'confirmDeleteGroup'
  | 'deleteGroupPassword'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { currentGroupId, setCurrentGroupId } = useCurrentGroup()
  const groupId = currentGroupId as string
  const groupQuery = useGroupQuery(groupId)
  const renameMutation = useRenameGroupMutation(groupId)
  const clearMutation = useClearAllExpensesMutation(groupId)
  const deleteGroupMutation = useDeleteGroupMutation(groupId)

  const [overlay, setOverlay] = useState<Overlay>('none')
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  if (groupQuery.isLoading) return <LoadingState />
  if (groupQuery.isError) {
    return <ErrorState error={groupQuery.error} onRetry={() => groupQuery.refetch()} />
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
        <span className="screen__title">Settings</span>
        <span className="icon-button" aria-hidden="true" />
      </header>

      <div className="screen__body">
        <div className="section" style={{ marginTop: 'var(--space-2)' }}>
          <h2 className="section__title">Group</h2>
          <div className="card">
            <button
              type="button"
              className="list-row"
              onClick={() => {
                setRenameValue(groupQuery.data?.name ?? '')
                setRenameError(null)
                setOverlay('rename')
              }}
            >
              <div className="list-row__main">
                <div className="list-row__subtitle">Group Name</div>
                <div className="list-row__title">{groupQuery.data?.name}</div>
              </div>
              <span className="list-row__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
        </div>

        <div className="section">
          <h2 className="section__title">People</h2>
          <div className="card">
            <button type="button" className="list-row" onClick={() => navigate('/settings/people')}>
              <span className="list-row__title">People</span>
              <span className="list-row__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
        </div>

        <div className="section">
          <h2 className="section__title">Categories</h2>
          <div className="card">
            <button
              type="button"
              className="list-row"
              onClick={() => navigate('/settings/categories')}
            >
              <span className="list-row__title">Categories</span>
              <span className="list-row__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
        </div>

        <div className="section">
          <h2 className="section__title">Danger Zone</h2>
          <div className="danger-zone">
            <button type="button" className="list-row" onClick={() => setOverlay('confirmClear')}>
              <span className="list-row__title">Clear All Transactions</span>
            </button>
            <button
              type="button"
              className="list-row"
              onClick={() => setOverlay('confirmDeleteGroup')}
            >
              <span className="list-row__title">Delete Group</span>
            </button>
          </div>
        </div>
      </div>

      {overlay === 'rename' && (
        <BottomSheet title="Group Name" onClose={() => setOverlay('none')}>
          <div className="form-group">
            <label className="form-label" htmlFor="rename-group-input">
              Group Name
            </label>
            <input
              id="rename-group-input"
              className="form-input"
              autoFocus
              maxLength={100}
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
            {renameError && (
              <p className="form-error" role="alert">
                {renameError}
              </p>
            )}
          </div>
          <div className="sheet__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setOverlay('none')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={renameMutation.isPending}
              onClick={async () => {
                const trimmed = renameValue.trim()
                if (!trimmed) {
                  setRenameError('Group name is required.')
                  return
                }
                try {
                  await renameMutation.mutateAsync(trimmed)
                  setOverlay('none')
                } catch (err) {
                  setRenameError(getErrorMessage(err))
                }
              }}
            >
              Save
            </button>
          </div>
        </BottomSheet>
      )}

      {overlay === 'confirmClear' && (
        <ConfirmDialog
          title="Clear all transactions?"
          body="This will remove the group's expense records and the associated transaction history. Settlement history is preserved."
          confirmLabel="Clear All"
          destructive
          onConfirm={() => setOverlay('clearPassword')}
          onCancel={() => setOverlay('none')}
        />
      )}

      {overlay === 'clearPassword' && (
        <AdminPasswordSheet
          confirmLabel="Clear All"
          onConfirm={async (password) => {
            await clearMutation.mutateAsync(password)
            setOverlay('none')
          }}
          onCancel={() => setOverlay('none')}
        />
      )}

      {overlay === 'confirmDeleteGroup' && (
        <ConfirmDialog
          title="Delete Group?"
          body="This permanently deletes the group, its expenses, people, categories, and settlement history."
          confirmLabel="Delete Group"
          destructive
          onConfirm={() => setOverlay('deleteGroupPassword')}
          onCancel={() => setOverlay('none')}
        />
      )}

      {overlay === 'deleteGroupPassword' && (
        <AdminPasswordSheet
          confirmLabel="Delete Group"
          onConfirm={async (password) => {
            await deleteGroupMutation.mutateAsync(password)
            setCurrentGroupId(null)
            setOverlay('none')
            navigate('/')
          }}
          onCancel={() => setOverlay('none')}
        />
      )}
    </div>
  )
}

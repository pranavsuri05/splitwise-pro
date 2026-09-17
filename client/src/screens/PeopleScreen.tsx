import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPasswordSheet } from '../components/AdminPasswordSheet.js'
import { BottomSheet } from '../components/BottomSheet.js'
import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { ErrorState } from '../components/ErrorState.js'
import { LoadingState } from '../components/LoadingState.js'
import { useCurrentGroup } from '../context/GroupContext.js'
import {
  useAddPersonMutation,
  usePeopleQuery,
  useRemovePersonMutation,
} from '../hooks/usePeople.js'
import type { Person } from '../api/types.js'
import { getErrorMessage } from '../utils/errors.js'

type Overlay = 'none' | 'addPerson' | 'confirmRemove' | 'removePassword'

export function PeopleScreen() {
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const groupId = currentGroupId as string
  const peopleQuery = usePeopleQuery(groupId, true)
  const addPersonMutation = useAddPersonMutation(groupId)
  const removePersonMutation = useRemovePersonMutation(groupId)

  const [overlay, setOverlay] = useState<Overlay>('none')
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [targetPerson, setTargetPerson] = useState<Person | null>(null)

  if (peopleQuery.isLoading) return <LoadingState />
  if (peopleQuery.isError) {
    return <ErrorState error={peopleQuery.error} onRetry={() => peopleQuery.refetch()} />
  }

  const people = peopleQuery.data ?? []
  const active = people.filter((p) => p.is_active)
  const inactive = people.filter((p) => !p.is_active)

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
        <span className="screen__title">People</span>
        <span className="icon-button" aria-hidden="true" />
      </header>

      <div className="screen__body">
        <div className="card" style={{ marginTop: 'var(--space-2)' }}>
          {active.length === 0 ? (
            <div className="list-row list-row--static">
              <span className="list-row__subtitle">No people yet.</span>
            </div>
          ) : (
            active.map((person) => (
              <button
                key={person.id}
                type="button"
                className="list-row"
                onClick={() => {
                  setTargetPerson(person)
                  setOverlay('confirmRemove')
                }}
              >
                <span className="list-row__title">{person.name}</span>
              </button>
            ))
          )}
        </div>

        {inactive.length > 0 && (
          <div className="section">
            <h2 className="section__title">Inactive</h2>
            <div className="card">
              {inactive.map((person) => (
                <div
                  className="list-row list-row--static"
                  key={person.id}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <span className="list-row__title">{person.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="text-button"
          style={{ marginTop: 'var(--space-4)' }}
          onClick={() => {
            setNewName('')
            setAddError(null)
            setOverlay('addPerson')
          }}
        >
          + Add Person
        </button>
      </div>

      {overlay === 'addPerson' && (
        <BottomSheet title="Add Person" onClose={() => setOverlay('none')}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-person-name">
              Name
            </label>
            <input
              id="new-person-name"
              className="form-input"
              autoFocus
              maxLength={100}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            {addError && (
              <p className="form-error" role="alert">
                {addError}
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
              disabled={addPersonMutation.isPending}
              onClick={async () => {
                const trimmed = newName.trim()
                if (!trimmed) {
                  setAddError('Name is required.')
                  return
                }
                try {
                  await addPersonMutation.mutateAsync(trimmed)
                  setOverlay('none')
                } catch (err) {
                  setAddError(getErrorMessage(err))
                }
              }}
            >
              Add
            </button>
          </div>
        </BottomSheet>
      )}

      {overlay === 'confirmRemove' && targetPerson && (
        <ConfirmDialog
          title={`Remove ${targetPerson.name}?`}
          body={`${targetPerson.name} will no longer be available for new expenses. Historical records will remain.`}
          confirmLabel="Remove"
          destructive
          onConfirm={() => setOverlay('removePassword')}
          onCancel={() => setOverlay('none')}
        />
      )}

      {overlay === 'removePassword' && targetPerson && (
        <AdminPasswordSheet
          confirmLabel="Remove"
          onConfirm={async (password) => {
            await removePersonMutation.mutateAsync({
              personId: targetPerson.id,
              adminPassword: password,
            })
            setOverlay('none')
            setTargetPerson(null)
          }}
          onCancel={() => setOverlay('none')}
        />
      )}
    </div>
  )
}

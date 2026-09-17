import { useState } from 'react'
import { getErrorMessage } from '../utils/errors.js'
import { BottomSheet } from './BottomSheet.js'

const GROUP_NAME_MAX_LENGTH = 100

interface CreateGroupSheetProps {
  onCreate: (name: string) => Promise<void>
  onCancel: () => void
}

export function CreateGroupSheet({ onCreate, onCancel }: CreateGroupSheetProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Group name is required.')
      return
    }
    if (trimmed.length > GROUP_NAME_MAX_LENGTH) {
      setError(`Group name must be at most ${GROUP_NAME_MAX_LENGTH} characters.`)
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onCreate(trimmed)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BottomSheet title="Create New Group" onClose={onCancel}>
      <div className="form-group">
        <label className="form-label" htmlFor="new-group-name">
          Group Name
        </label>
        <input
          id="new-group-name"
          className="form-input"
          autoFocus
          value={name}
          maxLength={GROUP_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleCreate()
          }}
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
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={handleCreate}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating…' : 'Create'}
        </button>
      </div>
    </BottomSheet>
  )
}

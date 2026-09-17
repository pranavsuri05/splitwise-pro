import { useEffect, useState, type ReactNode } from 'react'
import { getErrorMessage } from '../utils/errors.js'
import { BottomSheet } from './BottomSheet.js'

interface AdminPasswordSheetProps {
  title?: string
  description?: ReactNode
  confirmLabel?: string
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
}

// UI_UX_Specification.md §38: one consistent admin-password component used
// throughout the app. The password lives only in this component's local
// state — never localStorage, never the URL, never logged — and is cleared
// on cancel, success, and unmount.
export function AdminPasswordSheet({
  title = 'Admin Password',
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: AdminPasswordSheetProps) {
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => setPassword('')
  }, [])

  function handleCancel() {
    setPassword('')
    onCancel()
  }

  async function handleConfirm() {
    if (!password || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(password)
      setPassword('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BottomSheet title={title} onClose={handleCancel}>
      {description}
      <div className="form-group">
        <label className="form-label" htmlFor="admin-password-input">
          Admin Password
        </label>
        <input
          id="admin-password-input"
          type="password"
          inputMode="text"
          autoComplete="off"
          autoFocus
          className="form-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleConfirm()
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
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={handleConfirm}
          disabled={isSubmitting || password.length === 0}
        >
          {isSubmitting ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </BottomSheet>
  )
}

import { getErrorMessage } from '../utils/errors.js'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="state-block" role="alert">
      <p className="state-block__title">Something went wrong</p>
      <p className="state-block__body">{getErrorMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          className="button button--secondary"
          onClick={onRetry}
          style={{ width: 'auto' }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

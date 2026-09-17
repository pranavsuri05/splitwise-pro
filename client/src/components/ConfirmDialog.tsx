import type { ReactNode } from 'react'
import { BottomSheet } from './BottomSheet.js'

interface ConfirmDialogProps {
  title: string
  body?: ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <BottomSheet title={title} onClose={onCancel}>
      {body && (
        <p className="state-block__body" style={{ textAlign: 'center', margin: '0 auto 8px' }}>
          {body}
        </p>
      )}
      <div className="sheet__actions">
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`button ${destructive ? 'button--danger' : 'button--primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  )
}

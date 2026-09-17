import { useEffect, useRef, type ReactNode } from 'react'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Don't steal focus from a child that already auto-focused itself
    // (e.g. a form input) — only fall back to the sheet container when
    // nothing inside it took focus on its own.
    if (!sheetRef.current?.contains(document.activeElement)) {
      sheetRef.current?.focus()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="sheet-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={sheetRef}
        tabIndex={-1}
      >
        <p className="sheet__title">{title}</p>
        {children}
      </div>
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <p className="state-block__body">{label}</p>
    </div>
  )
}

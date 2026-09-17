export function FloatingAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="floating-add-button"
      onClick={onClick}
      aria-label="Add expense"
    >
      <span aria-hidden="true">+</span>
    </button>
  )
}

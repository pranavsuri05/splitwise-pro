interface TopHeaderProps {
  groupName: string
  onOpenSettings: () => void
  onOpenGroupSelector: () => void
  onOpenSettlement: () => void
}

// PRD.md §4 / UI_UX_Specification.md §12.1: ⚙️  Group ▾  ✓
export function TopHeader({
  groupName,
  onOpenSettings,
  onOpenGroupSelector,
  onOpenSettlement,
}: TopHeaderProps) {
  return (
    <header className="screen__header">
      <button
        type="button"
        className="icon-button"
        onClick={onOpenSettings}
        aria-label="Group settings"
      >
        <span aria-hidden="true">⚙️</span>
      </button>
      <button
        type="button"
        className="screen__title"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={onOpenGroupSelector}
      >
        {groupName} <span aria-hidden="true">▾</span>
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={onOpenSettlement}
        aria-label="Settlement"
      >
        <span aria-hidden="true">✓</span>
      </button>
    </header>
  )
}

import type { Group } from '../api/types.js'
import { BottomSheet } from './BottomSheet.js'

interface GroupSelectorSheetProps {
  groups: Group[]
  currentGroupId: string | null
  onSelect: (groupId: string) => void
  onCreateNew: () => void
  onClose: () => void
}

// UI_UX_Specification.md §14: Select Group bottom sheet.
export function GroupSelectorSheet({
  groups,
  currentGroupId,
  onSelect,
  onCreateNew,
  onClose,
}: GroupSelectorSheetProps) {
  return (
    <BottomSheet title="Select Group" onClose={onClose}>
      <div className="card">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className="list-row"
            onClick={() => onSelect(group.id)}
          >
            <span className="list-row__title">{group.name}</span>
            {group.id === currentGroupId && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="text-button"
        onClick={onCreateNew}
        style={{ marginTop: 'var(--space-4)', width: '100%' }}
      >
        + Create New Group
      </button>
    </BottomSheet>
  )
}

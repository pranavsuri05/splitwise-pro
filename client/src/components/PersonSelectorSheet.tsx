import type { Person } from '../api/types.js'
import { BottomSheet } from './BottomSheet.js'

interface PersonSelectorSheetProps {
  title?: string
  people: Person[]
  selectedId?: string
  onSelect: (personId: string) => void
  onClose: () => void
}

// UI_UX_Specification.md §20: "Paid by" bottom sheet — only active people.
export function PersonSelectorSheet({
  title = 'Paid by',
  people,
  selectedId,
  onSelect,
  onClose,
}: PersonSelectorSheetProps) {
  return (
    <BottomSheet title={title} onClose={onClose}>
      <div className="card">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            className="list-row"
            onClick={() => onSelect(person.id)}
          >
            <span className="list-row__title">{person.name}</span>
            {person.id === selectedId && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

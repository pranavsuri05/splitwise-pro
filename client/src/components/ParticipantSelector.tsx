import type { Person } from '../api/types.js'

interface ParticipantSelectorProps {
  people: Person[]
  selectedIds: string[]
  onToggle: (personId: string) => void
}

// UI_UX_Specification.md §21: at least one participant required; the payer
// does not have to be included. Only active people can be newly selected —
// Business_Logic_Algorithms.md §23 says a removed person cannot be used in
// new expense activity. A participant who was already part of this expense
// before being removed stays visible and clearly labelled so historical
// data is preserved, but is locked (checked + disabled) rather than
// removable/replaceable through normal selection.
export function ParticipantSelector({ people, selectedIds, onToggle }: ParticipantSelectorProps) {
  const selectable = people.filter((person) => person.is_active)
  const lockedInactive = people.filter(
    (person) => !person.is_active && selectedIds.includes(person.id),
  )

  return (
    <div>
      {selectable.map((person) => (
        <label key={person.id} className="checkbox-row">
          <input
            type="checkbox"
            checked={selectedIds.includes(person.id)}
            onChange={() => onToggle(person.id)}
          />
          <span>{person.name}</span>
        </label>
      ))}
      {lockedInactive.map((person) => (
        <label key={person.id} className="checkbox-row checkbox-row--locked">
          <input type="checkbox" checked disabled readOnly />
          <span>{person.name} (inactive)</span>
        </label>
      ))}
    </div>
  )
}

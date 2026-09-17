import type { Category } from '../api/types.js'
import { categoryIcon } from '../utils/categoryIcon.js'
import { BottomSheet } from './BottomSheet.js'

interface CategorySelectorSheetProps {
  categories: Category[]
  selectedId?: string | null
  onSelect: (categoryId: string | null) => void
  onClose: () => void
}

// UI_UX_Specification.md §23: Category bottom sheet, with a "None" option.
export function CategorySelectorSheet({
  categories,
  selectedId,
  onSelect,
  onClose,
}: CategorySelectorSheetProps) {
  return (
    <BottomSheet title="Category" onClose={onClose}>
      <div className="card">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className="list-row"
            onClick={() => onSelect(category.id)}
          >
            <span className="list-row__title">
              {categoryIcon(category.name)} {category.name}
            </span>
            {category.id === selectedId && <span aria-hidden="true">✓</span>}
          </button>
        ))}
        <button type="button" className="list-row" onClick={() => onSelect(null)}>
          <span className="list-row__title">None</span>
          {!selectedId && <span aria-hidden="true">✓</span>}
        </button>
      </div>
    </BottomSheet>
  )
}

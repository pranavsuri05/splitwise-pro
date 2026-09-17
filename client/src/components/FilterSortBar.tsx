import type { Category, ExpenseSort, Person } from '../api/types.js'

export interface HomeFilterState {
  categoryId?: string
  personId?: string
  month?: string
  sort: ExpenseSort
}

interface FilterSortBarProps {
  categories: Category[]
  people: Person[]
  filters: HomeFilterState
  onChange: (patch: Partial<HomeFilterState>) => void
}

export function FilterSortBar({ categories, people, filters, onChange }: FilterSortBarProps) {
  return (
    <div className="filter-bar">
      <select
        className={`filter-chip ${filters.categoryId ? 'filter-chip--active' : ''}`}
        aria-label="Filter by category"
        value={filters.categoryId ?? ''}
        onChange={(event) => onChange({ categoryId: event.target.value || undefined })}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <select
        className={`filter-chip ${filters.personId ? 'filter-chip--active' : ''}`}
        aria-label="Filter by person"
        value={filters.personId ?? ''}
        onChange={(event) => onChange({ personId: event.target.value || undefined })}
      >
        <option value="">All people</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>

      <input
        type="month"
        className={`filter-chip ${filters.month ? 'filter-chip--active' : ''}`}
        aria-label="Filter by month"
        value={filters.month ?? ''}
        onChange={(event) => onChange({ month: event.target.value || undefined })}
      />

      <select
        className="filter-chip"
        aria-label="Sort transactions"
        value={filters.sort}
        onChange={(event) => onChange({ sort: event.target.value as ExpenseSort })}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="amount_desc">Highest amount</option>
        <option value="amount_asc">Lowest amount</option>
      </select>
    </div>
  )
}

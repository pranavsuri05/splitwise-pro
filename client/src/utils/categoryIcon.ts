// UI_UX_Specification.md §10 / §33: a small, consistent line-icon per
// category. Represented with simple emoji rather than a custom icon font,
// to keep the dependency footprint at zero.
const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍛',
  Travel: '🚕',
  Rent: '🏠',
  Shopping: '🛍',
  Entertainment: '🎬',
  Utilities: '💡',
  Other: '•••',
}

export function categoryIcon(name: string | null | undefined): string {
  if (!name) return ''
  return CATEGORY_ICONS[name] ?? '📁'
}

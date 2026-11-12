/** Turns a stored value such as 'under_1_year' into 'Under 1 year'. */
export function formatLabel(value: string | null) {
  if (!value) return null
  const words = value.replaceAll('_', ' ')
  return words[0].toUpperCase() + words.slice(1)
}

/** Formats a 0 to 1 rate as a whole percentage, such as '82%'. */
export function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`
}

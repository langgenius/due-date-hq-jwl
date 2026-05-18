export type SeverityTone = 'critical' | 'high' | 'medium' | 'neutral'

// 2px left accent bar keyed to severity — replaces the full-row tint so a
// queue of mostly-critical rows doesn't read as a wall of red. Inset
// box-shadow avoids the 2px content shift that border-l would cause.
const tonedRowClass: Record<Exclude<SeverityTone, 'neutral'>, string> = {
  critical: 'shadow-[inset_2px_0_0_var(--color-severity-critical)]',
  high: 'shadow-[inset_2px_0_0_var(--color-severity-high)]',
  medium: 'shadow-[inset_2px_0_0_var(--color-severity-medium)]',
}

export function severityRowClass(tone: SeverityTone): string {
  return tone === 'neutral' ? '' : tonedRowClass[tone]
}

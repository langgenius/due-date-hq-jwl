import { useMemo } from 'react'
import { SearchIcon } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `JurisdictionRail` — the left master pane of the Rule Library
 * (2026-06-04, Yuqi rule-library master–detail pivot, Pencil `HR6mK`).
 *
 * Renders a searchable jurisdiction list: an "All jurisdictions" entry,
 * a pinned Federal entry, then the states A–Z. Each row carries its rule
 * count and a quiet amber "needs review" dot when the jurisdiction has
 * pending-review rules. The selected jurisdiction drives the flat rule
 * table in the right pane.
 *
 * Style follows the app's design-system tokens (not the Pencil's raw
 * hex / Geist): selected = accent-tinted bg + 2px accent left rail +
 * semibold, matching the "respect the Today-page style" brief.
 *
 * Decoupled from the route's private `JurisdictionGroup` type on
 * purpose — it takes a plain `RailJurisdiction[]` the route maps from
 * its already-computed `groupsAll`, so this feature component never
 * imports back from the route module (which would be circular).
 */
export type RailJurisdiction = {
  /** Jurisdiction key — also the 2-letter code shown in the badge ('FED', 'CA', …). */
  jurisdiction: string
  label: string
  ruleCount: number
  /** Rules in this jurisdiction awaiting CPA review — drives the amber dot. */
  reviewCount: number
}

export function JurisdictionRail({
  items,
  totalRuleCount,
  selected,
  onSelect,
  search,
  onSearchChange,
  className,
}: {
  items: readonly RailJurisdiction[]
  totalRuleCount: number
  /** Selected jurisdiction key, or `null` for "All jurisdictions". */
  selected: string | null
  onSelect: (jurisdiction: string | null) => void
  search: string
  onSearchChange: (next: string) => void
  className?: string
}) {
  const { t } = useLingui()
  const query = search.trim().toLowerCase()

  const federal = useMemo(() => items.find((it) => it.jurisdiction === 'FED') ?? null, [items])
  const states = useMemo(
    () =>
      items
        .filter((it) => it.jurisdiction !== 'FED')
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [items],
  )

  const matches = (it: RailJurisdiction) =>
    !query ||
    it.label.toLowerCase().includes(query) ||
    it.jurisdiction.toLowerCase().includes(query)

  const federalVisible = federal && matches(federal) ? federal : null
  const visibleStates = states.filter(matches)
  const shownCount = (federalVisible ? 1 : 0) + visibleStates.length

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-divider-regular bg-background-default',
        className,
      )}
      aria-label={t`Jurisdictions`}
    >
      {/* Search header — pinned above the scrolling list. */}
      <div className="shrink-0 border-b border-divider-subtle p-3">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-divider-regular bg-background-default px-3 focus-within:border-accent-default focus-within:ring-2 focus-within:ring-state-accent-active-alt">
          <SearchIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t`Search jurisdiction…`}
            aria-label={t`Search jurisdiction`}
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Scrolling jurisdiction list. */}
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {/* All jurisdictions — overview entry, always first. */}
        {!query ? (
          <RailRow
            code={t`All`}
            label={t`All jurisdictions`}
            count={totalRuleCount}
            reviewCount={0}
            selected={selected === null}
            onSelect={() => onSelect(null)}
          />
        ) : null}

        {federalVisible ? (
          <>
            <RailSectionLabel>{t`Pinned`}</RailSectionLabel>
            <RailRow
              code="FED"
              label={federalVisible.label}
              count={federalVisible.ruleCount}
              reviewCount={federalVisible.reviewCount}
              selected={selected === 'FED'}
              onSelect={() => onSelect('FED')}
            />
          </>
        ) : null}

        {visibleStates.length > 0 ? (
          <>
            <RailSectionLabel withRule>{t`States · A–Z`}</RailSectionLabel>
            {visibleStates.map((it) => (
              <RailRow
                key={it.jurisdiction}
                code={it.jurisdiction}
                label={it.label}
                count={it.ruleCount}
                reviewCount={it.reviewCount}
                selected={selected === it.jurisdiction}
                onSelect={() => onSelect(it.jurisdiction)}
              />
            ))}
          </>
        ) : null}

        {query && shownCount === 0 ? (
          <p className="px-5 py-6 text-center text-xs text-text-tertiary">
            {t`No jurisdictions match "${search}"`}
          </p>
        ) : null}
      </div>

      {/* Footer — "Showing N of M". */}
      <div className="shrink-0 border-t border-divider-subtle px-5 py-2.5 text-center text-xs text-text-tertiary tabular-nums">
        {t`Showing ${shownCount} of ${items.length}`}
      </div>
    </aside>
  )
}

function RailSectionLabel({
  children,
  withRule = false,
}: {
  children: React.ReactNode
  withRule?: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-5 pt-4 pb-1.5">
      <span className="text-caption-xs font-semibold tracking-eyebrow text-text-muted uppercase">
        {children}
      </span>
      {withRule ? <span className="h-px flex-1 bg-divider-subtle" aria-hidden /> : null}
    </div>
  )
}

function RailRow({
  code,
  label,
  count,
  reviewCount,
  selected,
  onSelect,
}: {
  code: string
  label: string
  count: number
  reviewCount: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 border-l-2 px-[18px] py-2 text-left transition-colors',
        selected
          ? 'border-l-accent-default bg-state-accent-hover'
          : 'border-l-transparent hover:bg-state-base-hover',
      )}
    >
      {/* 2-letter jurisdiction badge. */}
      <span
        className={cn(
          'inline-flex h-[18px] min-w-[26px] shrink-0 items-center justify-center rounded px-1 text-[11px] font-semibold tabular-nums',
          selected
            ? 'bg-accent-default text-text-inverted'
            : code === 'FED'
              ? 'bg-text-primary text-text-inverted'
              : 'bg-background-subtle text-text-secondary',
        )}
        aria-hidden
      >
        {code}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          selected ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary',
        )}
      >
        {label}
      </span>
      {/* Quiet amber "needs review" dot — review pressure without shouting. */}
      {reviewCount > 0 ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-state-warning-solid"
          title={`${reviewCount} need review`}
          aria-label={`${reviewCount} rules need review`}
        />
      ) : null}
      <span className="shrink-0 text-xs text-text-tertiary tabular-nums">{count}</span>
    </button>
  )
}

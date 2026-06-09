import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  LandmarkIcon,
  LayoutDashboardIcon,
  ListFilterIcon,
  MapPinIcon,
  RssIcon,
  TimerIcon,
} from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'

import { SearchInput } from '@/components/primitives/search-input'
import { PulsingDot } from '@/features/alerts/components/PulsingDot'

/**
 * `JurisdictionRail` — the left master pane of the Rule Library
 * (2026-06-04, Yuqi rule-library master–detail pivot; restyled
 * 2026-06-07 to the canonical Pencil `O0pyRO` PH-SecondarySidebar).
 *
 * Renders a searchable jurisdiction list: an "Overview" entry (the All
 * jurisdictions surface), a pinned FEDERAL section, then the states A–Z
 * under a STATES section label. Each row carries a leading lucide icon
 * (layout-dashboard / landmark / map-pin), its rule count in a mono
 * count, and a quiet amber "needs review" dot when the jurisdiction has
 * pending-review rules. The selected jurisdiction drives the flat rule
 * table in the right pane.
 *
 * Style maps the Pencil's raw hex onto design-system tokens (per repo
 * rule — no new theme colors): the active Overview row reads accent
 * (bg-state-accent-hover + text-text-accent), a selected state reads as
 * a quiet gray fill (bg-background-subtle). Section labels + eyebrow use
 * the muted caption scale.
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
  sources,
  temporary,
  className,
}: {
  items: readonly RailJurisdiction[]
  totalRuleCount: number
  /** Selected jurisdiction key, or `null` for "All jurisdictions". */
  selected: string | null
  onSelect: (jurisdiction: string | null) => void
  search: string
  onSearchChange: (next: string) => void
  /**
   * Library-section nav rows (Pencil `O0pyRO` — Sources / Temporary
   * rules sit between Overview and the jurisdictions). Each links to its
   * standalone route. Omitted while their data is still loading.
   */
  sources?: { count: number; healthy: boolean } | undefined
  temporary?: { activeCount: number; obligationCount: number } | undefined
  className?: string
}) {
  const { t } = useLingui()
  const query = search.trim().toLowerCase()
  // Filter toggle (rail header funnel icon): when on, the list collapses
  // to only jurisdictions with rules still awaiting review.
  const [reviewOnly, setReviewOnly] = useState(false)

  const federal = useMemo(() => items.find((it) => it.jurisdiction === 'FED') ?? null, [items])
  const states = useMemo(
    () =>
      items
        .filter((it) => it.jurisdiction !== 'FED')
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [items],
  )

  const matches = (it: RailJurisdiction) =>
    (!query ||
      it.label.toLowerCase().includes(query) ||
      it.jurisdiction.toLowerCase().includes(query)) &&
    (!reviewOnly || it.reviewCount > 0)

  const federalVisible = federal && matches(federal) ? federal : null
  const visibleStates = states.filter(matches)
  const shownStateCount = visibleStates.length

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col overflow-hidden border-r border-divider-regular bg-background-default',
        className,
      )}
      aria-label={t`Jurisdictions`}
    >
      {/* Header — eyebrow + title row + search pill. Top padding matches
          the main panel's `pt-6 md:pt-8` so the rail eyebrow lines up with
          the page eyebrow instead of sitting jammed against the top. */}
      <div className="shrink-0 px-3.5 pt-6 md:pt-8">
        <div className="flex flex-col gap-2.5 pb-4">
          <span className="text-caption-xs font-semibold tracking-eyebrow text-text-tertiary uppercase">
            <Trans>Rule library</Trans>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-text-primary">
              <Trans>Jurisdictions</Trans>
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setReviewOnly((v) => !v)}
              aria-pressed={reviewOnly}
              title={
                reviewOnly ? t`Show all jurisdictions` : t`Show only jurisdictions needing review`
              }
              aria-label={
                reviewOnly ? t`Show all jurisdictions` : t`Show only jurisdictions needing review`
              }
              className={cn(
                'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                reviewOnly
                  ? 'bg-state-accent-hover text-text-accent'
                  : 'text-text-secondary hover:bg-state-base-hover',
              )}
            >
              <ListFilterIcon className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="pb-3">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={t`Search jurisdictions`}
            ariaLabel={t`Search jurisdictions`}
          />
        </div>
      </div>

      <div className="h-px shrink-0 bg-divider-subtle" aria-hidden />

      {/* Scrolling jurisdiction list. */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-0.5">
          {/* Overview — the All-jurisdictions surface, always first. */}
          {!query ? (
            <>
              <RailRow
                icon={LayoutDashboardIcon}
                label={t`Overview`}
                count={totalRuleCount}
                reviewCount={0}
                tone="overview"
                selected={selected === null}
                onSelect={() => onSelect(null)}
              />
              {sources ? (
                <RailNavRow
                  icon={RssIcon}
                  label={t`Sources`}
                  href="/rules/sources"
                  trailing={
                    <span className="flex shrink-0 items-center gap-1.5">
                      <PulsingDot
                        tone={sources.healthy ? 'success' : 'warning'}
                        active={false}
                        label={
                          sources.healthy ? t`All sources healthy` : t`Some sources need attention`
                        }
                      />
                      <span className="text-[11px] font-semibold text-text-muted tabular-nums">
                        {sources.count}
                      </span>
                    </span>
                  }
                />
              ) : null}
              {temporary && temporary.activeCount > 0 ? (
                <RailNavRow
                  icon={TimerIcon}
                  label={t`Temporary rules`}
                  href="/rules/temporary"
                  inlineMeta={
                    <span className="shrink-0 text-[11px] font-semibold whitespace-nowrap text-text-warning">
                      {t`${temporary.activeCount} active`}
                    </span>
                  }
                  subtext={t`Applied to ${temporary.obligationCount} obligations`}
                />
              ) : null}
            </>
          ) : null}

          {federalVisible ? (
            <>
              <RailSectionLabel>{t`Federal`}</RailSectionLabel>
              <RailRow
                icon={LandmarkIcon}
                label={federalVisible.label}
                count={federalVisible.ruleCount}
                reviewCount={federalVisible.reviewCount}
                tone="default"
                selected={selected === 'FED'}
                onSelect={() => onSelect('FED')}
              />
            </>
          ) : null}

          {visibleStates.length > 0 ? (
            <>
              <RailSectionLabel>{t`States`}</RailSectionLabel>
              {visibleStates.map((it) => (
                <RailRow
                  key={it.jurisdiction}
                  icon={MapPinIcon}
                  label={it.label}
                  count={it.ruleCount}
                  reviewCount={it.reviewCount}
                  tone="default"
                  selected={selected === it.jurisdiction}
                  onSelect={() => onSelect(it.jurisdiction)}
                />
              ))}
            </>
          ) : null}

          {(query || reviewOnly) && shownStateCount === 0 && !federalVisible ? (
            <p className="px-3 py-6 text-center text-xs text-text-tertiary">
              {query ? t`No jurisdictions match "${search}"` : t`No jurisdictions need review`}
            </p>
          ) : null}
        </div>
      </nav>

      {/* Footer hint strip — "Showing N of M states". */}
      <div className="shrink-0 px-3.5 py-3">
        <div className="rounded-lg bg-background-subtle px-3 py-2.5 text-center text-xs font-medium text-text-tertiary tabular-nums">
          {t`Showing ${shownStateCount} of ${states.length} states`}
        </div>
      </div>
    </aside>
  )
}

function RailSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <span className="text-caption-xs font-semibold tracking-eyebrow text-text-tertiary uppercase">
        {children}
      </span>
    </div>
  )
}

/**
 * `RailNavRow` — a library-section row that LINKS to a sibling route
 * (Sources, Temporary rules), as opposed to `RailRow` which selects a
 * jurisdiction in place. Mirrors the row chrome (icon · label · trailing)
 * and adds an optional inline meta (after the label) + a second subtext
 * line, matching the Pencil Temporary-rules row.
 */
function RailNavRow({
  icon: Icon,
  label,
  href,
  inlineMeta,
  trailing,
  subtext,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  inlineMeta?: ReactNode
  trailing?: ReactNode
  subtext?: ReactNode
}) {
  return (
    <Link
      to={href}
      className="flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-state-base-hover"
    >
      <span className="flex items-center gap-2.5">
        <Icon className="size-[15px] shrink-0 text-text-secondary" aria-hidden />
        <span className="min-w-0 truncate text-[13px] font-medium text-text-secondary">
          {label}
        </span>
        {inlineMeta}
        <span className="flex-1" />
        {trailing}
      </span>
      {subtext ? (
        <span className="truncate pl-[25px] text-[11px] font-medium text-text-tertiary">
          {subtext}
        </span>
      ) : null}
    </Link>
  )
}

function RailRow({
  icon: Icon,
  label,
  count,
  reviewCount,
  tone,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  reviewCount: number
  /** `overview` reads accent when selected; `default` reads quiet gray. */
  tone: 'overview' | 'default'
  selected: boolean
  onSelect: () => void
}) {
  // The Overview row is the only row that reads in accent-blue when
  // active — it's the "home" surface. Jurisdiction rows read as a quiet
  // gray fill so the eye distinguishes "you're on the catalog" from
  // "you've drilled into one state."
  const accentSelected = tone === 'overview' && selected
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
        accentSelected
          ? 'bg-state-accent-hover'
          : selected
            ? 'bg-background-subtle'
            : 'hover:bg-state-base-hover',
      )}
    >
      <Icon
        className={cn(
          'size-[15px] shrink-0',
          accentSelected ? 'text-text-accent' : 'text-text-secondary',
        )}
        aria-hidden
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[13px]',
          accentSelected
            ? 'font-bold text-text-accent'
            : selected
              ? 'font-semibold text-text-primary'
              : 'font-medium text-text-secondary',
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
      <span
        className={cn(
          'shrink-0 text-[11px] font-semibold tabular-nums',
          accentSelected ? 'text-text-accent' : 'text-text-muted',
        )}
      >
        {count}
      </span>
    </button>
  )
}

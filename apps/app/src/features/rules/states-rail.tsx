import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { LayoutDashboardIcon, TimerIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  ListRail,
  ListRailHead,
  ListRailSection,
  ListRailTitle,
} from '@/components/patterns/list-rail'
import { SearchInput } from '@/components/primitives/search-input'
import { StateBadge } from '@/components/primitives/state-badge'

/**
 * `JurisdictionRail` — the left master pane of the Rule Library
 * (canonical Pencil `O0pyRO` PH-SecondarySidebar).
 *
 * Renders a searchable jurisdiction list: an "Overview" entry (the All
 * jurisdictions surface), a pinned FEDERAL section, then the states A–Z
 * under a STATES section label. The Overview row carries a lucide
 * dashboard icon; each JURISDICTION row carries its `StateBadge` seal
 * (FED / state code), its rule count in a mono count, and a quiet amber
 * "needs review" dot when the jurisdiction has pending-review rules. The
 * selected jurisdiction drives the flat rule table in the right pane.
 *
 * Style maps the Pencil's raw hex onto design-system tokens (per repo
 * rule — no new theme colors): the selected row — Overview OR a
 * jurisdiction — reads accent (bg-state-accent-hover + text-text-accent),
 * the canonical nav-item selected state shared with SettingsSubNav and
 * the main sidebar. Section labels + eyebrow use the muted caption scale.
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
   * Temporary-rules nav row between Overview and the jurisdictions. Links
   * to its standalone route; omitted while loading or when none are active.
   * (Sources moved to a button on the Overview header.)
   */
  temporary?: { activeCount: number; totalCount: number; obligationCount: number } | undefined
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
    <ListRail ariaLabel={t`Jurisdictions`} {...(className ? { className } : {})}>
      {/* ListHead — title + an All / Needs-review Segmented filter. The
          two-segment control reads unmistakably as a filter (same chrome as
          the per-jurisdiction Review/Active Segmented) where the lone chip
          read as a static label. Mirrors the canonical list-rail head
          (AlertListRail / ObligationListRail): a single 15px title row with a
          trailing control, separated by a `border-b`. */}
      <ListRailHead className="justify-between">
        <ListRailTitle>
          <Trans>Jurisdictions</Trans>
        </ListRailTitle>
        <Segmented<'all' | 'review'>
          value={reviewOnly ? 'review' : 'all'}
          onValueChange={(next) => setReviewOnly(next === 'review')}
          size="sm"
          ariaLabel={t`Filter jurisdictions`}
          options={[
            { value: 'all', label: <Trans>All</Trans> },
            { value: 'review', label: <Trans>Needs review</Trans> },
          ]}
        />
      </ListRailHead>

      {/* FilterRow — full-width search, separated by a `border-b` (same
          section rhythm as the canonical rails). */}
      <ListRailSection className="px-3">
        <SearchInput
          variant="compact"
          value={search}
          onChange={onSearchChange}
          placeholder={t`Search jurisdictions`}
          ariaLabel={t`Search jurisdictions`}
          className="w-full"
        />
      </ListRailSection>

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
                selected={selected === null}
                onSelect={() => onSelect(null)}
              />
              {/* Render whenever ANY override exists (active or expired) —
                  the page is the audit trail of past deadline overrides, and
                  an audit trail that disappears when its content expires is
                  unreachable exactly when a CPA needs to prove it existed. */}
              {temporary && temporary.totalCount > 0 ? (
                <RailNavRow
                  icon={TimerIcon}
                  label={t`Temporary rules`}
                  href="/rules/temporary"
                  inlineMeta={
                    temporary.activeCount > 0 ? (
                      <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-text-warning">
                        {t`${temporary.activeCount} active`}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs font-medium whitespace-nowrap text-text-tertiary">
                        {t`${temporary.totalCount} expired`}
                      </span>
                    )
                  }
                  subtext={
                    temporary.activeCount > 0
                      ? t`Applied to ${temporary.obligationCount} obligations`
                      : t`Past deadline overrides`
                  }
                />
              ) : null}
            </>
          ) : null}

          {federalVisible ? (
            <>
              <RailSectionLabel>{t`Federal`}</RailSectionLabel>
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
              <RailSectionLabel>{t`States`}</RailSectionLabel>
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

          {(query || reviewOnly) && shownStateCount === 0 && !federalVisible ? (
            <p className="px-3 py-6 text-center text-xs text-text-tertiary">
              {query ? t`No jurisdictions match "${search}"` : t`No jurisdictions need review`}
            </p>
          ) : null}
        </div>
      </nav>

      {/* Footer — "Showing N of M states", a quiet `border-t` strip that
          settles into the column edge (same divider rhythm as the head/search
          rows above). */}
      <div className="flex shrink-0 items-center border-t border-divider-subtle px-[18px] py-3">
        <span className="text-xs font-medium text-text-tertiary tabular-nums">
          {t`Showing ${shownStateCount} of ${states.length} states`}
        </span>
      </div>
    </ListRail>
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
        <span className="min-w-0 truncate text-base font-medium text-text-secondary">{label}</span>
        {inlineMeta}
        <span className="flex-1" />
        {trailing}
      </span>
      {subtext ? (
        <span className="truncate pl-[25px] text-xs font-medium text-text-tertiary">{subtext}</span>
      ) : null}
    </Link>
  )
}

function RailRow({
  icon: Icon,
  code,
  label,
  count,
  reviewCount,
  selected,
  onSelect,
}: {
  /** Leading lucide icon — used by the Overview row. Ignored when `code` is set. */
  icon?: React.ComponentType<{ className?: string }>
  /** Jurisdiction code ('FED', 'CA', …) — renders the StateBadge seal instead of an icon. */
  code?: string
  label: string
  count: number
  reviewCount: number
  selected: boolean
  onSelect: () => void
}) {
  // Selected rows — Overview AND jurisdictions — read in accent-blue,
  // the canonical nav-item selected state shared with SettingsSubNav and
  // the main sidebar. Unselected rows stay quiet (text-secondary label,
  // muted count) so the active jurisdiction is the one strong row.
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
        selected ? 'bg-state-accent-hover' : 'hover:bg-state-base-hover',
      )}
    >
      {code ? (
        <StateBadge code={code} size="xs" preview={false} />
      ) : Icon ? (
        <Icon
          className={cn(
            'size-[15px] shrink-0',
            selected ? 'text-text-accent' : 'text-text-secondary',
          )}
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-base',
          selected ? 'font-semibold text-text-accent' : 'font-medium text-text-secondary',
        )}
      >
        {label}
      </span>
      {/* Trailing cluster — quiet amber "needs review" dot + the rule count
          in a fixed-width right-aligned box. The fixed width keeps both the
          counts AND the dots in clean vertical columns down the rail (a
          1-digit vs 2-digit count would otherwise shift the dot left/right
          row to row). size-1 dot (not 1.5) so a list where most rows carry
          one doesn't read as a field of warning dots. */}
      <span className="flex shrink-0 items-center gap-1.5">
        {reviewCount > 0 ? (
          <span
            className="size-1 shrink-0 rounded-full bg-state-warning-solid"
            title={`${reviewCount} need review`}
            aria-label={`${reviewCount} rules need review`}
          />
        ) : null}
        <span
          className={cn(
            'inline-block min-w-[2ch] text-right text-xs font-medium tabular-nums',
            selected ? 'text-text-accent' : 'text-text-muted',
          )}
        >
          {count}
        </span>
      </span>
    </button>
  )
}

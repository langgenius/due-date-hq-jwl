import type { ReactNode } from 'react'
import { scrollIntoViewMotionSafe } from '@/lib/motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { LayoutDashboardIcon, TimerIcon, TriangleAlertIcon } from 'lucide-react'
import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'

import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  ListRail,
  ListRailBody,
  ListRailHead,
  ListRailSection,
  ListRailTitle,
} from '@/components/patterns/list-rail'
import { QueryErrorState } from '@/components/patterns/query-error-state'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { CountPill } from '@/components/primitives/count-pill'
import { SearchInput } from '@/components/primitives/search-input'
import { StateBadge } from '@/components/primitives/state-badge'

/**
 * `JurisdictionRail` — the left master pane of the Rule Library
 * (canonical Pencil `O0pyRO` PH-SecondarySidebar).
 *
 * Built on the shared `ListRail*` shell and tuned to read as ONE system
 * with `AlertListRail` (the alert detail's left list panel): the same
 * `ListRailHead` (title + a neutral `CountPill`), a `ListRailSection`
 * sort/group `Segmented` echoing the alerts rail's work-queue toggle, a
 * full-width compact `SearchInput`, and a `ListRailBody` of compact rows.
 *
 * Renders a searchable jurisdiction list: an "Overview" entry (the All
 * jurisdictions surface), a pinned FEDERAL section, then the states under
 * a STATES section label. The Overview row carries a lucide dashboard
 * icon; each JURISDICTION row carries its `StateBadge` seal (FED / state
 * code), its rule count in a fixed-width right-aligned box, and a quiet
 * amber "needs review" dot when the jurisdiction has pending-review rules.
 * The selected jurisdiction drives the flat rule table in the right pane.
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
  /** Pending rules that are HIGH-severity — escalates the dot to a warning
   *  triangle so "review these first" jurisdictions stand out in the rail
   *  (matches the overview's high-severity tier). */
  highCount: number
}

/** Sort/group order for the states list (the rail-head `Segmented`). */
type RailSort = 'az' | 'review'

export function JurisdictionRail({
  items,
  totalRuleCount,
  selected,
  onSelect,
  search,
  onSearchChange,
  temporary,
  loadError = null,
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
  /** S1 (ux-flow audit 2026-07-02): non-null when the catalog queries FAILED —
   * the rail shows the shared inline error + Retry instead of the fiction of
   * "Overview 0 / 0 jurisdictions". */
  loadError?: { error: unknown; onRetry: () => void; retrying: boolean } | null
  className?: string
}) {
  const { t } = useLingui()
  const query = search.trim().toLowerCase()
  // Sort/group control (rail-head Segmented, #8). Default 'az' = the
  // current alphabetical order. 'review' floats jurisdictions with pending
  // review work to the top so the CPA can clear the queue first.
  const [sort, setSort] = useState<RailSort>('az')

  const federal = useMemo(() => items.find((it) => it.jurisdiction === 'FED') ?? null, [items])
  const states = useMemo(() => {
    const rest = items.filter((it) => it.jurisdiction !== 'FED')
    if (sort === 'review') {
      // Needs-review first (most pending on top), then A–Z within each band.
      return rest.toSorted(
        (a, b) => b.reviewCount - a.reviewCount || a.label.localeCompare(b.label),
      )
    }
    return rest.toSorted((a, b) => a.label.localeCompare(b.label))
  }, [items, sort])

  const matches = (it: RailJurisdiction) =>
    !query ||
    it.label.toLowerCase().includes(query) ||
    it.jurisdiction.toLowerCase().includes(query)

  const federalVisible = federal && matches(federal) ? federal : null
  const visibleStates = states.filter(matches)
  const shownStateCount = visibleStates.length
  // Whether ANY jurisdiction has review work — gates the head count pill +
  // the sort control's "Needs review" affordance.
  const hasReviewWork = items.some((it) => it.reviewCount > 0)
  // The count SUMS rules, not jurisdictions: every "to review" figure on this
  // surface (Overview banner, "Where to start" cards) speaks in rules, and
  // this total is exactly the sum of the per-row dots the user sees — so the
  // head count reads true. (A jurisdiction count would misread as rules.)
  const reviewRuleCount = items.reduce((sum, it) => sum + it.reviewCount, 0)

  return (
    <ListRail ariaLabel={t`Jurisdictions`} {...(className ? { className } : {})}>
      {/* ListHead — title + a neutral "N to review" count pill, mirroring the
          alerts rail's "Alerts · N open" head (title + CountPill). Neutral
          tone: a standing backlog count isn't an alarm; the pill disappears
          when the queue is clear (quiet = caught up).
          #7 — `pr-6` (24px) overrides the shell's `px-[18px]` so the head's
          trailing element right-aligns with the per-row count column: each
          row's count box sits at body `px-3` (12px) + row `px-3` (12px) = 24px
          from the rail edge, so the columns line up vertically down the rail. */}
      <ListRailHead className="justify-between pr-6">
        <ListRailTitle>
          <Trans>Jurisdictions</Trans>
        </ListRailTitle>
        {hasReviewWork ? (
          <CountPill tone="neutral">
            <Trans>{reviewRuleCount} to review</Trans>
          </CountPill>
        ) : null}
      </ListRailHead>

      {/* Sort/group control (#8) — A–Z vs Needs review, the simplest sort-by,
          echoing the alerts rail's work-queue Segmented so the two rails read
          as one system. "Needs review" only appears when there's review work
          to surface; otherwise A–Z stands alone (no dead toggle). */}
      {hasReviewWork ? (
        <ListRailSection>
          <Segmented
            className="w-full [&>button]:flex-1"
            ariaLabel={t`Sort jurisdictions`}
            value={sort}
            onValueChange={setSort}
            options={[
              { value: 'az', label: <Trans>A–Z</Trans> },
              {
                value: 'review',
                // Count reads in accent when the toggle isn't active and there's
                // work waiting (color is the signal, not weight — color+bold is a
                // banned double-highlight). Matches the alerts rail's Review tab.
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Trans>Needs review</Trans>
                    <span
                      className={cn(
                        'tabular-nums',
                        sort === 'review' ? 'text-text-secondary' : 'text-text-accent',
                      )}
                    >
                      {reviewRuleCount}
                    </span>
                  </span>
                ),
              },
            ]}
          />
        </ListRailSection>
      ) : null}

      {/* FilterRow — full-width compact search, same treatment as the alerts
          rail (canonical `SearchInput variant="compact"`). */}
      <ListRailSection>
        <SearchInput
          variant="compact"
          value={search}
          onChange={onSearchChange}
          placeholder={t`Filter jurisdictions`}
          ariaLabel={t`Filter jurisdictions`}
          className="w-full"
        />
      </ListRailSection>

      {/* ListBody — the canonical scrolling body (same primitive the alerts
          rail uses). `px-3 py-2` so each row's left edge + trailing count
          column settle under the head's `px-[18px]` (body px-3 + row px-3). */}
      <ListRailBody className="px-3 py-2">
        {loadError && items.length === 0 ? (
          // Failure ≠ empty: the catalog queries errored, so "Overview 0" +
          // an empty states list would be fiction. Shared inline error + Retry.
          <QueryErrorState
            size="inline"
            what={<Trans>jurisdictions</Trans>}
            error={loadError.error}
            onRetry={loadError.onRetry}
            retrying={loadError.retrying}
          />
        ) : (
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
                        <span className="shrink-0 text-xs font-medium whitespace-nowrap text-text-warning">
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
                  highCount={federalVisible.highCount}
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
                    highCount={it.highCount}
                    selected={selected === it.jurisdiction}
                    onSelect={() => onSelect(it.jurisdiction)}
                  />
                ))}
              </>
            ) : null}

            {query && shownStateCount === 0 && !federalVisible ? (
              <p className="px-3 py-6 text-center text-xs text-text-tertiary">
                {t`No jurisdictions match "${search}"`}
              </p>
            ) : null}
          </div>
        )}
      </ListRailBody>

      {/* Footer — a plain total (#16). The list isn't paginated (every
          jurisdiction renders), so the old "Showing N of M states" read as
          truncation that never happens. A quiet `border-t` strip with the
          honest count, same divider rhythm as the head/search rows above. */}
      <div className="flex shrink-0 items-center border-t border-divider-subtle px-[18px] py-3">
        <span className="text-xs font-medium text-text-tertiary tabular-nums">
          {/* Never claim "0 jurisdictions" when the load failed — the em-dash
              is the canonical "no data" mark (EmptyCellMark semantics). */}
          {loadError && items.length === 0 ? '—' : t`${items.length} jurisdictions`}
        </span>
      </div>
    </ListRail>
  )
}

function RailSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <CapsFieldLabel as="span" variant="group">
        {children}
      </CapsFieldLabel>
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
  highCount = 0,
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
  /** High-severity pending rules — escalates the trailing marker to a warning
   *  triangle so "review first" jurisdictions stand out. */
  highCount?: number
  selected: boolean
  onSelect: () => void
}) {
  const { i18n } = useLingui()
  const reviewLabel = i18n._(
    plural(reviewCount, {
      one: '# rule to review',
      other: '# rules to review',
    }),
  )
  const highLabel = i18n._(
    plural(highCount, {
      one: '# high-severity rule to review',
      other: '# high-severity rules to review',
    }),
  )

  // #15 — when this JURISDICTION row becomes the active selection (driven by
  // the `?jurisdiction=` URL param, set when a "Where to start" card is
  // clicked on the page), scroll it into view so the rail reveals the row the
  // user just drilled into. Gated on `code` so the Overview row (always at the
  // top) never self-scrolls. `block:'nearest'` so an already-visible row never
  // teleports; smooth so the reveal reads as a gentle settle, not a jump.
  const rowRef = useRef<HTMLButtonElement | null>(null)
  const shouldReveal = selected && Boolean(code)
  useEffect(() => {
    if (shouldReveal) {
      scrollIntoViewMotionSafe(rowRef.current, { block: 'nearest' })
    }
  }, [shouldReveal])

  // Selected rows — Overview AND jurisdictions — read in accent-blue,
  // the canonical nav-item selected state shared with SettingsSubNav and
  // the main sidebar. Unselected rows stay quiet (text-secondary label,
  // muted count) so the active jurisdiction is the one strong row.
  return (
    <button
      ref={rowRef}
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
        {highCount > 0 ? (
          // High-severity pending → a warning triangle (stronger than the plain
          // dot) so the "review these first" jurisdictions read at a glance,
          // matching the overview's high-severity tier.
          <TriangleAlertIcon
            className="size-3 shrink-0 text-text-warning"
            aria-label={highLabel}
            role="img"
          />
        ) : reviewCount > 0 ? (
          <span
            className="size-1 shrink-0 rounded-full bg-state-warning-solid"
            title={reviewLabel}
            aria-label={reviewLabel}
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

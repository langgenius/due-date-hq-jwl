import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronRightIcon } from 'lucide-react'

import type { RuleCoverageRow } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseSourceHealthQueryOptions } from '@/features/pulse/api'
import { RuleLibraryTab } from '@/features/rules/rule-library-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { countSourcesByHealth, type RuleLibraryFilter } from '@/features/rules/rules-console-model'
import { orpc } from '@/lib/rpc'

/**
 * Rule library — the rule catalog and pending-review queue for owner /
 * manager governance work.
 *
 * The page is anchored by the Library table (the daily-use surface where
 * pending rules are accepted, rejected, or archived). Coverage and Sources
 * are *context* — compact summary strips at the top of the page that
 * answer "do we have rules where we need them?" and "are watchers healthy?"
 * at a glance. Clickable numbers in the strips filter the Library table
 * below (Coverage) or jump to the full standalone view (Sources). The
 * full Coverage map and Sources table live at `/rules/coverage` and
 * `/rules/sources` — reachable from the strip's "View …" link.
 *
 * Earlier iterations of this page (see
 * docs/dev-log/2026-05-18-rules-library-merge.md and
 * docs/dev-log/2026-05-18-rules-library-critique-fixes.md) stacked the
 * three full views as labeled sections, which produced a ~5700 px scroll
 * with poor signal-to-noise. The summary-strip shape is the v3 design:
 * one sidebar entry, one action page, two compact context rows.
 */
export function RulesLibraryRoute() {
  const { t } = useLingui()
  const [, setSearchParams] = useSearchParams()

  // The Library section owns its filter state via `?library` and `?jur`
  // URL params (see rule-library-tab.tsx). Coverage strip numbers drill
  // into the Library by pushing those params and scrolling the table
  // into view.
  const drillIntoLibrary = useCallback(
    (filter: RuleLibraryFilter, jurisdiction?: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('library', filter)
          if (jurisdiction) {
            next.set('jur', jurisdiction)
          } else {
            next.delete('jur')
          }
          return next
        },
        { replace: true },
      )
      requestAnimationFrame(() => {
        document.getElementById('library')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [setSearchParams],
  )

  return (
    <RulesPageShell
      title={t`Rule library`}
      description={t`Catalog of practice rules. Review pending templates, activate them into production, and inspect rejected or archived evidence.`}
    >
      <CoverageSummaryStrip onDrillIn={drillIntoLibrary} />
      <SourcesSummaryStrip />
      <section id="library" className="scroll-mt-20">
        <RuleLibraryTab />
      </section>
    </RulesPageShell>
  )
}

/**
 * One-line situational read of the rule catalog's coverage:
 * `Coverage  3 active · 123 needs review · 6 jurisdictions with gaps`
 * with a trailing "View coverage map →" link to `/rules/coverage`.
 *
 * Clickable numbers (`active`, `needs review`) drill into the Library
 * table below by pushing matching filters; non-action numbers stay as
 * plain text. The full jurisdiction × entity matrix lives on
 * `/rules/coverage` — reached by the trailing link.
 */
function CoverageSummaryStrip({
  onDrillIn,
}: {
  onDrillIn: (filter: RuleLibraryFilter, jurisdiction?: string) => void
}) {
  const { t } = useLingui()
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const stats = useMemo(
    () => aggregateCoverageStrip(coverageQuery.data ?? []),
    [coverageQuery.data],
  )

  return (
    <SummaryStrip
      label={t`Coverage`}
      loading={coverageQuery.isLoading}
      detailHref="/rules/coverage"
      detailLabel={t`View coverage map`}
    >
      <SummaryNumber value={stats.active} label={t`active`} onClick={() => onDrillIn('active')} />
      <SummarySeparator />
      <SummaryNumber
        value={stats.pending}
        label={t`needs review`}
        tone={stats.pending > 0 ? 'review' : 'muted'}
        onClick={() => onDrillIn('pending_review')}
      />
      <SummarySeparator />
      {/*
        `jurisdictions with gaps` is informational here — it doesn't drill
        into a filtered Library view because gaps live in the Coverage
        domain, not the catalog. Tone stays `muted` regardless of the
        count: per the SummaryNumber tone contract, color signals
        severity-with-action, not "look how big this number is". The full
        gap map is one click away on `/rules/coverage`.
      */}
      <SummaryNumber
        value={stats.jurisdictionsWithGaps}
        label={t`jurisdictions with gaps`}
        tone="muted"
      />
    </SummaryStrip>
  )
}

/**
 * One-line health read of the source-watcher fleet:
 * `Sources  88 watched · 3 degraded · 1 failing`
 * with "View sources →" linking to the full table on `/rules/sources`.
 *
 * `degraded` and `failing` counts deep-link to `/rules/sources` so the
 * CPA can drop straight into the affected rows; the count itself is not
 * a Library filter because source health is sysops, not catalog state.
 */
function SourcesSummaryStrip() {
  const { t } = useLingui()
  const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))
  // The watcher diagnostics live in Pulse; the registry has only static
  // metadata. Pull both, fall back to the registry's stored health if
  // Pulse hasn't reported in. Pulse aggregates by id, registry aggregates
  // by RuleSource.healthStatus directly.
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())

  const counts = useMemo(() => {
    const sources = sourcesQuery.data ?? []
    return countSourcesByHealth(sources)
  }, [sourcesQuery.data])
  const pulseCounts = useMemo(() => {
    const entries = sourceHealthQuery.data?.sources ?? []
    return {
      degraded: entries.filter((entry) => entry.healthStatus === 'degraded').length,
      failing: entries.filter((entry) => entry.healthStatus === 'failing').length,
    }
  }, [sourceHealthQuery.data])

  // Pulse trumps the registry when available — it's the live signal.
  const degraded = pulseCounts.degraded || counts.degraded
  const failing = pulseCounts.failing || counts.failing

  return (
    <SummaryStrip
      label={t`Sources`}
      loading={sourcesQuery.isLoading || sourceHealthQuery.isLoading}
      detailHref="/rules/sources"
      detailLabel={t`View sources`}
    >
      <SummaryNumber value={counts.all} label={t`watched`} />
      <SummarySeparator />
      <SummaryNumber
        value={degraded}
        label={t`degraded`}
        tone={degraded > 0 ? 'warning' : 'muted'}
        {...(degraded > 0 ? { href: '/rules/sources' } : {})}
      />
      <SummarySeparator />
      <SummaryNumber
        value={failing}
        label={t`failing`}
        tone={failing > 0 ? 'destructive' : 'muted'}
        {...(failing > 0 ? { href: '/rules/sources' } : {})}
      />
    </SummaryStrip>
  )
}

/**
 * One-row context strip — newspaper-kicker rhythm.
 *
 * Layout decisions worth keeping stable so a future DESIGN.md update
 * stays a one-place change:
 *  - Label is inline (no fixed-width gutter) so the strip doesn't read
 *    as a settings-form row. Separator dot bridges label and content.
 *  - Trailing "View →" link wears a small pill (bordered + bg-subtle)
 *    so the *escape hatch* outweighs any individual count number in
 *    the row — affordance > data density.
 *  - Single `h-10` rib aligned with all other strips in the app.
 *
 * If DESIGN.md adjusts pill borders / kicker spacing, edit only this
 * component — every Coverage / Sources / future strip inherits.
 */
function SummaryStrip({
  label,
  loading,
  detailHref,
  detailLabel,
  children,
}: {
  label: string
  loading: boolean
  detailHref: string
  detailLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-md border border-divider-regular bg-background-default px-3">
      <span className="shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
        {label}
      </span>
      <span aria-hidden className="shrink-0 text-text-tertiary">
        ·
      </span>
      <div
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
        aria-busy={loading || undefined}
      >
        {loading ? (
          <span className="text-xs text-text-tertiary">
            <Trans>Loading…</Trans>
          </span>
        ) : (
          children
        )}
      </div>
      <Link
        to={detailHref}
        className={cn(
          'group/detail inline-flex h-6 shrink-0 items-center gap-0.5 rounded-md',
          'border border-divider-regular bg-background-subtle px-2',
          'text-xs font-medium text-text-secondary outline-none',
          'hover:border-state-accent-active-alt hover:bg-background-default hover:text-text-accent',
          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        {detailLabel}
        <ChevronRightIcon
          className="size-3.5 text-text-tertiary transition-transform group-hover/detail:translate-x-0.5 group-hover/detail:text-text-accent"
          aria-hidden
        />
      </Link>
    </div>
  )
}

/**
 * A single stat in a SummaryStrip — `<value> <label>`, e.g. `123 needs review`.
 *
 * **Tone vs affordance** (the rule worth keeping stable):
 *   - `tone` signals *severity* (the data is bad / needs attention) and
 *     is read by the human as urgency. Maps directly to existing design
 *     tokens (`text-status-review`, `text-severity-medium`, etc.).
 *   - `onClick` / `href` signal *affordance* (this count is actionable).
 *     Interactivity is shown via underline-on-hover + focus ring, NOT
 *     via tone. Hover state is the universal teacher.
 *
 *   ❌ Don't use a warning tone on a count that isn't actionable —
 *      that conflates "this is bad" with "click me to fix it" and the
 *      user learns the wrong rule.
 *   ❌ Don't make a count clickable without a destination — every
 *      interactive number drills somewhere (Library filter or detail
 *      page).
 *
 * If DESIGN.md tweaks the severity color stack later, change the
 * tone-to-class map here and every Coverage / Sources / future strip
 * updates in one place.
 */
function SummaryNumber({
  value,
  label,
  tone = 'default',
  onClick,
  href,
}: {
  value: number
  label: string
  /**
   * Severity signal only. `default` for ordinary counts (`88 watched`),
   * `muted` for deprioritized counts (`52 jurisdictions with gaps`),
   * `review` for catalog-state attention (`123 needs review`),
   * `warning` for sysops degraded state (`11 degraded`),
   * `destructive` for sysops failure state (`1 failing`).
   */
  tone?: 'default' | 'muted' | 'review' | 'warning' | 'destructive'
  onClick?: () => void
  href?: string
}) {
  const toneClass =
    tone === 'review'
      ? 'text-status-review'
      : tone === 'warning'
        ? 'text-severity-medium'
        : tone === 'destructive'
          ? 'text-text-destructive'
          : tone === 'muted'
            ? 'text-text-muted'
            : 'text-text-primary'

  const inner = (
    <>
      <span className={cn('font-mono text-sm font-semibold tabular-nums', toneClass)}>{value}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </>
  )

  const interactive = onClick || href
  if (!interactive) {
    return <span className="inline-flex items-baseline gap-1">{inner}</span>
  }

  const className = cn(
    'inline-flex items-baseline gap-1 rounded-sm outline-none',
    'hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
  )

  if (href) {
    return (
      <Link to={href} className={className}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}

function SummarySeparator() {
  return (
    <span aria-hidden className="text-text-tertiary">
      ·
    </span>
  )
}

function aggregateCoverageStrip(rows: readonly RuleCoverageRow[]) {
  let active = 0
  let pending = 0
  let jurisdictionsWithGaps = 0
  for (const row of rows) {
    active += row.activeRuleCount ?? row.verifiedRuleCount
    pending += row.pendingReviewCount ?? row.candidateCount
    if ((row.pendingReviewCount ?? row.candidateCount) > 0) {
      jurisdictionsWithGaps += 1
    }
  }
  return { active, pending, jurisdictionsWithGaps }
}

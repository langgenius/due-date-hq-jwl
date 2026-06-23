import { useLingui } from '@lingui/react/macro'
import { Trans } from '@lingui/react/macro'

import { cn } from '@duedatehq/ui/lib/utils'
import {
  US_JURISDICTION_TILES,
  US_TILE_GRID_COLS,
  US_TILE_GRID_ROWS,
  US_TILE_CELL_SIZE,
  US_TILE_CELL_GAP,
} from '@/components/primitives/us-jurisdiction-tiles'
import { RULE_JURISDICTION_LABELS } from '@/features/rules/rules-console-model'

export type RuleCoverageEntry = { pending: number; high: number; total: number }

/**
 * RuleCoverageMap — the signature visual for /rules/library: a US tilegram
 * where every jurisdiction is a tile coloured by REVIEW PRESSURE, so the
 * whole "52 jurisdictions" backlog reads at a glance and geographically.
 *   red    → has high-severity rules awaiting review (do these first)
 *   amber  → rules pending review
 *   green  → tracked + fully reviewed (caught up)
 *   dim    → no rules tracked yet
 * Clicking a tile drills into that jurisdiction (same as the rail / the
 * "Where to start" list). Reuses the shared tilegram layout the /alerts
 * map uses, so the two surfaces never drift apart geographically.
 */
export function RuleCoverageMap({
  coverage,
  activeJurisdiction,
  onSelect,
  className,
}: {
  coverage: ReadonlyMap<string, RuleCoverageEntry>
  activeJurisdiction: string | null
  onSelect: (jurisdiction: string) => void
  className?: string
}) {
  const { t } = useLingui()
  const cellSpan = US_TILE_CELL_SIZE + US_TILE_CELL_GAP
  const width = US_TILE_GRID_COLS * cellSpan
  const height = US_TILE_GRID_ROWS * cellSpan

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {/* Peer of "Where to start" — same region-title size so the two
            overview columns read as equal-weight siblings, not header/sub. */}
        <h2 className="text-region-title text-text-primary">
          <Trans>Coverage map</Trans>
        </h2>
        <span className="text-xs text-text-tertiary">
          <Trans>Click a jurisdiction to review its rules</Trans>
        </span>
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-divider-regular bg-background-default p-4">
        <div className="overflow-x-auto">
          <div
            role="group"
            aria-label={t`Review coverage by jurisdiction`}
            className="relative mx-auto overflow-visible"
            style={{ width, height }}
          >
            {Object.entries(US_JURISDICTION_TILES).map(([code, [col, row]]) => {
              const entry = coverage.get(code)
              const total = entry?.total ?? 0
              const pending = entry?.pending ?? 0
              const high = entry?.high ?? 0
              const tracked = total > 0
              const active = activeJurisdiction === code
              const tone = !tracked
                ? 'untracked'
                : high > 0
                  ? 'high'
                  : pending > 0
                    ? 'pending'
                    : 'reviewed'
              const label = RULE_JURISDICTION_LABELS[code] ?? code
              const title = !tracked
                ? t`${label}: no rules tracked`
                : pending === 0
                  ? t`${label}: all ${total} reviewed`
                  : high > 0
                    ? t`${label}: ${pending} to review · ${high} high-severity`
                    : t`${label}: ${pending} of ${total} to review`
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onSelect(code)}
                  disabled={!tracked && !active}
                  aria-pressed={active}
                  aria-label={title}
                  title={title}
                  className={cn(
                    'absolute inline-flex cursor-pointer flex-col items-center justify-center gap-0 rounded-lg border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1',
                    active
                      ? 'border-state-accent-solid bg-state-accent-hover'
                      : tone === 'high'
                        ? 'border-state-destructive-border bg-components-badge-bg-red-soft hover:border-state-accent-solid'
                        : tone === 'pending'
                          ? 'border-transparent bg-components-badge-bg-warning-soft hover:border-state-accent-solid'
                          : tone === 'reviewed'
                            ? 'border-transparent bg-components-badge-bg-green-soft hover:border-state-accent-solid'
                            : 'cursor-not-allowed border-transparent bg-background-soft opacity-40',
                  )}
                  style={{
                    left: col * cellSpan,
                    top: row * cellSpan,
                    width: US_TILE_CELL_SIZE,
                    height: US_TILE_CELL_SIZE,
                  }}
                >
                  <span
                    className={cn(
                      'text-xs font-semibold leading-none tabular-nums',
                      active
                        ? 'text-text-accent'
                        : tone === 'high'
                          ? 'text-text-destructive'
                          : tone === 'pending'
                            ? 'text-text-warning'
                            : tone === 'reviewed'
                              ? 'text-text-success'
                              : 'text-text-tertiary',
                    )}
                  >
                    {code}
                  </span>
                  {tracked && pending > 0 ? (
                    <span
                      className={cn(
                        'mt-0.5 text-micro leading-none tabular-nums',
                        active ? 'text-text-accent' : 'text-text-secondary',
                      )}
                    >
                      {pending}
                    </span>
                  ) : null}
                  {/* High-severity marker on "review first" tiles — a small
                      red count bubble in the corner, so the do-these-first
                      jurisdictions carry their high-severity number (not just
                      a red tint) and read as the priority the StatBand calls
                      out. */}
                  {tone === 'high' && high > 0 ? (
                    <span
                      className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-background-default bg-text-destructive px-1 text-[9px] font-semibold leading-none text-text-inverted tabular-nums"
                      aria-hidden
                    >
                      {high}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-tertiary">
          <CoverageLegendSwatch
            className="bg-components-badge-bg-red-soft"
            label={t`Review first`}
          />
          <CoverageLegendSwatch
            className="bg-components-badge-bg-warning-soft"
            label={t`Pending`}
          />
          <CoverageLegendSwatch className="bg-components-badge-bg-green-soft" label={t`Reviewed`} />
          <CoverageLegendSwatch className="bg-background-soft" label={t`No rules`} />
        </div>
      </div>
    </section>
  )
}

function CoverageLegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn('size-3 rounded-sm border border-divider-subtle', className)}
        aria-hidden
      />
      {label}
    </span>
  )
}

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
 * RuleCoverageMap — a US tilegram for /rules/library: every jurisdiction is a
 * calm neutral tile (white cell, gray outline — no fills), so the whole "52
 * jurisdictions" backlog reads at a glance and geographically. Status rides two
 * quiet signals, not a coloured block:
 *   • a small corner MONITORING dot — green ("we sweep this jurisdiction"),
 *     red when it has high-severity rules awaiting review ("review first");
 *   • the to-review COUNT below the code.
 * Untracked (no rules) recedes. Clicking a tile drills into that jurisdiction
 * (same as the rail / the "Where to start" list). Reuses the shared tilegram
 * layout the /alerts map uses, so the two surfaces never drift geographically.
 *
 * NOTE: currently hidden in the overview behind `SHOW_COVERAGE_MAP` in
 * routes/rules.library.tsx — kept intact for when it's re-enabled.
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
                    // Calm by default: every tile is a neutral white cell with a
                    // gray outline — no red BORDERS or fills (a board full of red
                    // outlines read as shocking). The warranted red lives in the
                    // small corner status DOT instead: green = monitored/fine,
                    // red = has high-severity rules to review first. So red shows
                    // exactly where it should, restrained to the few urgent tiles.
                    // The COUNT shows how many rules await review; untracked
                    // (no rules) recedes.
                    'absolute inline-flex cursor-pointer flex-col items-center justify-center gap-0 rounded-lg border bg-background-default transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1',
                    active
                      ? 'border-state-accent-solid bg-state-accent-hover'
                      : tone === 'untracked'
                        ? 'cursor-not-allowed border-divider-subtle bg-background-subtle opacity-50'
                        : 'border-border hover:border-state-accent-solid',
                  )}
                  style={{
                    left: col * cellSpan,
                    top: row * cellSpan,
                    width: US_TILE_CELL_SIZE,
                    height: US_TILE_CELL_SIZE,
                  }}
                >
                  {/* Monitoring dot — a small status dot in the corner for every
                      jurisdiction we actively sweep. Tone follows the PulsingDot
                      ladder: GREEN normally ("monitored, fine"), RED when the
                      jurisdiction has high-severity rules awaiting review ("review
                      first"). The red is warranted + restrained — only the few
                      high-severity tiles light up, never a wall of red borders.
                      Mirrors the states-rail per-row small-solid-dot pattern. */}
                  {tracked ? (
                    <span
                      className={cn(
                        'absolute right-1 top-1 size-1.5 shrink-0 rounded-full',
                        high > 0 ? 'bg-state-destructive-solid' : 'bg-state-success-solid',
                      )}
                      title={
                        high > 0 ? t`${label}: ${high} high-severity — review first` : t`Monitoring ${label}`
                      }
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      'text-xs font-semibold leading-none tabular-nums',
                      active
                        ? 'text-text-accent'
                        : tone === 'untracked'
                          ? 'text-text-tertiary'
                          : 'text-text-secondary',
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
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-state-success-solid" aria-hidden />
            <Trans>Monitoring</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-state-destructive-solid" aria-hidden />
            <Trans>Review first</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-text-secondary tabular-nums">#</span>
            <Trans>To review</Trans>
          </span>
          <CoverageLegendSwatch className="border-divider-subtle" label={t`No rules`} />
        </div>
      </div>
    </section>
  )
}

// Outline swatch — a bordered square (no fill), matching the tiles' new
// border-carries-status treatment. `className` supplies the border colour.
function CoverageLegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn('size-3 rounded-sm border bg-background-default', className)}
        aria-hidden
      />
      {label}
    </span>
  )
}

import type { ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { TriangleAlertIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `NeedsAttentionPanel` — the canonical "this needs your attention" card,
 * used anywhere the app surfaces a block of items requiring action
 * (degraded source monitoring, expired invites, blocked work, …).
 *
 * Treatment (Yuqi, 2026-06-14 — "light destructive background … icon alert +
 * Needs attention", refined the same day to "more delicate, more details"):
 *  - LAYERED card, not a red flood: a soft destructive header band (icon
 *    medallion + title + a plain-language `summary` of what's wrong + a
 *    delicate count chip + optional action) sits above a clean
 *    `background-default` body that holds the rows. The red reads as a
 *    focused accent band; the rows stay maximally legible. Chromatic accent
 *    lives in the container, never in body text.
 *  - the icon rides in a soft white medallion with a destructive ring — a
 *    finished "status seal" rather than a bare glyph.
 *  - one full destructive hairline frames the rounded card (never per-side).
 *
 * The panel owns the header + the white body wrapper; callers pass their
 * rows as children (rows separate themselves with neutral hairlines —
 * `border-t border-divider-subtle first:border-t-0` — because they sit on
 * the white body, not the tint). A needs-attention panel must never render
 * when nothing is wrong — that gate is the caller's.
 */
export function NeedsAttentionPanel({
  count,
  summary,
  action,
  children,
  className,
}: {
  /** Optional count shown as a delicate chip beside the heading. */
  count?: number
  /**
   * One plain-language line under the title saying WHAT needs attention and
   * WHY — the at-a-glance detail ("1 source hasn't refreshed in over a
   * month"). Answers the question before the user reads the rows.
   */
  summary?: ReactNode
  /** Optional trailing affordance (right-aligned, vertically centered). */
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const { t } = useLingui()
  return (
    <section
      aria-label={t`Needs attention`}
      className={cn(
        'overflow-hidden rounded-xl border border-state-destructive-hover-alt bg-state-destructive-hover',
        className,
      )}
    >
      <header className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon medallion — white seal + destructive ring; calmer and more
            finished than a bare triangle on the tint. */}
        <span
          aria-hidden
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-background-default/70 ring-1 ring-state-destructive-hover-alt"
        >
          <TriangleAlertIcon className="size-3.5 text-text-destructive" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              <Trans>Needs attention</Trans>
            </h2>
            {count !== undefined ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background-default/70 px-1 text-caption-xs font-semibold tabular-nums text-text-destructive ring-1 ring-state-destructive-hover-alt">
                {count}
              </span>
            ) : null}
          </div>
          {summary ? <p className="text-xs leading-5 text-text-secondary">{summary}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </header>
      {/* Clean body — rows on the default surface so the red stays a header
          accent. The tinted hairline marks the band/body boundary. */}
      {children !== undefined ? (
        <div className="border-t border-state-destructive-hover-alt bg-background-default">
          {children}
        </div>
      ) : null}
    </section>
  )
}

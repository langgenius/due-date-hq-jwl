// Small shared presentational components for the obligation queue (/deadlines).
// Extracted from routes/obligations.tsx.
import { type ComponentProps, type ReactNode } from 'react'

import { Trans } from '@lingui/react/macro'
import { AlertTriangleIcon } from 'lucide-react'

import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { type ObligationStatus } from '@/features/obligations/status-control'
import {
  dueCountdownTone,
  DUE_COUNTDOWN_TEXT_CLASS,
} from '@/features/_surface-vocabulary/due-date-tone'
import { cn } from '@/lib/utils'

import type { AuditSummaryRow } from '../types'
import { isDueDaysSuppressedForStatus } from '../helpers'

export function DropdownTriggerButton({
  size = 'default',
  disabled,
  className,
  children,
  ...props
}: {
  size?: 'default' | 'lg'
  disabled?: boolean | undefined
  className?: string
  children: ReactNode
} & Omit<ComponentProps<'button'>, 'children' | 'className' | 'disabled'>) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-divider-regular bg-background-default px-3 text-sm text-text-primary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:bg-state-base-hover',
        size === 'lg' ? 'h-10 text-left' : 'h-9',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function DueDaysPill({ days, status }: { days: number; status: ObligationStatus }) {
  if (isDueDaysSuppressedForStatus(status)) {
    // Quality stat, not active urgency. Skip the dot, drop the
    // urgency tone, render as a muted line. Drop entirely when the
    // row landed exactly on its deadline — no signal there.
    //
    // `not_applicable` is a closed state where lateness/earliness
    // doesn't apply because the obligation never applied. Render a
    // quiet em-dash so the column still reserves its baseline without
    // claiming a filing event.
    if (status === 'not_applicable' || days === 0) {
      // Canonical EmptyCellMark shares the same accessible "No data"
      // label as other empty cells.
      return <EmptyCellMark />
    }
    return (
      // Terminal quality stat — compact "filed Nd late/early" in tertiary tone.
      // 2026-06-16 (audit — "compact everywhere"): this column previously
      // dropped the "filed" prefix on purpose, but that divergence was
      // overridden so every surface reads one vocabulary (DueCountdownText).
      <span className="text-sm text-text-tertiary tabular-nums">
        <DueCountdownText days={days} terminal />
      </span>
    )
  }
  // Live countdown — wording from the shared DueCountdownText ("5d late" /
  // "in 5d" / "today"); urgency tone from the canonical `dueCountdownTone`
  // ramp (overdue → red, ≤7d → peach, else neutral) so /alerts and /deadlines
  // colour lateness identically. No filled badge/dot/icon: a filled chip would
  // look like the Status pill next to it, and a dot would be a redundant signal
  // on the same axis.
  const tintedTextClass = DUE_COUNTDOWN_TEXT_CLASS[dueCountdownTone(days)]
  return (
    <span
      className={cn('inline-flex items-center text-sm tabular-nums leading-tight', tintedTextClass)}
    >
      <DueCountdownText days={days} />
    </span>
  )
}

// P0: editable email preview shared by the single ("Remind client to sign")
// and bulk ("Remind to sign") flows. The CPA edits a TOKEN template
// ({{client_name}} / {{form}} / {{tax_year}}); the server substitutes it per
// recipient on send, so one edited template still personalizes each email. A
// live preview shows how the current template resolves for one sample client.

export function EmptyPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-divider-regular p-4 text-sm text-text-tertiary',
        className,
      )}
    >
      {/* Step 9's branch had Penalty-sources rendering here (an older
          `_PenaltyBreakdownCard` shape); HEAD's `EmptyPanel` is now a
          simple children-wrapper. Step 9's block doesn't apply here.
          The `_penaltyFormulaDisplay` / `_penaltyFactsDisplay` orphans
          that lived directly below were also deleted as part of this
          merge (lint flagged the dangling `_` prefix on the diff). */}
      {children}
    </div>
  )
}

export function AlertPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-state-warning-hover-alt bg-state-warning-hover p-3 text-sm text-text-primary">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <p>{children}</p>
    </div>
  )
}

export function AuditSummaryRows({ rows }: { rows: AuditSummaryRow[] }) {
  if (rows.length === 0) return null
  return (
    <dl className="mt-3 grid gap-2 text-xs">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[112px_1fr] gap-3">
          <dt className="font-medium text-text-tertiary">{row.label}</dt>
          <dd className="break-words text-text-secondary">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
      <dt className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</dt>
      <dd className="break-words text-text-primary">{value}</dd>
    </div>
  )
}

// ── Cluster 2 (deadline detail tabs) reusables ──────────────────────
// Extracted from the Pencil detail-tab designs (d4YrtC / Ls3vb /
// AYpfU / KsbdI). All map the design hexes to existing tokens:
//   #155aef → accent, #17b26a/#079455 → success, #b9501a → warning,
//   #98a2b2 → text-tertiary, #354052/#676f83 → text-secondary.
// Card chrome in the designs (rounded-14, #10182814 border, white fill)
// is intentionally NOT replicated 1:1 inside the drawer — the drawer
// uses flat sections; these primitives carry the INNER content + the
// design's signature dot/mono/colour vocabulary.

type MilestoneTone = 'active' | 'done' | 'pending'

// Summary strip chip (design `Z6n7Z5 > WTa7O`): dot + label + sub-state
// caption inside a pill. `active` = blue dot + blue text on accent-hover
// tint; `done` = success; `pending` = muted on section bg.
export function MilestoneChip({
  label,
  caption,
  tone,
}: {
  label: ReactNode
  caption?: ReactNode
  tone: MilestoneTone
}) {
  const dotClass =
    tone === 'active'
      ? 'bg-state-accent-solid'
      : tone === 'done'
        ? 'bg-state-success-solid'
        : 'bg-text-tertiary'
  const pillClass =
    tone === 'active'
      ? 'bg-state-accent-hover-alt'
      : tone === 'done'
        ? 'bg-state-success-hover'
        : 'bg-background-section'
  const labelClass =
    tone === 'active'
      ? 'text-text-accent'
      : tone === 'done'
        ? 'text-state-success-solid'
        : 'text-text-secondary'
  const captionClass = tone === 'active' ? 'text-text-accent' : 'text-text-tertiary'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-2 leading-none',
        pillClass,
      )}
    >
      <span className={cn('size-2 shrink-0 rounded-full', dotClass)} aria-hidden />
      <span className={cn('text-xs font-semibold', labelClass)}>{label}</span>
      {caption ? (
        <span className={cn('text-caption-xs font-semibold uppercase tracking-wide', captionClass)}>
          {caption}
        </span>
      ) : null}
    </span>
  )
}

// Extension amber callout (design `Ls3vb` warn-note + payment-due card).
// Reuses the AlertPanel chrome; carries a title + body so it reads as a
// distinct "filing ≠ payment" warning rather than a generic note.
export function PaymentStillDueCallout({
  title,
  children,
}: {
  title: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex gap-2 rounded-lg border border-state-warning-hover-alt bg-state-warning-hover p-3 text-sm">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <div className="grid gap-0.5">
        <p className="font-medium text-text-warning">{title}</p>
        <p className="text-text-secondary">{children}</p>
      </div>
    </div>
  )
}

// Shared file row (design Summary `SourceDocs` + Evidence `Workpapers`):
// f9fafb icon tile + mono filename + meta sub + trailing actions.
export function FileArtifactRow({
  icon,
  name,
  meta,
  actions,
}: {
  icon: ReactNode
  name: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-divider-subtle py-2 last:border-0">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-section text-text-secondary"
        aria-hidden
      >
        {icon}
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-mono text-xs font-medium text-text-primary">{name}</span>
        {meta ? <span className="truncate text-caption-xs text-text-tertiary">{meta}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}

type ArtifactCellTone = 'success' | 'warning' | 'pending'

export type ArtifactStatusCell = {
  id: string
  label: ReactNode
  value: ReactNode
  tone: ArtifactCellTone
}

// Evidence hero checks grid (design `H3xJg > zdni4`): a bordered N-cell
// grid, each cell = mono uppercase label + colored dot + value. Wraps to
// a single column on narrow widths.
export function EvidenceArtifactStatusGrid({ cells }: { cells: ArtifactStatusCell[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-divider-subtle sm:grid-cols-4">
      {cells.map((cell) => (
        <div
          key={cell.id}
          className="flex flex-col gap-2 border-b border-r border-divider-subtle p-3 last:border-r-0 [&:nth-child(2n)]:border-r-0 sm:border-b-0 sm:[&:nth-child(2n)]:border-r"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                cell.tone === 'success'
                  ? 'bg-state-success-solid'
                  : cell.tone === 'warning'
                    ? 'bg-state-destructive-solid'
                    : 'bg-text-tertiary',
              )}
              aria-hidden
            />
            <span className="text-caption-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {cell.label}
            </span>
          </div>
          <span className="text-sm font-semibold text-text-primary">{cell.value}</span>
        </div>
      ))}
    </div>
  )
}

export type AuthorityFact = {
  id: string
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
}

// Evidence authority strip (design `FXD1b`): a quiet f9fafb strip of
// mono-labelled facts separated by thin vertical dividers, + an
// optional trailing link. Wraps fluidly; dividers hide on the wrapped
// leading edge of each row via flex.
export function AuthorityFactStrip({
  facts,
  action,
}: {
  facts: AuthorityFact[]
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-divider-subtle bg-background-section px-4 py-3">
      {facts.map((fact, index) => (
        <span key={fact.id} className="inline-flex items-center gap-2">
          {index > 0 ? (
            <span className="h-3.5 w-px shrink-0 bg-divider-regular" aria-hidden />
          ) : null}
          {fact.icon ? (
            <span className="shrink-0 text-text-secondary" aria-hidden>
              {fact.icon}
            </span>
          ) : null}
          <span className="font-mono text-caption-xs font-semibold uppercase tracking-wide text-text-tertiary">
            {fact.label}
          </span>
          <span className="text-xs font-medium text-text-secondary">{fact.value}</span>
        </span>
      ))}
      {action ? <span className="ml-auto">{action}</span> : null}
    </div>
  )
}

type MaterialsLegendCounts = {
  received: number
  outstanding: number
  waived: number
}

// Materials progress + 3-dot legend (design `AYpfU` MatHeader kQkqL +
// legend). Green/red/grey dots map to received/outstanding/waived.
export function MaterialsProgressLegend({
  counts,
  lastUpdated,
}: {
  counts: MaterialsLegendCounts
  lastUpdated?: ReactNode
}) {
  const total = counts.received + counts.outstanding + counts.waived
  const pct = total > 0 ? Math.round((counts.received / total) * 100) : 0
  return (
    <div className="grid gap-2">
      <div className="h-2 w-full overflow-hidden rounded-sm bg-background-subtle">
        <div
          className="h-full rounded-sm bg-state-success-solid transition-[width] duration-300 ease-apple"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-state-success-solid" aria-hidden />
          <span className="tabular-nums text-text-secondary">{counts.received}</span>
          <Trans>received</Trans>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-state-destructive-solid" aria-hidden />
          <span className="tabular-nums text-text-secondary">{counts.outstanding}</span>
          <Trans>outstanding</Trans>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-text-tertiary" aria-hidden />
          <span className="tabular-nums text-text-secondary">{counts.waived}</span>
          <Trans>waived</Trans>
        </span>
        {lastUpdated ? <span className="ml-auto">{lastUpdated}</span> : null}
      </div>
    </div>
  )
}

// Top-of-Readiness-tab overview. Answers in one read:
//   1. IS THIS FILING READY? (binary headline — "Ready to prep" or
//      "Not ready" — the most important signal on the tab)
//   2. WHY (the gap: items received vs. expected, or "no checklist yet")
//   3. WHAT does "ready" mean (one-line explainer pulled from PDF §3.2)
//
// Replaces the prior side-by-side label-and-counter. The headline is
// the H2 of the tab; the rest is small support text below it.

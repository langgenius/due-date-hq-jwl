// Small shared presentational components for the obligation queue (/deadlines).
// Extracted from routes/obligations.tsx.
import { type ComponentProps, type ReactNode } from 'react'

import { Plural, Trans } from '@lingui/react/macro'
import { AlertTriangleIcon } from 'lucide-react'

import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { type ObligationStatus } from '@/features/obligations/status-control'
import { cn } from '@/lib/utils'

import type { AuditSummaryRow } from '../types'
import { dueDaysTone, isDueDaysSuppressedForStatus } from '../helpers'

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
        'inline-flex w-full items-center justify-between gap-2 rounded-md border border-divider-regular bg-background-default px-3 text-sm text-text-primary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:bg-state-base-hover',
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
    // 2026-05-27 (Agent X3 milestone audit M-08): `not_applicable`
    // is a closed state where lateness/earliness doesn't apply because
    // the obligation never applied. Render a quiet em-dash so the column
    // still reserves its baseline without claiming a filing event.
    if (status === 'not_applicable' || days === 0) {
      // 2026-06-01: canonical EmptyCellMark replaces hand-rolled em-dash —
      // shares the same accessible "No data" label as other empty cells.
      return <EmptyCellMark />
    }
    return (
      // 2026-06-06 (Yuqi): this column compares only against the
      // internal due date. Do not prefix terminal rows with "Filed";
      // that mixes the status/action vocabulary into a due-date metric.
      <span className="text-sm text-text-tertiary tabular-nums">
        {days < 0 ? (
          <Plural value={Math.abs(days)} one="# day late" other="# days late" />
        ) : (
          <Plural value={days} one="# day early" other="# days early" />
        )}
      </span>
    )
  }
  const tone = dueDaysTone(days)
  // 2026-05-25 (Yuqi Deadlines #7, #8): Internal-due always renders
  // as `outline` regardless of urgency. The previous filled
  // `destructive` / `warning` variants made this badge LOOK exactly
  // like the Status pill ("In review", "Blocked") next to it —
  // two filled badges, same row, different meanings, no visual
  // separation. Now: dot carries the urgency signal (red for very
  // late, amber for soon, neutral for future), and the outline
  // chip itself stays calm so the eye reads Status pill (filled,
  // workflow state) and Internal due (outline, deadline anchor)
  // as different visual classes. Reduces the red overload on
  // late+blocked+rejected rows at the same time.
  const tintedTextClass =
    tone.dot === 'error'
      ? 'text-text-destructive'
      : tone.dot === 'warning'
        ? 'text-text-warning'
        : 'text-text-primary'
  // 2026-05-25 (Yuqi Deadlines follow-up): the days-late badge used a
  // colored BadgeStatusDot (red/amber/neutral). The dot did double
  // duty as both the urgency tone signal AND a generic "this is a
  // status" mark — which collided visually with the Status pill in
  // the next column (also dot-led). Swapped to a lucide Info icon for
  // the days-late case ("you'll want to read this") and kept the dot
  // for non-late states (future / today) where the tone is the only
  // signal worth carrying. The Info icon inherits the tinted text
  // color so red text + red icon read as a single urgency cluster
  // without claiming "status pill" semantics.
  const isLate = days < 0
  // 2026-05-26 (Yuqi /deadlines sixty-fifth pass #17): dropped the
  // outline Badge wrapper. Yuqi questioned "is it necessary to put
  // it in a badge pill?" — the row already carries the Status pill
  // (filled, workflow state) in the next column, and a second
  // bordered chip for due-days read as "two badges, same row,
  // different meanings, what's a primary?" Now: dot + plain text,
  // text-sm tabular-nums, urgency carried by text color (red /
  // amber / neutral) and the leading dot/icon. Reads as a value
  // ("3 days late"), not a control.
  // 2026-05-26 (Yuqi sixty-eighth pass #6/#7): dropped the Info
  // icon on late rows. The leading dot already carries the urgency
  // tone (red for late, amber for soon, neutral for future) and the
  // red text reinforces it — the Info icon was a third signal on
  // the same axis. Cell gap bumped 1.5 → 2 so dot + value have a
  // touch more breathing room.
  return (
    <span
      className={cn(
        // 2026-05-27 (Yuqi "去掉这个点"): BadgeStatusDot removed
        // entirely. The tinted text color already carries the
        // urgency signal (text-text-destructive for late, etc.);
        // the dot was redundant noise next to the date.
        'inline-flex items-center text-sm tabular-nums leading-tight',
        tintedTextClass,
      )}
    >
      {days === 0 ? (
        <Trans>Today</Trans>
      ) : isLate ? (
        <Plural value={Math.abs(days)} one="# day late" other="# days late" />
      ) : (
        <Plural value={days} one="# day" other="# days" />
      )}
    </span>
  )
}

// `RangeHeaderFilterDropdown` retired 2026-05-26 with the sixty-fifth
// pass #5. The column-header range filter overlapped semantically
// with the sort handle on the same header AND with the toolbar
// "Past Due" / "Due this week" chips above. If we ever need a
// generic numeric-range column filter again, restore from git
// history (commit before 2026-05-26-deadlines-pass-65).

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

// 2026-05-27 (Step 9 merge cleanup): the orphaned `_DeadlineTipPanel`
// + `InsightStatusBadge` + `InsightCitationChips` cluster was retained
// when the Risk tab was removed, surviving as `_`-prefixed dead code.
// Step 9's AI-visibility audit explicitly flagged this as "fully wired
// in the data layer but its React component is orphaned." The cluster
// referenced symbols (`AiInsightPublic`, `FileSearchIcon`,
// `UpgradeCtaButton`) that no longer exist in this file's import
// graph, so the merge would not compile with them in place. If we
// want to revive deadline-tip insights, restore from
// `feat/step-9-ai-visibility-audit` and reintroduce the required
// imports + a real mount point.

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

// `ObligationForwardingPanel` + `obligationForwardingAddress`
// retired 2026-05-21 with the inbound-routing Phase-2 stub. Restore
// when the email-thread-to-task pipeline actually ships.

// Top-of-Readiness-tab overview. Answers in one read:
//   1. IS THIS FILING READY? (binary headline — "Ready to prep" or
//      "Not ready" — the most important signal on the tab)
//   2. WHY (the gap: items received vs. expected, or "no checklist yet")
//   3. WHAT does "ready" mean (one-line explainer pulled from PDF §3.2)
//
// Replaces the prior side-by-side label-and-counter. The headline is
// the H2 of the tab; the rest is small support text below it.

import { useMemo } from 'react'
import { useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic, ObligationQueueRow } from '@duedatehq/contracts'
import { isLegalObligationTransition } from '@duedatehq/core/obligation-workflow'
import { BadgeStatusDot, badgeVariants } from '@duedatehq/ui/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

type ObligationStatus = ObligationInstancePublic['status']
type ObligationReadiness = ObligationInstancePublic['readiness']
type StatusLabels = Record<ObligationStatus, string>
type ReadinessLabels = Record<ObligationReadiness, string>
type StatusControlRow = Pick<ObligationQueueRow, 'clientName' | 'status'> & { id: string }

// Legacy 8-state vocabulary. Lifecycle v2 introduces `blocked` and
// `completed` as additions (see docs/Design/obligation-lifecycle-design-brief.md).
// They are included here so exhaustive maps below stay typesafe; the
// 6-state v2 UI surface (LIFECYCLE_V2_STATUSES) is chosen behind the
// ?lifecycle=v2 flag in `use-lifecycle-v2.ts`.
const ALL_STATUSES = [
  'pending',
  'in_progress',
  'waiting_on_client',
  'review',
  'done',
  'paid',
  'extended',
  'not_applicable',
  'blocked',
  'completed',
] as const satisfies readonly ObligationStatus[]

// The 6 states that compose the v2 queue surface. Order is also the
// dropdown display order (and keyboard 1-6 mapping).
const LIFECYCLE_V2_STATUSES = [
  'pending', // displays as "Not started"
  'waiting_on_client',
  'blocked',
  'review', // displays as "In review"
  'done', // displays as "Filed" — unchanged from today's label
  'completed',
] as const satisfies readonly ObligationStatus[]

const STATUS_VARIANT: Record<
  ObligationStatus,
  'destructive' | 'info' | 'secondary' | 'outline' | 'success' | 'warning'
> = {
  pending: 'secondary',
  in_progress: 'info',
  review: 'warning',
  waiting_on_client: 'outline',
  done: 'success',
  extended: 'info',
  paid: 'success',
  not_applicable: 'outline',
  blocked: 'destructive',
  completed: 'success',
}

// 2026-05-21: split waiting_on_client off into its own violet ('info')
// tone so it stops colliding with review (amber) and blocked (red).
// Lifecycle vocab:
//   - pending          → gray   (not started)
//   - in_progress      → blue   (we're working on it)
//   - waiting_on_client → violet (externally blocked, paused on us)
//   - review           → amber  (needs attention — ours or partner's)
//   - blocked          → red    (hard stop, can't proceed)
//   - done / completed → green  (closed)
const STATUS_DOT: Record<
  ObligationStatus,
  'error' | 'normal' | 'disabled' | 'warning' | 'success' | 'info'
> = {
  pending: 'disabled',
  in_progress: 'normal',
  review: 'warning',
  waiting_on_client: 'info',
  done: 'success',
  extended: 'normal',
  paid: 'success',
  not_applicable: 'disabled',
  blocked: 'error',
  completed: 'success',
}

function isObligationStatus(value: string): value is ObligationStatus {
  return (ALL_STATUSES as readonly string[]).includes(value)
}

function useStatusLabels(): StatusLabels {
  const { t } = useLingui()
  return useMemo(
    () => ({
      pending: t`Not started`,
      in_progress: t`In progress`,
      waiting_on_client: t`Waiting on client`,
      review: t`Needs review`,
      done: t`Filed`,
      paid: t`Paid`,
      extended: t`Extended`,
      not_applicable: t`Not applicable`,
      blocked: t`Blocked`,
      completed: t`Completed`,
    }),
    [t],
  )
}

// Lifecycle v2 label overrides — under v2 the queue shows only 6
// canonical pill labels even though the DB still carries the
// legacy 10-state palette. Same map shape as useStatusLabels so
// the consumer is unaware. The collapse mapping (2026-05-21):
//   pending / not_applicable           → "Not started"
//   waiting_on_client                  → "Waiting on client"
//   blocked                            → "Blocked"
//   in_progress / review / extended    → "In review"
//   done / paid                        → "Filed"
//   completed                          → "Completed"
// Mutations can still TARGET specific legacy values (e.g., `paid`
// for a payment obligation) — only the DISPLAY collapses, so the
// CPA sees a consistent vocabulary while the schema preserves the
// granularity. `not_applicable` reads as "Not started" today;
// future work will mute the whole timeline at 60% opacity to
// signal "doesn't apply" per PRD §7.
function useLifecycleV2StatusLabels(): StatusLabels {
  const { t } = useLingui()
  return useMemo(
    () => ({
      pending: t`Not started`,
      not_applicable: t`Not started`,
      waiting_on_client: t`Waiting on client`,
      blocked: t`Blocked`,
      in_progress: t`In review`,
      review: t`In review`,
      extended: t`In review`,
      done: t`Filed`,
      paid: t`Filed`,
      completed: t`Completed`,
    }),
    [t],
  )
}

function useReadinessLabels(): ReadinessLabels {
  const { t } = useLingui()
  return useMemo(
    () => ({
      ready: t`Ready`,
      waiting: t`Waiting`,
      needs_review: t`Needs review`,
    }),
    [t],
  )
}

function ObligationQueueStatusControl({
  row,
  labels,
  statuses = ALL_STATUSES,
  disabled,
  onChange,
}: {
  row: StatusControlRow
  labels: StatusLabels
  // Subset of statuses to surface in the dropdown. Defaults to the
  // full ALL_STATUSES (legacy 10-value set). v2 callers pass
  // LIFECYCLE_V2_STATUSES so the dropdown shows only the 6 target
  // states. The trigger still renders `labels[row.status]` so a row
  // currently in a legacy state (e.g. `in_progress`) keeps a readable
  // label even when its value isn't in the dropdown options.
  statuses?: readonly ObligationStatus[]
  disabled: boolean
  onChange: (id: string, status: ObligationStatus) => void
}) {
  const { t } = useLingui()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={t`Change status for ${row.clientName}`}
            disabled={disabled}
            className={cn(
              badgeVariants({ variant: STATUS_VARIANT[row.status] }),
              'h-6 cursor-pointer text-xs outline-none hover:ring-2 hover:ring-state-accent-active-alt focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <BadgeStatusDot tone={STATUS_DOT[row.status]} />
            {labels[row.status]}
          </button>
        }
      />
      <DropdownMenuContent className="min-w-48" align="start">
        <DropdownMenuRadioGroup
          value={row.status}
          onValueChange={(value) => {
            if (typeof value !== 'string' || !isObligationStatus(value)) return
            if (value === row.status) return
            onChange(row.id, value)
          }}
        >
          {statuses.map((status) => {
            // Illegal transitions are surfaced as disabled items rather
            // than hidden — preparers learn the state machine by
            // seeing which targets aren't reachable, with the cell
            // tooltip explaining when relevant. Server rejects too.
            const illegal = !isLegalObligationTransition(row.status, status)
            return (
              <DropdownMenuRadioItem
                key={status}
                value={status}
                disabled={illegal}
                className="gap-2"
                onClick={(event) => event.stopPropagation()}
                title={illegal ? t`Not reachable from ${labels[row.status]}.` : undefined}
              >
                <BadgeStatusDot tone={STATUS_DOT[status]} />
                <span>{labels[status]}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  STATUS_DOT,
  STATUS_VARIANT,
  isObligationStatus,
  useLifecycleV2StatusLabels,
  useReadinessLabels,
  useStatusLabels,
  type ObligationReadiness,
  type ObligationStatus,
}

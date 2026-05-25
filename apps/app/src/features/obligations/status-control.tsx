import { useMemo, type ComponentType, type SVGProps } from 'react'
import { useLingui } from '@lingui/react/macro'
import {
  CircleCheck,
  Construction,
  FileCheck,
  Hourglass,
  Loader,
  MessageSquareText,
} from 'lucide-react'

import type { ObligationInstancePublic, ObligationQueueRow } from '@duedatehq/contracts'
import { isLegalObligationTransition } from '@duedatehq/core/obligation-workflow'
import { Badge, badgeVariants } from '@duedatehq/ui/components/ui/badge'
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

// 2026-05-25 (Yuqi Deadlines #10 status color audit): two collisions
// surfaced — `extended` used the same blue (`info` variant + `normal`
// dot) as `in_progress`, and `done`/`paid`/`completed` all shared
// green. The `extended` collision was a real bug — in_progress means
// "we're actively working", extended means "deadline got pushed
// forward via an extension filing." Different intent, same color.
// Fixed: extended now renders as `secondary` (gray pill) with a blue
// dot — distinct from in_progress (blue pill + blue dot) and from
// pending (gray pill + gray dot).
//
// The done/paid/completed cluster is intentionally green-shared:
// they're all "settled" lifecycle states and the eye doesn't need to
// distinguish them at scan time. The label text ("Filed" / "Paid" /
// "Completed") carries the granular meaning when the row is read.
//
// `waiting_on_client` uses outline + info dot (uncolored pill +
// violet dot) which is already distinct from every filled pill.
// 2026-05-25 (Yuqi review tone audit): `review` flipped from
// `warning` (amber) → `info` (blue). Lifecycle v2 reads `review` as
// "In review" — i.e. work IS happening, someone is actively
// reviewing the prepared return. That's the same family as
// `in_progress` (blue), not the "needs attention" family that
// warning/amber implies. The icon was already `text-text-accent`,
// so the pill was internally inconsistent — amber bg + amber text
// + blue icon. Now: blue bg + blue text + blue icon, matching
// in_progress.
const STATUS_VARIANT: Record<
  ObligationStatus,
  'destructive' | 'info' | 'secondary' | 'outline' | 'success' | 'warning'
> = {
  pending: 'secondary',
  in_progress: 'info',
  review: 'info',
  waiting_on_client: 'outline',
  done: 'success',
  extended: 'secondary',
  paid: 'success',
  not_applicable: 'outline',
  blocked: 'destructive',
  completed: 'success',
}

// 2026-05-25 (status-pill audit §4 #8): `STATUS_DOT` (a
// `Record<ObligationStatus, BadgeStatusDot tone>` mapping)
// lived here as the pre-icon-pass affordance. It was retired
// once the canonical badge + queue control switched to
// icon-led (`STATUS_ICON` + `STATUS_ICON_COLOR`); the only
// remaining consumer was the obligations-page filter tab as a
// fallback that was already unreachable (every status-mapped
// tab passes `icon`). Removed from the export surface so
// future surfaces can't regress onto the legacy treatment.
//
// 2026-05-25 (Yuqi status icon pass): every status now ships a
// lucide icon + a tinted color class so the chrome reads as
// recognizable glyphs ("hourglass = waiting on client", "barrier
// = blocked") rather than tone-dot abstractions. The icon set
// mirrors the lifecycle v2 collapse (see useLifecycleV2StatusLabels):
//   pending / not_applicable           → Loader            (gray)
//   waiting_on_client                  → Hourglass         (amber)
//   blocked                            → Construction      (red)
//   in_progress / review / extended    → MessageSquareText (blue)
//   done / paid                        → FileCheck         (green)
//   completed                          → CircleCheck       (green)
// Used by ObligationStatusReadBadge, ObligationQueueStatusControl,
// the obligations-page filter tabs, and any other surface that
// renders a status label — single source of truth for the
// "status as glyph" vocabulary across the product.
type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>

const STATUS_ICON: Record<ObligationStatus, LucideIcon> = {
  pending: Loader,
  not_applicable: Loader,
  waiting_on_client: Hourglass,
  blocked: Construction,
  in_progress: MessageSquareText,
  review: MessageSquareText,
  extended: MessageSquareText,
  done: FileCheck,
  paid: FileCheck,
  completed: CircleCheck,
}

// Tinted text-color class that pairs with the icon. Applied to
// the icon's `className` (and inherits to label text when the
// caller wants the whole chip tinted). Stays in `text-*` token
// space so dark/light themes pick up the right hue.
const STATUS_ICON_COLOR: Record<ObligationStatus, string> = {
  pending: 'text-text-tertiary',
  not_applicable: 'text-text-tertiary',
  waiting_on_client: 'text-text-warning',
  blocked: 'text-text-destructive',
  in_progress: 'text-text-accent',
  review: 'text-text-accent',
  extended: 'text-text-accent',
  done: 'text-text-success',
  paid: 'text-text-success',
  completed: 'text-text-success',
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
      // 2026-05-23: materials state vocabulary. Was "Ready / Waiting /
      // Needs review". Renamed in three passes to break visual
      // collisions with the obligation status palette:
      //   - "Waiting" collided with status `waiting_on_client` → now
      //     "Outstanding" (materials are outstanding).
      //   - "Ready" was ambiguous (firm-side or client-side?) → now
      //     "Received" (materials have been received).
      //   - "Needs review" collided with status `review` → now
      //     "Needs CPA action" (the firm has to act on the response).
      // These chip labels appear in the audit log entries and the
      // materials overview header. Each label answers the question
      // "what state are the materials in?" not "is anyone ready?"
      ready: t`Received`,
      waiting: t`Outstanding`,
      needs_review: t`Needs CPA action`,
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
  const TriggerIcon = STATUS_ICON[row.status]
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
            {/* 2026-05-25 (Yuqi status icon pass): icon-led status
                chip — TriggerIcon carries the color via
                STATUS_ICON_COLOR, the variant carries the fill.
                Size is enforced by badgeVariants' `[&>svg]:size-3!`
                rule (see docs/Design/icon-sizing.md) — passing a
                size class here would be ignored, so we don't. */}
            <TriggerIcon className={STATUS_ICON_COLOR[row.status]} aria-hidden />
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
            const ItemIcon = STATUS_ICON[status]
            return (
              <DropdownMenuRadioItem
                key={status}
                value={status}
                disabled={illegal}
                className="gap-2"
                onClick={(event) => event.stopPropagation()}
                title={illegal ? t`Not reachable from ${labels[row.status]}.` : undefined}
              >
                <ItemIcon className={cn('size-3.5', STATUS_ICON_COLOR[status])} aria-hidden />
                <span>{labels[status]}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Read-only canonical status badge. Renders the same visual vocabulary
 * (variant + dot tone + v2 label) as `ObligationQueueStatusControl`,
 * but as a plain Badge — no dropdown, no click target.
 *
 * Use this wherever a surface needs to *display* an obligation's
 * status without giving the user a way to change it from the chip.
 * Today: filing-plan rows on `/clients/[id]`, the obligation drawer
 * header on read-only views, and future cross-surface listings.
 *
 * One status, one label, one color — across the whole product. If a
 * caller needs the legacy 10-label set (e.g. an admin / debug
 * surface), pass `useV2Labels={false}`.
 */
function ObligationStatusReadBadge({
  status,
  useV2Labels = true,
  className,
}: {
  status: ObligationStatus
  useV2Labels?: boolean
  className?: string
}) {
  const v2Labels = useLifecycleV2StatusLabels()
  const legacyLabels = useStatusLabels()
  const labels = useV2Labels ? v2Labels : legacyLabels
  const Icon = STATUS_ICON[status]
  // Size enforced by Badge primitive's `[&>svg]:size-3!` rule
  // (see docs/Design/icon-sizing.md). Only the color class is
  // passed here — a size class would be silently overridden.
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      <Icon className={STATUS_ICON_COLOR[status]} aria-hidden />
      {labels[status]}
    </Badge>
  )
}

export {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  ObligationStatusReadBadge,
  STATUS_ICON,
  STATUS_ICON_COLOR,
  STATUS_VARIANT,
  isObligationStatus,
  useLifecycleV2StatusLabels,
  useReadinessLabels,
  useStatusLabels,
  type ObligationReadiness,
  type ObligationStatus,
}

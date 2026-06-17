import { useEffect, useMemo, useRef, type ComponentType, type SVGProps } from 'react'
import { motion, useAnimationControls } from 'motion/react'
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

import { EASE_APPLE } from '@/lib/motion'

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

// Raw statuses that DISPLAY under each v2 stage label (the exact inverse
// of `useLifecycleV2StatusLabels`). Any surface that counts or filters by
// a v2 stage must use this set — counting only the canonical status while
// rows wear the merged label produces "In review 3" above 10 visible
// "In review" chips (in_progress + review + extended all display as one).
const LIFECYCLE_V2_STATUS_SETS = {
  pending: ['pending', 'not_applicable'],
  waiting_on_client: ['waiting_on_client'],
  blocked: ['blocked'],
  review: ['in_progress', 'review', 'extended'],
  done: ['done', 'paid'],
  completed: ['completed'],
} as const satisfies Record<(typeof LIFECYCLE_V2_STATUSES)[number], readonly ObligationStatus[]>

// `extended` renders as `secondary` (gray pill) with a blue dot —
// distinct from in_progress (blue pill + blue dot) and from pending
// (gray pill + gray dot). in_progress means "we're actively
// working", extended means "deadline got pushed forward via an
// extension filing" — different intent, so they must not share a color.
//
// The done/paid/completed cluster is intentionally green-shared:
// they're all "settled" lifecycle states and the eye doesn't need to
// distinguish them at scan time. The label text ("Filed" / "Paid" /
// "Completed") carries the granular meaning when the row is read.
//
// `waiting_on_client` uses outline + info dot (uncolored pill +
// violet dot) which is already distinct from every filled pill.
// `review` is `info` (blue), not `warning` (amber): lifecycle v2
// reads `review` as "In review" — work IS happening, someone is
// actively reviewing the prepared return. That's the same family as
// `in_progress` (blue), not the "needs attention" family that
// warning/amber implies. Blue bg + blue text + blue icon, matching
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

// Every status ships a lucide icon + a tinted color class so the
// chrome reads as recognizable glyphs ("hourglass = waiting on
// client", "barrier = blocked") rather than tone-dot abstractions.
// The icon set mirrors the lifecycle v2 collapse (see useLifecycleV2StatusLabels):
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
//
// Used on the menu surface (dropdown rows) where the icon sits
// against white — keep the tinted tones so the glyph reads as a
// hue swatch next to the label.
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

// Icon-on-pill tones mirror the Badge variant's text tone, so the
// chip reads as one coherent color rather than gray-text-plus-tinted-icon.
// The non-pill rendering (`STATUS_ICON_COLOR`, used in the dropdown
// menu against white) keeps the canonical hue swatch so the menu
// still reads as a color-coded picker.
//
//   pending          → secondary pill (gray text)   → gray icon
//   waiting_on_client→ outline pill   (gray text)   → gray icon
//   extended         → secondary pill (gray text)   → gray icon
//   not_applicable   → outline pill   (gray text)   → gray icon
//
// Tinted statuses (info / success / destructive / warning) keep
// their colored icons because the pill's text tone already matches.
const STATUS_ICON_COLOR_ON_PILL: Record<ObligationStatus, string> = {
  ...STATUS_ICON_COLOR,
  pending: 'text-text-secondary',
  not_applicable: 'text-text-secondary',
  waiting_on_client: 'text-text-secondary',
  extended: 'text-text-secondary',
}

function isObligationStatus(value: string): value is ObligationStatus {
  return (ALL_STATUSES as readonly string[]).includes(value)
}

function useStatusLabels(): StatusLabels {
  const { t } = useLingui()
  return useMemo(
    // `review` reads as "In review" (work-in-progress, not "needs
    // attention") to match the v2 collapse and the tone on the pill.
    () => ({
      pending: t`Not started`,
      in_progress: t`In progress`,
      waiting_on_client: t`Waiting on client`,
      review: t`In review`,
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
// the consumer is unaware. The collapse mapping:
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
      // Materials state vocabulary chosen to avoid visual collisions
      // with the obligation status palette:
      //   - "Outstanding" (not "Waiting", which collides with status
      //     `waiting_on_client`) — materials are outstanding.
      //   - "Received" (not "Ready", which is ambiguous firm-side vs
      //     client-side) — materials have been received.
      //   - "Needs CPA action" (not "Needs review", which collides
      //     with status `review`) — the firm has to act on the response.
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
  displayStatus,
  compact = false,
  readOnly = false,
}: {
  row: StatusControlRow
  labels: StatusLabels
  statuses?: readonly ObligationStatus[]
  disabled: boolean
  onChange: (id: string, status: ObligationStatus) => void
  displayStatus?: ObligationStatus | undefined
  compact?: boolean
  // `readOnly` = the user lacks `obligation.status.update`. Trigger
  // stays clickable so the user can see WHY the pill is inert; menu
  // surfaces an explanatory banner and disables every item.
  readOnly?: boolean
}) {
  const { t } = useLingui()
  const triggerStatus = displayStatus ?? row.status
  const TriggerIcon = STATUS_ICON[triggerStatus]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={
              compact
                ? `${labels[triggerStatus]} · ${t`Change status for ${row.clientName}`}`
                : t`Change status for ${row.clientName}`
            }
            title={
              readOnly
                ? t`You can view status but only preparers, managers, partners, or owners can change it.`
                : compact
                  ? labels[triggerStatus]
                  : undefined
            }
            disabled={disabled}
            className={cn(
              badgeVariants({ variant: STATUS_VARIANT[triggerStatus] }),
              'h-6 cursor-pointer text-xs outline-none hover:ring-2 hover:ring-state-accent-active-alt focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
              compact && 'gap-0 px-1.5',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <TriggerIcon className={STATUS_ICON_COLOR_ON_PILL[triggerStatus]} aria-hidden />
            {compact ? null : labels[triggerStatus]}
          </button>
        }
      />
      <DropdownMenuContent className="min-w-56" align="start">
        {readOnly ? (
          <p className="px-2 py-1.5 text-caption italic leading-snug text-text-tertiary">
            {t`Coordinators can view status but can't change it.`}
          </p>
        ) : null}
        <DropdownMenuRadioGroup
          value={row.status}
          onValueChange={(value) => {
            if (readOnly) return
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
                disabled={readOnly || illegal}
                className="gap-2"
                onClick={(event) => event.stopPropagation()}
                title={
                  readOnly
                    ? undefined
                    : illegal
                      ? t`Not reachable from ${labels[row.status]}.`
                      : undefined
                }
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

  // Status is *observed, not chosen* — it auto-advances from monitored
  // events, often while the user is looking elsewhere. A one-shot scale
  // pop on the chip whose value just changed answers "what moved?" Size
  // is the house change/urgency signal (never a second colour), so the
  // cue stays tone-agnostic across all 6 states and never double-
  // highlights. Fires ONLY on a real transition (ref compare) — never on
  // mount or an unrelated re-render. Reduced-motion is a global no-op via
  // the root <MotionConfig reducedMotion="user"> (main.tsx); no per-call
  // guard, per the motion grammar.
  const controls = useAnimationControls()
  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === status) return
    prevStatus.current = status
    void controls.start({
      scale: [1, 1.12, 1],
      transition: { duration: 0.5, ease: EASE_APPLE, times: [0, 0.35, 1] },
    })
  }, [status, controls])

  // Size enforced by Badge primitive's `[&>svg]:size-3!` rule
  // (see docs/Design/icon-sizing.md). Only the color class is
  // passed here — a size class would be silently overridden.
  // Uses STATUS_ICON_COLOR_ON_PILL so the success statuses (solid
  // green chip) render a white icon instead of disappearing into
  // the fill.
  return (
    <motion.span animate={controls} className="inline-flex origin-center">
      <Badge variant={STATUS_VARIANT[status]} className={className}>
        <Icon className={STATUS_ICON_COLOR_ON_PILL[status]} aria-hidden />
        {labels[status]}
      </Badge>
    </motion.span>
  )
}

export {
  ALL_STATUSES,
  LIFECYCLE_V2_STATUSES,
  LIFECYCLE_V2_STATUS_SETS,
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

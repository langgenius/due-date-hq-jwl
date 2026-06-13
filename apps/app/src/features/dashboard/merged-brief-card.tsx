import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, CoffeeIcon, SparklesIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { DueDateLabel } from '@/components/primitives/due-date-label'
import { ReadinessIndicator } from '@/components/primitives/readiness-indicator'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { isPaymentOverdue, paymentOverdueDays } from '@/features/obligations/payment-overdue'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { formatDatePretty } from '@/lib/utils'
import { useCurrentUserId } from '@/lib/use-current-user-name'
import { ExtensionChip } from './extension-chip'

/**
 * MergedBriefCard — the /today "Priorities" queue (Pencil `jXPZ9` lineage).
 *
 * Composition (Yuqi: "pull the original actions table, merge the good bits"):
 * the BRIEF header survives — title + the count-chip bucket selector (this
 * week / this month / overdue — CPA buckets) + a one-line deterministic lede —
 * and the rows below render through the SAME canonical `<Table>` frame the
 * original Priority Actions table (actions-list.tsx) and /deadlines use:
 * labeled column header band, client + action-verb stacked cell, due cell
 * stacking the relative countdown over the absolute date, owner avatar with
 * the is-mine ring, and the hover-revealed Review CTA. One framed surface,
 * an open section header above it — not a card-in-a-card.
 */
export interface MergedBriefCounts {
  thisWeek: number
  thisMonth: number
  overdue: number
}

// CPA-aligned buckets (Yuqi): "ending today" isn't how CPAs frame their work —
// they think in this week / this month / overdue. Order matches that.
type Bucket = 'week' | 'month' | 'overdue'

const ROWS_PER_BUCKET = 5

function daysUntil(dueIso: string, asOf: Date): number {
  const due = Date.parse(dueIso)
  if (Number.isNaN(due)) return 0
  const a = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const d = new Date(due)
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.round((b - a) / 86_400_000)
}

export function MergedBriefCard({
  counts,
  rows,
  asOfDate,
  isLoading = false,
  onOpenObligation,
}: {
  counts: MergedBriefCounts
  rows: readonly DashboardTopRow[]
  asOfDate: string | null
  // While the dashboard query loads, render the column-aligned skeleton —
  // without it the zero counts masquerade as "Nothing here. You're clear."
  isLoading?: boolean
  onOpenObligation: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const asOf = useMemo(() => (asOfDate ? new Date(asOfDate) : new Date()), [asOfDate])

  const byBucket = useMemo(() => {
    const by: Record<Bucket, DashboardTopRow[]> = { week: [], month: [], overdue: [] }
    for (const r of rows) {
      const d = daysUntil(r.currentDueDate, asOf)
      if (d < 0) by.overdue.push(r)
      else if (d <= 7) by.week.push(r)
      else if (d <= 30) by.month.push(r)
    }
    return by
  }, [rows, asOf])

  const tabs = [
    {
      key: 'week' as const,
      label: t`This week`,
      count: counts.thisWeek,
      dot: 'text-text-secondary',
    },
    {
      key: 'month' as const,
      label: t`This month`,
      count: counts.thisMonth,
      dot: 'text-text-tertiary',
    },
    {
      key: 'overdue' as const,
      label: t`Overdue`,
      count: counts.overdue,
      dot: 'text-text-destructive',
    },
  ]

  // No explicit pick yet → follow the data. Derived (not initial-state) so it
  // stays correct as counts load in; once the user clicks a chip we honor it.
  const [override, setOverride] = useState<Bucket | null>(null)
  // Default to the most actionable non-empty bucket: overdue first, then this
  // week, then this month.
  const selected: Bucket =
    override ?? (counts.overdue > 0 ? 'overdue' : counts.thisWeek > 0 ? 'week' : 'month')
  const activeTotal =
    selected === 'overdue'
      ? counts.overdue
      : selected === 'month'
        ? counts.thisMonth
        : counts.thisWeek
  const shown = byBucket[selected].slice(0, ROWS_PER_BUCKET)
  const moreCount = Math.max(0, activeTotal - shown.length)

  // One-line deterministic summary — the lede of the brief. It surfaces the
  // docs blocker the count chips can't, so it says something they don't.
  const overdueNeedingDocs = byBucket.overdue.filter((r) => r.evidenceCount === 0).length
  const upcoming = counts.thisWeek + counts.thisMonth
  const totalActive = counts.overdue + upcoming

  if (isLoading) {
    // Shape-faithful skeleton: the REAL title + table frame + column header
    // band render (they don't depend on data), only the data slots shimmer —
    // so the page doesn't reflow when rows land. aria-busy for SRs.
    return (
      <section aria-label={t`Priorities`} aria-busy className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="text-region-title text-text-primary">
              <Trans>Priorities</Trans>
            </h2>
            {/* lede slot — tight under the title, mirroring the loaded view */}
            <Skeleton className="h-4 w-64" />
          </div>
          {/* chips slot */}
          <Skeleton className="h-8 w-72 rounded-full" />
        </div>
        <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Form</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Client</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Status</Trans>
                </TableHead>
                <TableHead aria-hidden className="w-full p-0" />
                <TableHead aria-hidden />
                <TableHead className="text-right">
                  <Trans>Due</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[0, 1, 2].map((i) => (
                <TableRow key={i} className="even:bg-transparent [&_td]:py-2.5">
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="flex w-[220px] flex-col gap-1.5 md:w-[300px] xl:w-[440px]">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded" />
                  </TableCell>
                  <TableCell aria-hidden className="p-0" />
                  <TableCell>
                    <Skeleton className="size-5 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-1.5">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    )
  }

  return (
    // OPEN section — header + lede float on the page like the Alerts section;
    // the table below is the page's single framed surface. Fewer borders
    // (Yuqi: avoid too much use of borders), and the section grammar matches
    // the rest of /today: title row → content surface. gap-3 = the one
    // in-section gap token (audit: kill the 10/11/12 drift).
    <section aria-label={t`Priorities`} className="flex w-full flex-col gap-3">
      {/* Header — title first (flush with the page rail so all section titles
          share one x — the audit's eye-line fix; the old leading icon-circle
          pushed this title 38px off the rail) + the count-chip bucket selector
          pinned right. */}
      {/* 2026-06-12 (Yuqi /today #6 "spacing between Priorities title and body
          is too much — do the math"): the bucket selector (32px) is taller than
          the title (23px), so a shared `items-center` row centered the title and
          left ~17px to the lede (5px row-slack + 12px section gap) while the
          title-to-row-top was only 5px — lopsided. Title + lede now form a tight
          title/subtitle pair (gap-1.5 = 6px) in a left column; the chip group
          pins right and `items-start` aligns it to the TITLE so it never
          inflates the title→lede gap again. */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {/* "Priorities", not "Today's brief" — the card leads with overdue
                work, so a "today" headline would lie about its own content. */}
            <h2 className="text-region-title text-text-primary">
              <Trans>Priorities</Trans>
            </h2>
            {/* The sparkles marks the list as Smart-Priority curated and opens
                the explainer on hover. Accent at REST, not just on hover —
                per the two-color discipline (today-actions-table-style.md)
                accent belongs on exactly the Smart Priority marks; a gray
                sparkle was hiding the one mark the budget is spent on. */}
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <button
                    type="button"
                    aria-label={t`About Priorities`}
                    className="inline-flex size-4 cursor-help items-center justify-center rounded text-text-accent outline-none transition-colors hover:text-text-accent-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                    {...props}
                  >
                    <SparklesIcon className="size-3.5" aria-hidden />
                  </button>
                )}
              />
              <TooltipContent>
                <div className="flex max-w-[280px] flex-col gap-1 text-left">
                  <span className="font-semibold">
                    <Trans>Curated by Smart Priority</Trans>
                  </span>
                  <span>
                    <Trans>
                      The top open deadlines in this view, ranked by Smart Priority and bucketed by
                      due window — the next work most worth handling, not every deadline.
                    </Trans>
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Lede — one-line deterministic summary, tight under the title.
              Suppressed in the all-clear state: the celebration block below
              already says it, and saying it twice would deflate the moment. */}
          {totalActive === 0 ? null : (
            <p className="text-sm text-text-secondary">
              {counts.overdue > 0 && overdueNeedingDocs === counts.overdue ? (
                // The count already lives in the "Overdue N" chip 40px away —
                // when every overdue row shares the blocker, the lede carries
                // ONLY the insight the chips can't (one home per fact).
                <Trans>Every overdue deadline is waiting on source documents.</Trans>
              ) : counts.overdue > 0 && overdueNeedingDocs > 0 ? (
                <Trans>
                  {counts.overdue} overdue, {overdueNeedingDocs} awaiting source documents.
                </Trans>
              ) : counts.overdue > 0 ? (
                <Trans>{counts.overdue} overdue.</Trans>
              ) : (
                <Trans>{upcoming} coming up, none overdue.</Trans>
              )}
            </p>
          )}
        </div>

        {/* Bucket selector borrowed from the /deadlines queue: rounded-full
            track, white active pill, tone dot + label + muted count. Hidden
            entirely when nothing is open — a track of three zeros is chrome
            with no decision in it (the all-clear block below carries the
            state). */}
        {totalActive > 0 ? (
          <div className="flex items-center gap-0.5 rounded-full bg-background-subtle p-1">
            {tabs.map((tab) => {
              const active = tab.key === selected
              return (
                <button
                  key={tab.key}
                  type="button"
                  data-active={active}
                  onClick={() => setOverride(tab.key)}
                  aria-pressed={active}
                  // `active:scale-[0.98]` = a 1-frame press acknowledgement; the
                  // transition covers colors + transform together. An empty
                  // inactive bucket dims to 60% — a "This week 0" chip at full
                  // strength invites a dead-end click (still clickable, the
                  // empty state explains where the work sits).
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-text-secondary outline-none transition-[color,background-color,transform,opacity] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt active:scale-[0.98] data-[active=true]:bg-background-default data-[active=true]:text-text-primary motion-reduce:transition-none',
                    tab.count === 0 && !active && 'opacity-60',
                  )}
                >
                  <span
                    className={cn('size-1.5 shrink-0 rounded-full bg-current', tab.dot)}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  <span className="tabular-nums text-text-tertiary">{tab.count}</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {totalActive === 0 ? (
        // The all-clear moment (Yuqi: "bring more FUN" — empty states are
        // where playfulness is free). Mirrors the Alerts empty-state anatomy
        // (icon in an accent disc + headline + one sub-line) so the two
        // sections celebrate the same way. Coffee, not confetti: the calm
        // brand's idea of a party. Every word is real state — no fiction.
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center animate-in fade-in duration-150 motion-reduce:animate-none">
          <span
            className="flex size-14 items-center justify-center rounded-full bg-state-accent-hover"
            aria-hidden
          >
            <CoffeeIcon className="size-6 text-text-accent" strokeWidth={1.75} />
          </span>
          <div className="flex max-w-md flex-col gap-1">
            <p className="text-base font-medium text-text-primary">
              <Trans>All clear — nothing due, nothing late.</Trans>
            </p>
            <p className="text-sm text-text-tertiary">
              <Trans>New deadlines land here as rules match your clients.</Trans>
            </p>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <p
          key={selected}
          className="rounded-xl border border-divider-subtle px-5 py-6 text-center text-sm text-text-tertiary animate-in fade-in duration-150 motion-reduce:animate-none"
        >
          {activeTotal > 0 ? (
            // "open the queue" is a real link — the message names the next
            // action, so the action lives on the words themselves instead of
            // making the user hunt for the footer link.
            <Trans>
              None in the priority shortlist —{' '}
              <Link to="/deadlines" className="text-text-accent underline-offset-2 hover:underline">
                open the queue
              </Link>{' '}
              to see all {activeTotal}.
            </Trans>
          ) : counts.overdue > 0 ? (
            // The selected WINDOW is empty but work exists in other tabs —
            // claiming "No open deadlines" while the lede above says
            // "2 overdue" is a same-screen contradiction. Name where the
            // work actually sits.
            <Trans>Nothing in this window — {counts.overdue} overdue in the Overdue tab.</Trans>
          ) : (
            <Trans>Nothing in this window — {totalActive} coming up in the other tabs.</Trans>
          )}
        </p>
      ) : (
        // The canonical table frame shared with the original Priority Actions
        // table + /deadlines (table-canonical-style.md): rounded-xl,
        // border-divider-regular, white fill, labeled header band. Zebra
        // opted out so the queue reads as one flat surface. Keyed by the
        // selected bucket so switching chips plays a quick fade-in (the
        // house `animate-in` recipe; static for reduced-motion users).
        <div
          key={selected}
          // overflow-x-auto (not -hidden): when the columns genuinely can't
          // fit (phone widths), the frame scrolls sideways instead of
          // silently amputating STATUS/owner/DUE. Corner clipping behaves
          // the same when content fits.
          className="overflow-x-auto rounded-xl border border-divider-regular bg-background-default animate-in fade-in duration-150 motion-reduce:animate-none"
        >
          <Table className="[&_tbody_tr]:even:bg-transparent">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Form</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Client</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Status</Trans>
                </TableHead>
                {/* Spacer — absorbs the leftover width BETWEEN the identity
                    cluster (form/client/status) and the ownership cluster
                    (owner/due). Critique 2026-06-12 ("dead right half"): the
                    old layout packed every column left and dumped ~40% of
                    blank frame after DUE — the page's key signal hid
                    mid-table and the hover Review CTA materialized in the
                    void. DUE now pins to the frame's right rail,
                    right-aligned, so the red countdowns stack into one
                    scannable column at the edge the eye expects. */}
                <TableHead aria-hidden className="w-full p-0" />
                <TableHead>
                  <span className="sr-only">
                    <Trans>Owner</Trans>
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <Trans>Due</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => (
                <BriefTableRow
                  key={row.obligationId}
                  row={row}
                  asOf={asOf}
                  asOfDate={asOfDate}
                  onOpen={onOpenObligation}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer — ONE link. When the shortlist truncates, the count rides
          inside the link ("See all 12 deadlines") instead of a separate
          "{n} more not shown" caption — information posing as an affordance
          becomes the affordance (critique 2026-06-12). */}
      <div className="flex items-center justify-end gap-2">
        {/* Canonical `<TextLink>` accent — same primitive + variant as the
            Alerts section's "View all", so the page's two go-to-the-full-list
            affordances share one voice (the hand-rolled Link was a
            vocabulary violation). */}
        <TextLink variant="accent" render={<Link to="/deadlines" />} className="group shrink-0">
          {moreCount > 0 ? (
            <span className="tabular-nums">
              <Trans>See all {activeTotal} deadlines</Trans>
            </span>
          ) : (
            <Trans>See all deadlines</Trans>
          )}
          {/* Arrow nudge on hover — motion on the glyph, not the surface. */}
          <ArrowRightIcon
            className="size-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </TextLink>
      </div>
    </section>
  )
}

function BriefTableRow({
  row,
  asOf,
  asOfDate,
  onOpen,
}: {
  row: DashboardTopRow
  asOf: Date
  asOfDate: string | null
  onOpen: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const d = daysUntil(row.currentDueDate, asOf)
  const currentUserId = useCurrentUserId()
  const isMine = currentUserId !== null && row.assigneeId === currentUserId
  // Action verb inline — the lingui `t` macro must stay in component scope;
  // passing it into a helper compiles fine (tsgo) but returns "" at runtime.
  // Verb is STAGE-FIRST: a return in review/blocked has already gathered its
  // docs, so status must win over the evidence check — otherwise an in-review
  // row wrongly reads "Attach the source document". evidenceCount only drives
  // the verb in the early doc-gathering stages.
  const verb =
    row.status === 'waiting_on_client'
      ? t`Follow up with the client for documents`
      : row.status === 'review'
        ? t`Review the prepared return and sign off`
        : row.status === 'blocked'
          ? t`Clear the blocker to proceed`
          : row.evidenceCount === 0
            ? t`Attach the source document`
            : d <= 0
              ? t`Confirm filing or payment status`
              : d <= 2
                ? t`Final-check owner, source, and cutoff`
                : t`Re-verify the source still applies`
  // Readiness (Docs N/M) only matters while still gathering source docs — hide
  // it once prep is done (review/blocked/filed/…) so an in-review row doesn't
  // contradict itself with a "Docs 0/3" reading.
  const showReadiness =
    row.status === 'pending' || row.status === 'in_progress' || row.status === 'waiting_on_client'
  // Payment-late is a SEPARATE obligation from the filing — it rides next to the
  // status as its own chip, so the due column can stay the filing countdown that
  // matches the action (Yuqi: two obligations, two homes).
  const paymentLate = isPaymentOverdue(row.paymentDueDate, asOfDate)
  const paymentLateDays = paymentOverdueDays(row.paymentDueDate, asOfDate)
  // …but one row tells ONE lateness story (critique 2026-06-12: "Overdue" badge
  // + red "7d late" + gray "Pay 7d late" is three signals for one fact). The
  // chip only renders when payment lateness says something the DUE column's
  // filing countdown doesn't — i.e. the filing isn't late, or it's late by a
  // different number of days.
  const showPaymentLateChip = paymentLate && (d >= 0 || paymentLateDays !== -d)
  return (
    <TableRow
      onClick={() => onOpen(row.obligationId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(row.obligationId)
        }
      }}
      tabIndex={0}
      aria-label={t`Open ${verb} for ${row.clientName}`}
      // Interactivity + the `group` hook live here; zebra/border/transition
      // come from the canonical TableRow. The hover Review CTA renders in
      // the spacer CELL (between the clusters) — no absolute overlay, no
      // mask, the due date stays readable on hover. py-2.5 (not the default
      // py-4): the two-line stacked cells already carry height — this lands
      // the row near the canonical /deadlines 56px pitch instead of 68
      // (spacing audit). hover:shadow-none suppresses the primitive's 2px
      // inset left accent bar — Yuqi: no side-border highlight inside a
      // rounded frame.
      className="group cursor-pointer hover:!bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt [&_td]:py-2.5"
    >
      {/* FORM */}
      <TableCell>
        <TaxCodeBadge code={row.taxType} />
      </TableCell>
      {/* CLIENT — name (row anchor) + the instruction/readiness sub-line,
          stacked like the original actions table. Fixed width (440px at xl,
          the original ActionsTable's client width) so STATUS / owner / DUE
          follow right after the content instead of being pushed to the
          table's far edge by a greedy flex column (Yuqi: "why are
          status/due/assignee so far right?"). The trailing spacer cell
          absorbs the leftover width. Width steps DOWN with the viewport —
          a hard 440px at tablet width shoved STATUS/owner/DUE past the
          frame edge where overflow clipped them invisibly. */}
      <TableCell>
        <div className="flex w-[220px] min-w-0 flex-col gap-0.5 md:w-[300px] xl:w-[440px]">
          {/* 14/500, NOT text-row-anchor (14/600) — Yuqi 2026-06-12: "so many
              bold things on the page, people lost focus". Five 600-weight
              client names plus three card titles plus three section titles
              made eleven equal bolds; nothing won. The name is key data (500);
              the row's ONE loud element is the red lateness in DUE. */}
          <span className="truncate text-base font-medium text-text-primary">{row.clientName}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-tertiary transition-colors group-hover:text-text-secondary">
            <span className="truncate">{verb}</span>
            {showReadiness ? (
              <ReadinessIndicator
                obligationType={row.obligationType}
                attached={row.evidenceCount}
                className="shrink-0"
              />
            ) : null}
          </span>
        </div>
      </TableCell>
      {/* STATUS — workflow badge (+ extension), payment-late as its own quiet
          gray chip below. Neutral, not red: this design system has no amber,
          and RED must keep pointing at exactly one thing per row — the filing
          lateness in the due column (Yuqi). */}
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-1.5">
            <ObligationStatusReadBadge status={row.status} className="h-5 w-fit text-xs" />
            {row.status === 'extended' ? <ExtensionChip /> : null}
          </div>
          {showPaymentLateChip ? (
            <span className="inline-flex items-center rounded bg-background-subtle px-1.5 py-0.5 text-caption-xs text-text-secondary">
              <Trans>Pay {paymentLateDays}d late</Trans>
            </span>
          ) : null}
        </div>
      </TableCell>
      {/* Spacer — pairs with the header's spacer: identity cluster left,
          ownership cluster (owner + due) pinned to the right rail. The
          hover-revealed Review CTA lives HERE, in the breathing room between
          the clusters (Yuqi: the old absolute overlay + gradient mask
          covered the due date on hover — the exact column being scanned).
          Nothing sits under the button now, so the mask is gone entirely. */}
      <TableCell aria-hidden className="relative p-0">
        {/* Absolutely positioned so the button contributes ZERO min-content
            width to the spacer column — with in-flow content the `w-full`
            spacer broke the table's width math and pushed DUE past the
            frame edge (clipped countdowns). Absolute content keeps the
            spacer layout-empty while the button still appears in the gap. */}
        <div className="absolute inset-y-0 right-4 flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
          <Button
            type="button"
            size="xs"
            variant="primary"
            tabIndex={-1}
            aria-hidden
            onClick={(event) => {
              event.stopPropagation()
              onOpen(row.obligationId)
            }}
          >
            <Trans>Review</Trans>
          </Button>
        </div>
      </TableCell>
      {/* OWNER — xs avatar with the is-mine ring, riding just left of the
          date it answers for. */}
      <TableCell>
        <AssigneeAvatar
          size="xs"
          name={row.assigneeName}
          isMine={isMine}
          title={
            row.assigneeName === null
              ? t`Unassigned`
              : isMine
                ? t`Assigned to you (${row.assigneeName})`
                : row.assigneeName
          }
        />
      </TableCell>
      {/* DUE — relative FILING countdown (paymentDueDate nulled so payment-late
          doesn't hijack it) stacked over the absolute date, right-aligned on
          the frame's right rail so the red countdowns stack into one scan
          column. Late/due-today countdowns step UP to 16px — Yuqi 2026-06-12:
          the REAL important thing gets size. Weight stays the primitive's
          500: red + 600 was "tooooo strong" (Yuqi same day — never
          double-highlight; color and size already carry it, bold would be a
          third channel). Future countdowns ("in 10d") stay at the quiet
          13/500 default so the This week/This month buckets don't shout. */}
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-0.5">
          <DueDateLabel
            days={d}
            status={row.status}
            paymentDueDate={null}
            asOfDate={asOfDate}
            className={cn(d <= 0 && 'text-[16px] leading-[22px]')}
          />
          <span className="text-xs tabular-nums text-text-tertiary">
            {formatDatePretty(row.currentDueDate)}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

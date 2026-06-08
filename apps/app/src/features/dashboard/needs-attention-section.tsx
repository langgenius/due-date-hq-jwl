import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CircleCheckIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { TextLink } from '@duedatehq/ui/components/ui/text-link'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import {
  useAlertsAffectedClients,
  useAlertsListQueryOptions,
  useAlertSourceHealthQueryOptions,
} from '@/features/alerts/api'
import { PulsingDot } from '@/features/alerts/components/PulsingDot'

// 2026-05-31 (Yuqi Pencil Sq0EX): NeedsAttentionOverflowCard is no
// longer used in this section — the "View all" section link below
// the grid replaces the per-card overflow tile. The export is
// retained from the card module for any future callers.
import { NeedsAttentionCard } from './needs-attention-card'

// Dashboard "Alerts" section — promotes state-policy Alerts (the
// product's wedge: "a rule changed → here are the affected clients")
// to a first-class row.
//
// 2026-06-03 (Yuqi B): the section now has two clearly different
// weights. When alerts are live it is the page's loudest block — a
// destructive-tinted hero card row. When the feed is calm it collapses
// to a single quiet status line (no tinted box), so an empty alerts
// state stops claiming hero real estate it hasn't earned. Previously
// the empty state rendered the same large tinted panel + dashed
// "No active alerts" banner as the live state, which read as the most
// important thing on the page even when nothing needed review.

// 2026-05-31 (Yuqi Pencil Sq0EX): grid widened from 2 to 3 cards
// in the wide-viewport row so the Today alerts surface mirrors the
// 3-card composition in the design. Overflow continues to expose
// the View all link below the grid; the per-card overflow column
// is dropped (the Pencil design uses a section-level link).
const VISIBLE_ALERTS = 3
const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

// 2026-05-24 (critique P0): aligned with the sidebar's
// `TODAY_ALERTS_LIMIT` so this page and the sidebar Alerts badge share
// a single React Query cache entry.
const TODAY_ALERTS_LIMIT = 50

function NeedsAttentionSection() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openAlert } = useAlertDrawer()

  const alertsQuery = useQuery(useAlertsListQueryOptions(TODAY_ALERTS_LIMIT))
  // Source-health rides alongside the alert count so an empty list can
  // distinguish "all good" from "feed paused / broken" — same UI,
  // opposite meaning.
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? []
  const sources = sourceHealthQuery.data?.sources ?? []
  const visibleAlerts = alerts.slice(0, VISIBLE_ALERTS)
  // One batched detail request for the visible cards instead of one
  // `getDetail` per card — the cards only need affected-client names.
  const affectedByAlert = useAlertsAffectedClients(visibleAlerts.map((alert) => alert.id))
  const totalAlertCount = alerts.length
  // Describes jurisdiction coverage, not raw adapter count, so hidden
  // policy-watch adapters can grow without the header reading
  // "monitoring 150 sources."
  const hasNationalMonitoringCoverage =
    MVP_RULE_JURISDICTIONS.length === NATIONAL_MONITORING_JURISDICTION_COUNT

  // ── Calm feed → thin single line, no tinted box ──
  if (totalAlertCount === 0) {
    const watchedCount = sources.filter(
      (source) => source.enabled && source.healthStatus !== 'paused',
    ).length
    const pausedCount = sources.filter(
      (source) => source.enabled && source.healthStatus === 'paused',
    ).length

    return (
      <section
        aria-label={t`Alerts`}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 py-0.5 text-xs text-text-tertiary"
      >
        <CircleCheckIcon className="size-3.5 shrink-0 text-text-success" aria-hidden />
        <span className="font-medium text-text-secondary">
          <Trans>Alerts</Trans>
        </span>
        {hasNationalMonitoringCoverage ? (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <PulsingDot tone="success" active />
              <Trans>Monitoring Federal + 50 states + DC</Trans>
            </span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        {sourceHealthQuery.isLoading ? (
          <span>
            <Trans>checking sources…</Trans>
          </span>
        ) : watchedCount === 0 ? (
          <span className="text-text-warning">
            <Trans>no sources monitored</Trans>
          </span>
        ) : pausedCount > 0 ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-text-warning">
              <Plural value={pausedCount} one="# source paused" other="# sources paused" />
            </span>
            <Link
              to="/rules/sources"
              className="underline-offset-2 hover:text-text-secondary hover:underline"
            >
              <Trans>View</Trans>
            </Link>
          </span>
        ) : (
          <span>
            <Trans>nothing needs your review</Trans>
          </span>
        )}
      </section>
    )
  }

  // ── Live alerts → hero card row ──
  return (
    <section
      aria-label={t`Alerts`}
      // 2026-05-26 (Yuqi sixty-ninth pass — "背景太浅了，看不出"):
      // alert-state background bumped from `/25` (basically
      // invisible) to a real solid `bg-state-destructive-hover`
      // + a destructive border so the panel actually reads as
      // "this is the alerts zone." Empty-state keeps the
      // neutral tint but adds a subtle border so the section
      // still has a shape on the page.
      // 2026-05-26 (Yuqi follow-up — "remove the border"): dropped
      // `border` + border-color rules. The destructive bg-tint
      // (when alerts are live) and the section bg (when empty)
      // already give the panel its shape against the page wash;
      // the explicit border was just doubling the boundary.
      // 2026-05-27 (audit-drain X1 D18 + Yuqi cross-route consistency):
      // empty-state and alerts-loaded paths now have different
      // outer styling. Alerts-loaded keeps the destructive-tinted
      // padded box (`p-3` + `gap-2.5` + `bg-state-destructive-hover`)
      // because the urgent rows earn that weight. Empty state drops
      // ALL outer styling — the inner `StatusBanner` primitive
      // provides its own dashed border, bg, and padding (matching
      // /rules/pulse and /clients), so wrapping it in a second
      // tinted padded box was double chrome. This compresses the
      // empty section more aggressively than D18's `gap-2 px-3 py-2`
      // while also unifying with the canonical StatusBanner shape.
      // 2026-05-28 (Yuqi /today polish): always set `gap-4` so the
      // section heading + body have the same rhythm as Actions this
      // 2026-05-31 (Yuqi DS-first revision): destructive-toned
      // panel wash dropped. The previous `bg-state-destructive-hover
      // p-3 rounded-xl` painted the entire section red whenever
      // any alert was present — even for low-severity informational
      // alerts. That's a section-level urgency signal that the
      // design system doesn't have a pattern for (Card primitive
      // is per-block, not per-section), and it inconsistent with
      // the un-washed Actions-this-week section below.
      //
      // Per-alert urgency now lives where it belongs — on the
      // individual `<NeedsAttentionCard>` chrome (the
      // LowConfidenceBadge, the source-link icon, the card's
      // hover state) — and the section reads as a regular
      // gap-rhythm section like every other one on /today.
      // 2026-06-04 round 4 (Yuqi feedback "Today's page should not
      // be more than a screen long"): section internal gap-4 →
      // gap-3 to keep the alerts row + cards above the fold.
      className="flex flex-col gap-3"
    >
      {/* 2026-05-31 (Yuqi DS-first revision): `px-3` now applied
          unconditionally — the outer destructive-toned wash was
          dropped, so the conditional padding compensation for the
          alerts-present case is no longer needed. The h2 left
          edge aligns with Actions-this-week's h2 in both states. */}
      {/* 2026-06-03 (Yuqi Pencil VmcdD — alerts header): split into
          a `justify-between` row carrying the h2 + chips cluster on
          the left and a quiet "View all" TextLink on the right.
          The count chip switches from a bare number to "{N} active"
          with a leading `<BadgeStatusDot tone="error" />` so the
          live-state read matches the monitoring chip's dot+text
          shape. */}
      {/* 2026-06-03 (Yuqi /critique pass — Reviewer panel
          P3 microcopy): count chip "{N} active" → "{N} urgent".
          "Active" was vague (active vs inactive? active in what
          sense?); "urgent" matches the alert's semantic load
          ("you need to act on these") and parallels the Due-this-
          week section's "{N} due" chip below — both sections now
          signal urgency with a single specific word in the chip
          slot. */}
      {/* 2026-06-04 round 6 (Yuqi "alerts, actions this week title
          should be 大标题Today的下一级"): h2 stepped down from
          text-2xl (matching Today h1) → text-xl (one tier below).
          The section h2's are second-tier titles under the page
          h1, NOT same-tier; this resets the hierarchy. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold tracking-[0.4px] text-text-muted uppercase">
          <Trans>Alerts</Trans>
          {totalAlertCount > 0 ? (
            // 2026-06-04 round 45 (Yuqi /today feedback #2 — "just
            // write a number, [8]"): the count chip drops the
            // "urgent" word. The destructive bg already signals
            // urgency; the literal word was redundant. Bare count
            // reads cleaner at a glance.
            //
            // 2026-06-04 round 49 (Yuqi /today #1 — "remove the
            // dot"): BadgeStatusDot dropped from the urgent-count
            // pill. The destructive bg already signals urgency; the
            // leading dot was redundant chrome inside a tight
            // numeric chip. Bare count reads at-a-glance from
            // further away.
            // 2026-06-04 round 81 (Yuqi #3 "gray, default kind of
            // numbering"): count chip dropped from `destructive`
            // (red) to `outline` (gray). The number is a scope
            // signal, not an urgency one — the destructive red
            // was claiming alarm semantics that the PulsingDot +
            // card chrome already carry.
            <Badge variant="outline" className="tabular-nums">
              <span>{totalAlertCount}</span>
            </Badge>
          ) : null}
          {hasNationalMonitoringCoverage ? (
            // 2026-06-04 round 14 (Yuqi page-feedback "hover on
            // can show tooltip or expanded information?"): wrapped
            // the Monitoring chip in a Tooltip that expands what
            // "monitoring" actually does — naming the cadence and
            // the change types we're watching for, so the CPA knows
            // what counts as a Pulse-worthy event. `cursor-help`
            // signals the interactivity to mouse users; keyboard
            // users can tab to the trigger and get the same expansion.
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <Badge
                    variant="ghost"
                    size="sm"
                    className="cursor-help px-0 text-text-secondary"
                    {...props}
                  >
                    <PulsingDot tone="success" active />
                    {/* 2026-06-04 round 18 (Yuqi page-feedback
                        "Monitoring: Federal · 50 States · DC"):
                        copy refined — colon after Monitoring,
                        middot separators instead of `+`, capital
                        S on States. The middot reads as a list
                        separator (matches the rest of the app's
                        meta-row separator vocab); the colon
                        scopes "Monitoring" as the verb-anchor of
                        the chip. */}
                    <Trans>Monitoring: Federal · 50 States · DC</Trans>
                  </Badge>
                )}
              />
              <TooltipContent>
                <div className="flex max-w-[280px] flex-col gap-1 text-left">
                  <span className="font-semibold">
                    <Trans>National policy watch</Trans>
                  </span>
                  <span>
                    <Trans>
                      Daily sweep of IRS + 50 states + DC tax authority sources for new rules,
                      extended deadlines, rate changes, and form revisions. Matches against your
                      clients' obligations and surfaces what actually affects you.
                    </Trans>
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </h2>
        {totalAlertCount > 0 ? (
          // 2026-06-04 round 16 (Yuqi page-feedback "remove arrow"):
          // trailing ChevronRightIcon dropped. The "View all" copy
          // alone carries the affordance; the chevron was reading
          // as a redundant directional cue next to underlined link
          // chrome.
          <TextLink
            onClick={() => void navigate('/alerts')}
            aria-label={t`View all ${totalAlertCount} alerts`}
          >
            <Trans>View all</Trans>
          </TextLink>
        ) : null}
      </div>

      {totalAlertCount > 0 ? (
        // 2026-05-27 (Yuqi — "怎么会变成这样vertical"): restored
        // the horizontal grid layout. Two alert cards sit side-by-side
        // with a fixed 160px overflow column when there are extra
        // alerts. The full-width vertical stack read as a cramped
        // mini-inbox; the grid lets Today's alerts sit as parallel
        // tiles like the rest of the dashboard surfaces.
        // 2026-05-28 (cherry-pick conflict resolve): kept Yuqi's
        // deterministic grid over the earlier flex-wrap try — the
        // grid + 160px overflow column is the authored intent.
        // 2026-05-31 (Yuqi Pencil Sq0EX): grid bumped to support
        // 3 cards side by side. The overflow column previously
        // sat as a 160px sibling column; now overflow surfaces via
        // a section-level "View all" link below the grid (see
        // below) so all three card slots stay equal-width. The
        // fragment groups the grid + view-all link as siblings
        // under the same ternary branch.
        // 2026-05-31 (Yuqi DS-first revision): both the cards grid
        // and the view-all link now carry `px-3` since the outer
        // panel wash + its compensating padding were removed. Same
        // gutter rhythm as Actions-this-week below — sections look
        // consistent across the page.
        <>
          <div
            className={cn(
              // 2026-06-04 (Yuqi alignment fix): dropped `px-3` on
              // the cards grid so card left edges align with the
              // section header above, the page H1, and the
              // ActionsTable wrapper below.
              'grid items-stretch gap-3',
              alerts.length === 1 && 'grid-cols-1',
              alerts.length === 2 && 'grid-cols-2',
              alerts.length >= 3 && 'grid-cols-3',
            )}
          >
            {visibleAlerts.map((alert) => (
              <div key={alert.id} className="h-full min-w-0">
                <NeedsAttentionCard
                  alert={alert}
                  affectedClients={affectedByAlert.get(alert.id) ?? []}
                  onReview={() => openAlert(alert.id)}
                />
              </div>
            ))}
          </div>
          {/* 2026-06-03 (Yuqi Pencil VmcdD): bottom "View all" link
              moved up into the section header (see top of the
              <section>). Removing the duplicate here so there's a
              single right-aligned affordance per section. */}
        </>
      ) : null}
    </section>
  )
}

export { NeedsAttentionSection }

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, CoffeeIcon, SparklesIcon, XIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'

import { useAlertsListQueryOptions, useAlertsMorningSweepQueryOptions } from './api'
import { alertImpactLevel } from './lib/impact-level'
import { useMorningSweep } from './MorningSweepContext'

/**
 * `MorningSweepDialog` — AI-style daily briefing surface.
 *
 * Clicking the button opens this Dialog with a generated summary of
 * the last 24 hours' alerts and a "Show me just these alerts" CTA that
 * applies the canonical Morning-sweep filter preset (last 24h + needs
 * action).
 *
 * Phase architecture:
 *   • **Phase 1 (this commit):** client-side mock summary. Template
 *     string mashes up the alert list into the briefing prose. No
 *     LLM call, no backend, no cost. Validates the UX shape so we
 *     can ship the feature in front of the CPA today.
 *   • **Phase 2 (next):** server-side `pulse.morningSweepSummary`
 *     oRPC procedure. One generation per firm per morning, cached
 *     in KV (or the same place pulse alerts live). LLM call ranks
 *     + summarises; client renders the response. Same UI; the only
 *     change is `summary` source from local template → server.
 *   • **Phase 3 (after):** real personalisation. The server pass
 *     joins `affectedClients` per alert so the summary can say
 *     "Your client Acme Manufacturing is in 2 of these" instead of
 *     the current bulk count. Requires the affected-clients
 *     pre-computation off the per-alert detail query.
 *
 * Phase 1 personalisation is intentionally modest: we already have
 * the `matchedCount + needsReviewCount` aggregate per alert from
 * the list payload, so the briefing can say "K alerts affect your
 * clients" without per-alert detail fetches. Named-client mentions
 * wait for Phase 3.
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

type Briefing = {
  /** Plain-prose summary paragraph(s). */
  paragraphs: string[]
  /** Top-3 alerts the CPA should act on first, ranked by impact. */
  topActions: PulseAlertPublic[]
  /** All alerts inside the last-24h window — what the filter applies to. */
  windowAlerts: PulseAlertPublic[]
}

/**
 * Compose the client-side mock briefing. Pure function for ease of
 * test + swap-to-server later.
 *
 * Ranking heuristic for "top 3":
 *   1. HIGH IMPACT (5+ impacted obligations) first
 *   2. Then MEDIUM IMPACT
 *   3. Within tier: descending by client-impact count
 *
 * Mirrors `alertImpactLevel` + the impact pill ranking used on the
 * card — REAL client impact (matchedCount + needsReviewCount), not
 * inverted AI confidence. When Phase 2 server LLM lands, the ranking
 * moves into the prompt and this client-side mock becomes a fallback.
 */
function composeBriefing(alerts: PulseAlertPublic[], firmName: string | null): Briefing {
  const now = Date.now()
  const windowAlerts = alerts.filter(
    (a) => now - new Date(a.publishedAt).getTime() <= TWENTY_FOUR_HOURS_MS,
  )
  const tierRank = (a: PulseAlertPublic): number => {
    const level = alertImpactLevel(a)
    if (level === 'high') return 3
    if (level === 'medium') return 2
    return 1
  }
  const ranked = [...windowAlerts].toSorted((a, b) => {
    const diff = tierRank(b) - tierRank(a)
    if (diff !== 0) return diff
    const aImpact = a.matchedCount + a.needsReviewCount
    const bImpact = b.matchedCount + b.needsReviewCount
    return bImpact - aImpact
  })
  const topActions = ranked.slice(0, 3)

  // Aggregate counts for the prose.
  const total = windowAlerts.length
  const highImpactCount = windowAlerts.filter((a) => alertImpactLevel(a) === 'high').length
  const withClientImpact = windowAlerts.filter(
    (a) => a.matchedCount + a.needsReviewCount > 0,
  ).length

  // Paragraph 1 — the headline.
  const firmTag = firmName ? `${firmName}'s` : 'your firm'
  const paragraphs: string[] = []
  if (total === 0) {
    paragraphs.push(
      `Quiet overnight — no new regulatory alerts published in the last 24 hours for ${firmTag} coverage.`,
    )
    return { paragraphs, topActions: [], windowAlerts: [] }
  }
  paragraphs.push(
    total === 1
      ? `1 new regulatory alert published in the last 24 hours.`
      : `${total} new regulatory alerts published in the last 24 hours.` +
          (highImpactCount > 0
            ? ` ${highImpactCount} HIGH IMPACT.`
            : ` None flagged as HIGH IMPACT.`),
  )

  // Paragraph 2 — impact framing.
  if (withClientImpact > 0) {
    paragraphs.push(
      withClientImpact === 1
        ? `1 alert touches your client roster — review before client communication this morning.`
        : `${withClientImpact} alerts touch your client roster — review these before client communication this morning.`,
    )
  } else {
    paragraphs.push(`None of these alerts match your current client roster yet.`)
  }

  return { paragraphs, topActions, windowAlerts }
}

/**
 * Button trigger for the MorningSweep dialog. Sits in the
 * `rules.pulse.tsx` page-header actions cluster. Replaces the
 * previous toggle-button: click opens the dialog, the "Show me
 * just these alerts" CTA inside the dialog applies the filter.
 */
/**
 * Inline panel that renders above the alerts list when the user
 * clicks the morning sweep button.
 *
 * The panel reads its open state from `MorningSweepContext.digestOpen`
 * so both the header button (toggles open) and the panel's own ×
 * button (closes) write to the same state. Renders nothing when
 * closed — callers can drop
 * `<MorningSweepPanel />` unconditionally above their list and it
 * only takes layout when the user has asked to see the briefing.
 */
export function MorningSweepPanel() {
  const sweep = useMorningSweep()
  if (!sweep || !sweep.digestOpen) return null
  return <MorningSweepDialogBody onClose={sweep.closeDigest} />
}

function MorningSweepDialogBody({ onClose }: { onClose: () => void }) {
  const { t } = useLingui()
  const sweep = useMorningSweep()
  // Server-side AI summary. The alerts list query is retained as a
  // fallback when the server call is loading, errors, or returns
  // 'fallback' source — we can still render the client-side template
  // so the dialog never shows an empty body.
  const summaryQuery = useQuery(useAlertsMorningSweepQueryOptions())
  const alertsQuery = useQuery(useAlertsListQueryOptions(100))
  // Pin the fallback list to the alerts query DATA reference (memoize
  // the dereference) so the useMemo below depends on a stable identity
  // instead of a freshly-allocated array on every render. Satisfies
  // react-hooks/exhaustive-deps.
  const alerts = useMemo(() => alertsQuery.data?.alerts ?? [], [alertsQuery.data?.alerts])
  const clientFallback = useMemo(() => composeBriefing(alerts, null), [alerts])
  // Prefer the server briefing; fall back to client template when
  // unavailable or when source === 'fallback' AND the deterministic
  // server fallback hasn't materially differentiated from the
  // client one. The server already returns a fully-shaped briefing
  // even in 'fallback' source, so the only reason to render the
  // local clientFallback is loading / network-error states.
  const briefing = summaryQuery.data?.briefing ?? null
  const briefingSource = summaryQuery.data?.source ?? null
  // `generatedAt` is not surfaced in the dialog body; if a "Last
  // generated …" caption is added, re-read `summaryQuery.data?.generatedAt`
  // at that call site.

  const applyFilter = () => {
    if (sweep && !sweep.active) sweep.toggle()
    // Closing the panel after Apply lets the newly-filtered alerts
    // list take over the viewport — the user got their briefing, now
    // they're working the queue.
    onClose()
  }

  // Normalize the two briefing shapes (server LLM output + client
  // fallback) into a single render-ready structure. Server
  // briefings carry a per-alert `whyNow` + `clientMentions`; the
  // client fallback only knows the alert tier + count.
  type RenderAction = {
    alertId: string
    title: string
    jurisdiction: string
    tier: 'high' | 'medium' | 'low'
    impacted: number
    whyNow: string | null
    clientMentions: string[]
  }
  const renderBriefing: {
    paragraphs: string[]
    topActions: RenderAction[]
    windowAlerts: PulseAlertPublic[]
  } = briefing
    ? {
        paragraphs: [briefing.headline, ...briefing.bullets],
        topActions: briefing.topActions.map((a): RenderAction => {
          const fullAlert = alerts.find((al) => al.id === a.alertId)
          const tier = fullAlert ? alertImpactLevel(fullAlert) : ('medium' as const)
          return {
            alertId: a.alertId,
            title: a.title,
            jurisdiction: fullAlert?.jurisdiction ?? '',
            tier,
            impacted: fullAlert ? fullAlert.matchedCount + fullAlert.needsReviewCount : 0,
            whyNow: a.whyNow,
            clientMentions: a.clientMentions,
          }
        }),
        windowAlerts: alerts.filter(
          (a) => new Date(a.publishedAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000,
        ),
      }
    : {
        paragraphs: clientFallback.paragraphs,
        topActions: clientFallback.topActions.map((a): RenderAction => {
          return {
            alertId: a.id,
            title: a.title,
            jurisdiction: a.jurisdiction,
            tier: alertImpactLevel(a),
            impacted: a.matchedCount + a.needsReviewCount,
            whyNow: null,
            clientMentions: [],
          }
        }),
        windowAlerts: clientFallback.windowAlerts,
      }

  // Single horizontal row: Sparkle icon + the briefing's HEADLINE (one
  // paragraph, no bullets, no top-3 list) + a compact "Show me" action
  // + close. No title, no subtitle, no provenance chip — the icon IS
  // the AI signal and the headline IS the content. Truncates with
  // `line-clamp-1` so the row stays a true single line at any viewport
  // width.
  const headline =
    renderBriefing.paragraphs[0] ??
    (briefingSource === 'fallback' ? t`AI summarisation unavailable.` : t`Brewing your briefing…`)
  const isLoading = summaryQuery.isLoading || alertsQuery.isLoading
  return (
    <section
      aria-labelledby="morning-sweep-panel-title"
      className="flex items-center gap-3 rounded-xl bg-state-accent-hover px-4 py-2.5"
    >
      {/* Leading icon is Coffee while the brewing message is showing.
          Once the briefing arrives the Sparkles (AI signal) takes
          over. */}
      {isLoading ? (
        <CoffeeIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
      ) : (
        <SparklesIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
      )}
      <p
        id="morning-sweep-panel-title"
        className="line-clamp-1 min-w-0 flex-1 text-base text-text-secondary"
        aria-live="polite"
      >
        {isLoading ? <Trans>Brewing your briefing…</Trans> : headline}
      </p>
      {!isLoading && renderBriefing.windowAlerts.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={applyFilter}
          className="h-7 shrink-0 px-2 text-xs text-text-accent hover:bg-state-accent-hover-alt hover:text-text-accent"
        >
          <Trans>Show me</Trans>
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon-xs"
        type="button"
        onClick={onClose}
        aria-label={t`Close morning sweep`}
        className="shrink-0 hover:bg-state-accent-hover-alt hover:text-text-primary"
      >
        <XIcon className="size-3.5" aria-hidden />
      </Button>
    </section>
  )
}

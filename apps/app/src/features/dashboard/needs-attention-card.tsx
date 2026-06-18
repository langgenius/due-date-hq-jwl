import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon, ExternalLinkIcon, Plus } from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { alertTone } from '@/features/alerts/alert-tone'
// PulseSourceMeta was retired from this card in round 81 — source
// now renders inline in the subject block via `<ExternalLinkIcon>` +
// truncated label with the URL on tooltip hover.
import { impactBadgeFromAlert } from '@/features/alerts/components/pulse-alert-chrome'
import { SeverityChip } from '@/components/primitives/severity-chip'
import { StateBadge } from '@/components/primitives/state-badge'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { formatRelativeTime } from '@/lib/utils'

// Act-by dates are date-valued (a filing due date, not a moment), so format
// in UTC to avoid the previous-day off-by-one in western timezones.
function formatActByDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'

// Dashboard variant of the Alert card. Tuned for the dashboard's
// "scan-and-act" mode and built to Pencil node VVMj9 specs:
//
//   • Card chrome: `bg-background-default` (white), `rounded-xl`
//     (16px), NO border (Pencil shows the stroke disabled). Hover
//     drops to `bg-background-subtle` (gray-100). This is the same
//     pattern the /alerts AlertCard uses — both surfaces serve
//     the same alert data and the same gray SidebarInset wash, so
//     the chrome should match. Pencil VVMj9 originally drew a
//     gray-tinted card (designed on a white canvas); inverting to
//     white-on-gray-wash is the equivalent in the live app.
//   • Fixed min-height (160px) so 3 cards in a row stay vertically
//     aligned even when one title is short. Content column uses
//     `justify-between` to push the affected-clients row to the
//     bottom edge regardless of how tall the title block grows.
//   • Empty client list rendered as a quiet caption, NOT an empty
//     chip row — preserves the bottom-anchor without rendering an
//     awkward empty container.
//   • Responsive: caller (`NeedsAttentionSection`) drives the grid
//     `grid-cols-{1,2,3}` based on alert count + viewport.
//
// Every internal element ships from a DS primitive:
//   • `<PulseSourceMeta>` — "source · timestamp" row
//   • `<StateBadge>` — jurisdiction chip in the top meta row
// Title text hangs from the card's left padding directly. Source
// meta sits flush left under the title (round 42 dropped the
// leading tone icon, so no title inset is needed any more).
// Minimum card height per Pencil VVMj9 — enforces vertical alignment
// across the 3-card row. Title can line-clamp to 2 lines; if the
// resulting card is shorter than this floor, the empty-state /
// chip row pushes to the bottom edge via the parent's `justify-between`.
const CARD_MIN_HEIGHT_CLASS = 'min-h-[120px]'

// Returns the FULL deduplicated list of affected client names so the
// Meta row's tooltip can render every name on hover (the card shows a
// single "{N} clients" label with a tooltip-revealed roster, not a
// chip cluster).
//

/**
 * When an alert title starts with the source name (e.g. title "FL DOR
 * Bulletin has very-low-confidence…" alongside source "FL DOR Bulletin"),
 * the two read as a duplicate. Strip the source prefix from the title
 * when it matches, then clean up a trailing separator (":", "·", "—",
 * "-") if present.
 *
 * Edge cases:
 *   • If `title === source` exactly (or trimmed-equal), there's
 *     nothing meaningful to surface as a stripped title. Return
 *     the raw title so the card still shows SOMETHING in the
 *     subject slot; the source line below renders the same text
 *     once, which is the round-81 problem in miniature but is
 *     less bad than rendering an empty `<h3>`.
 *   • If the trimmed-rest is purely punctuation/whitespace, treat
 *     as "no meaningful content" and fall back to raw title.
 *   • Otherwise strip the prefix and the trailing separator
 *     (same shape as the original).
 * Defensive — falls back to the raw title for any non-matching
 * shape so unrelated titles render unchanged.
 *
 * @internal Exported for unit tests.
 */
export function dedupeTitleSource(title: string, source: string): string {
  const t = title.trim()
  const s = source.trim()
  if (!s) return t
  // Edge case: source IS the entire title. Nothing meaningful
  // after stripping; fall back to the raw title.
  if (t.toLowerCase() === s.toLowerCase()) return t
  if (t.toLowerCase().startsWith(s.toLowerCase())) {
    const rest = t
      .slice(s.length)
      .trim()
      .replace(/^[-—:·]+\s*/u, '')
    // Also guard against rest being non-empty but pure
    // punctuation/whitespace — render the raw title instead.
    if (rest.length > 0 && /[\p{L}\p{N}]/u.test(rest)) {
      // Capitalize first letter so the stripped title still reads
      // like a proper sentence.
      return rest.charAt(0).toUpperCase() + rest.slice(1)
    }
  }
  return t
}

function NeedsAttentionCard({
  alert,
  affectedClients = [],
  onReview,
}: {
  alert: PulseAlertPublic
  affectedClients?: PulseAffectedClient[]
  onReview: () => void
}) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount
  // Dot tone comes from the canonical helper so the dashboard card +
  // drawer + alerts list all agree on the same alert's tone.
  const tone = alertTone(alert)
  // The section batch-loads detail, so derive the form code from the
  // first affected client's `taxType` to render the TaxCodeBadge in the
  // bottom row without an extra round-trip. Null when no clients matched.
  const firstForm = affectedClients[0]?.taxType ?? null
  // VxRyF bottom-meta data: confidence % and the alert's own form code.
  const confidencePct = Math.round(alert.confidence * 100)
  // At rest the confidence pill stays neutral; on card hover it switches
  // to its confidence-tier color (high → green, medium → amber, low →
  // red) via the canonical helper.
  const confidenceHoverToneClass = {
    high: 'group-hover:text-text-success',
    medium: 'group-hover:text-text-warning',
    low: 'group-hover:text-text-destructive',
  }[aiConfidenceTier(alert.confidence)]
  const alertForm = alert.forms[0] ?? firstForm
  // Mirror the AlertCard severity-pill + StateBadge vocabulary so the
  // dashboard summary and the alerts list speak the same visual language.
  // `impactBadgeFromAlert` is the shared helper from pulse-alert-chrome so
  // the tier mapping stays canonical. The tier reflects REAL client impact
  // (matchedCount + needsReviewCount), not inverted AI confidence. Only the
  // high-impact tier renders a (red) severity pill.
  const severity = impactBadgeFromAlert(alert)

  // Pencil X3j4nt TimeColumn shows "2h ago" + an absolute "14:32"
  // in mono. Resolve the firm's timezone so the absolute time
  // matches the CPA's working clock, not UTC.
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const absoluteTime = alert.publishedAt
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: firmTimezone,
      }).format(new Date(alert.publishedAt))
    : ''

  // Clicking this card opens the alert drawer in-place on the dashboard
  // (via `useAlertDrawer().openDrawer`) — not a navigation to /alerts.
  // This is intentional:
  //   • Alert review is list-driven and quick (1-3 min per alert).
  //     Keeping the user on Today lets them sweep through the 2-3
  //     cards without losing place.
  //   • Same pattern the obligation drawer + client drawer use —
  //     consistency across surfaces beats per-page novelty.
  //   • The overflow tile ("View N more") DOES navigate to
  //     /alerts — that's the right behaviour when the user is
  //     asking for the full list, not one specific alert.
  // If alerts grow into long-form investigation work later we'll
  // revisit and promote to a route.
  return (
    <button
      type="button"
      onClick={onReview}
      aria-label={t`Open Pulse alert details: ${alert.title}`}
      className={cn(
        // A single uniform surface that lifts off the page. Alert cards
        // take the gray fill (bg-background-section) while the Actions
        // table stays white: different surface colors split the two
        // regions and let the white table — the CPA's work — read as the
        // focal point. Impact is carried by the High-impact pill +
        // "Affects N clients", not by a receding fill. No drop shadow.
        'group relative flex h-full w-full min-w-0 cursor-pointer flex-col gap-3 rounded-xl bg-background-section p-5 text-left',
        // Hover carried by the bg step alone — no lift, no floating shadow
        // (Yuqi hated the floating-shadow interaction; restrained-shadows
        // rule). Micro-interactions (Yuqi feedback #3): a 1-frame press
        // scale acknowledges the click
        // and the open-affordance arrow below fades in on hover. Motion on
        // glyphs and scale, never shadows.
        'transition-[background-color,transform] hover:bg-background-subtle active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
      data-tone={tone}
    >
      {/* Open affordance — ↗ fades in at the top-right corner on hover/focus
          and nudges diagonally, telling the user the whole card is the click
          target (the footer's source link opens elsewhere, so the card needed
          its own "this opens the alert" hint). */}
      <ArrowUpRightIcon
        className="pointer-events-none absolute top-4 right-4 size-4 text-text-tertiary opacity-0 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
        aria-hidden
      />
      {/* Outer block holding the head row + the subject stack. */}
      <div className="flex min-w-0 flex-col gap-2">
        {/* Top row — meta strip. LEFT (severity + state pill) +
            RIGHT (relative + absolute time). The form pill lives in
            the bottom row next to "N Clients" as a `<TaxCodeBadge>`
            so it shares the chrome + label format the Actions this
            week table uses. */}
        {/* ONE left-aligned meta cluster — the date ("May 18") sits right
            after the form badge instead of being pushed to the far right edge
            by a justify-between split. */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* HIGH IMPACT — only renders for high-impact alerts. The SAME
              shared <SeverityChip level="neutral"> as the /alerts row + drawer
              header — one alert, one pill, every surface (same-entity-same-
              rendering). NEUTRAL (2026-06-18): reach is a quiet tag, not an
              alarm; red/amber stay on urgency. */}
          {severity.id === 'high' ? (
            <SeverityChip level="neutral">
              <Trans>High impact</Trans>
            </SeverityChip>
          ) : null}

          {/* STATE — jurisdiction pill (seal + code; full name on hover). */}
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium tracking-[0.2px] text-text-secondary outline-none"
                  {...props}
                >
                  <StateBadge
                    code={alert.jurisdiction}
                    size="xs"
                    preview={false}
                    style={{ width: 14, height: 14 }}
                  />
                  {alert.jurisdiction}
                </span>
              )}
            />
            <TooltipContent>{alert.jurisdiction}</TooltipContent>
          </Tooltip>

          {/* FORM badge — gray-filled code chip (TaxCodeBadge mono). */}
          {alertForm ? (
            <TaxCodeBadge
              code={alertForm}
              className="rounded-lg border-divider-subtle px-2 py-[2px] text-xs"
            />
          ) : null}

          {/* DATE — relative time inline (exact on tooltip), right after the
              form so the two read together rather than splitting the row.
              Catch-up rows (origin='catchup') swap the publication framing
              for the state framing: the announcement is months old, so
              "5mo ago" reads as stale news — what matters is that it is in
              effect and when the firm must act. */}
          {/* text-text-tertiary, not text-muted: the muted token measures
              ~2.9:1 at this size — an AA failure for real information (the
              publish date is decision input, not decoration). */}
          {alert.origin === 'catchup' ? (
            <span className="shrink-0 whitespace-nowrap text-xs font-normal text-text-tertiary tabular-nums">
              {alert.actionDeadline ? (
                <Trans>In effect · act by {formatActByDate(alert.actionDeadline)}</Trans>
              ) : (
                <Trans>In effect</Trans>
              )}
            </span>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="shrink-0 whitespace-nowrap text-xs font-normal text-text-tertiary tabular-nums outline-none"
                    {...props}
                  >
                    {formatRelativeTime(alert.publishedAt)}
                  </span>
                )}
              />
              <TooltipContent>{absoluteTime}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Subject — title + source caption. The source is wrapped in a
            Tooltip that surfaces the full source URL on hover; the span gets
            cursor-pointer + onClick→window.open(sourceUrl) so clicking it
            opens the official authority page in a new tab, with
            stopPropagation so the card's onReview doesn't also fire. */}
        <div className="flex min-w-0 flex-col gap-1.5">
          {/* Title — the card's signal. `dedupeTitleSource` strips a leading
              source prefix so the bottom source link doesn't echo it.
              14/500, two demotions from the original 16/600 item-title:
              first to 14 (the monitor must not out-size the work, critique
              2026-06-12), then to 500 (Yuqi same day: "so many bold things
              on the page, people lost focus" — the 600 budget on /today is
              the page title + the two section anchors; everything else is
              ≤500 so the red lateness countdowns own the attention). */}
          <h3
            className="line-clamp-2 min-w-0 text-base font-medium text-text-primary"
            title={alert.title}
          >
            {dedupeTitleSource(alert.title, alert.source)}
          </h3>
          {/* Alert body — the source's verbatim quote under the headline (Yuqi:
              add the body text back). This is the authority's own words, which
              ARE distinct from the title (both title + summary derive from the
              AI headline). Clamped to ONE line (Yuqi 2026-06-15) so the card
              stays tight; the full text lives in the drawer. Skipped when
              absent or when it would just echo the title. */}
          {alert.verbatimQuote && alert.verbatimQuote.trim() !== alert.title.trim() ? (
            <p className="line-clamp-1 min-w-0 text-xs text-text-secondary">
              {alert.verbatimQuote}
            </p>
          ) : null}
        </div>
      </div>

      {/* Bottom meta — top hairline divider, then "Affects N client" +
          overlapping client-initial avatars · conf% — spacer — source link.
          The row doesn't wrap: the affected-clients line can shrink while the
          source holds a fixed width on the right, so the two always share a
          single line. */}
      <div className="flex items-center gap-x-2 border-t border-divider-subtle pt-3 text-xs">
        {/* The affected-clients signal is just the client COUNT ("N clients")
            (Yuqi: don't show client names — back to the count label). When
            nothing matched, a quiet muted "No clients matched". */}
        {impacted > 0 ? (
          <span className="inline-flex min-w-0 shrink items-center gap-1.5 whitespace-nowrap">
            {/* font-medium: the affected-client count is the card's key
                datum (it's WHY the alert earned a card) — 500 per the
                type-weight ladder, while the rest of the footer stays 400. */}
            <span className="font-medium text-text-secondary">
              <Plural value={impacted} one="# client" other="# clients" />
            </span>
          </span>
        ) : (
          // Zero state matches the /alerts row + rail verbatim — "No
          // client impact", muted, no icon (one phrasing for the zero
          // answer across every alert surface).
          <span className="shrink-0 whitespace-nowrap text-text-tertiary">
            <Trans>No client impact</Trans>
          </span>
        )}

        {/* The confidence read-out (and its leading dot separator) is
            invisible at rest and fades in on card hover. opacity-0 reserves
            the layout width so the row doesn't shift; the tier color resolves
            on hover via confidenceHoverToneClass. */}
        <span className="inline-flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span aria-hidden className="text-text-muted">
            ·
          </span>
          <span
            className={cn(
              'text-xs tabular-nums text-text-secondary transition-colors',
              confidenceHoverToneClass,
            )}
          >
            {/* "{N}% conf" — the same order the /alerts row meter uses. */}
            <Trans>{confidencePct}% confidence</Trans>
          </span>
        </span>

        <span className="flex-1" />

        {/* Source — text + trailing ↗, the one external-link order across
            every alert surface (row / rail / drawer). Interactive only
            when a sourceUrl exists; url-less alerts render a plain
            caption instead of a dead window.open(null) click
            (state-completeness audit). */}
        {alert.sourceUrl ? (
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <span
                  role="link"
                  tabIndex={0}
                  className="inline-flex min-w-0 max-w-[160px] cursor-pointer items-center gap-1 rounded-sm text-xs text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  onClick={(event) => {
                    event.stopPropagation()
                    window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  {...props}
                >
                  <span className="truncate text-right">{alert.source}</span>
                  <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                </span>
              )}
            />
            <TooltipContent>
              <div className="flex max-w-[320px] flex-col gap-0.5 text-left">
                <span className="font-semibold">
                  <Trans>Open source</Trans>
                </span>
                <span className="break-all text-text-secondary">{alert.sourceUrl}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="inline-flex min-w-0 max-w-[160px] items-center text-xs text-text-tertiary">
            <span className="truncate text-right">{alert.source}</span>
          </span>
        )}
      </div>
    </button>
  )
}

// Quiet one-line form of the alert — used by `NeedsAttentionSection` for
// alerts whose impact is zero (matchedCount + needsReviewCount === 0). A
// full card whose punchline is "No client impact" spends ~150px of hero
// real estate apologizing; the row keeps the fact (what changed, where,
// when, that nobody's affected) at one line of quiet type. Click still
// opens the same drawer as the card.
function NeedsAttentionQuietRow({
  alert,
  onReview,
}: {
  alert: PulseAlertPublic
  onReview: () => void
}) {
  const { t } = useLingui()
  return (
    <button
      type="button"
      onClick={onReview}
      aria-label={t`Open Pulse alert details: ${alert.title}`}
      className={cn(
        '-mx-2 flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-left',
        'transition-colors hover:bg-background-section',
        'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
    >
      {/* Same jurisdiction vocabulary as the card's meta row, one size down. */}
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium tracking-[0.2px] text-text-secondary">
        <StateBadge
          code={alert.jurisdiction}
          size="xs"
          preview={false}
          style={{ width: 14, height: 14 }}
        />
        {alert.jurisdiction}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-text-primary" title={alert.title}>
        {dedupeTitleSource(alert.title, alert.source)}
      </span>
      <span className="shrink-0 whitespace-nowrap text-xs text-text-tertiary tabular-nums">
        {formatRelativeTime(alert.publishedAt)}
      </span>
      {/* The zero answer keeps the same phrasing every alert surface uses. */}
      <span className="shrink-0 whitespace-nowrap text-xs text-text-tertiary">
        <Trans>No client impact</Trans>
      </span>
    </button>
  )
}

// Overflow tile rendered next to the alert cards when there are more
// alerts than the dashboard's `VISIBLE_ALERTS` cap allows.
function NeedsAttentionOverflowCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { i18n } = useLingui()
  const ariaLabel = i18n._(
    plural(count, {
      one: 'View # more Alert',
      other: 'View # more Alerts',
    }),
  )
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className={cn(
        'group/overflow flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 self-stretch rounded-xl px-4 text-text-secondary',
        'transition-colors hover:text-text-primary',
        'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        CARD_MIN_HEIGHT_CLASS,
      )}
    >
      <span className="inline-flex items-center gap-1 text-sm">
        <Plus
          className="size-3.5 transition-transform group-hover/overflow:rotate-90"
          aria-hidden
        />
        <Trans>{count} more</Trans>
      </span>
    </button>
  )
}

export { NeedsAttentionCard, NeedsAttentionOverflowCard, NeedsAttentionQuietRow }

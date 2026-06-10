import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { Plus, UsersIcon } from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { alertTone } from '@/features/alerts/alert-tone'
// PulseSourceMeta was retired from this card in round 81 — source
// now renders inline in the subject block via `<ExternalLinkIcon>` +
// truncated label with the URL on tooltip hover.
import { impactBadgeFromAlert } from '@/features/alerts/components/pulse-alert-chrome'
import { changeKindLabel } from '@/features/alerts/components/PulseChangeKindChip'
import { StateBadge } from '@/components/primitives/state-badge'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { formatRelativeTime } from '@/lib/utils'
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
const CARD_MIN_HEIGHT_CLASS = 'min-h-[160px]'

// Returns the FULL deduplicated list of affected client names so the
// Meta row's tooltip can render every name on hover (the card shows a
// single "{N} clients" label with a tooltip-revealed roster, not a
// chip cluster).
//
// Affected rows are batch-loaded by the parent section (one
// `getDetailsBatch` for all visible cards via
// `useAlertsAffectedClients`) and passed in, instead of each card
// fetching its own `pulse.getDetail`. This keeps the dashboard at a
// single batched request regardless of how many cards render.
function uniqueAffectedClientNames(affected: PulseAffectedClient[]): {
  allNames: string[]
} {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const row of affected) {
    if (!seen.has(row.clientName)) {
      seen.add(row.clientName)
      ordered.push(row.clientName)
    }
  }
  return {
    allNames: ordered,
  }
}

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
  // Affected client names come from the parent's batched load (one
  // request for all visible cards), not a per-card query.
  const { allNames } = uniqueAffectedClientNames(affectedClients)
  // The section batch-loads detail, so derive the form code from the
  // first affected client's `taxType` to render the TaxCodeBadge in the
  // bottom row without an extra round-trip. Null when no clients matched.
  const firstForm = affectedClients[0]?.taxType ?? null
  // VxRyF bottom-meta data: confidence %, the alert's own form code, and
  // overlapping initial-avatars of the matched clients.
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
  const avatars = allNames.slice(0, 3).map((name) => ({
    name,
    initials: name
      .split(/\s+/)
      .map((word) => word[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  }))
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
        'group flex h-full w-full min-w-0 cursor-pointer flex-col gap-4 rounded-xl bg-background-section p-[18px] text-left',
        // Hover is carried by the bg step alone (no border hairline).
        'transition-colors duration-200 hover:bg-background-subtle',
        'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
      data-tone={tone}
    >
      {/* Outer block holding the head row + the subject stack. */}
      <div className="flex min-w-0 flex-col gap-2">
        {/* Top row — meta strip. LEFT (severity + state pill) +
            RIGHT (relative + absolute time). The form pill lives in
            the bottom row next to "N Clients" as a `<TaxCodeBadge>`
            so it shares the chrome + label format the Actions this
            week table uses. */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          {/* LEFT cluster — pill row. */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {/* HIGH IMPACT — Pencil VxRyF red pill (#FEE4E2 bg / #B42318
                text → destructive tokens). Full words "High impact", not
                the abbreviated "HIGH". Only renders for high-impact alerts. */}
            {severity.id === 'high' ? (
              <span className="inline-flex shrink-0 items-center rounded-[4px] bg-state-destructive-hover px-2 py-[3px] text-xs font-semibold tracking-[0.4px] text-text-destructive uppercase">
                <Trans>High impact</Trans>
              </span>
            ) : null}

            {/* STATE — jurisdiction pill. Yuqi: the actual state badge (the
                seal graphic used on /alerts), not a generic pin. Tooltip
                preserves the full jurisdiction on hover. */}
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-[0.2px] text-text-secondary outline-none"
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

            {/* FORM badge — gray-filled code chip. The form code inherits
                TaxCodeBadge's canonical `font-mono tracking-tight` — same mono
                treatment the /alerts table rows use; only the scale + padding
                are overridden. */}
            {alertForm ? (
              <TaxCodeBadge
                code={alertForm}
                className="rounded-lg border-divider-subtle px-2 py-[2px] text-xs"
              />
            ) : null}

            {/* CHANGE KIND — e.g. "DEADLINE SHIFTED", plain label. Neutral
                (two-color rule). Invisible at rest and fades in on card hover;
                opacity-0 reserves its width so the meta row doesn't reflow. On
                hover it stays the muted gray tone — no accent-tone switch. */}
            <span className="shrink-0 text-xs font-semibold tracking-[0.4px] text-text-tertiary uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {changeKindLabel(alert.changeKind)}
            </span>
          </div>

          {/* RIGHT cluster — only relative time ("2h ago" / "Jun 4")
              renders inline; exact time is surfaced via tooltip
              (mirrors the /alerts row pattern). */}
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <span
                  className="shrink-0 whitespace-nowrap text-xs font-normal text-text-muted tabular-nums outline-none"
                  {...props}
                >
                  {formatRelativeTime(alert.publishedAt)}
                </span>
              )}
            />
            <TooltipContent>{absoluteTime}</TooltipContent>
          </Tooltip>
        </div>

        {/* Subject — title + source caption. The source is wrapped in a
            Tooltip that surfaces the full source URL on hover; the span gets
            cursor-pointer + onClick→window.open(sourceUrl) so clicking it
            opens the official authority page in a new tab, with
            stopPropagation so the card's onReview doesn't also fire. */}
        <div className="flex min-w-0 flex-col gap-1">
          {/* Title — the card's signal (the full summary lives in the alert
              drawer). `dedupeTitleSource` strips a leading source prefix so the
              bottom source link doesn't echo it. */}
          <h3
            className="line-clamp-2 min-w-0 text-base font-semibold leading-[1.3] text-text-primary"
            title={alert.title}
          >
            {dedupeTitleSource(alert.title, alert.source)}
          </h3>
        </div>
      </div>

      {/* Bottom meta — top hairline divider, then "Affects N client" +
          overlapping client-initial avatars · conf% — spacer — source link.
          The row doesn't wrap: the affected-clients line can shrink while the
          source holds a fixed width on the right, so the two always share a
          single line. */}
      <div className="flex items-center gap-x-2 border-t border-divider-subtle pt-3 text-xs">
        {/* Affects-clients line. Yuqi #5: icon + label share ONE color.
            #6: when nothing matched, both step to the lighter muted tone so
            noise alerts recede. */}
        <span
          className={cn(
            // The affected-clients line is the row's priority signal, so it
            // holds `shrink-0` and never truncates — the fixed-width source
            // (right) is what gives way on tight cards.
            'inline-flex shrink-0 items-center gap-1 whitespace-nowrap',
            impacted > 0 ? 'font-medium text-text-secondary' : 'text-text-muted',
          )}
        >
          {/* Users icon for the affected-clients line, unified with the
              /alerts AlertCard + PulseAlertRow. */}
          <UsersIcon className="size-3 shrink-0" aria-hidden />
          {impacted > 0 ? (
            <Plural value={impacted} one="Affects # client" other="Affects # clients" />
          ) : (
            <Trans>No clients matched</Trans>
          )}
        </span>

        {/* Gate the avatar stack on real client impact, not just the presence
            of affected-client names. When nothing matched (impacted === 0) the
            row reads "No clients matched" with no avatars trailing it. */}
        {impacted > 0 && avatars.length > 0 ? (
          <span className="flex shrink-0 items-center pl-0.5">
            {avatars.map((avatar, index) => (
              <Tooltip key={avatar.name}>
                <TooltipTrigger
                  render={(props) => (
                    <span
                      className={cn(
                        // One neutral tone + the card's font. Initials carry
                        // identity; the full name is on hover. The fill +
                        // text-primary initials read against the card's gray
                        // surface instead of dissolving in; the separating ring
                        // is a faint rim just below the fill so it reads without
                        // darkening the overlap gap.
                        'inline-flex size-5 items-center justify-center rounded-full bg-[#e9ebf0] text-caption-xs font-semibold text-text-primary ring-[1.5px] ring-[#e2e5ea] outline-none',
                        index > 0 && '-ml-1.5',
                      )}
                      {...props}
                    >
                      {avatar.initials}
                    </span>
                  )}
                />
                <TooltipContent>{avatar.name}</TooltipContent>
              </Tooltip>
            ))}
            {/* Overflow counter — Yuqi: "+1 in a circle is hard to read."
                Now plain text after the stack so it reads as "and N more"
                rather than a mystery avatar. */}
            {impacted > avatars.length ? (
              <span className="ml-1.5 text-xs font-medium text-text-tertiary tabular-nums">
                +{impacted - avatars.length}
              </span>
            ) : null}
          </span>
        ) : null}

        {/* The confidence read-out (and its leading dot separator) is
            invisible at rest and fades in on card hover. opacity-0 reserves
            the layout width so the row doesn't shift; the tier color resolves
            on hover via confidenceHoverToneClass. */}
        <span className="inline-flex shrink-0 items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span aria-hidden className="text-text-muted">
            ·
          </span>
          <span
            className={cn(
              'text-xs font-medium tabular-nums text-text-secondary transition-colors',
              confidenceHoverToneClass,
            )}
          >
            <Trans>conf {confidencePct}%</Trans>
          </span>
        </span>

        <span className="flex-1" />

        {/* Source link — opens the authority page; URL on tooltip hover.
            Yuqi #8: a simple arrow (ArrowUpRight) instead of the external-
            link glyph. */}
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <span
                className="inline-flex min-w-0 max-w-[160px] cursor-pointer items-center gap-1 text-xs font-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary"
                onClick={(event) => {
                  event.stopPropagation()
                  window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
                }}
                {...props}
              >
                <span className="truncate text-right">{alert.source}</span>
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
      </div>
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
          className="size-3.5 transition-transform duration-200 group-hover/overflow:rotate-90"
          aria-hidden
        />
        <Trans>{count} more</Trans>
      </span>
    </button>
  )
}

export { NeedsAttentionCard, NeedsAttentionOverflowCard }

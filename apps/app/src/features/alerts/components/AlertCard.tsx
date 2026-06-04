import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertCircle, Astroid, BriefcaseIcon, Building2, UserRound } from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'

import { AlertConfidencePill } from './AlertConfidencePill'
import { AlertSourceBadge } from './AlertSourceBadge'
import { AlertSourceStatusBadge } from './AlertSourceStatusBadge'
import { AlertReadinessChip } from './AlertReadinessStatus'
import { AlertStatusBadge } from './AlertStatusBadge'

const VISIBLE_CLIENT_NAMES = 3

interface AlertCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  /**
   * Affected-client rows for THIS alert, batch-loaded by the parent
   * (AlertsListPage) in a single `getDetailsBatch` request and passed down
   * instead of each card fetching its own `pulse.getDetail`. Defaults to empty
   * so the card renders fine before the batch resolves (or in isolation).
   */
  affectedClients?: PulseAffectedClient[]
  /** Inline actions are hidden when the card is rendered as a folded "more" entry. */
  compact?: boolean
  /**
   * 2026-05-26 (Yuqi twenty-third pass): when the right panel is
   * open the list column is narrower (~560px). Pass `true` to
   * truncate affected-client name chips at a fixed 140px so a
   * long client name (e.g. "Hudson & Wells LLC") doesn't push
   * the chip row into wrapping/overflow.
   */
  compactClients?: boolean
  /**
   * History/archive rows have already been reviewed, applied, dismissed, or
   * otherwise closed. Hide readiness there so the footer doesn't say "Ready to
   * apply" next to an Applied/Reviewed status.
   */
  showReadiness?: boolean
  /**
   * 2026-05-26 (Yuqi /alerts #4): when this card is the one
   * currently being viewed in the right-hand panel, render a left
   * border + brighter background so the user can quickly find the
   * active row in the list. Parent (AlertsListPage) passes
   * `active={alert.id === openAlertId}`.
   */
  active?: boolean
}

// Single Alert row used by /alerts (Alerts).
//
// 2026-05-25 (Yuqi Alerts #4, #5, #6, #11):
//   • Dropped the leading PulsingDot. Yuqi flagged repeatedly that
//     the coloured dots don't communicate meaning to a CPA — the
//     status badge ("New"/"Applied"/"Snoozed"), confidence badge
//     ("AI 46%" with destructive tone for very-low), and the change-
//     kind label already carry every signal the dot was trying to
//     encode.
//   • Leading StateBadge so the jurisdiction (CA / TX / FL) reads
//     at a glance — same recognition the chip strip above uses.
//   • Added `alert.summary` as a body line under the title. The
//     model's one-sentence explanation of the source change ("AI
//     explains what is happening" per Yuqi #6) lets the CPA decide
//     whether to open the drawer without reading the title back to
//     themselves.
//   • AlertSourceBadge promoted from the footer to the header next
//     to the source name. It's already a real link to the official
//     source — promoting it lets the CPA jump out to the source
//     without opening the drawer (Yuqi #6).
//   • Dropped the separate "Low AI confidence" warning line. The
//     AlertConfidencePill already renders in the destructive tone
//     when confidence < 0.7; doubling the cue was redundant (Yuqi
//     #11). The drawer still surfaces the explicit one-paragraph
//     warning + reason copy.
export function AlertCard({
  alert,
  onReview,
  affectedClients = [],
  compact = false,
  active = false,
  compactClients = false,
  showReadiness = true,
}: AlertCardProps) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount

  // 2026-05-25 (Yuqi /alerts fourth pass #2): LIST the actual
  // affected-client names on the card instead of a bare "5 clients
  // may be affected" summary.
  // 2026-06-01: the rows are now batch-loaded by the parent
  // (AlertsListPage) via a single `getDetailsBatch` call and passed in
  // as a prop. Previously each card fired its own `getDetail`, so a
  // 50-alert list opened 50 parallel detail requests on render.
  const allAffectedNames = affectedClients
  // 2026-05-26 (Yuqi seventeenth pass #1): collect each unique
  // client's name AND whether the alert flags them for review.
  // Needs-review clients sort to the FRONT of the visible list so
  // the row matching the trailing "N flagged for review" count is
  // the first one the CPA sees. Eligible / already-applied
  // clients trail.
  const uniqueClients: Array<{ name: string; needsReview: boolean }> = []
  const seen = new Set<string>()
  for (const row of allAffectedNames) {
    if (!seen.has(row.clientName)) {
      seen.add(row.clientName)
      uniqueClients.push({
        name: row.clientName,
        needsReview: row.matchStatus === 'needs_review',
      })
    }
  }
  uniqueClients.sort((a, b) => Number(b.needsReview) - Number(a.needsReview))
  const visibleClients = uniqueClients.slice(0, VISIBLE_CLIENT_NAMES)
  const overflowNames = Math.max(uniqueClients.length - visibleClients.length, 0)
  // 2026-05-26 (Yuqi /alerts follow-up #10): 3-tier qualitative
  // confidence (LOW / MEDIUM / HIGH) instead of numeric AI XX%.
  // Card background tone follows the level: LOW gets the destructive
  // tint (review urgency), MEDIUM gets a faint warning tint, HIGH
  // stays clean.
  // 2026-05-26 (Step 9 AI Visibility Audit F-002): thresholds now
  // sourced from the canonical `aiConfidenceTier` helper so every
  // surface in the product agrees on the same 0.5 / 0.85 ladder.
  const confidenceLevel = aiConfidenceTier(alert.confidence)
  const lowConfidence = confidenceLevel === 'low'
  const mediumConfidence = confidenceLevel === 'medium'
  const showReadinessChip = showReadiness && alert.status === 'matched'

  // 2026-05-25 (Yuqi /alerts fourth pass — #3, #4, #8):
  //   • #3: Review button moves from a bottom-of-action-column slot
  //     to the very TOP of the action column so it's always at the
  //     same vertical anchor across cards. Snooze/Dismiss render
  //     below it as the softer secondary affordances.
  //   • #4: outer gap between content + action columns bumped
  //     gap-4 → gap-6 — Yuqi flagged the two halves as crowded.
  //   • #8: card chrome restyled — border dropped entirely, light
  //     gray bg (bg-background-subtle) replaces the white panel.
  //     Reads as a "soft card on the page surface" instead of a
  //     bordered tile. Hover lifts to bg-state-base-hover so the
  //     interactive cue still lands.
  // 2026-05-26 (Yuqi /alerts #12): card bg picks up a faint
  // destructive tint when AI confidence is very low so the CPA's
  // eye lands on those rows first. Same tone family as the
  // LowConfidenceBadge that replaces the numeric confidence pill.
  // 2026-05-26 (Yuqi /alerts #1): the whole article is now
  // clickable — onClick fires onReview, so the entire row opens
  // the detail panel. The interior Review/Snooze/Dismiss buttons
  // still work as primary affordances and stopPropagation so
  // their own handlers run (snooze/dismiss diverge from review).
  // Keyboard a11y: role="button" + tabIndex + Enter/Space handler.
  // 2026-05-26 (Yuqi /alerts #4): when `active`, the card
  // shows a left accent border + brighter bg so the CPA can find
  // the alert currently displayed in the right panel without
  // re-scanning every row.
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onReview()
    }
  }
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={t`Alert: ${alert.title}`}
      aria-pressed={active}
      onClick={onReview}
      onKeyDown={handleCardKeyDown}
      className={cn(
        // 2026-05-26 (Yuqi twenty-first pass): card chrome
        // simplified for the new `bg-background-inset` work surface.
        //   • All cards use the same white bg + a subtle border so
        //     they read as clean cards floating on the gray inset.
        //   • Active state: faint accent tint + accent border to
        //     mark "this row is open in the right panel".
        // 2026-05-26 (Yuqi twenty-seventh pass): when ANY row is
        // active (panel open) the non-active rows get a slight
        // dim (`opacity-70` + drop hover state) — pushes the eye
        // toward the active row without yelling. Hover still
        // brings full opacity back so the CPA can scan the dimmed
        // list without losing readability.
        // 2026-05-26 (Yuqi forty-third pass — spacing unification):
        // outer card padding p-5 (20px) → p-4 (16px) and inter-column
        // gap gap-6 (24px) → gap-3 (12px). Matches the canonical
        // scale: "standard card padding = p-4", "card internal
        // block gap = gap-3". Was a one-off spacing here that read
        // looser than every other card surface on Today / Deadlines.
        'group/alert-card relative flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-md border p-4 transition-[opacity,background-color,border-color]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        active
          ? // 2026-05-26 (Yuqi forty-fifth pass — active state stronger):
            // dropped the `/40` opacity on bg-state-accent-hover. The
            // /40 made the active card read as just-barely-tinted —
            // the CPA couldn't always tell which row was open in the
            // panel. Full bg-state-accent-hover plus the
            // border-state-accent-active-alt (one step stronger than
            // hover-alt) gives the active row a real signal-blue
            // chrome so it pops as "this is open" against the dimmed
            // white siblings. Still using the accent-hover tone, not
            // saturated solid blue, so the row reads as
            // wayfinding-quiet, not alert-loud.
            'border-state-accent-active-alt bg-state-accent-hover'
          : cn(
              // 2026-05-26 (Yuqi twenty-ninth pass): hover quieted.
              // Was `hover:bg-state-base-hover` which painted a
              // noticeable gray tint over the whole card — too strong
              // for a list of cards. Now: border-only hover
              // (`hover:border-divider-regular`, one step up from
              // divider-subtle). White card stays white on hover;
              // only the border darkens enough to confirm "yes this
              // is interactive."
              'border-divider-subtle bg-background-default hover:border-divider-regular',
              compactClients && 'opacity-70 hover:opacity-100',
            ),
        compact && 'p-2.5',
      )}
    >
      {/* 2026-05-26 (Yuqi fifteenth pass): NEW chip styling pass —
          brand accent solid fill (`bg-state-accent-solid` +
          text-text-inverted) so it reads as a real "fresh /
          unread" flag, and flush-to-corner positioning (right-0
          top-0) so it integrates with the card's top-right.
          Top-right corner matches the card's rounded-md radius;
          bottom-left gets a small radius so the chip reads as a
          deliberate notch rather than a square label dropped on
          the card. Only renders when status === 'matched'. */}
      {alert.status === 'matched' ? (
        // 2026-05-26 (Yuqi twenty-fourth pass): NEW chip switched
        // to a high-contrast dark fill — `bg-text-primary`
        // (near-black, the canonical text-primary token reused
        // as a surface) + `text-text-inverted` (white). Matches
        // the design-system tokens for inverted ("dark pill on
        // light page") chrome.
        <span className="pointer-events-none absolute right-0 top-0 z-10 inline-flex shrink-0 items-center rounded-bl-sm rounded-tr-md bg-text-primary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-inverted">
          <Trans>New</Trans>
        </span>
      ) : null}
      {/* 2026-05-26 (Yuqi /alerts fifth pass — B#2): state pill
          + content column wrapped in an inner flex with gap-2 so
          the state pill sits as a LEFT RAIL anchor and everything
          below the title (summary, impact, review-only) aligns
          with the title's left edge — not the state pill's. The
          outer article gap-6 separates this combined block from
          the kebab on the right. */}
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {/* 2026-05-29 (Yuqi /clients round 1 — "remove the state icon
            everywhere"): SVG StateBadge dropped; the bordered pill +
            jurisdiction code carries the identity. */}
        <span
          className="inline-flex shrink-0 items-center self-start rounded-sm border border-divider-regular bg-background-default px-1.5 py-0.5"
          aria-hidden
        >
          <span className="font-semibold uppercase tracking-wide text-xs text-text-primary">
            {alert.jurisdiction}
          </span>
        </span>
        {/* 2026-05-26 (Yuqi forty-third pass — spacing unification):
            content column gap gap-1.5 (6px) → gap-2 (8px). Per
            canonical: stacked sibling text blocks (title row, body,
            chips row) use gap-2. The 6px was a half-step that
            doesn't exist in the canonical scale. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* 2026-05-26 (Yuqi /alerts eleventh pass): change-kind
              chip moved from BEFORE the title to immediately AFTER it.
              Yuqi flagged that with the chip leading the row, its
              variable width pushed each card's title to a different
              left edge — the column lost vertical alignment. With
              chip-after-title, the title's left edge is always
              `[state-pill width] + gap-2` so titles line up across
              cards. Chip stays prominent (filled accent bg) and
              still sits inside the title row, just trailing the
              headline rather than introducing it. */}
          <header className="flex min-w-0 items-center gap-2">
            {/* 2026-05-26 (Yuqi forty-fourth pass — alert card
                title is a "card emphasis title", not a row title):
                title bumped back to text-base font-medium per Yuqi's
                "这个标题要大" callout. Alert cards are the page's
                primary unit (no h2 section above them), so the
                title needs to anchor the card the way a row title
                anchors a table row. text-base (16px) gives it the
                weight the screen reads as the "thing to look at"
                without screaming. font-medium (not semibold) keeps
                the canonical content-title weight; size carries the
                emphasis. Action-list rows + table client names
                stay at text-sm font-medium since they're row
                titles in dense lists, not card headlines. */}
            <h3
              className="min-w-0 flex-1 truncate text-base font-medium leading-tight text-text-primary"
              title={alert.title}
            >
              {alert.title}
            </h3>
            {/* 2026-06-01: change-kind chip swapped to the canonical
                Badge primitive (shape="square" variant="info"). The
                hand-rolled rounded-sm + uppercase + accent-tint
                recipe is now carried by Badge's `square` shape and
                `info` variant — same call as PulseDetailDrawer:747
                so the two surfaces stay in sync. */}
            <Badge shape="square" variant="info" size="lg">
              {changeKindLabel(alert.changeKind)}
            </Badge>
            {/* 2026-05-26 (Yuqi fourteenth pass #3): NEW chip lifted
                out of the header row and rendered as an
                absolute-positioned pill at the article's top-right
                corner — see article-level `relative` + the absolute
                NEW chip rendered as the article's last child. */}
            {/* 2026-05-26 (Yuqi fourteenth pass #2): AlertStatusBadge
                moved out of the header row into the bottom footer
                row alongside the official source. */}
            {/* 2026-05-26 (Yuqi sixteenth pass #5): confidence pill
                moved from the header row into the bottom footer row
                alongside official source + status. Header now only
                carries title + change-kind chip. */}
            {/* Change-kind pill removed from header — promoted to the
                leading eyebrow above the title (Yuqi sixth pass #4).
                2026-05-26 (Yuqi /alerts twelfth pass): official
                source link + source-status badge moved out of the
                header to a footer row at the bottom of the card —
                after the impact line / review-only sentence — so the
                "open the source" affordance reads as the final step
                in the row's scan path, not as another header chip. */}
          </header>

          {/* AI summary — only render when meaningfully different from
            the title.
            2026-05-26 (Yuqi /alerts #6): line-clamp-2 → line-clamp-1
            so the card stays compact and the rest of the summary
            becomes a reason to open the detail panel.
            2026-05-26 (Yuqi /alerts third pass #2): summary now
            caps at 700px so it stops competing with the affected-client
            line below. Above 700px the eye starts treating it as a
            second h3-weight line instead of a quieter caption; the
            cap keeps the truncation kicking in earlier and pushes
            the CPA to open the drawer for the full text.
            2026-05-26 (Step 9 AI Visibility Audit F-010): leading
            Astroid icon marks the summary as AI-generated. Without
            it the prose read like editorial copy authored by
            DueDateHQ, but `alert.summary` is the model's one-sentence
            extraction — provenance disclosure should be visible at
            first glance, not opt-in to hover. */}
          {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
            <p className="line-clamp-1 max-w-[700px] text-sm text-text-secondary">
              <Astroid
                className="mr-1 inline size-3 shrink-0 text-text-tertiary align-[-1px]"
                aria-label={t`AI-generated summary`}
              />
              {alert.summary}
            </p>
          ) : null}

          {/* 2026-05-25 (Yuqi /alerts fourth pass #2): impact
            line now LISTS the affected client names instead of
            collapsing them to a count. Up to 3 names render as
            chips inline; the tail folds to `+N more` so long
            client lists don't blow up the card. The needs-review
            count + "may be affected" framing live on a trailing
            meta line below. Falls back to the old count-only
            rendering for terminal/review-only alerts where the
            client list isn't useful. */}
          {alert.actionMode === 'review_only' ? (
            // 2026-05-26 (Yuqi /alerts follow-up #11, #12):
            // dropped italic — italic + small caption read as a
            // "footnote disclaimer" and visually conflicted with the
            // briefcase icon's "action you take" message. Added a
            // top border + pt-2 so the action sentence reads as a
            // separate unit from the impact line above it.
            // 2026-05-26 (Yuqi fourteenth pass #1): dropped border-t
            // + pt-2 on the review-only sentence — Yuqi flagged the
            // divider as noise; the content column's `gap-1.5`
            // already separates it from the impact line above.
            <p className="flex items-center gap-1.5 text-sm text-text-secondary">
              {/* 2026-05-26 (Yuqi /alerts fourth pass #6):
                briefcase size-3.5 → size-3 so the icon sits as a
                quieter ornament next to the sentence text. */}
              <BriefcaseIcon className="size-3 shrink-0" aria-hidden />
              <span>
                <Trans>Review-only source change. No due-date overlay will be applied.</Trans>
              </span>
            </p>
          ) : alert.firmImpact === 'no_current_match' ? (
            // 2026-05-26 (Yuqi /alerts fifth pass — A#4): empty-state
            // text bumped `text-sm text-text-tertiary` → `text-base
            // text-text-secondary`. Yuqi flagged it as too quiet — the
            // CPA should see clearly that the alert doesn't affect any
            // of their clients, since that's actually a meaningful
            // resolution ("nothing to do"). Bigger + darker reads as
            // a deliberate verdict, not a meta footnote.
            // 2026-05-26 (Yuqi forty-second pass — body unification):
            // size rolled back to text-sm. Empty-state prose is body
            // text and should share the body scale across Today /
            // Alerts / Deadlines. Prominence still comes from
            // `text-text-secondary` (darker than the meta-tertiary
            // surrounding text), not from a size bump.
            <p className="text-sm text-text-secondary">
              <Trans>
                No matching open deadlines in this practice. Review and confirm no action.
              </Trans>
            </p>
          ) : (
            // 2026-05-26 (Yuqi /alerts #5): impact line collapsed
            // into a single readable sentence — "5 clients may be
            // affected: client 1, client 2, client 3, +N more" —
            // instead of the previous count-chip-grid + summary-line
            // two-row layout. Reads as a sentence the CPA can scan
            // top-to-bottom without a visual jump. Needs-review count
            // (when present) tacked on as a trailing meta clause.
            // 2026-05-26 (Yuqi /alerts follow-up #7): client names
            // now render as 2px-rounded framed pills (white bg, faint
            // border) instead of a comma-joined run-on string. Reads
            // as "5 clients may be affected: [Acme] [Beta] [Gamma]
            // +N more" — the pill shape signals these are entities
            // not free-form text, matching the AffectedClientsTable
            // chip pattern in the drawer.
            // 2026-05-26 (Yuqi /alerts fourth pass #3): impact
            // paragraph gets `mt-3` so it pulls away from the
            // summary above. The previous tight `gap-1.5` (from the
            // content column flex) made the impact line and the
            // summary read as one stacked block; the bigger top
            // margin breaks them into two distinct units.
            <p className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-text-tertiary">
              <span>
                {impacted === 1 ? (
                  <Trans>1 client may be affected</Trans>
                ) : (
                  <Trans>{impacted} clients may be affected</Trans>
                )}
                {visibleClients.length > 0 ? ':' : '.'}
              </span>
              {visibleClients.map((client) => {
                // 2026-05-26 (Yuqi /alerts sixth pass #2): client
                // chip leads with an entity icon — `Building2` for
                // business/entity clients (suffixes like LLC / Inc /
                // Corp / Co / Ltd in the name), `UserRound` for
                // individuals.
                // 2026-05-26 (Yuqi seventeenth pass #1): needs-review
                // clients get a warning-toned chip + a trailing
                // AlertCircleIcon so the "this client needs your
                // attention" signal sits directly on the chip
                // instead of only in the trailing count. Combined
                // with the sort-to-front above, the row's first
                // visible client IS the one flagged for review.
                const EntityIcon = isEnterpriseClientName(client.name) ? Building2 : UserRound
                return (
                  <span
                    key={client.name}
                    title={client.name}
                    className={cn(
                      // 2026-05-26 (Yuqi twenty-fifth pass): dropped
                      // the per-chip warning bg/border/text color for
                      // needs-review clients. The trailing
                      // AlertCircle icon already signals "this one
                      // needs attention" — tinting the chip too was
                      // doubling up. All chips now share the same
                      // neutral surface; the icon does the lifting.
                      'inline-flex items-center gap-1 rounded-sm border border-divider-subtle bg-background-default px-1.5 py-0.5 text-xs text-text-secondary',
                      // When the panel is open the list column is
                      // narrow, so each client chip caps at a fixed
                      // 140px and truncates. Tooltip shows the full
                      // name on hover.
                      compactClients && 'w-[140px]',
                    )}
                  >
                    <EntityIcon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
                    <span className={cn('min-w-0', compactClients && 'truncate')}>
                      {client.name}
                    </span>
                    {/* 2026-05-26 (Yuqi thirtieth pass): the trailing
                        "N client(s) flagged for review" tail was
                        dropped — the AlertCircle icon on the chip
                        already carries that signal. Hover tooltip
                        spells it out for a CPA who hasn't seen
                        the convention yet. */}
                    {client.needsReview ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span
                              className="inline-flex shrink-0 cursor-help text-text-warning"
                              tabIndex={0}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <AlertCircle className="size-3" aria-hidden />
                            </span>
                          }
                        />
                        <TooltipContent>
                          <Trans>This client needs review</Trans>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </span>
                )
              })}
              {overflowNames > 0 ? (
                <span className="text-text-tertiary">+{overflowNames} more</span>
              ) : null}
            </p>
          )}

          {/* 2026-05-26 (Yuqi /alerts twelfth pass): official
              source link + source-status badge anchor the bottom
              of the content column. Reads as the "if you want to
              dig further, open the source" affordance — the last
              thing on the scan path. Quiet text-tertiary border
              above so it visually separates from the impact /
              review-only sentence without claiming a heavy footer
              treatment. The AlertSourceBadge stays as an
              <a target="_blank"> so the CPA can jump to the IRS /
              state bulletin in a new tab. */}
          {/* 2026-05-26 (Yuqi fourteenth pass #2): footer row now
              carries the official source + source status PLUS the
              workflow status pill (AlertStatusBadge). All three
              status-class signals (workflow / source identity /
              source health) live together at the bottom of the
              card, instead of split between the header and footer. */}
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 border-t border-divider-subtle pt-2 text-sm">
            <AlertSourceBadge source={alert.source} sourceUrl={alert.sourceUrl} />
            <AlertSourceStatusBadge status={alert.sourceStatus} />
            <AlertStatusBadge status={alert.status} />
            {showReadinessChip ? (
              <AlertReadinessChip readiness={alert.applyReadiness} firmImpact={alert.firmImpact} />
            ) : null}
            {alert.duplicateSourceSnapshotCount > 0 ? (
              <span className="text-xs text-text-tertiary">
                <Plural
                  value={alert.duplicateSourceSnapshotCount}
                  one="Merged # similar source update"
                  other="Merged # similar source updates"
                />
              </span>
            ) : null}
            {/* 2026-05-26 (Yuqi sixteenth pass #5 + #10): confidence
                pill anchors the footer alongside the other status
                signals. "Confidence" word dropped from the label
                per #10 — just LOW / MEDIUM / HIGH (single word)
                since the surrounding status row already implies
                what's being qualified. Astroid icon keeps the
                "AI signal" semantic anchor across all three tiers. */}
            {/* 2026-05-26 (Yuqi twenty-fourth pass): retoned the
                confidence pill ladder to break the color collisions
                Yuqi flagged:
                  • HIGH (was success green) → INFO BLUE — was
                    colliding with the Applied / Reviewed status
                    pills which are also success green.
                  • MEDIUM (was warning amber) → NEUTRAL GRAY — was
                    colliding with the needs-review client chip
                    (also warning amber). Medium confidence isn't
                    really a warning, it's just informational.
                  • LOW (warning amber) — kept, it IS a real
                    "don't trust this" warning. Same family as the
                    needs-review chip is fine because they appear
                    in different contexts (footer vs client chip
                    row). */}
            {/* HEAD's canonical `AlertConfidencePill` primitive kept;
                Step 9 F-038 (tooltip surfacing the numeric AI
                confidence on hover) deferred — applying it inline
                here would lose the primitive's consolidation work.
                Better to add the tooltip inside the pill component
                itself in a follow-up. */}
            <AlertConfidencePill
              confidence={lowConfidence ? 'low' : mediumConfidence ? 'medium' : 'high'}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

// 2026-05-25 (Yuqi Alerts #8): the chip labels were single nouns
// ("Scope", "Form", "Deadline") that don't tell the CPA what
// ACTUALLY changed. Renamed to verb-phrase or noun-phrase forms
// that name the thing AND say it shifted: "Deadline shifted",
// "Scope narrowed", "Form updated", etc. Reads as a sentence
// fragment from a hover sweep.
//
// 2026-05-26 (Yuqi /alerts fourth pass #1): copy switched
// from sentence-case ("Deadline shifted") to Title Case
// ("Deadline Shifted") so the chip reads as a label not a
// sentence fragment. Pairs with the pill chrome dropping its
// `uppercase` class — the previous combination forced UPPERCASE
// rendering at CSS time even though the source string was
// sentence-case, which made the chip louder than the title
// next to it.
// 2026-05-26 (Yuqi /alerts sixth pass #2): until the server
// adds `entityKind` to PulseAffectedClient, classify business vs.
// individual by the canonical legal-suffix patterns in the name.
// Word-boundaried matching + case-insensitive — "Hudson & Wells LLC"
// → enterprise; "John Smith" → individual; "Acme Corp" → enterprise.
// Punctuation tolerated for `Co.` and `P.C.`. False negatives
// (e.g. "Beta Holdings" without a legal suffix) still read as
// individual; that's the safer wrong answer than the inverse.
const ENTERPRISE_NAME_RE =
  /\b(llc|inc|corp(?:oration)?|co|ltd|llp|plc|gmbh|p\.?c|s\.?a|holdings?|industries|associates|partners|group)\b\.?/i
function isEnterpriseClientName(name: string): boolean {
  return ENTERPRISE_NAME_RE.test(name)
}

function changeKindLabel(kind: PulseAlertPublic['changeKind']) {
  switch (kind) {
    case 'deadline_shift':
      return <Trans>Deadline Shifted</Trans>
    case 'filing_requirement':
      return <Trans>Filing Rule Changed</Trans>
    case 'applicability_scope':
      return <Trans>Scope Changed</Trans>
    case 'form_instruction':
      return <Trans>Form Updated</Trans>
    case 'source_status':
      return <Trans>Source Status</Trans>
    case 'rule_source_drift':
      return <Trans>Source Changed</Trans>
    case 'new_obligation':
      return <Trans>New Rule Added</Trans>
    case 'threshold_advisory':
      return <Trans>Threshold Advisory</Trans>
    case 'other':
      return <Trans>Other Change</Trans>
  }
  return kind
}

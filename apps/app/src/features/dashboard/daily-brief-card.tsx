import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  NewspaperIcon,
  RotateCwIcon,
  XIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import type {
  DashboardBriefPublic,
  DashboardBriefScope,
  DashboardSummary,
} from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatRelativeTime } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { useAlertsListQueryOptions } from '@/features/alerts/api'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { parseBriefText } from './brief-text'

type DashboardBriefCitation = NonNullable<DashboardBriefPublic['citations']>[number]

// Collapse pref storage — JSON { key: <brief generation stamp>, collapsed }.
// Keyed to the generation so a new day's brief reopens itself. Supersedes
// the old `ddhq:dashboard:brief-dismissed` remove-forever key (stale values
// there are simply ignored now).
const BRIEF_COLLAPSED_STORAGE_KEY = 'ddhq:dashboard:brief-collapsed'

export interface DailyBriefTodayCounts {
  overdueCount: number
  waitingOnClientCount: number
  dueThisWeekCount: number
}

/**
 * DailyBriefCard — the morning edition. One forward-looking payload:
 *
 *   📰  Daily Brief                                    [freshness]
 *       <one AI sentence: today's focus + where to start, with citation chips>
 *       <catch-up line, only if pre-join changes still await handling>
 *       [Waiting on client N →]   (only pill with no twin elsewhere on /today)
 *
 * The AI's role is ONE sentence; the detailed plan is the Priorities table
 * right below, so the card never repeats it. Citation `[n]` tokens resolve to
 * accent chips deep-linking back to the obligation (evidence traceability, not
 * decoration).
 *
 * 2026-06-15 (Yuqi — de-densify + remove recap): the "since your last visit"
 * recap and the workload-counts line were both cut. The recap was
 * backward-looking reassurance that answered no triage question; the counts
 * line duplicated the Priorities buckets ~100px below. What survives is the
 * one sentence only this card can say, plus the catch-up line and the action
 * row. The masthead newspaper glyph now rides into the expanded state too, so
 * collapse↔expand reads as the same edition folding and unfolding.
 *
 * 2026-06-10 (Yuqi — firm scope goes deterministic): at scope='firm' the
 * lead is NOT an AI sentence. The Everyone reader is supervising, not
 * executing — their line is "where does the overdue work cluster", expressed
 * by FORM TYPE only (never by member name) from summary.overdueConcentration.
 * No AI call, no freshness chip at firm scope; firm-scope brief generation is
 * retired server-side (cron fan-out removed, consumer drops firm messages).
 *
 * Card chrome stays Pencil `qYrr3` (accent-tinted, hairline-free). Renders
 * nothing when there is neither a brief nor (at firm scope) a concentration
 * line to show.
 */
export function DailyBriefCard({
  scope,
  brief,
  todayCounts,
  concentration,
  onOpenObligation,
}: {
  scope: DashboardBriefScope
  brief: DashboardBriefPublic | null
  todayCounts: DailyBriefTodayCounts
  concentration: DashboardSummary['overdueConcentration']
  onOpenObligation: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const aiEnabled = scope === 'me'
  // Hoisted from `<CatchupLine>` (same cache key, shared entry) so the
  // nothing-to-say default below can know whether the catch-up line would
  // render before deciding the card has nothing to say.
  const catchupQuery = useQuery(useAlertsListQueryOptions(50, 'catchup'))
  const catchupCount = catchupQuery.data?.alerts.length ?? 0
  // Collapse pref — persisted per BRIEF GENERATION (Yuqi feedback #4: a
  // closed brief must be reopenable, "like a 'tab' on the page you click
  // to open"). ✕ collapses to the tab instead of removing the section; the
  // pref is keyed to the brief's generation stamp so a freshly generated
  // brief auto-expands on its own. Replaces the old dismissed-forever model.
  const [collapsePref, setCollapsePref] = useState<{ key: string; collapsed: boolean } | null>(
    () => {
      if (typeof window === 'undefined') return null
      try {
        const raw = window.localStorage.getItem(BRIEF_COLLAPSED_STORAGE_KEY)
        // oxlint-disable-next-line no-unsafe-type-assertion -- localStorage payload is owned by this module; caller wraps in try/catch
        return raw ? (JSON.parse(raw) as { key: string; collapsed: boolean }) : null
      } catch {
        return null
      }
    },
  )
  if (!brief && !(scope === 'firm' && concentration)) return null

  // 2026-06-10 (manual refresh retired): the brief is a self-tending
  // daily edition — it regenerates on the firm-tz day rollover and
  // self-heals failed/stale states server-side, so the card carries NO
  // refresh affordance anywhere. The freshness chip is display-only.
  const isPending = aiEnabled && brief?.status === 'pending'

  // Nothing to say = the AI sentence failed AND no catch-up rows exist. The
  // card defaults COLLAPSED in that state (critique 2026-06-12: an apologetic
  // band between monitor and work was an empty blue billboard) — the tab + a
  // deterministic all-quiet hint carry the same facts at one line. The user
  // can still expand it.
  const nothingToSay = aiEnabled && brief?.status === 'failed' && !brief.text && catchupCount === 0

  const briefKey = brief?.generatedAt ?? brief?.status ?? 'none'
  const collapsed = collapsePref?.key === briefKey ? collapsePref.collapsed : nothingToSay
  const setCollapsed = (next: boolean) => {
    const pref = { key: briefKey, collapsed: next }
    setCollapsePref(pref)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BRIEF_COLLAPSED_STORAGE_KEY, JSON.stringify(pref))
    }
  }

  // ── Collapsed → the tab: a folded morning paper waiting on the doorstep
  //    (Yuqi: "be more playful and fun with this Daily brief idea"). A small
  //    accent-tinted chip in the brief's slot — newspaper glyph + name +
  //    freshness dot + chevron; hover tilts the paper and nudges the chevron
  //    (motion on glyphs, never surfaces). When the brief has a real
  //    headline, its first line rides beside the tab as a teaser — the
  //    morning edition's "above the fold". When there is nothing to say, the
  //    deterministic all-quiet line rides there instead, so neither fact
  //    hides behind a click. ──
  if (collapsed) {
    const teaser =
      aiEnabled && brief?.text
        ? (parseBriefText(brief.text).headline ?? brief.text)
            .replace(/\[\d+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        : null
    return (
      <section
        aria-label={t`Daily brief`}
        className="flex flex-wrap items-center gap-3 animate-in fade-in duration-150 motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          className="group/tab inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-transparent bg-state-accent-hover px-3 text-xs font-medium text-text-accent outline-none transition-colors hover:border-state-accent-border focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          {/* The masthead glyph — tilts a few degrees on hover, like picking
              the paper up off the mat. */}
          <NewspaperIcon
            className="size-3.5 transition-transform group-hover/tab:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover/tab:rotate-0"
            aria-hidden
          />
          <Trans>Daily Brief</Trans>
          {isPending ? (
            <RotateCwIcon className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <span
              className={cn(
                'size-1.5 rounded-full',
                // Failed = amber, not red: a missing optional AI sentence is
                // not a destructive error (the rest of /today is unaffected).
                brief?.status === 'failed' || brief?.status === 'stale'
                  ? 'bg-state-warning-solid'
                  : 'bg-state-success-solid',
              )}
              aria-hidden
            />
          )}
          {/* Chevron dips on hover — "pull down to unfold". */}
          <ChevronDownIcon
            className="size-3.5 transition-transform group-hover/tab:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/tab:translate-y-0"
            aria-hidden
          />
        </button>
        {teaser ? (
          // Above-the-fold teaser — the real headline, one truncated line,
          // muted. Clicking it opens the edition too (it IS the brief).
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="min-w-0 flex-1 cursor-pointer truncate rounded-sm text-left text-sm text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            title={teaser}
          >
            {teaser}
          </button>
        ) : nothingToSay ? (
          <p className="text-sm text-text-tertiary">
            {/* A calm all-quiet line, not an apology: the brief self-heals
                server-side, so a missing AI sentence earns no "unavailable"
                framing here. */}
            <Trans>All quiet — nothing new needs your attention right now.</Trans>
          </p>
        ) : (
          // No AI headline yet (generating / couldn't update / firm scope) but
          // real work is pending — the tab still states the facts from the
          // deterministic counts instead of a blank line above the fold.
          <DeterministicBriefTeaser counts={todayCounts} onOpen={() => setCollapsed(false)} />
        )}
      </section>
    )
  }

  return (
    <div className="relative">
      <section
        aria-label={t`Daily brief`}
        // The accent-tinted banner of /today (Yuqi: "background blue tint") —
        // the page's ONE chromatic surface, marking the AI digest apart from
        // the neutral monitor (alerts) and work (priorities) sections. No
        // border: the tint alone defines the edge (avoid too much borders).
        // Same editorial bones as the /deadlines at-a-glance banner (title →
        // content sentence → metric lines); see
        // docs/Design/brief-banner-language.md.
        // The unfold: expanding from the tab plays the house animate-in recipe
        // (fade + 4px slide from the tab's position) — the paper opens.
        className="group relative z-10 flex flex-col gap-1.5 rounded-xl bg-state-accent-hover px-5 py-3 pr-9 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none"
      >
        {/* Collapse — ghost ✕ top-right folds the band back into the tab (it
          never deletes; the tab keeps the brief one click away). */}
        <Button
          variant="ghost"
          size="icon-xs"
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={t`Collapse brief`}
          // size-7 (28px) hit area over the icon-xs default — the audit
          // flagged the ~24px dismiss target as the floor.
          className="absolute top-2 right-2 size-7 text-text-tertiary"
        >
          <XIcon className="size-3.5" aria-hidden />
        </Button>

        {/* Masthead — the newspaper glyph rides ahead of the title so the
          expanded card is recognizably the SAME morning edition as the
          collapsed tab (which leads with the same glyph). Accent-tinted: it's
          the card's one chromatic mark. The glyph tilts a few degrees when the
          whole card is hovered (the section owns `group`), echoing the tab's
          "pick the paper up off the mat" motion without adding any chrome. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2">
            <NewspaperIcon
              className="size-3.5 text-text-accent transition-transform group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
              aria-hidden
            />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              <Trans>Daily Brief</Trans>
            </h2>
          </span>
          {aiEnabled && brief ? <BriefFreshness brief={brief} pending={isPending} /> : null}
        </div>

        {/* Lead — the card's one payload: the AI focus sentence (or its pending
          skeleton) at personal scope, the deterministic concentration line at
          firm scope. NEVER an apology (Yuqi: "is this the best you can do?") —
          a failed brief demotes to the caption footnote at the bottom, and the
          freshness chip beside the title already carries the status.
          De-densified 2026-06-15 (Yuqi): the workload-counts line and the
          since-last-visit recap were both cut — the counts duplicated the
          Priorities buckets ~100px below, and the recap was backward-looking
          reassurance that answered no triage question. What's left is one
          forward-looking sentence, the catch-up line, and the action row. */}
        {(aiEnabled && Boolean(brief?.text)) || (aiEnabled && isPending) ? (
          <TodayLine brief={brief} pending={isPending} onOpenObligation={onOpenObligation} />
        ) : (
          <FirmTodayLine concentration={concentration} counts={todayCounts} />
        )}

        {/* Self-hiding (renders null at zero count) — a brand-new firm with no
          generated work still sees the changes already in effect for its
          clients. */}
        <CatchupLine />

        {/* Waiting-on-client quick-jump (Pencil t9nO3) — the one count with no
          twin elsewhere on /today. Self-hiding at zero. Alerts + Overdue pills
          were removed 2026-06-18 (they duplicated the Needs-attention section
          and Priorities overdue bucket directly around this card). */}
        <BriefActionPills counts={todayCounts} scope={scope} />

        {/* Failure footnote — a quiet caption, never the headline. */}
        {aiEnabled && brief?.status === 'failed' && !brief.text ? (
          <p className="text-sm leading-relaxed text-text-tertiary">
            <Trans>Brief unavailable — we'll retry shortly.</Trans>
          </p>
        ) : null}
      </section>
    </div>
  )
}

/**
 * Deterministic above-the-fold teaser — the collapsed tab's one-line preview
 * when there is no AI headline (generating / couldn't update / firm scope)
 * but real work is pending. Pure `todayCounts` (no model), joined "·", so the
 * tab never shows a blank line beside it. Clicking opens the brief like the
 * AI teaser does. Self-empties to nothing when every count is zero.
 */
function DeterministicBriefTeaser({
  counts,
  onOpen,
}: {
  counts: DailyBriefTodayCounts
  onOpen: () => void
}) {
  const parts: React.ReactNode[] = []
  if (counts.overdueCount > 0)
    parts.push(<Plural value={counts.overdueCount} one="# overdue" other="# overdue" />)
  if (counts.waitingOnClientCount > 0)
    parts.push(
      <Plural
        value={counts.waitingOnClientCount}
        one="# waiting on client"
        other="# waiting on client"
      />,
    )
  if (counts.dueThisWeekCount > 0)
    parts.push(
      <Plural value={counts.dueThisWeekCount} one="# due this week" other="# due this week" />,
    )
  if (parts.length === 0) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="min-w-0 flex-1 cursor-pointer truncate rounded-sm text-left text-sm text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      {parts.map((part, i) => (
        // oxlint-disable-next-line no-array-index-key -- separator-joined inline parts, fixed order
        <Fragment key={i}>
          {i > 0 ? ' · ' : null}
          {part}
        </Fragment>
      ))}
    </button>
  )
}

/**
 * Action pill under the brief (Pencil t9nO3) — a quick-jump chip,
 * `icon + label + live count + →`, white on the accent band with a hairline
 * border. The count is REAL (from the `todayCounts` the card already receives)
 * and the pill self-hides at zero, so the brief never shows an empty pill.
 *
 * 2026-06-18 (Yuqi — distill): the Alerts and Overdue pills were removed. They
 * duplicated the Needs-attention section directly above and the Priorities
 * overdue bucket directly below (same counts, same destinations, all within
 * ~150px) — one home per fact. Waiting-on-client has no such twin on /today, so
 * its jump stays. (The row is kept as a list so a future real signal can slot
 * back in without restructuring.)
 */
function BriefActionPills({
  counts,
  scope,
}: {
  counts: DailyBriefTodayCounts
  scope: DashboardBriefScope
}) {
  const { t } = useLingui()
  // Needed for the scope-faithful destination below; the layout's member
  // cache makes this a no-fetch read.
  const currentUserName = useCurrentUserName()

  const pills: Array<{
    key: string
    icon: typeof ClockIcon
    iconClass: string
    label: React.ReactNode
    count: number
    to: string
    ariaLabel: string
  }> = []
  if (counts.waitingOnClientCount > 0) {
    // 2026-07-02 (ux-flow S4: scoped pill → unscoped destination): the count
    // comes from the dashboard facets, which follow the page's My-work /
    // Everyone toggle — but the link used to land on the FIRM-WIDE
    // waiting-on-client queue, so a "3" pill could open a 9-row list. At
    // scope='me' we now carry the viewer's assignee filter (`?assignee=` is
    // the /deadlines name-keyed facet param). Known residual gap: 'me' also
    // counts UNASSIGNED deadlines (so unclaimed work never disappears), and
    // the queue can't express "mine OR unassigned" — the assignee-filtered
    // arrival may show slightly fewer rows than the pill when unassigned
    // waiting rows exist. Still strictly closer than firm-wide.
    const waitingTo =
      scope === 'me' && currentUserName
        ? `/deadlines?status=waiting_on_client&assignee=${encodeURIComponent(currentUserName)}`
        : '/deadlines?status=waiting_on_client'
    pills.push({
      key: 'waiting',
      icon: ClockIcon,
      iconClass: 'text-text-tertiary',
      // Name what it's waiting ON — "Waiting" alone reads as a bare adjective.
      // Matches the canonical status label used on /deadlines.
      label: <Trans>Waiting on client</Trans>,
      count: counts.waitingOnClientCount,
      // Carry the filter so the queue arrives already scoped to these rows —
      // the pill counts waiting-on-client deadlines, so landing on an
      // unfiltered list would lose the user's place. (`waiting_on_client`
      // is a canonical ?status= literal — see status-control ALL_STATUSES.)
      to: waitingTo,
      // Count ternary, not plural()+i18n._ — the repo pattern for pluralized
      // strings outside JSX (a bare `1 deadlines` read wrong to SR users).
      ariaLabel:
        counts.waitingOnClientCount === 1
          ? t`1 deadline waiting on the client`
          : t`${counts.waitingOnClientCount} deadlines waiting on the client`,
    })
  }

  if (pills.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {pills.map((pill) => {
        const Icon = pill.icon
        return (
          <Link
            key={pill.key}
            to={pill.to}
            aria-label={pill.ariaLabel}
            className="group/pill inline-flex items-center gap-1.5 rounded-full border border-divider-subtle bg-background-default py-1 pr-2 pl-2.5 text-caption outline-none transition-colors hover:border-state-accent-active-alt hover:bg-state-accent-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Icon className={cn('size-3 shrink-0', pill.iconClass)} aria-hidden />
            <span className="font-medium text-text-primary">{pill.label}</span>
            <span className="tabular-nums text-text-tertiary">{pill.count}</span>
            <ArrowRightIcon
              className="size-2.5 shrink-0 text-text-muted transition-transform group-hover/pill:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </Link>
        )
      })}
    </div>
  )
}

/**
 * Persistent "already in effect" line — relief windows published before the
 * firm joined (origin='catchup') that still await handling. These are state,
 * not news (excluded from the server's newAlertCount by design), so without
 * this line the brief would stay silent about deadlines a brand-new firm must
 * still act on. Renders for as long as unhandled rows exist and disappears
 * once the band is cleared — not a one-shot toast.
 */
function CatchupLine() {
  const catchupQuery = useQuery(useAlertsListQueryOptions(50, 'catchup'))
  const count = catchupQuery.data?.alerts.length ?? 0
  if (count === 0) return null
  return (
    <p className="min-w-0 text-sm text-text-primary">
      {/* Deep-links the SCOPED board (?origin=catchup), not bare /alerts —
          catch-up rows carry months-old published dates and sort to the
          bottom (or off the first page) of the unscoped stream, so the bare
          link broke the promise this line makes. The scoped landing shows
          exactly these rows plus a dismissible "Show all" banner. */}
      <TextLink variant="accent" size="sm" render={<Link to="/alerts?origin=catchup" />}>
        <Plural
          value={count}
          one="# change already in effect affects your clients"
          other="# changes already in effect affect your clients"
        />
      </TextLink>
    </p>
  )
}

/**
 * The one AI sentence: today's focus + where to start, citation chip
 * inline. Pending shows a single skeleton line; failed degrades to a
 * quiet "will retry automatically" note — the server self-heals failed
 * briefs with backoff, so there is no manual retry affordance and the
 * deterministic rows around it keep rendering regardless. Old multi-item
 * briefs render their headline; if it carries no citation marker, the
 * first item's markers are appended so the deep-link affordance survives.
 */
function TodayLine({
  brief,
  pending,
  onOpenObligation,
}: {
  brief: DashboardBriefPublic | null
  pending: boolean
  onOpenObligation: (obligationId: string) => void
}) {
  const parsed = useMemo(() => (brief?.text ? parseBriefText(brief.text) : null), [brief?.text])

  if (pending && !brief?.text) {
    return (
      <div aria-busy>
        <Skeleton className="h-4 w-[70%]" />
      </div>
    )
  }
  if (brief && brief.status === 'failed' && !brief.text) {
    return (
      <p className="text-sm text-text-tertiary">
        <Trans>We couldn't generate today's brief — we'll retry shortly.</Trans>
      </p>
    )
  }
  if (!brief || !brief.text || !parsed) {
    return (
      <p className="text-sm text-text-tertiary">
        <Trans>No brief for this view yet.</Trans>
      </p>
    )
  }

  const headline = parsed.headline ?? brief.text
  // Older briefs put citations on the items, not the headline — surface
  // the first item's markers so the chip affordance survives.
  const fallbackMarkers =
    !/\[\d+\]/.test(headline) && parsed.items[0]
      ? [
          ...new Set(
            `${parsed.items[0].text} ${parsed.items[0].nextCheck ?? ''}`.match(/\[\d+\]/g) ?? [],
          ),
        ].join(' ')
      : ''

  return (
    <p className="min-w-0 max-w-[72ch] text-base font-medium text-text-primary">
      <BriefProse text={headline} citations={brief.citations} onOpenObligation={onOpenObligation} />
      {fallbackMarkers ? (
        <>
          {' '}
          <BriefProse
            text={fallbackMarkers}
            citations={brief.citations}
            onOpenObligation={onOpenObligation}
          />
        </>
      ) : null}
    </p>
  )
}

/**
 * Firm-scope Today line — fully deterministic, supervisory voice. Says
 * where the overdue work CLUSTERS by form type ("Overdue concentrated in
 * Form 1120 (3 of 5)") and deliberately never names a member. Renders
 * only when there is a real cluster (≥2 of one form); scattered overdue
 * is already carried by the Priorities table below. All-quiet collapses to
 * one muted line so the row never sits empty.
 */
function FirmTodayLine({
  concentration,
  counts,
}: {
  concentration: DashboardSummary['overdueConcentration']
  counts: DailyBriefTodayCounts
}) {
  if (concentration && concentration.count >= 2) {
    const formLabel = formatTaxCode(concentration.taxType)
    return (
      <p className="min-w-0 max-w-[72ch] text-base font-medium text-text-primary">
        <Trans>
          Overdue work is concentrated in {formLabel} ({concentration.count} of{' '}
          {concentration.overdueTotal})
        </Trans>{' '}
        {/* Carry the filter the sentence describes — overdue deadlines of this
            form type — so the queue arrives scoped to exactly that cluster
            (`due` + `taxType` are real /deadlines params). */}
        <TextLink
          variant="accent"
          size="sm"
          render={
            <Link
              to={`/deadlines?due=overdue&taxType=${encodeURIComponent(concentration.taxType)}`}
            />
          }
        >
          <Trans>View deadlines</Trans>
        </TextLink>
      </p>
    )
  }
  const allQuiet =
    counts.overdueCount === 0 && counts.waitingOnClientCount === 0 && counts.dueThisWeekCount === 0
  if (allQuiet) {
    return (
      <p className="text-sm text-text-tertiary">
        <Trans>No deadline pressure right now.</Trans>
      </p>
    )
  }
  // Scattered or light overdue — the Priorities table below carries the signal.
  return null
}

/**
 * Freshness signal — Pencil qYrr3 `kcUpS` + `v5X2Y`: one small status dot
 * followed by a mono, uppercase age label, both sitting just after the
 * title. The dot's color is the only freshness cue (green = fresh, amber =
 * outdated, red = failed), so the rest of the title row reads neutral.
 */
function BriefFreshness({ brief, pending }: { brief: DashboardBriefPublic; pending: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <RotateCwIcon
          className="size-3 animate-spin text-text-secondary motion-reduce:animate-none"
          aria-hidden
        />
        <span className="font-mono text-chip-label text-text-secondary uppercase">
          <Trans>Generating</Trans>
        </span>
      </span>
    )
  }
  if (brief.status === 'failed') {
    // Display-only — recovery is the server's self-heal, not a user action.
    // Wording is "Couldn't update", NOT "FAILED": only the optional AI
    // sentence is missing; the rest of /today (Alerts, Priorities) is
    // unaffected, so the primary dashboard must not read as a broken product
    // (re-critique 2026-06-14). Error code stays one hover away for support.
    const failedText = (
      <span className="text-chip-label text-text-tertiary uppercase">
        <Trans>Couldn't update</Trans>
      </span>
    )
    return (
      <span className="inline-flex shrink-0 items-center gap-1">
        {brief.errorCode ? (
          <Tooltip>
            <TooltipTrigger render={failedText} />
            <TooltipContent>{brief.errorCode}</TooltipContent>
          </Tooltip>
        ) : (
          failedText
        )}
      </span>
    )
  }
  const stale = brief.status === 'stale'
  const age = brief.generatedAt ? formatRelativeTime(brief.generatedAt) : null

  // 2026-06-08 (Yuqi "remove the REFRESH"): the outdated state is a plain
  // amber "Outdated" label again — the inline "· Refresh" affordance is
  // gone; the icon-only regenerate button on the right handles refresh.
  return (
    <span className="inline-flex shrink-0 items-center">
      <span
        className={cn(
          'font-mono text-chip-label tabular-nums uppercase',
          stale ? 'text-text-warning' : 'text-text-secondary',
        )}
      >
        {stale ? <Trans>Outdated</Trans> : (age ?? <Trans>Live</Trans>)}
      </span>
    </span>
  )
}

/**
 * Splits the brief text on `[n]` markers and renders each as a clickable
 * citation chip when a matching citation exists. Unmatched markers fall
 * back to plain text so a stray `[7]` never becomes a dead chip.
 */
function BriefProse({
  text,
  citations,
  onOpenObligation,
}: {
  text: string
  citations: DashboardBriefPublic['citations']
  onOpenObligation: (obligationId: string) => void
}) {
  const segments = text.split(/(\[\d+\])/g)
  // Key each split part by its running character offset — unique and stable for a
  // given text, so repeated text/marker segments never collide on an index key.
  let charOffset = 0
  return (
    <>
      {segments.map((segment) => {
        const key = `${charOffset}:${segment}`
        charOffset += segment.length
        const match = /^\[(\d+)\]$/.exec(segment)
        if (!match) return <Fragment key={key}>{segment}</Fragment>
        const ref = Number(match[1])
        const citation = citations?.find((entry) => entry.ref === ref)
        if (!citation) return <Fragment key={key}>{segment}</Fragment>
        return (
          <CitationChip
            key={key}
            n={ref}
            citation={citation}
            onOpen={() => onOpenObligation(citation.obligationId)}
          />
        )
      })}
    </>
  )
}

function CitationChip({
  n,
  citation,
  onOpen,
}: {
  n: number
  citation: DashboardBriefCitation
  onOpen: () => void
}) {
  const { t } = useLingui()
  // Pencil qYrr3 `Cite`: a tight accent pill (#eff4ff fill, accent mono
  // numeral). The accent is the card's single chromatic accent.
  const chip = (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t`Citation ${n} — open deadline`}
      className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded border border-state-accent-border bg-background-default px-1.5 align-text-bottom font-mono text-xs leading-none font-semibold text-text-accent tabular-nums hover:bg-state-accent-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none"
    >
      {n}
    </button>
  )
  const evidence = citation.evidence
  if (!evidence) {
    return (
      <Tooltip>
        <TooltipTrigger render={chip} />
        <TooltipContent>
          <Trans>Open deadline</Trans>
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger render={chip} />
      <TooltipContent className="flex flex-col items-start gap-1">
        <span className="text-caption-xs text-text-tertiary">{evidence.sourceType}</span>
        {evidence.sourceUrl ? (
          <TextLink
            variant="accent"
            size="sm"
            render={<a href={evidence.sourceUrl} target="_blank" rel="noreferrer" />}
          >
            <Trans>View source</Trans>
            <ExternalLinkIcon className="size-3" aria-hidden />
          </TextLink>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}

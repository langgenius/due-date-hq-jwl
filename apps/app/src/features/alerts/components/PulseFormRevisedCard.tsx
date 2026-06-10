import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, UsersIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatRelativeTime } from '@/lib/utils'

import { useAlertDetailQueryOptions } from '../api'
import {
  actionPillFromAlert,
  impactBadgeFromAlert,
  openStatusFromAlert,
} from './pulse-alert-chrome'
import { changeKindLabel } from './PulseChangeKindChip'

/**
 * PulseFormRevisedCard — exact recreation of Pencil node `ZkXFr`
 * (the "Form Revised" master used inside jykZH).
 *
 * 2026-06-04 round 32 (Yuqi "check the padding - margin - border -
 * rounded corners - layout again"): ZkXFr was REVISED since my
 * round-28 build. Re-audit of the latest resolveVariables JSON
 * caught these deltas:
 *
 *   • cornerRadius 20 → **16** (`rounded-xl`).
 *   • padding 24 → **20** (`p-5`).
 *   • Outer gap 20 → **8** (`gap-2`) between sections
 *     c4OFh (meta) / eMmjH (title) / iKzA1 (facts+impact).
 *   • iKzA1 internal gap dropped to **0** — facts (R2kul) sits
 *     directly above impact (I1qCj9); breathing room comes from
 *     impact's own `padding: [10, 0, 2, 0]` (pt-2.5 pb-0.5).
 *   • Facts panel R2kul kept `rounded-xl` + `bg-#f9fafb`
 *     (bg-background-section).
 *   • Cell strokes (`border-divider-regular` left borders on
 *     cells 2-4) REMOVED in the latest Pencil — cells are
 *     visually separated by the cell padding alone.
 *   • Cell widths: WHAT CHANGED (500) + AFFECTING (500) +
 *     FIRST YEAR (200) + TRANSITION (200) → `grid-cols-[5fr_5fr_2fr_2fr]`.
 *   • SCHEMA DIFF cell RENAMED to **AFFECTING** and now shows form
 *     code pills (JetBrains Mono 12/700, bg-background-section,
 *     rounded-5, padding [4, 12], stroke divider-regular).
 *   • WHAT CHANGED row gains a leading **NEW badge** after the new
 *     form code — amber #92400E bg, white Geist Mono 10/700 ls 0.7
 *     text, rounded-full, padding [4, 9], slightly rotated.
 *   • Title row (eMmjH) is now ONE inline cluster `sAnr3` (gap-8)
 *     containing CA pill + title + Open. The `justify-between`
 *     framing left/right was kept at the eMmjH level but with
 *     a single child it doesn't surface; visually the cluster
 *     packs left, "Open" sits right after the title text.
 *
 * Data wiring (unchanged from round 30): every visible value
 * comes from `alert` props via the shared `pulse-alert-chrome`
 * helpers, with `facts` carrying the form-revision-specific
 * payload that the contract doesn't yet expose.
 */

interface PulseFormRevisedFacts {
  whatChanged?: { from: string; to: string; newBadge?: boolean | undefined } | undefined
  affecting?: readonly string[] | undefined
  firstYear?: string | undefined
  transition?: string | undefined
}

interface PulseFormRevisedCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  facts?: PulseFormRevisedFacts
  className?: string
}

function PulseFormRevisedCard({ alert, onReview, facts, className }: PulseFormRevisedCardProps) {
  const { t } = useLingui()
  const severity = impactBadgeFromAlert(alert)
  const actionPill = actionPillFromAlert(alert)
  const openId = openStatusFromAlert(alert.status)
  const totalAffected = alert.matchedCount + alert.needsReviewCount

  const detailQuery = useQuery(useAlertDetailQueryOptions(alert.id))
  const firstForm = detailQuery.data?.forms?.[0]

  // 2026-06-08 (Yuqi /alerts #5 "give High Impact Alerts the HIGH IMPACT
  // badge"): the impact pill is gated to HIGH only — matching AlertCard
  // (rounds 66/84: "LOW / MEDIUM render nothing; absence IS the signal").
  // The form-revised card previously always rendered a pill, so quiet
  // form updates wore a noisy "LOW IMPACT" badge; now only the genuinely
  // high-impact ones carry the red HIGH IMPACT chip.
  const severityLabel = t`HIGH IMPACT`
  const actionLabel = actionPill
    ? actionPill.id === 'needs-action'
      ? t`Needs Action`
      : actionPill.id === 'needs-review'
        ? t`Needs Review`
        : t`Closed`
    : null
  const openLabel =
    openId === 'open'
      ? t`Open`
      : openId === 'applied'
        ? t`Applied`
        : openId === 'dismissed'
          ? t`Dismissed`
          : openId === 'partial'
            ? t`Partially applied`
            : t`Reverted`

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onReview()
    }
  }

  return (
    // Whole-card click parity with AlertCard — this form_instruction
    // variant renders in place of AlertCard, so it must carry the same
    // button semantics (role / tabIndex / onClick / keyboard). Without
    // them only the small "Review →" link is reachable and the card body
    // reads as clickable but isn't.
    <article
      role="button"
      tabIndex={0}
      aria-label={t`Alert: ${alert.title}`}
      onClick={onReview}
      onKeyDown={handleCardKeyDown}
      className={cn(
        // Outer chrome — Pencil ZkXFr exactly.
        //   • cornerRadius 16 → rounded-xl
        //   • padding 20 → p-5
        //   • outer gap 8 → gap-2 between c4OFh / eMmjH / iKzA1
        //   • stroke disabled → no border
        //   • bg #ffffff → bg-background-default
        'flex cursor-pointer flex-col gap-2 overflow-hidden rounded-xl bg-background-default p-5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        className,
      )}
    >
      {/* c4OFh Frame 132 — top meta row, justify-between, gap-2. */}
      <div className="flex items-center justify-between gap-2">
        {/* uHKcq left cluster, gap-2 (8px). */}
        <div className="flex min-w-0 items-center gap-2">
          {/* l6Xgs severity pill: 11/600 ls 0.8, rounded-4, fill +
              text from impactBadgeFromAlert(). padding [3,8,2,8].
              Gated to HIGH only (see severityLabel note above). */}
          {severity.id === 'high' ? (
            <span
              className="inline-flex shrink-0 items-center rounded-[4px] px-2 pt-[3px] pb-[2px] text-caption font-semibold tracking-[0.8px]"
              style={{ backgroundColor: severity.bg, color: severity.text }}
            >
              {severityLabel}
            </span>
          ) : null}
          {/* Mclbt source caption: 12/500 muted. */}
          <span className="truncate text-xs font-medium text-text-muted">{alert.source}</span>
          {/* QJ04z change-kind text-badge: 12/500 purple #6B21A8 ls 0.8
              uppercase. */}
          <span className="shrink-0 text-xs font-medium tracking-[0.8px] text-[#6B21A8] uppercase">
            {changeKindLabel(alert.changeKind)}
          </span>
        </div>
        {/* lAREX right cluster, gap-2. */}
        <div className="flex shrink-0 items-center gap-2">
          {/* E3XexN "2hrs ago" 14/500 #676f83. */}
          <span className="text-sm font-medium text-text-tertiary">
            {formatRelativeTime(alert.publishedAt)}
          </span>
          {/* ZKK1S action pill: rounded-full, padding [6,12], 12/500. */}
          {actionPill && actionLabel ? (
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: actionPill.bg, color: actionPill.text }}
            >
              {actionLabel}
            </span>
          ) : null}
        </div>
      </div>

      {/* eMmjH meta row — single inline cluster sAnr3 (gap-2).
          The eMmjH frame uses justify-between but with one child it
          packs to the left; the cluster contains CA + title + Open
          tightly. */}
      <div className="flex items-center gap-2">
        {/* tCuD7 jurisdiction pill: 14/700 ls 0.8, rounded-4, bg
            #f9fafb (bg-background-section), padding [3,8]. */}
        <span className="inline-flex shrink-0 items-center rounded-[4px] bg-background-section px-2 py-[3px] text-sm font-bold tracking-[0.8px] text-text-tertiary">
          {alert.jurisdiction}
        </span>
        {/* d5PWuK title: 18/600 ls -0.2 line-height 1.25 primary. */}
        <h3 className="min-w-0 flex-1 truncate text-[18px] leading-[1.25] font-semibold tracking-[-0.2px] text-text-primary">
          {alert.title}
        </h3>
        {/* C9rliy "Open" muted: 20/500 ls -0.4 line-height 1.25. */}
        <span className="shrink-0 text-[20px] leading-[1.25] font-medium tracking-[-0.4px] text-text-muted">
          {openLabel}
        </span>
      </div>

      {/* iKzA1 Frame 128 — facts + impact stacked with NO gap.
          The impact row's own pt-2.5 padding creates the visual
          breathing room. */}
      <div className="flex flex-col">
        {/* R2kul facts panel: rounded-xl, bg #f9fafb. NO cell
            strokes anymore (Pencil dropped them). Column widths
            500/500/200/200 → grid-cols-[5fr_5fr_2fr_2fr]. */}
        <div className="grid grid-cols-[5fr_5fr_2fr_2fr] overflow-hidden rounded-xl bg-background-section">
          {/* wdV5a WHAT CHANGED. padding [12,16], gap-1.5. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-caption font-semibold tracking-[0.6px] text-text-muted">
              <Trans>WHAT CHANGED</Trans>
            </span>
            <div className="flex items-center gap-2.5 text-sm">
              <span className="font-medium whitespace-nowrap text-text-tertiary">
                {facts?.whatChanged?.from ?? '—'}
              </span>
              <ArrowRightIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
              <span className="font-medium tracking-[-0.2px] whitespace-nowrap text-text-secondary">
                {facts?.whatChanged?.to ?? '—'}
              </span>
              {facts?.whatChanged?.newBadge ? (
                // U3D0D NEW badge: rounded-full, bg #92400E (amber-800),
                // white Geist Mono 10/700 ls 0.7, padding [4,9],
                // slight rotation.
                <span
                  className="inline-flex shrink-0 -rotate-[11deg] items-center rounded-full bg-[#92400E] px-2 py-[3px] font-mono text-caption-xs font-bold tracking-[0.7px] text-white"
                  aria-label={t`New form version`}
                >
                  <Trans>NEW</Trans>
                </span>
              ) : null}
            </div>
          </div>
          {/* JNTVV AFFECTING (renamed from SCHEMA DIFF). Shows form-code
              pills inline. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-caption font-semibold tracking-[0.6px] text-text-muted">
              <Trans>AFFECTING</Trans>
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {(facts?.affecting && facts.affecting.length > 0
                ? facts.affecting
                : firstForm
                  ? [firstForm]
                  : ['—']
              ).map((code) => (
                <span
                  key={code}
                  // QbZPm form-code pill: bg #f9fafb, border
                  // divider-regular, rounded-5, padding [4,12], 12/700
                  // JetBrains Mono.
                  className="inline-flex items-center rounded-sm border border-divider-regular bg-background-section px-3 py-1 font-mono text-xs font-bold text-text-secondary"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
          {/* DOz2N FIRST YEAR — narrower cell. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-caption font-semibold tracking-[0.6px] text-text-muted">
              <Trans>FIRST YEAR</Trans>
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {facts?.firstYear ?? '—'}
            </span>
          </div>
          {/* y3WVFs TRANSITION — narrower cell. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-caption font-semibold tracking-[0.6px] text-text-muted">
              <Trans>TRANSITION</Trans>
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {facts?.transition ?? '—'}
            </span>
          </div>
        </div>

        {/* I1qCj9 impact row: padding [10, 0, 2, 0] → pt-2.5 pb-0.5.
            Carries the breathing room that replaces what was a gap. */}
        <div className="flex items-center justify-between gap-2.5 pt-2.5 pb-0.5">
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-[13px] shrink-0 text-text-tertiary" aria-hidden />
            <span className="text-xs font-medium text-text-tertiary">
              {totalAffected > 0 ? (
                firstForm ? (
                  <Plural
                    value={totalAffected}
                    one={`# client · 1 ${firstForm} return affected`}
                    other={`# clients · # ${firstForm} returns affected`}
                  />
                ) : (
                  <Plural
                    value={totalAffected}
                    one="# client may be affected"
                    other="# clients may be affected"
                  />
                )
              ) : (
                <Trans>No matching clients in this practice.</Trans>
              )}
            </span>
          </div>
          <TextLink
            variant="accent"
            onClick={(event) => {
              // Card-level onClick already calls onReview; stop the
              // bubble so the button doesn't fire it a second time.
              event.stopPropagation()
              onReview()
            }}
            className="font-semibold focus-visible:underline"
          >
            <Trans>Review →</Trans>
          </TextLink>
        </div>
      </div>
    </article>
  )
}

export { PulseFormRevisedCard }

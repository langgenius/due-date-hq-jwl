import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  TriangleAlertIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  BanIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  LockIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SquareChartGanttIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { toast, type ExternalToast } from 'sonner'

import type {
  ObligationRule,
  RuleBulkImpactPreview,
  RuleConcreteDraft,
  RuleConcreteDraftCacheEntry,
  RuleEvidence,
  RuleEvidenceAuthorityRole,
  RuleReviewTaskReason,
  RuleSource,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card } from '@duedatehq/ui/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@duedatehq/ui/components/ui/dialog'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { cn } from '@duedatehq/ui/lib/utils'

import { EntityAuditActivityPanel } from '@/features/audit/entity-audit-activity-panel'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { EASE_APPLE, MOTION_DURATION, fadeMotion } from '@/lib/motion'
import { formatDatePretty, formatDateTimeWithTimezone, formatRelativeTime } from '@/lib/utils'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { DetailSectionCard } from '@/components/patterns/detail-section-card'
import { Kbd } from '@/components/patterns/kbd'
import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'

import {
  ENTITY_LABELS,
  formatEnumLabel,
  humanizeDueDateLogic,
  jurisdictionLabel,
  RULE_AUTHORITY_ROLE_DESCRIPTION,
  RULE_AUTHORITY_ROLE_LABEL,
  type EntityKey,
} from './rules-console-model'
import { JurisdictionCode } from './rules-console-primitives'
import { MatchedPulseBlock } from './matched-pulse-block'
import { RuleYearDiff } from './rule-year-diff'
import { useSourceLookup } from './use-source-lookup'

const isEntityKey = (key: string): key is EntityKey => key in ENTITY_LABELS

const ACCEPT_RULE_LOADING_TOAST_STYLE: CSSProperties = {
  background: 'var(--state-accent-hover)',
  borderColor: 'var(--state-accent-hover-alt)',
  color: 'var(--text-accent)',
}
const ACCEPT_RULE_SUCCESS_TOAST_STYLE: CSSProperties = {
  background: 'var(--state-success-hover)',
  borderColor: 'var(--state-success-hover-alt)',
  color: 'var(--text-success)',
}
const ENTITY_APPLICABILITY_LABELS: Record<string, string> = {
  any_business: 'business clients',
  c_corp: 'C corporations',
  individual: 'individuals',
  llc: 'LLCs',
  partnership: 'partnerships',
  s_corp: 'S corporations',
  sole_prop: 'sole proprietors',
  trust: 'trusts',
}

function formatEntityApplicability(values: readonly string[]): string {
  const labels = values.map((value) => ENTITY_APPLICABILITY_LABELS[value] ?? formatEnumLabel(value))
  if (labels.length <= 1) return labels[0] ?? ''
  if (labels.length === 2) return labels.join(' and ')
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`
}

/**
 * Inline-renderable version of the rule detail — full section list, no
 * Sheet header (caller provides its own title cue) and no overflow-scroll
 * viewport. The canonical rule detail surface lives inline in the
 * Coverage page; the standalone drawer was deprecated as part of the
 * detail-surface unification (drawer for triage, page/inline for deep
 * work).
 *
 * Includes its own compact header with `id · v{version} · status` so
 * the audit footprint is still visible inline, and the
 * `CandidateReviewSection` (Accept) so the inline view can
 * complete the daily-triage flow.
 */
export function RuleDetailInline({ rule }: { rule: ObligationRule }) {
  const sourceLookup = useSourceLookup()
  // The kicker line lives in the Dialog header (RuleDetailKicker), so the
  // body just renders the structured sections. ReviewReasonsSection is
  // conditionally pushed to the top when present so the "you need to act"
  // prompt isn't buried below the rule substance when the rule still needs
  // review.
  // `CandidateReviewSection` does not render inside the scrollable body —
  // the dialog renders it as a sticky footer below this component so the
  // Accept action is always visible without scrolling past every reference
  // section first.
  const needsReview = rule.status === 'candidate' || rule.status === 'pending_review'
  // Approved, still-active pulses that affect this rule — surfaced as an
  // additive "proposed change" block above the rule substance so a CPA sees a
  // pending regulatory change before accepting. Lazy per-rule (mirrors the
  // previewRuleImpact query in CandidateReviewSection); errors fall back to no
  // block (the rule detail stays fully usable).
  const matchedPulsesQuery = useQuery({
    ...orpc.pulse.listAlertsForRule.queryOptions({
      input: {
        ruleId: rule.id,
        jurisdiction: rule.jurisdiction,
        taxType: rule.taxType,
        formName: rule.formName,
      },
    }),
    staleTime: 60_000,
  })
  const matchedPulses = matchedPulsesQuery.data?.matches ?? []
  return (
    <div className="flex flex-col gap-4">
      <MatchedPulseBlock matches={matchedPulses} />
      {needsReview ? <ReviewReasonsSection rule={rule} /> : null}
      <ApplicabilitySection rule={rule} />
      <EvidenceSection rule={rule} sourceLookup={sourceLookup} />
      <DueDateLogicSection rule={rule} />
      <ExtensionSection rule={rule} />
      {!needsReview ? <ReviewReasonsSection rule={rule} /> : null}
      <ProvenanceSection rule={rule} />
      <VerificationSection rule={rule} />
      <RuleVersionHistorySection rule={rule} />
    </div>
  )
}

/**
 * B22: the local facts a local-jurisdiction rule needs to compute its
 * obligation (resident county, PSD code, local collector, …). Carried on
 * the rule but never rendered. Only local rules have these, so the section
 * renders nothing for the common case.
 */
function ProvenanceSection({ rule }: { rule: ObligationRule }) {
  const localFacts = rule.localFactRequirements ?? []
  if (localFacts.length === 0) return null
  return (
    <DetailSection label={<Trans>Local facts required</Trans>}>
      <div className="flex flex-wrap gap-1">
        {localFacts.map((fact) => (
          <Badge key={fact} variant="outline" size="sm">
            {fact.replace(/_/g, ' ')}
          </Badge>
        ))}
      </div>
    </DetailSection>
  )
}

function RuleVersionHistorySection({ rule }: { rule: ObligationRule }) {
  // Per-rule audit timeline — created / updated (with body diff) / accepted /
  // archived events, keyed by entityType 'rule' + the rule id. Closes the
  // "Rule library row → version history" surface gap.
  return (
    <DetailSectionCard variant="flat" title={<Trans>Version history</Trans>}>
      <EntityAuditActivityPanel
        entityType="rule"
        entityId={rule.id}
        // A rule's edit/review history is evidence — the panel's default
        // 30-day window silently hid a 39-day-old review decision while the
        // Practice-review card right below still showed it ("No edits yet"
        // above "Reviewed by Miguel Chen"). History panels never window.
        range="all"
        emptyTitle={<Trans>No audited rule changes yet</Trans>}
        emptyDescription={
          <Trans>Edits, version bumps, and review decisions for this rule will appear here.</Trans>
        }
      />
      {/* The "View in full audit log" reverse link now lives INSIDE
          EntityAuditActivityPanel, so every entity (rules, clients, alerts)
          gets it — no per-caller wrapper needed here. */}
    </DetailSectionCard>
  )
}

/**
 * Compact inline detail — what a CPA actually needs at a glance to
 * Accept a pending rule, with everything else trimmed.
 * Designed for cases where the detail expands inside another list
 * (e.g. a Coverage row with 7+ pending rules) and the full footprint
 * would dominate the page.
 *
 * Trimmed out vs `RuleDetailInline`:
 *   - Tax type code (engineer-facing identifier — not part of the
 *     review decision)
 *   - Standalone "Needs review" callout (redundant with the status
 *     pill in the header)
 *   - Practice review footer (Reviewed by / Reviewed at — audit
 *     history, not relevant to the accept decision).
 *   - Multi-row applicability grid (collapsed into a single line)
 *
 * Kept:
 *   - Rule ID + version + status (audit reference)
 *   - One-line applicability summary
 *   - Due-date logic
 *   - Extension policy (compressed)
 *   - Evidence card(s) — the audit trail the decision rests on
 *   - Accept button
 */
/**
 * `DisclosureCard` — the canonical bar-header card (same chrome as the
 * deadline-detail cards: `rounded-xl`, `divider-subtle`
 * border, `bg-default`, an `h-9` `bg-subtle` bar with a 13/600 title + an
 * `ml-auto` right meta slot) plus the summary-first disclosure contract from
 * `docs/Design/rule-library-review-flow.md`: the `summary` body shows by
 * default; an optional `detail` body is revealed by a trailing
 * "Read more / Show less" toggle. Each card discloses independently.
 */
function DisclosureCard({
  title,
  meta,
  summary,
  detail,
  moreLabel,
  lessLabel,
  flat = false,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  summary: React.ReactNode
  detail?: React.ReactNode
  moreLabel?: React.ReactNode
  lessLabel?: React.ReactNode
  /**
   * `flat` (Pencil TkpJG): drop the bordered-card chrome for a flush section —
   * an inline heading + right-aligned meta over the content, no border/bg/bar.
   * Same disclosure behaviour + content; only the chrome changes.
   */
  flat?: boolean
}) {
  const { t } = useLingui()
  const [expanded, setExpanded] = useState(false)
  const disclosure =
    detail != null ? (
      <>
        {expanded ? (
          <div className="flex flex-col gap-3 border-t border-divider-subtle pt-3 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
            {detail}
          </div>
        ) : null}
        <TextLink
          variant="accent"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="w-fit text-sm"
        >
          {expanded ? (lessLabel ?? t`Show less`) : (moreLabel ?? t`Read more`)}
          <ChevronDownIcon
            aria-hidden
            className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
          />
        </TextLink>
      </>
    ) : null

  if (flat) {
    return (
      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {meta != null ? (
            <span className="ml-auto truncate text-sm font-medium text-text-tertiary">{meta}</span>
          ) : null}
        </div>
        {summary}
        {disclosure}
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
      <div className="flex h-9 items-center gap-2 border-b border-divider-regular bg-background-section px-5">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {meta != null ? (
          <span className="ml-auto truncate text-caption font-medium text-text-tertiary">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        {summary}
        {disclosure}
      </div>
    </section>
  )
}

/** Labeled summary chip (irBJ8 Applicability ENTITY · FILES · EFFECTIVE). */
function FactChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-background-section px-2.5 py-1">
      <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
        {label}
      </CapsFieldLabel>
      {/* Value is text-sm (not text-base): a data value must read quieter than
          the text-base/600 card title above it, not compete with it. */}
      <span className="min-w-0 truncate text-sm font-medium text-text-primary">{value}</span>
    </span>
  )
}

/** Key/value row for a disclosure-card detail grid. */
function FactRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-text-tertiary">{label}</dt>
      <dd className="min-w-0 text-right text-text-primary">{children}</dd>
    </div>
  )
}

/**
 * `ReviewZone` — a labeled group of cards in the full-window review modal's
 * columns layout. The quiet eyebrow label gives the card stack a name and a
 * clear reading order — the masonry it replaced had neither.
 */
function ReviewZone({
  label,
  className,
  children,
}: {
  label: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3', className)}>
      <CapsFieldLabel as="div" variant="group" className="px-0.5">
        {label}
      </CapsFieldLabel>
      {children}
    </section>
  )
}

export function RuleDetailCompact({
  rule,
  concreteDraft,
  concreteDraftLoading = false,
  deferQueryInvalidation = false,
  confirmImpact = false,
  hideDecision = false,
  hideReviewAids = false,
  columns = false,
  splitRail = false,
  header,
  onActionComplete,
  reviewReason,
}: {
  rule: ObligationRule
  reviewReason?: RuleReviewTaskReason
  concreteDraft?: RuleConcreteDraftCacheEntry | null
  concreteDraftLoading?: boolean
  deferQueryInvalidation?: boolean
  /** Route the Accept through the impact-confirm dialog (single-rule detail). */
  confirmImpact?: boolean
  /** Omit the Decision footer — the modal renders it as a sticky footer instead. */
  hideDecision?: boolean
  /**
   * Lay the reference cards out in balanced CSS columns instead of a single
   * vertical stack. Used by the full-window review modal so the whole rule
   * reads at a glance without scrolling. Only valid with `hideDecision`.
   */
  columns?: boolean
  /**
   * Two-pane "accept rule modal" layout (Pencil `TkpJG`): the rule facts stack
   * in a left column (with the `header` at its top) while the entire decision
   * flow — impact · the Before-you-accept gate · the required practice note ·
   * the Generate-draft / Reject / Accept actions — lives in a right decision
   * rail. Takes over the whole modal body; renders the decision inline (no
   * separate sticky footer).
   */
  splitRail?: boolean
  /** Rendered at the top of the left column in `splitRail` mode (the header band). */
  header?: React.ReactNode
  /** Omit the per-rule Practice-review note composer. Bulk surfaces own the note
      workflow at the batch level (their own shared note), so the per-rule note
      textarea is suppressed there. The Before-you-accept AI-draft panel stays —
      it's the accept gate. */
  hideReviewAids?: boolean
  onActionComplete?: () => void | Promise<void>
}) {
  const { t } = useLingui()
  const sourceLookup = useSourceLookup()
  const dueDateSummary = useMemo(() => humanizeDueDateLogic(rule.dueDateLogic), [rule.dueDateLogic])
  const entitySummary = formatEntityApplicability(rule.entityApplicability)
  const primaryEvidence = rule.evidence[0]
  const restEvidence = rule.evidence.slice(1)
  // Summary-first card-stack (docs/Design/rule-library-review-flow.md). Each
  // section is its own bar-header DisclosureCard, collapsed to a scannable
  // summary; the reviewer opts into depth per section. The Decision surface
  // (CandidateReviewSection) is the always-expanded commit footer.
  const isReview = rule.status === 'candidate' || rule.status === 'pending_review'

  // Each section is built once as a const so the modal (columns) and the batch
  // drawer (stack) can arrange the SAME cards differently without duplicating
  // their JSX.
  const applicabilityCard = (
    // Applicability — 3 labeled chips (irBJ8); detail = full facts grid.
    <DisclosureCard
      flat={splitRail}
      title={<Trans>Applicability</Trans>}
      // No right-meta: the other sections' metas are facts (classification /
      // source count / version); "Verify before Accept" was an instruction
      // that the group eyebrow ("Verify the facts") already states. Dropping
      // it keeps the meta slot meaning one thing — a fact — across sections.
      moreLabel={<Trans>Show all fields</Trans>}
      summary={
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <FactChip label={t`Entity`} value={entitySummary} />
          <FactChip label={t`Files`} value={rule.formName} />
          <FactChip
            label={t`Effective`}
            value={
              rule.effectiveOn ? (
                formatDatePretty(rule.effectiveOn, { alwaysShowYear: true })
              ) : (
                // No source publish date — show our verification date muted +
                // "≈"-marked so it doesn't read as the source's date.
                <span className="text-text-tertiary">
                  ≈ {formatDatePretty(rule.verifiedAt, { alwaysShowYear: true })}
                </span>
              )
            }
          />
        </div>
      }
      detail={
        <dl className="flex flex-col gap-2 text-sm">
          <FactRow label={t`Entities`}>{entitySummary}</FactRow>
          <FactRow label={t`Form`}>{rule.formName}</FactRow>
          <FactRow label={t`Event`}>{formatEnumLabel(rule.eventType)}</FactRow>
          <FactRow label={t`Tax year`}>
            <span className="tabular-nums">
              {rule.taxYear}–{rule.applicableYear}
            </span>
          </FactRow>
        </dl>
      }
    />
  )

  const dueDateCard = (
    // Due date logic — humanized summary in a highlighted block (irBJ8);
    // detail = extension policy.
    <DisclosureCard
      flat={splitRail}
      title={<Trans>Due date logic</Trans>}
      meta={formatEnumLabel(rule.dueDateLogic.kind)}
      moreLabel={<Trans>View extension rules</Trans>}
      summary={
        rule.dueDateLogic.kind === 'fixed_date' ? (
          // irBJ8 "Due {date}" block — concrete date + holiday-rollover hint.
          <div className="flex flex-col gap-1 rounded-lg bg-background-section px-3.5 py-3">
            <span className="font-mono text-lg font-medium text-text-primary">
              <Trans>
                Due {formatDatePretty(rule.dueDateLogic.date, { alwaysShowYear: true })}
              </Trans>
            </span>
            <span className="text-xs font-medium text-text-secondary">
              {rule.dueDateLogic.holidayRollover === 'next_business_day' ? (
                <Trans>Weekend → next business day</Trans>
              ) : (
                <Trans>Holidays: uses the source&apos;s published calendar</Trans>
              )}
            </span>
          </div>
        ) : (
          <div className="rounded-lg bg-background-section px-3.5 py-3 text-sm text-text-primary">
            {dueDateSummary}
          </div>
        )
      }
      detail={
        <div className="flex flex-col gap-1.5">
          <CapsFieldLabel as="span" variant="group">
            <Trans>Extension</Trans>
          </CapsFieldLabel>
          <div className="text-sm">
            <ExtensionCompact policy={rule.extensionPolicy} />
          </div>
        </div>
      }
    />
  )

  const evidenceCard = (
    // Evidence — summary = primary source; detail = remaining sources.
    <DisclosureCard
      flat={splitRail}
      title={<Trans>Evidence</Trans>}
      meta={<Plural value={rule.evidence.length} one="# source" other="# sources" />}
      moreLabel={
        <Plural value={restEvidence.length} one="View # more source" other="View # more sources" />
      }
      summary={
        primaryEvidence ? (
          <RuleEvidenceCard
            evidence={primaryEvidence}
            source={sourceLookup.get(primaryEvidence.sourceId)}
            isPrimary
          />
        ) : (
          <p className="text-sm text-text-tertiary">
            <Trans>No evidence recorded.</Trans>
          </p>
        )
      }
      detail={
        restEvidence.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            {restEvidence.map((evidence) => (
              <RuleEvidenceCard
                key={evidenceKey(evidence)}
                evidence={evidence}
                source={sourceLookup.get(evidence.sourceId)}
              />
            ))}
          </div>
        ) : undefined
      }
    />
  )

  // Impact — estimated client obligations accepting would generate (real
  // previewRuleImpact count only). Review context only.
  const impactCard = isReview ? <RuleImpactCard rule={rule} flat={splitRail} /> : null

  // Practice review — team-note composer + thread (irBJ8). Review only;
  // hidden on bulk surfaces (they own the note workflow).
  const practiceCard =
    !hideReviewAids && isReview ? <RulePracticeReviewCard rule={rule} flat={splitRail} /> : null

  const activityCard = (
    // Activity — summary = current version; detail = full audit timeline.
    <DisclosureCard
      flat={splitRail}
      title={<Trans>Activity</Trans>}
      meta={<span className="tabular-nums">v{rule.version}</span>}
      moreLabel={<Trans>Show all events</Trans>}
      summary={
        <p className="text-sm text-text-secondary">
          <Trans>
            Currently on version {rule.version}. Expand for the full edit + review history.
          </Trans>
        </p>
      }
      detail={
        <EntityAuditActivityPanel
          entityType="rule"
          entityId={rule.id}
          range="all"
          emptyTitle={<Trans>No audited rule changes yet</Trans>}
          emptyDescription={
            <Trans>
              Edits, version bumps, and review decisions for this rule will appear here.
            </Trans>
          }
        />
      }
    />
  )

  // Reviewed-rule metadata (Reviewed by / at) — self-gates on reviewedAt, so
  // candidates render nothing here.
  const verificationCard = <VerificationSection rule={rule} />

  // Before you accept — the accept gate (year-over-year + AI draft). Review
  // context only.
  const beforeAcceptCard = isReview ? (
    <RuleBeforeAcceptCard
      rule={rule}
      concreteDraft={concreteDraft ?? null}
      concreteDraftLoading={concreteDraftLoading}
      flat={splitRail}
      {...(reviewReason !== undefined ? { reviewReason } : {})}
    />
  ) : null

  // Decision — always-expanded commit footer. Omitted when the modal renders
  // it as a sticky footer (hideDecision).
  const decisionCard = hideDecision ? null : (
    <CandidateReviewSection
      key={rule.id}
      rule={rule}
      concreteDraft={concreteDraft ?? null}
      concreteDraftLoading={concreteDraftLoading}
      deferQueryInvalidation={deferQueryInvalidation}
      confirmImpact={confirmImpact}
      {...(reviewReason !== undefined ? { reviewReason } : {})}
      {...(onActionComplete ? { onActionComplete } : {})}
    />
  )

  // Split-rail mode (Pencil TkpJG "Accept rule modal"): a centered two-pane —
  // the rule facts stack in a left column under the header, and the entire
  // decision flow lives in a right gray rail (impact · the Before-you-accept
  // gate · the required practice note · the Generate-draft / Reject / Accept
  // actions). No sticky footer; the rail owns the commit.
  if (splitRail) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* LEFT — header + rule facts (white, scrolls independently). Sections
            are delineated by a full-width hairline + per-section padding — the
            "clear sections, not boxes" device: enough structure to read each
            fact as a distinct band, without wrapping every one in its own
            bordered card (whitespace alone blended them together). */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {header}
          {/* Reference facts — dense + quiet. This column is read-to-verify, not
              acted on, so it stays calm; tighter section padding (py-4) packs the
              facts so the whole rule reads without much scrolling, ceding the
              visual weight to the decision rail. */}
          <div className="flex min-w-0 flex-col px-6 pt-4">
            <CapsFieldLabel as="span" variant="group" className="pb-0.5">
              <Trans>Verify the facts</Trans>
            </CapsFieldLabel>
            <div className="flex min-w-0 flex-col divide-y divide-divider-subtle [&>*]:py-4 [&>*:first-child]:pt-2.5">
              {applicabilityCard}
              {dueDateCard}
              {evidenceCard}
              {verificationCard}
            </div>
          </div>
          {/* Activity — the least-important content here (version + history, no
              decision). Demoted onto a muted strip pinned to the column foot so
              it reads as secondary metadata, clearly set apart from the facts
              above and the decision rail beside it. */}
          <div className="mt-auto border-t border-divider-subtle bg-background-section/60 px-6 py-3.5">
            {activityCard}
          </div>
        </div>

        {/* RIGHT — the decision rail. Made structurally DISTINCT from the
            read-side (Yuqi "be more different"): a deeper gray surface + a
            firmer seam so it reads as a separate "act here" panel, not a margin
            of the facts column; and an accent-tinted header (vs the neutral
            "Verify the facts" eyebrow) so the eye knows which side is the
            decision. Scrolls independently. */}
        <aside className="flex w-[400px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-divider-deep bg-background-subtle px-6 py-5">
          <CapsFieldLabel as="span" variant="group" className="text-text-accent">
            <Trans>Your decision</Trans>
          </CapsFieldLabel>
          {impactCard}
          {beforeAcceptCard}
          {practiceCard}
          {isReview ? (
            <CandidateReviewSection
              key={rule.id}
              rule={rule}
              concreteDraft={concreteDraft ?? null}
              concreteDraftLoading={concreteDraftLoading}
              deferQueryInvalidation={deferQueryInvalidation}
              confirmImpact={confirmImpact}
              chrome="flat"
              {...(reviewReason !== undefined ? { reviewReason } : {})}
              {...(onActionComplete ? { onActionComplete } : {})}
            />
          ) : null}
        </aside>
      </div>
    )
  }

  // Columns mode (full-window modal): three labeled zones in a row so the panel
  // reads as a structured decision surface — Verify the facts · Impact &
  // readiness (the accept gate sits here, nearest the footer action) · Your
  // review. Each zone is a vertical stack in a fixed left→right reading order,
  // replacing the masonry whose height-balancing scrambled the order and buried
  // the accept gate in a corner. Stacks to one column below `lg`.
  if (columns) {
    return (
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:gap-4">
        <ReviewZone label={t`Verify the facts`} className="lg:flex-[1.2]">
          {applicabilityCard}
          {dueDateCard}
          {evidenceCard}
        </ReviewZone>
        {impactCard || beforeAcceptCard ? (
          <ReviewZone label={t`Impact & readiness`} className="lg:flex-1">
            {impactCard}
            {beforeAcceptCard}
          </ReviewZone>
        ) : null}
        <ReviewZone label={t`Your review`} className="lg:flex-1">
          {practiceCard}
          {activityCard}
          {verificationCard}
        </ReviewZone>
      </div>
    )
  }

  // Stacked mode (batch-review drawer): one vertical column in source order,
  // including the inline Decision footer.
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {applicabilityCard}
      {dueDateCard}
      {evidenceCard}
      {impactCard}
      {practiceCard}
      {activityCard}
      {verificationCard}
      {beforeAcceptCard}
      {decisionCard}
    </div>
  )
}

/**
 * `RuleImpactCard` — the `N2X10V` "Impact" card. Summary = the real
 * `previewRuleImpact.estimatedObligationCount` ("→ ~N new obligations");
 * read-more = the per-entity distribution. The canvas's affected-client count
 * and coverage-lift % aren't returned by the API, so they're intentionally
 * omitted (no fiction).
 */
function RuleImpactCard({ rule, flat = false }: { rule: ObligationRule; flat?: boolean }) {
  const impactQuery = useQuery({
    ...orpc.rules.previewRuleImpact.queryOptions({
      input: { ruleId: rule.id, expectedVersion: rule.version },
    }),
    staleTime: 60_000,
  })
  const impact = impactQuery.data ?? null
  const count = impact?.estimatedObligationCount ?? null
  const clientCount = impact?.affectedClientCount ?? 0
  const entityRows = impact?.entityCounts ?? []
  return (
    <DisclosureCard
      flat={flat}
      title={<Trans>Impact</Trans>}
      meta={<Trans>Estimated</Trans>}
      moreLabel={<Trans>View breakdown</Trans>}
      summary={
        impactQuery.isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : impactQuery.isError ? (
          <p className="text-sm text-text-tertiary">
            <Trans>Impact preview unavailable.</Trans>
          </p>
        ) : count !== null && count > 0 ? (
          // irBJ8 Impact line — real affected-clients + obligation counts (the
          // canvas's "+X% coverage" is dropped: no coverage-lift metric exists).
          // Fade the resolved line in as it replaces the Skeleton. Counts stay
          // in <Plural> — opacity-only, no digit-rolling.
          <motion.p className="text-sm text-text-primary" {...fadeMotion}>
            <Trans>
              Activates this rule for{' '}
              <Plural value={clientCount} one="# client" other="# clients" /> →{' '}
              <Plural value={count} one="# new obligation" other="# new obligations" />
            </Trans>
          </motion.p>
        ) : (
          <motion.p className="text-sm text-text-secondary" {...fadeMotion}>
            <Trans>
              No client obligations yet — accepting activates this rule for future filings.
            </Trans>
          </motion.p>
        )
      }
      detail={
        entityRows.length > 0 ? (
          <dl className="flex flex-col gap-2 text-sm">
            {entityRows.map((row) => (
              <FactRow
                key={row.key}
                label={isEntityKey(row.key) ? ENTITY_LABELS[row.key] : row.key}
              >
                <span className="font-medium tabular-nums">{row.count}</span>
              </FactRow>
            ))}
          </dl>
        ) : undefined
      }
    />
  )
}

/**
 * `RuleBeforeAcceptCard` — the "Before you accept" pre-accept checks lifted OUT
 * of the Decision footer (irBJ8 keeps the footer slim). Year-over-year diff +
 * (source-defined only) the AI concrete-draft panel. Self-contained: its own
 * `draftConcreteRule` mutation invalidates `listConcreteDrafts`, which the route
 * re-reads → the footer's `concreteDraft` prop updates → Accept unlocks. So the
 * footer's accept gating needs no wiring change. Review-context rules only.
 */
function RuleBeforeAcceptCard({
  rule,
  concreteDraft,
  concreteDraftLoading = false,
  reviewReason,
  flat = false,
}: {
  rule: ObligationRule
  concreteDraft: RuleConcreteDraftCacheEntry | null
  concreteDraftLoading?: boolean
  reviewReason?: RuleReviewTaskReason
  /** `flat` (TkpJG rail): a border-only box on the gray rail (no white fill /
      bar header) — heading inline above the checks. */
  flat?: boolean
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const sourceDefined = rule.dueDateLogic.kind === 'source_defined_calendar'
  const reviewSourceId = rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? ''
  const draft = concreteDraft?.draft ?? null
  const draftMutation = useMutation(
    orpc.rules.draftConcreteRule.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.rules.listConcreteDrafts.key() })
        toast.success(t`Draft generated`)
      },
      onError: (error) => {
        toast.error(t`Couldn't generate draft`, {
          description: rpcErrorMessage(error) ?? t`Try again, or skip this rule for now.`,
        })
      },
    }),
  )
  function requestDraft() {
    if (!sourceDefined || reviewSourceId.length === 0 || draftMutation.isPending) return
    draftMutation.mutate({ ruleId: rule.id, sourceId: reviewSourceId })
  }
  const draftPanelMessage =
    sourceDefined && reviewSourceId.length === 0
      ? t`This source-defined rule is missing an official source.`
      : sourceDefined && !draft && !concreteDraftLoading
        ? t`AI concrete draft is not ready.`
        : null
  const checks = (
    <>
      <RuleYearDiff
        ruleId={rule.id}
        expectedVersion={rule.version}
        bare={flat}
        {...(reviewReason !== undefined ? { reason: reviewReason } : {})}
      />
      {sourceDefined ? (
        <AiDraftReviewPanel
          draft={draft}
          errorMessage={draftPanelMessage}
          generating={(concreteDraftLoading || draftMutation.isPending) && !draft}
          bare={flat}
          {...(reviewSourceId.length > 0 ? { onGenerateDraft: requestDraft } : {})}
        />
      ) : null}
    </>
  )

  if (flat) {
    // TkpJG gate: a single bordered box on the rail; the checks read as flat
    // hairline-separated rows inside it (no nested cards), so there's one
    // consistent padding level instead of box-in-box.
    return (
      <section className="flex flex-col rounded-lg border border-divider-regular px-4 pt-3.5 pb-3.5">
        <h3 className="text-base font-semibold text-text-primary">
          <Trans>Before you accept</Trans>
        </h3>
        <div className="flex flex-col divide-y divide-divider-regular [&>*]:py-3 [&>*:last-child]:pb-0">
          {checks}
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
      <div className="flex h-9 items-center gap-2 border-b border-divider-regular bg-background-section px-5">
        <h3 className="text-base font-semibold text-text-primary">
          <Trans>Before you accept</Trans>
        </h3>
      </div>
      <div className="flex flex-col gap-2 px-5 py-4">{checks}</div>
    </section>
  )
}

/**
 * `RulePracticeReviewCard` — the irBJ8 "Practice review" card: a team-note
 * composer (NOTE textarea + char count) + a "View N team notes" disclosure of
 * the threaded notes. Backed by the real `rules.listRuleNotes` / `addRuleNote`
 * endpoints (rule_note table). Review-context rules only.
 */
function RulePracticeReviewCard({
  rule,
  flat = false,
}: {
  rule: ObligationRule
  /** `flat` (TkpJG rail): flush label + red "Required" tag over the textarea,
      no bordered-card chrome. */
  flat?: boolean
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const notesQuery = useQuery(orpc.rules.listRuleNotes.queryOptions({ input: { ruleId: rule.id } }))
  const notes = notesQuery.data?.notes ?? []
  const addMutation = useMutation(
    orpc.rules.addRuleNote.mutationOptions({
      onSuccess: () => {
        setBody('')
        void queryClient.invalidateQueries({ queryKey: orpc.rules.listRuleNotes.key() })
        toast.success(t`Note added`)
      },
      onError: (error) => {
        toast.error(t`Couldn't add note`, {
          description: rpcErrorMessage(error) ?? t`Try again.`,
        })
      },
    }),
  )
  const trimmed = body.trim()
  const canSubmit = trimmed.length > 0 && !addMutation.isPending
  // Honest label: Accept does NOT gate on this note (`acceptDisabled` ignores
  // it; the note posts via its own addRuleNote mutation, and accept sends a
  // hardcoded reviewNote). So it's "Recommended", not "Required" — and a
  // neutral `secondary` Badge, not amber, so it reads as encouragement, not a
  // gate competing with the real locked-Accept warning.
  const recommendedTag = (
    <Badge variant="secondary" size="sm" className="ml-auto shrink-0">
      <Trans>Recommended</Trans>
    </Badge>
  )
  const inner = (
    <>
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={2000}
        disabled={addMutation.isPending}
        placeholder={t`Add a note for your team — explain assumptions, scope decisions, or follow-ups.`}
        // White fill so the field reads as editable against the gray decision
        // rail (gray-on-gray otherwise) — matches the bulk modal's note field.
        className="min-h-16 bg-background-default text-sm"
      />
      {/* Meta row — one text size across the three elements (link · count ·
          button label). They previously mixed text-base + text-caption, so a
          single row read at two scales. */}
      <div className="flex items-center gap-3">
        {notes.length > 0 ? (
          <TextLink
            variant="accent"
            onClick={() => setShowNotes((value) => !value)}
            aria-expanded={showNotes}
            className="text-xs"
          >
            <Plural value={notes.length} one="View # team note" other="View # team notes" />
            <ChevronDownIcon
              aria-hidden
              className={cn('size-3.5 transition-transform', showNotes && 'rotate-180')}
            />
          </TextLink>
        ) : (
          <span className="text-xs text-text-tertiary">
            <Trans>No team notes yet</Trans>
          </span>
        )}
        <span className="ml-auto text-xs font-medium text-text-tertiary tabular-nums">
          {body.length} / 2000
        </span>
        {trimmed.length > 0 ? (
          <Button
            type="button"
            size="xs"
            onClick={() => canSubmit && addMutation.mutate({ ruleId: rule.id, body: trimmed })}
            disabled={!canSubmit}
          >
            {addMutation.isPending ? (
              <Loader2Icon
                data-icon="inline-start"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            <Trans>Add note</Trans>
          </Button>
        ) : null}
      </div>
      {showNotes && notes.length > 0 ? (
        <ul className="flex flex-col gap-2 border-t border-divider-subtle pt-2">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.li
                key={note.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
                className="flex flex-col gap-0.5"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-text-primary">{note.authorName}</span>
                  <span className="text-xs text-text-tertiary">
                    {formatRelativeTime(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-text-secondary">{note.body}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
    </>
  )

  if (flat) {
    return (
      <section className="flex min-w-0 flex-col gap-2.5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-text-primary">
            <Trans>Practice review</Trans>
          </h3>
          {recommendedTag}
        </div>
        {inner}
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
      <div className="flex h-9 items-center gap-2 border-b border-divider-regular bg-background-section px-5">
        <h3 className="text-base font-semibold text-text-primary">
          <Trans>Practice review</Trans>
        </h3>
        {recommendedTag}
      </div>
      <div className="flex flex-col gap-2 px-5 py-4">{inner}</div>
    </section>
  )
}

function DetailSection({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  // Section labels are font-semibold text-text-primary headings, not
  // uppercase kicker eyebrows — five eyebrows in a row on the review
  // surface made the modal read as a form, not a decision page.
  // `text-base` (16px) so the labels read as title-rank between the
  // `text-xl` dialog title and the `text-sm` body; at 14px they read as
  // emphasized body text, not as section titles.
  // 2026-06-16 (Yuqi "band EVERY section"): render through the shared
  // DetailSectionCard so this group gets the same light header band.
  return (
    <DetailSectionCard variant="flat" title={label}>
      {children}
    </DetailSectionCard>
  )
}

function ExtensionCompact({ policy }: { policy: ObligationRule['extensionPolicy'] }) {
  if (!policy.available) {
    return (
      <span>
        <span className="text-text-primary">
          <Trans>Not allowed.</Trans>
        </span>
        {policy.notes ? (
          <span className="ml-1.5 text-xs text-text-tertiary">{policy.notes}</span>
        ) : null}
      </span>
    )
  }
  const parts: string[] = []
  if (policy.formName) parts.push(policy.formName)
  if (policy.durationMonths !== undefined) parts.push(`${policy.durationMonths}mo`)
  parts.push(policy.paymentExtended ? 'payment included' : 'filing-only')
  return (
    <span className="text-text-primary">
      <Trans>Allowed</Trans> · {parts.join(' · ')}
    </span>
  )
}

export function CandidateReviewSection({
  rule,
  concreteDraft,
  concreteDraftLoading = false,
  deferQueryInvalidation = false,
  onActionComplete,
  chrome = 'card',
  confirmImpact = false,
  reviewReason,
}: {
  rule: ObligationRule
  reviewReason?: RuleReviewTaskReason
  concreteDraft?: RuleConcreteDraftCacheEntry | null
  concreteDraftLoading?: boolean
  deferQueryInvalidation?: boolean
  onActionComplete?: () => void | Promise<void>
  /**
   * When true, the Accept action first opens a "Confirm impact" dialog
   * (Pencil `jpoZx`) summarizing the real downstream deadline impact
   * (from `previewRuleImpact`) before committing. Used by the single-rule
   * detail panel; the batch-review queue keeps the fast one-click accept.
   */
  confirmImpact?: boolean
  /**
   * The dialog renders this section as a sticky FOOTER below the
   * scrollable body, which means it should NOT carry its own rounded
   * card chrome (the footer wrapper provides the visual boundary via
   * `border-t`). Default stays `'card'` so other callers (batch-review
   * modal in coverage-tab) keep their existing chrome.
   */
  chrome?: 'card' | 'flat'
}) {
  if (rule.status !== 'candidate' && rule.status !== 'pending_review') {
    return null
  }
  return (
    <CandidateReviewForm
      rule={rule}
      concreteDraft={concreteDraft ?? null}
      concreteDraftLoading={concreteDraftLoading}
      deferQueryInvalidation={deferQueryInvalidation}
      chrome={chrome}
      confirmImpact={confirmImpact}
      {...(reviewReason !== undefined ? { reviewReason } : {})}
      {...(onActionComplete ? { onActionComplete } : {})}
    />
  )
}

function CandidateReviewForm({
  rule,
  concreteDraft,
  concreteDraftLoading = false,
  deferQueryInvalidation = false,
  onActionComplete,
  chrome = 'card',
  confirmImpact = false,
}: {
  rule: ObligationRule
  reviewReason?: RuleReviewTaskReason
  concreteDraft: RuleConcreteDraftCacheEntry | null
  concreteDraftLoading?: boolean
  deferQueryInvalidation?: boolean
  onActionComplete?: () => void | Promise<void>
  chrome?: 'card' | 'flat'
  confirmImpact?: boolean
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [acceptCompleting, setAcceptCompleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Accept-mutation error surface (Pencil `DGeuG`). On failure the loading
  // toast is dismissed and this dialog takes over — it carries the real
  // server message + code, reassures the draft is preserved, and offers a
  // one-click Retry. (`acceptAttempts` numbers retries; the Pencil's
  // per-step "Step 3 of 5" progress is intentionally NOT rendered — the
  // accept is a single RPC with no streamed step state, so it'd be fiction.)
  const [acceptError, setAcceptError] = useState<{ message: string; code: string | null } | null>(
    null,
  )
  const acceptAttemptsRef = useRef(0)
  const acceptToastIdRef = useRef<string | number | null>(null)
  const sourceDefined = rule.dueDateLogic.kind === 'source_defined_calendar'
  const reviewSourceId = rule.sourceIds[0] ?? rule.evidence[0]?.sourceId ?? ''
  const draft = concreteDraft?.draft ?? null

  const invalidateRules = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.rules.listRules.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.rules.listReviewTasks.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.rules.listReviewDecisions.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }

  const invalidateAcceptedRuleOutputs = () => {
    invalidateRules()
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    // Accepting may have recomputed matched pulse alerts' matchedCount against
    // the freshly-generated deadlines — refetch so the "proposed change" block
    // and the alerts surfaces reflect the new counts.
    void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
  }

  function acceptToastOptions(options: Omit<ExternalToast, 'id'> = {}): ExternalToast {
    const id = acceptToastIdRef.current
    return id === null ? options : { ...options, id }
  }

  function finishAcceptAction() {
    void (async () => {
      try {
        await onActionComplete?.()
      } finally {
        window.requestAnimationFrame(() => {
          setAcceptCompleting(false)
          acceptToastIdRef.current = null
          if (!deferQueryInvalidation) invalidateAcceptedRuleOutputs()
        })
      }
    })()
  }

  function handleAcceptSuccess() {
    toast.success(t`Rule accepted`, acceptToastOptions({ style: ACCEPT_RULE_SUCCESS_TOAST_STYLE }))
    track(ANALYTICS_EVENTS.ruleAccepted, {
      jurisdiction: rule.jurisdiction,
      filing_type: rule.taxType,
      affected_client_count: impactQuery.data?.affectedClientCount,
    })
    finishAcceptAction()
  }

  function handleAcceptError(error: unknown) {
    setAcceptCompleting(false)
    // Replace the loading toast with the error dialog (Pencil `DGeuG`) — it
    // gives the failure room for the message + a real Retry, rather than a
    // toast the user has to re-trigger the whole flow from.
    if (acceptToastIdRef.current !== null) {
      toast.dismiss(acceptToastIdRef.current)
      acceptToastIdRef.current = null
    }
    setAcceptError({
      message: rpcErrorMessage(error) ?? t`The server rejected the change.`,
      code: rpcErrorCode(error),
    })
  }

  // ---- Reject flow (Pencil DvLC9 reject popover) ---------------------
  // Rejecting needs an explicit reason (free-text on the wire). The UI
  // offers preset reasons + an "Other" note. Mirrors the accept flow's
  // in-flight + error handling; rejecting writes no obligations, so it
  // only invalidates the rule/review/audit caches (not obligations).
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  function handleRejectSuccess() {
    setRejecting(false)
    setRejectOpen(false)
    toast.success(t`Rule rejected`)
    track(ANALYTICS_EVENTS.ruleRejected, {
      jurisdiction: rule.jurisdiction,
      filing_type: rule.taxType,
    })
    void (async () => {
      try {
        await onActionComplete?.()
      } finally {
        window.requestAnimationFrame(() => {
          if (!deferQueryInvalidation) invalidateRules()
        })
      }
    })()
  }
  function handleRejectError(error: unknown) {
    setRejecting(false)
    toast.error(t`Couldn't reject rule`, {
      description: rpcErrorMessage(error) ?? t`Check the rule version and try again.`,
    })
  }
  const rejectTemplateMutation = useMutation(
    orpc.rules.rejectTemplate.mutationOptions({
      onSuccess: handleRejectSuccess,
      onError: handleRejectError,
    }),
  )
  const rejectCandidateMutation = useMutation(
    orpc.rules.rejectCandidate.mutationOptions({
      onSuccess: handleRejectSuccess,
      onError: handleRejectError,
    }),
  )
  const rejectPending = rejectTemplateMutation.isPending || rejectCandidateMutation.isPending
  function submitReject(reason: string) {
    const trimmed = reason.trim()
    if (trimmed.length === 0 || rejecting || rejectPending) return
    setRejecting(true)
    if (sourceDefined) {
      rejectCandidateMutation.mutate({ ruleId: rule.id, reason: trimmed })
    } else {
      rejectTemplateMutation.mutate({
        ruleId: rule.id,
        expectedVersion: rule.version,
        reason: trimmed,
      })
    }
  }

  const acceptMutation = useMutation(
    orpc.rules.acceptTemplate.mutationOptions({
      onSuccess: handleAcceptSuccess,
      onError: handleAcceptError,
    }),
  )
  const verifyMutation = useMutation(
    orpc.rules.verifyCandidate.mutationOptions({
      onSuccess: handleAcceptSuccess,
      onError: handleAcceptError,
    }),
  )
  // The `draftConcreteRule` generate mutation now lives in `RuleBeforeAcceptCard`
  // (the pre-accept checks moved out of this slim footer, irBJ8). Accept stays
  // gated on `draft` from the `concreteDraft` prop, which the route re-reads
  // after that card's generate invalidates `listConcreteDrafts`.

  // Preview the rule's impact so the Practice review explainer can show
  // the actual count of deadlines acceptance would generate. Surfaces in
  // the explainer copy as "Accepting will generate ~N deadlines for
  // client filings in {jurisdiction}…" — the decision weight depends on
  // the magnitude, not just the jurisdiction + entity labels. Errors are
  // silently ignored — if the preview can't load, we fall back to the
  // generic copy.
  const impactQuery = useQuery({
    ...orpc.rules.previewRuleImpact.queryOptions({
      input: { ruleId: rule.id, expectedVersion: rule.version },
    }),
    staleTime: 60_000,
  })
  const estimatedObligations = impactQuery.data?.estimatedObligationCount ?? null
  function submitAccept() {
    if (acceptCompleting || isPending) return
    setAcceptError(null)
    acceptAttemptsRef.current += 1
    setAcceptCompleting(true)
    acceptToastIdRef.current = toast.loading(
      t`Accepting rule…`,
      acceptToastOptions({ style: ACCEPT_RULE_LOADING_TOAST_STYLE }),
    )
    if (sourceDefined) {
      if (!draft || reviewSourceId.length === 0) {
        setAcceptCompleting(false)
        toast.dismiss(acceptToastIdRef.current)
        acceptToastIdRef.current = null
        return
      }
      verifyMutation.mutate({
        ruleId: rule.id,
        sourceId: reviewSourceId,
        aiOutputId: draft.aiOutputId,
        reviewNote: t`Accepted AI concrete draft from rule detail review.`,
      })
      return
    }
    acceptMutation.mutate({
      ruleId: rule.id,
      expectedVersion: rule.version,
      reviewNote: t`Accepted as shown from rule detail review.`,
    })
  }

  const isPending = acceptMutation.isPending || verifyMutation.isPending
  // Any in-flight decision (accept OR reject) locks both actions so a
  // double-submit / accept-while-rejecting race can't fire two writes.
  const reviewDisabled = isPending || acceptCompleting || rejecting || rejectPending
  const draftUnavailableMessage =
    sourceDefined && reviewSourceId.length === 0
      ? t`This source-defined rule is missing an official source.`
      : null
  const draftPanelMessage =
    draftUnavailableMessage ??
    // Actionable, not just a status: this rule's due date comes from its source,
    // so Accept stays locked until the AI draft exists — and the way to make it
    // exist is the "Generate draft" button in the gate just above. Say so.
    (sourceDefined && !draft && !concreteDraftLoading
      ? t`Generate the AI draft above to unlock Accept.`
      : null)
  const acceptDisabledReason = sourceDefined
    ? reviewSourceId.length === 0
      ? t`This source-defined rule is missing an official source.`
      : draftUnavailableMessage
        ? draftUnavailableMessage
        : concreteDraftLoading && !draft
          ? t`AI concrete draft is loading.`
          : draftPanelMessage && !draft
            ? draftPanelMessage
            : !draft
              ? t`Generate the AI draft above to unlock Accept.`
              : null
    : null
  const acceptDisabled =
    reviewDisabled || acceptDisabledReason !== null || (sourceDefined && !draft)

  const entitySummary = formatEntityApplicability(rule.entityApplicability)
  // `chrome === 'card'` renders the wrapper as the Card primitive (sm
  // size, accent-active tone, md radius). `chrome === 'flat'` keeps the
  // bare <section> so the sticky dialog footer doesn't double-wrap with
  // its own border-t + tinted bg.
  const body = (
    <>
      {/* No "Decision" heading — the bordered commit footer + the
          Accept/Reject buttons already name this zone; in the full-window
          panel the heading was just height the reviewer must scroll past. */}
      <p className="text-xs text-text-secondary">
        {sourceDefined && rule.status === 'active' ? (
          <Trans>
            This rule is active for client filings in {rule.jurisdiction} for {entitySummary}, but
            it still needs concrete due-date logic before it can create deadlines.
          </Trans>
        ) : (
          // Only the unique skip-guidance here — the "accepting activates this
          // rule" consequence is already stated by the Impact card at the top
          // of this rail, so it isn't repeated next to the buttons.
          <Trans>
            Skip it if the evidence, applicability, due-date logic, or extension handling needs more
            review.
          </Trans>
        )}
      </p>
      {/* Client-impact line. Shows the actual count of deadlines this
          rule would generate across the firm's clients. Renders only when
          the preview query has a count > 0 so an empty firm doesn't see a
          misleading "0 deadlines." Quiet text tertiary — informative, not
          action-demanding. */}
      {estimatedObligations !== null && estimatedObligations > 0 ? (
        <p className="text-xs text-text-tertiary">
          <Plural
            value={estimatedObligations}
            one="Generates ~# deadline across your current clients."
            other="Generates ~# deadlines across your current clients."
          />
        </p>
      ) : null}
      {/* Pre-accept checks (year-over-year + AI draft) now live in the
          `RuleBeforeAcceptCard` scroll card above — the footer stays slim
          (irBJ8). Accept's draft gating is unchanged: it reads `draft` from the
          `concreteDraft` prop, which the route re-reads after that card's
          generate invalidates `listConcreteDrafts`. */}
      {/* Action bar — gate status on the left, the two decision actions on
          the right. When Accept is blocked, the REASON sits here next to the
          disabled button (not only in the "Before you accept" scroll card),
          so a greyed-out Accept is never unexplained. Otherwise the left
          carries the audit-log assurance (the canvas's "signed by {name}" is
          dropped — there's no signer until the decision is recorded).
          Reject never depends on a draft being ready; Accept does. */}
      {/* The commit — the climax of the rail, so it's given weight: a stronger
          top rule sets it off, the gate status/reason gets its own full-width
          line (so the actionable lock reason reads in full, never truncated),
          and the two decisions sit below as full-height (default-size) buttons
          with Accept stretched to dominate as the primary action. */}
      <div className="flex flex-col gap-2.5 border-t border-divider-regular pt-4">
        {acceptDisabledReason ? (
          <span className="inline-flex min-w-0 items-start gap-1.5 text-xs font-medium text-text-warning">
            <TriangleAlertIcon aria-hidden className="mt-px size-3.5 shrink-0" />
            <span className="min-w-0">{acceptDisabledReason}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
            <ShieldCheckIcon aria-hidden className="size-3.5 shrink-0" />
            <Trans>Your decision is recorded in the audit log.</Trans>
          </span>
        )}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRejectOpen(true)}
            disabled={reviewDisabled}
            data-rule-action="reject"
          >
            <Trans>Reject</Trans>
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={confirmImpact ? () => setConfirmOpen(true) : submitAccept}
            disabled={acceptDisabled}
            data-rule-action="accept"
          >
            {/* Lock when the gate isn't satisfied (TkpJG) — the disabled Accept
                reads as "locked until ready", not merely greyed. */}
            {acceptDisabled && !reviewDisabled ? <LockIcon data-icon="inline-start" /> : null}
            <Trans>Accept rule</Trans>
          </Button>
        </div>
      </div>
      {/* No separate "Accept unlocks once the draft is ready" hint here — it
          restated the ⚠ disabled-reason that already sits next to the locked
          Accept above (and the actionable home is the "Before you accept"
          gate card). One home per fact. */}
      {confirmImpact ? (
        <ConfirmImpactDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          rule={rule}
          impact={impactQuery.data ?? null}
          loading={impactQuery.isLoading}
          errored={impactQuery.isError}
          isPending={reviewDisabled}
          onConfirm={() => {
            setConfirmOpen(false)
            submitAccept()
          }}
        />
      ) : null}
      {acceptError ? (
        <RuleAcceptErrorDialog
          ruleId={rule.id}
          error={acceptError}
          attempt={acceptAttemptsRef.current}
          retrying={acceptCompleting || isPending}
          onRetry={submitAccept}
          onReload={() => {
            // Refetch the rule so the panel re-renders with the latest version,
            // then dismiss — a subsequent accept sends the fresh expectedVersion.
            invalidateRules()
            setAcceptError(null)
          }}
          onClose={() => setAcceptError(null)}
        />
      ) : null}
      {/* Reject dialog mounts in every review context (single detail + batch
          walkthrough); it's only visible when `rejectOpen`. */}
      <RejectReasonDialog
        open={rejectOpen}
        onOpenChange={(next) => {
          // Don't allow closing mid-submit so the result toast lands on
          // a known state.
          if (rejecting || rejectPending) return
          setRejectOpen(next)
        }}
        rule={rule}
        pending={rejecting || rejectPending}
        onSubmit={submitReject}
      />
    </>
  )
  if (chrome === 'card') {
    return (
      <Card size="sm" tone="accent-active" radius="md">
        {body}
      </Card>
    )
  }
  return <section className="flex flex-col gap-3">{body}</section>
}

/** Extract an oRPC error's machine code (e.g. `CONFLICT`), if present. */
function rpcErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string' && code.length > 0) return code
  }
  return null
}

/**
 * `RuleAcceptErrorDialog` — the accept-mutation failure surface (Pencil
 * `DGeuG`). Shown when `acceptTemplate` / `verifyCandidate` rejects: a
 * destructive-led header with the rule id + attempt count, the real server
 * message, the machine code (only when it adds signal beyond the message),
 * reassurance that the draft is preserved, and a one-click Retry.
 *
 * The Pencil's "Step 3 of 5 · Write deadline changes" progress + the
 * "Reference: req_… · Logged to audit" line are intentionally omitted — the
 * accept is a single RPC (no streamed step state) and a rolled-back failure
 * isn't written to the audit ledger, so rendering either would be fiction.
 */
export function RuleAcceptErrorDialog({
  ruleId,
  error,
  attempt,
  retrying,
  onRetry,
  onReload,
  onClose,
}: {
  ruleId: string
  error: { message: string; code: string | null }
  attempt: number
  retrying: boolean
  onRetry: () => void
  /** Reload the rule from the server (refetch + close). The recovery for a
      stale-version conflict, where retrying with the same expected version
      would just fail again. */
  onReload?: () => void
  onClose: () => void
}) {
  const { t } = useLingui()
  // A version conflict (Pencil zVX0E) is a stale-view problem, not a server
  // failure: someone saved a newer version after this one opened. It reads as
  // a warning (amber), not an error (red), and the fix is Reload — not Retry,
  // which would re-send the same stale expected version and fail again.
  // (No field-level merge UI: the accept RPC doesn't return the conflicting
  // values, so a side-by-side diff would be fiction.)
  const isConflict = error.code === 'CONFLICT'
  const showCode = !isConflict && error.code !== null && error.code !== error.message
  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent
        showCloseButton
        className="flex w-[min(480px,calc(100vw-2rem))] max-w-[480px] flex-col gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center gap-3 border-b border-divider-subtle px-4 py-4">
          <span
            aria-hidden
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              isConflict ? 'bg-state-warning-hover' : 'bg-state-destructive-hover',
            )}
          >
            <TriangleAlertIcon
              className={cn('size-4', isConflict ? 'text-text-warning' : 'text-text-destructive')}
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-base font-semibold text-text-primary">
              {isConflict ? (
                <Trans>This rule changed since you opened it</Trans>
              ) : (
                <Trans>Couldn't apply rule</Trans>
              )}
            </DialogTitle>
            <span className="truncate font-mono text-xs font-medium text-text-tertiary">
              {ruleId}
              {!isConflict && attempt > 1 ? ` · ${t`attempt ${attempt}`}` : ''}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3.5 px-[22px] py-5">
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-medium leading-relaxed text-text-secondary">
              {isConflict ? (
                <Trans>A newer version was saved after you opened this one.</Trans>
              ) : (
                error.message
              )}
            </p>
            <p className="text-xs text-text-tertiary">
              {isConflict ? (
                <Trans>
                  Reload to review the latest before accepting — retrying now would apply against an
                  outdated version.
                </Trans>
              ) : (
                <Trans>Your draft is preserved — retry, or come back to it later.</Trans>
              )}
            </p>
          </div>
          {showCode ? (
            <div className="flex items-center rounded-lg border border-divider-subtle bg-background-subtle px-3 py-2.5">
              <span className="font-mono text-xs font-medium text-text-destructive">
                {error.code}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-divider-subtle px-4 py-3.5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={retrying}>
            <Trans>Cancel</Trans>
          </Button>
          {isConflict && onReload ? (
            <Button size="sm" onClick={onReload} disabled={retrying}>
              <RotateCcwIcon data-icon="inline-start" />
              <Trans>Reload rule</Trans>
            </Button>
          ) : (
            <Button size="sm" onClick={onRetry} disabled={retrying}>
              {retrying ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <RotateCcwIcon data-icon="inline-start" />
              )}
              <Trans>Retry</Trans>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * `ConfirmImpactDialog` — the accept-time impact confirmation (Pencil
 * `jpoZx`). Styled like the design's confirm-impact modal but populated
 * ONLY with the real aggregate `previewRuleImpact` data we have
 * (estimated deadlines + entity distribution) — no fabricated per-client
 * rows. Shown from the single-rule detail panel before committing accept.
 */
function ConfirmImpactDialog({
  open,
  onOpenChange,
  rule,
  impact,
  loading,
  errored,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  rule: ObligationRule
  impact: RuleBulkImpactPreview | null
  loading: boolean
  errored: boolean
  isPending: boolean
  onConfirm: () => void
}) {
  const { t } = useLingui()
  const deadlines = impact?.estimatedObligationCount ?? 0
  const entityRows = (impact?.entityCounts ?? []).filter((row) => row.count > 0)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(560px,calc(100vw-2rem))] max-w-[560px] gap-0 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-divider-subtle px-5 py-4">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-state-accent-hover"
          >
            <ShieldCheckIcon className="size-[18px] text-text-accent" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-lg font-semibold text-text-primary">
              <Trans>Confirm accept</Trans>
            </DialogTitle>
            <p className="text-base text-text-tertiary">
              <Trans>
                Accepting activates this rule for client filings in{' '}
                {jurisdictionLabel(rule.jurisdiction)}.
              </Trans>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label={t`Close`}
            onClick={() => onOpenChange(false)}
            className="-mr-1 -mt-1 shrink-0"
          >
            <XIcon className="size-4" aria-hidden />
          </Button>
        </div>
        {/* Honest aggregate stats — only the numbers the API provides. */}
        <div className="flex items-center gap-5 border-b border-divider-subtle bg-background-subtle px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-medium text-text-primary tabular-nums">
              {loading ? '—' : errored ? '—' : deadlines}
            </span>
            <span className="text-xs font-medium text-text-tertiary">
              {deadlines === 1 ? t`deadline generated` : t`deadlines generated`}
            </span>
          </div>
          <span className="h-8 w-px shrink-0 bg-divider-subtle" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-medium text-text-primary tabular-nums">
              {rule.entityApplicability.length}
            </span>
            <span className="text-xs font-medium text-text-tertiary">
              {rule.entityApplicability.length === 1 ? t`entity type` : t`entity types`}
            </span>
          </div>
        </div>
        {/* Body — real entity distribution, or an honest activation note. */}
        <div className="flex flex-col gap-3 px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : errored ? (
            <p className="text-sm text-text-secondary">
              <Trans>
                Couldn&apos;t load the impact preview. You can still accept — the rule will activate
                for client filings in {jurisdictionLabel(rule.jurisdiction)}.
              </Trans>
            </p>
          ) : deadlines > 0 ? (
            <>
              <p className="text-xs text-text-tertiary">
                <Trans>These deadlines will be created across your current clients:</Trans>
              </p>
              <ul className="flex flex-col">
                {entityRows.map((row, index) => (
                  <li
                    key={row.key}
                    className={cn(
                      'flex items-center justify-between py-2',
                      index > 0 && 'border-t border-divider-subtle',
                    )}
                  >
                    <span className="text-sm text-text-secondary">
                      {isEntityKey(row.key) ? ENTITY_LABELS[row.key] : row.key}
                    </span>
                    <span className="text-sm font-medium text-text-primary tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              <Trans>
                No client deadlines will be generated yet — accepting activates this rule for future
                filings.
              </Trans>
            </p>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-divider-subtle px-5 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={isPending}>
            <CheckIcon data-icon="inline-start" />
            <Trans>Activate rule</Trans>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * `RejectReasonDialog` — the reject-with-reason step (Pencil DvLC9 reject
 * popover). Offers preset reasons + an "Other" free-text note; the chosen
 * reason is sent as the rule's reject `reason` string. Reject is blocked
 * until a reason is selected (and a note typed when "Other"). State resets
 * each time the dialog opens so a prior selection never leaks across rules.
 */
function RejectReasonDialog({
  open,
  onOpenChange,
  rule,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  rule: ObligationRule
  pending: boolean
  onSubmit: (reason: string) => void
}) {
  const { t } = useLingui()
  // Pencil toYTe reason picker: rich two-line cards. The label is what's
  // persisted as the reject `reason`; the subline is static guidance only.
  const presets = [
    {
      key: 'policy',
      label: t`Conflicts with firm policy`,
      hint: t`This rule contradicts a stricter internal policy you've set.`,
    },
    {
      key: 'source',
      label: t`Source unreliable or superseded`,
      hint: t`The cited authority is outdated or a newer notice supersedes it.`,
    },
    {
      key: 'duplicate',
      label: t`Duplicate of an existing rule`,
      hint: t`Already covered by a rule in your library.`,
    },
    {
      key: 'other',
      label: t`Other`,
      hint: t`You'll write a brief reason below.`,
    },
  ] as const
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  // Reset when (re)opened so a prior selection never leaks into the next
  // rejection.
  useEffect(() => {
    if (open) {
      setSelected(null)
      setNote('')
    }
  }, [open])
  const isOther = selected === 'other'
  const trimmedNote = note.trim()
  const presetLabel = presets.find((p) => p.key === selected)?.label ?? ''
  // For "Other" the note IS the reason (required). For preset reasons the note
  // is an optional internal note appended to the persisted reason string — so
  // the always-visible field never silently discards what's typed.
  const reason = isOther
    ? trimmedNote
    : presetLabel
      ? trimmedNote
        ? `${presetLabel} — ${trimmedNote}`
        : presetLabel
      : ''
  const canSubmit = (isOther ? trimmedNote.length > 0 : selected !== null) && !pending
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(540px,calc(100vw-2rem))] max-w-[540px] gap-0 overflow-hidden p-0"
      >
        <div className="flex items-start gap-3 border-b border-divider-subtle px-6 py-5">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-state-destructive-hover"
          >
            <BanIcon className="size-[18px] text-text-destructive" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-lg font-semibold text-text-primary">
              <Trans>Reject rule</Trans>
            </DialogTitle>
            <p className="truncate text-sm font-medium text-text-secondary" title={rule.title}>
              {rule.title}
            </p>
            <p className="text-xs text-text-tertiary">
              <Trans>Will be marked Rejected and skipped in your library.</Trans>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Kbd>Esc</Kbd>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label={t`Close`}
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="-mr-1 shrink-0"
            >
              <XIcon className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-2">
            <CapsFieldLabel as="span" variant="group">
              <Trans>Why are you rejecting?</Trans>
            </CapsFieldLabel>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label={t`Reject reason`}>
              {presets.map((preset) => {
                const active = selected === preset.key
                return (
                  <button
                    key={preset.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(preset.key)}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                      active
                        ? 'border-state-accent-solid bg-state-accent-hover'
                        : 'border-divider-subtle hover:bg-state-base-hover',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                        active ? 'border-state-accent-solid' : 'border-divider-deep',
                      )}
                    >
                      {active ? (
                        <span className="size-2 rounded-full bg-state-accent-solid" />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-text-primary">{preset.label}</span>
                      <span className="text-xs text-text-tertiary">{preset.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder={
              isOther
                ? t`Add a short note explaining the rejection…`
                : t`Add an internal note (optional, visible to firm members only)…`
            }
            className="min-h-18 text-sm"
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-divider-subtle px-6 py-4">
          <p className="text-xs text-text-tertiary">
            {isOther ? (
              <Trans>A note is required for “Other”.</Trans>
            ) : (
              <Trans>The reason is recorded on the rejection.</Trans>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              type="button"
              variant="destructive-primary"
              size="sm"
              onClick={() => onSubmit(reason)}
              disabled={!canSubmit}
            >
              <BanIcon data-icon="inline-start" />
              <Trans>Reject rule</Trans>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AiDraftReviewPanel({
  draft,
  errorMessage,
  generating,
  onGenerateDraft,
  bare = false,
}: {
  draft: RuleConcreteDraft | null
  errorMessage: string | null
  generating: boolean
  /**
   * When no draft and not actively generating, render a "Generate draft"
   * button. Optional — only rendered when caller has a viable source +
   * mutation wired up. Without this prop the panel just shows the
   * disabled / pending state.
   */
  onGenerateDraft?: () => void
  /** Drop the Card box so the check reads as a flat row inside a parent gate
      (TkpJG), not a nested card. */
  bare?: boolean
}) {
  const Wrapper = bare ? AiDraftBareWrapper : AiDraftCardWrapper
  return (
    <Wrapper busy={generating && !draft}>
      <p className="text-xs font-medium text-text-secondary">
        <Trans>AI concrete draft</Trans>
      </p>
      {generating && !draft ? <AiDraftReviewSkeleton /> : null}
      {!generating && !draft && (onGenerateDraft || errorMessage) ? (
        // Pre-generation state (informational `text-text-tertiary`, not an
        // error tone). When a draft CAN be generated we explain what it is and
        // why it's needed; when it can't (no official source), we surface that
        // blocker (`errorMessage`) instead.
        <div className="flex flex-col gap-2.5">
          {onGenerateDraft ? (
            // What the AI concrete draft is + how it's used — so a reviewer
            // seeing "Generate draft" for the first time knows what they get.
            <p className="text-xs text-text-tertiary">
              <Trans>
                This rule&apos;s due date is set by its official source, so it has no concrete logic
                yet. Generating a draft reads that source and proposes the exact due date — review
                the proposal and its confidence, then accept to start creating client deadlines from
                it.
              </Trans>
            </p>
          ) : (
            <p className="text-xs text-text-tertiary">{errorMessage}</p>
          )}
          {/* "Generate draft" is the primary, full-width CTA (TkpJG): while
              Accept is gated on a ready draft, generating it is the real next
              action, so it leads. Without it the user could only Skip →
              revisit → still no draft → Skip again. */}
          {onGenerateDraft ? (
            <Button
              type="button"
              size="sm"
              onClick={onGenerateDraft}
              disabled={generating}
              className="w-full"
            >
              <SparklesIcon data-icon="inline-start" />
              {generating ? <Trans>Generating…</Trans> : <Trans>Generate draft</Trans>}
            </Button>
          ) : null}
        </div>
      ) : null}
      {draft ? (
        <div className="flex flex-col gap-2 text-sm animate-in fade-in duration-150 motion-reduce:animate-none">
          <p className="text-text-primary">{humanizeDueDateLogic(draft.dueDateLogic)}</p>
          <div className="flex items-baseline gap-2 text-xs">
            <span className="text-text-tertiary">
              <Trans>Confidence</Trans>
            </span>
            {/* Qualitative tier (Low/Medium/High) renders alongside the
                raw percentage so a CPA reading the draft can match against
                the same Low/Medium/High vocabulary used in Alerts, instead
                of mentally translating "72%" into the canonical ladder. */}
            <span className="font-mono text-text-secondary">
              {Math.round(draft.confidence * 100)}%
              <span className="ml-1 text-text-tertiary">
                {(() => {
                  const tier = aiConfidenceTier(draft.confidence)
                  if (tier === 'low') return <Trans>(Low)</Trans>
                  if (tier === 'medium') return <Trans>(Medium)</Trans>
                  return <Trans>(High)</Trans>
                })()}
              </span>
            </span>
          </div>
          <blockquote className="border-l border-state-accent-active-alt pl-2 text-xs text-text-secondary italic">
            “{draft.sourceExcerpt}”
          </blockquote>
          <p className="text-xs text-text-tertiary">{draft.reasoning}</p>
        </div>
      ) : null}
    </Wrapper>
  )
}

/** Boxed (default) wrapper for the AI-draft check — a muted Card. */
function AiDraftCardWrapper({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <Card size="sm" tone="muted" radius="md" aria-busy={busy ? true : undefined}>
      {children}
    </Card>
  )
}

/** Flat wrapper for the AI-draft check — a bare column inside a parent gate
    (TkpJG), so it reads as a row, not a nested card. */
function AiDraftBareWrapper({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2" aria-busy={busy ? true : undefined}>
      {children}
    </div>
  )
}

function AiDraftReviewSkeleton() {
  // Explicit "AI is reading the source" microcopy above the skeleton
  // bars: a bare skeleton row leaves the user wondering whether the page
  // is loading or actually invoking a model — naming the operation
  // removes the ambiguity and sets honest latency expectations.
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      <p className="text-xs text-text-tertiary">
        <Trans>AI is reading the source…</Trans>
      </p>
      <Skeleton className="h-4 w-4/5" />
      <div className="grid grid-cols-[96px_1fr] gap-x-2 gap-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

function ApplicabilitySection({ rule }: { rule: ObligationRule }) {
  // Applicability layout:
  //   - First line: full sentence "Applies to {entities} in
  //     {jurisdiction}" — answers "who does this rule cover" in plain
  //     prose before any tabular data.
  //   - Grid rows uniform `text-sm text-text-secondary`.
  //   - Event row spells out the secondary flags ("also handles payment"
  //     instead of "· also payment") so the suffix reads as a sentence.
  return (
    <DetailSectionCard
      variant="flat"
      title={<Trans>Applicability</Trans>}
      headerRight={
        <Plural value={rule.entityApplicability.length} one="# entity" other="# entities" />
      }
    >
      <p className="text-sm text-text-primary">
        <Trans>
          Applies to {formatEntityApplicability(rule.entityApplicability)} in{' '}
          <JurisdictionCode code={rule.jurisdiction} />
        </Trans>
      </p>
      <div className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <span className="text-text-tertiary">
          <Trans>Tax type</Trans>
        </span>
        <span className="text-text-secondary">
          <TaxCodeLabel code={rule.taxType} />
        </span>
        <span className="text-text-tertiary">
          <Trans>Form</Trans>
        </span>
        <span className="text-text-secondary">{rule.formName}</span>
        <span className="text-text-tertiary">
          <Trans>Event</Trans>
        </span>
        <EventRow rule={rule} />
        <span className="text-text-tertiary">
          <Trans>Tax year</Trans>
        </span>
        <span className="text-text-secondary tabular-nums">
          {rule.taxYear === rule.applicableYear
            ? rule.taxYear
            : `${rule.taxYear}–${rule.applicableYear}`}
        </span>
      </div>
      {/* The "derive" direction: applicability says WHO this rule covers —
          these links open the actual work it generated. "Deadlines" is the
          flat list; "Affected clients" is the same set grouped by client (the
          rule→clients view). Only for live rules; candidates have generated
          nothing yet, so the links would land on an empty list. */}
      {rule.status !== 'candidate' && rule.status !== 'pending_review' ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <TextLink
            variant="accent"
            size="sm"
            render={<Link to={`/deadlines?rule=${encodeURIComponent(rule.id)}`} />}
          >
            <SquareChartGanttIcon className="size-3.5" aria-hidden />
            <Trans>View deadlines from this rule</Trans>
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </TextLink>
          <TextLink
            variant="accent"
            size="sm"
            render={<Link to={`/deadlines?rule=${encodeURIComponent(rule.id)}&group=client`} />}
          >
            <UsersIcon className="size-3.5" aria-hidden />
            <Trans>View affected clients</Trans>
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </TextLink>
        </div>
      ) : null}
    </DetailSectionCard>
  )
}

function EventRow({ rule }: { rule: ObligationRule }) {
  // Secondary flags are spelled out — "(also handles payment)" / "(also
  // handles filing)" — so the relationship to the primary eventType is
  // obvious, rather than a terse "· also filing" suffix.
  const extras: ('filing' | 'payment')[] = []
  if (rule.isFiling && rule.eventType !== 'filing') extras.push('filing')
  if (rule.isPayment && rule.eventType !== 'payment') extras.push('payment')
  return (
    <span className="text-text-secondary">
      {formatEnumLabel(rule.eventType)}
      {extras.length > 0 ? (
        <span className="ml-2 text-text-tertiary">
          <Trans>(also handles {extras.join(' + ')})</Trans>
        </span>
      ) : null}
    </span>
  )
}

function DueDateLogicSection({ rule }: { rule: ObligationRule }) {
  const summary = useMemo(() => humanizeDueDateLogic(rule.dueDateLogic), [rule.dueDateLogic])
  // The humanizer returns a dense formula sentence like "15th day of the
  // 3rd month after tax year end…" which is hard to scan, so the section
  // label is "When it's due" — plain English asks "when?" before the
  // reader hits the answer.
  return (
    <DetailSectionCard variant="flat" title={<Trans>When it's due</Trans>}>
      <p className="text-sm text-text-primary">{summary}</p>
    </DetailSectionCard>
  )
}

function ExtensionSection({ rule }: { rule: ObligationRule }) {
  // The extension section is a structured grid so the relationship
  // between "extension is allowed", "form to file", "how long", and
  // "what's covered" reads top-down inside one labeled section with
  // explicit field labels.
  const { extensionPolicy } = rule
  const durationMonths = extensionPolicy.durationMonths
  return (
    <DetailSectionCard variant="flat" title={<Trans>Extension</Trans>}>
      {extensionPolicy.available ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-primary">
            <Trans>An extension can be filed for this deadline.</Trans>
          </p>
          <div className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-sm">
            {extensionPolicy.formName ? (
              <>
                <span className="text-text-tertiary">
                  <Trans>Form</Trans>
                </span>
                <span className="font-medium text-text-secondary">{extensionPolicy.formName}</span>
              </>
            ) : null}
            {durationMonths !== undefined ? (
              <>
                <span className="text-text-tertiary">
                  <Trans>Adds</Trans>
                </span>
                <span className="text-text-secondary">
                  <Plural value={durationMonths} one="# month" other="# months" />
                </span>
              </>
            ) : null}
            <span className="text-text-tertiary">
              <Trans>Covers</Trans>
            </span>
            {extensionPolicy.paymentExtended ? (
              <span className="text-text-secondary">
                <Trans>Filing and payment.</Trans>
              </span>
            ) : (
              <span className="inline-flex items-start gap-1.5 font-medium text-text-warning">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <Trans>Filing only. Payment is not extended.</Trans>
                </span>
              </span>
            )}
          </div>
          {extensionPolicy.notes ? (
            <p className="text-xs text-text-tertiary">{extensionPolicy.notes}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-text-primary">
            <Trans>This deadline cannot be extended.</Trans>
          </p>
          {extensionPolicy.notes ? (
            <p className="text-xs text-text-tertiary">{extensionPolicy.notes}</p>
          ) : null}
        </div>
      )}
    </DetailSectionCard>
  )
}

function ReviewReasonsSection({ rule }: { rule: ObligationRule }) {
  if (
    rule.status !== 'candidate' &&
    rule.status !== 'pending_review' &&
    !rule.requiresApplicabilityReview
  ) {
    return null
  }

  // The callout carries an icon-led heading that names the work ("Needs
  // CPA review" / "Needs CPA confirmation") plus a `defaultTip` body that
  // explains why, so it reads as a regular section, not a random alert
  // box. The CTA action lives in CandidateReviewSection below — this
  // section names the WHY, the next one names the HOW. RuleDetailInline
  // pushes this section to the top of the body when the rule still needs
  // review, so the prompt isn't buried below Applicability / Due date.
  // `info` for review-needed (accent tint), `warning` for applicability
  // review (severity-medium tint).
  if (rule.status === 'candidate' || rule.status === 'pending_review') {
    return (
      <Alert variant="info" aria-label="Review required">
        <TriangleAlertIcon />
        <AlertTitle>
          <Trans>Needs CPA review</Trans>
        </AlertTitle>
        <AlertDescription>{rule.defaultTip}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="warning" aria-label="Applicability review required">
      <TriangleAlertIcon />
      <AlertTitle>
        <Trans>Needs CPA confirmation each year</Trans>
      </AlertTitle>
      <AlertDescription>{rule.defaultTip}</AlertDescription>
    </Alert>
  )
}

function EvidenceSection({
  rule,
  sourceLookup,
}: {
  rule: ObligationRule
  sourceLookup: ReadonlyMap<string, RuleSource>
}) {
  return (
    <DetailSectionCard
      variant="flat"
      title={<Trans>Evidence</Trans>}
      headerRight={<span className="tabular-nums">{rule.evidence.length}</span>}
    >
      <div className="flex flex-col gap-2">
        {rule.evidence.map((evidence) => (
          <RuleEvidenceCard
            key={evidenceKey(evidence)}
            evidence={evidence}
            source={sourceLookup.get(evidence.sourceId)}
          />
        ))}
      </div>
    </DetailSectionCard>
  )
}

function RuleEvidenceCard({
  evidence,
  source,
  isPrimary = false,
}: {
  evidence: RuleEvidence
  source: RuleSource | undefined
  /** The primary source gets the green "Primary" pill (irBJ8); others show
      their authority-role chip. */
  isPrimary?: boolean
}) {
  // irBJ8 Evidence row: file tile · code (sourceId, mono) · name (source.title)
  // · external-link · description (evidence.summary) · Primary / authority pill.
  // (Switched from the verbatim sourceExcerpt quote to the evidence summary, per
  // the canvas — the quote is the locator-level detail, not the row.)
  const inner = (
    <>
      <span
        aria-hidden
        className="flex size-[22px] shrink-0 items-center justify-center self-start rounded bg-background-section"
      >
        <FileTextIcon className="size-3.5 text-text-muted" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-medium text-text-secondary">
            {evidence.sourceId}
          </span>
          <span aria-hidden className="text-text-muted">
            ·
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-text-primary">
            {source?.title ?? evidence.sourceId}
          </span>
          {source?.url ? (
            <ExternalLinkIcon aria-hidden className="size-3 shrink-0 text-text-muted" />
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm text-text-secondary">{evidence.summary}</p>
      </div>
      {isPrimary ? (
        // The lead source — a ROLE, not a success state. Solid emphasis (per the
        // Badge milestone-chip convention) in the brand accent, not green:
        // success-green falsely read as "this source is verified/good".
        <Badge variant="accent-solid" className="shrink-0 self-start px-2.5 font-medium">
          <Trans>Primary</Trans>
        </Badge>
      ) : (
        <AuthorityRoleBadge role={evidence.authorityRole} />
      )}
    </>
  )

  if (source?.url) {
    const url = source.url
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open official source: ${source.title}`}
        onClick={(event) => openEvidenceSource(event, url)}
        className="group/card flex items-start gap-3 rounded-lg border border-components-card-border bg-components-card-bg px-3 py-2.5 text-left text-sm text-text-primary no-underline outline-none transition-colors hover:border-state-accent-active-alt hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {inner}
      </a>
    )
  }

  return (
    <Card size="sm" radius="md" className="flex items-start gap-3 px-3 py-2.5">
      {inner}
    </Card>
  )
}

function openEvidenceSource(event: React.MouseEvent<HTMLAnchorElement>, url: string) {
  event.preventDefault()
  event.stopPropagation()
  window.open(url, '_blank', 'noopener,noreferrer')
}

function evidenceKey(evidence: RuleEvidence): string {
  // RuleEvidence has no natural primary key, but `sourceId + authorityRole +
  // locator.heading` is unique within an `ObligationRule.evidence[]` per the
  // current rule pack (verified by `packages/core/src/rules/index.test.ts`).
  return `${evidence.sourceId}::${evidence.authorityRole}::${evidence.locator.heading ?? ''}`
}

function AuthorityRoleBadge({ role }: { role: RuleEvidenceAuthorityRole }) {
  const className = {
    basis: 'bg-state-accent-hover text-text-accent',
    cross_check: 'bg-background-subtle text-text-secondary',
    watch: 'bg-state-warning-hover text-text-warning',
    early_warning: 'bg-state-warning-hover text-text-warning',
  }[role]
  // WATCH / BASIS / CROSS-CHECK / EARLY-WARN are opaque to first-timers,
  // so a tooltip via `title` explains the classification in plain English
  // on hover. The label stays short to fit the evidence-card chip slot;
  // the explainer surfaces only when the user needs it.
  return (
    <Badge
      title={RULE_AUTHORITY_ROLE_DESCRIPTION[role]}
      className={cn(
        'h-[18px] shrink-0 cursor-help rounded-sm border-transparent px-1.5 text-caption-xs font-medium uppercase tracking-eyebrow-tight',
        className,
      )}
    >
      {RULE_AUTHORITY_ROLE_LABEL[role]}
    </Badge>
  )
}

function VerificationSection({ rule }: { rule: ObligationRule }) {
  const practiceTimezone = usePracticeTimezone()
  if (!rule.reviewedAt) return null

  return (
    <DetailSectionCard variant="flat" title={<Trans>Practice review</Trans>}>
      <div className="grid grid-cols-[88px_1fr] gap-y-1 text-sm">
        <span className="text-text-tertiary">
          <Trans>Reviewed by</Trans>
        </span>
        <span className="text-text-secondary">
          {rule.reviewedByName ?? <Trans>Unknown reviewer</Trans>}
        </span>
        <span className="text-text-tertiary">
          <Trans>Reviewed at</Trans>
        </span>
        <span className="font-mono text-text-secondary">
          {formatDateTimeWithTimezone(rule.reviewedAt, practiceTimezone)}
        </span>
      </div>
    </DetailSectionCard>
  )
}

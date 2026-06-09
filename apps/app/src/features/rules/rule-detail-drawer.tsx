import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  AlertTriangleIcon,
  Astroid,
  CheckIcon,
  SparklesIcon,
  TriangleAlertIcon,
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
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { cn } from '@duedatehq/ui/lib/utils'

import { EntityAuditActivityPanel } from '@/features/audit/entity-audit-activity-panel'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
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
const ACCEPT_RULE_ERROR_TOAST_STYLE: CSSProperties = {
  background: 'var(--state-destructive-hover)',
  borderColor: 'var(--state-destructive-hover-alt)',
  color: 'var(--text-destructive)',
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
  // 2026-05-25 (Yuqi rule library #14-#16): the old audit-meta header
  // (`fed.7004.extension.1065.2025 · v1 · Active`) lived inline at the
  // top of the body. Now the kicker line lives in the Dialog header
  // (RuleDetailKicker), so the body just renders the structured
  // sections. ReviewReasonsSection is conditionally pushed to the top
  // when present so the "you need to act" prompt isn't buried below
  // the rule substance when the rule still needs review.
  // 2026-05-27 (Yuqi — "Practice review在最下面而且需要滑动才能看到"):
  // `CandidateReviewSection` no longer renders inside the scrollable
  // body. The dialog renders it as a sticky footer below this
  // component so the Accept action is always visible without
  // scrolling past every reference section first.
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
    <section className="flex flex-col gap-3 border-t border-divider-subtle pt-4">
      <RuleSectionHeading>
        <Trans>Version history</Trans>
      </RuleSectionHeading>
      <EntityAuditActivityPanel
        entityType="rule"
        entityId={rule.id}
        emptyTitle={<Trans>No audited rule changes yet</Trans>}
        emptyDescription={
          <Trans>Edits, version bumps, and review decisions for this rule will appear here.</Trans>
        }
      />
    </section>
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
export function RuleDetailCompact({
  rule,
  concreteDraft,
  concreteDraftLoading = false,
  deferQueryInvalidation = false,
  onActionComplete,
  reviewReason,
}: {
  rule: ObligationRule
  reviewReason?: RuleReviewTaskReason
  concreteDraft?: RuleConcreteDraftCacheEntry | null
  concreteDraftLoading?: boolean
  deferQueryInvalidation?: boolean
  onActionComplete?: () => void | Promise<void>
}) {
  const sourceLookup = useSourceLookup()
  const dueDateSummary = useMemo(() => humanizeDueDateLogic(rule.dueDateLogic), [rule.dueDateLogic])
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* 2026-05-26 (Yuqi /critique — P1-3 / P2-1 / P2-3):
        retired the audit meta line. It carried `rule.id` (a
        dev-internal slug — `al.individual_income_return.candidate.
        2026` reads as code, not as identity), `v{rule.version}`
        (only meaningful to engineers debugging migrations), and
        a `Needs review` status pill (redundant — every rule in
        the batch-review queue is "Needs review" by definition;
        the surface IS the review queue). The audit trail for
        these values lives in the server-side audit log; the
        review screen doesn't need to repeat it.

        If a future surface needs the rule id (deep-link share,
        DevTools, support ticket reference), expose it via a
        "Copy rule id" affordance or a Details disclosure, not
        as visible chrome. */}

      {/* Vertical layout — each section's label sits ABOVE its
        content, not beside. Frees the full panel width for content
        (long source titles, due-date paragraphs, evidence cards
        wrap less aggressively) and removes the eye-jump from a
        narrow label column to a wider content column. */}
      <DetailSection label={<Trans>Applicability</Trans>}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-text-primary">
          <JurisdictionCode code={rule.jurisdiction} />
          <span>{formatEntityApplicability(rule.entityApplicability)}</span>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span className="text-text-secondary">{rule.formName}</span>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span className="text-text-secondary">{formatEnumLabel(rule.eventType)}</span>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span className="font-mono text-xs text-text-tertiary">
            {rule.taxYear}–{rule.applicableYear}
          </span>
        </div>
      </DetailSection>

      <DetailSection label={<Trans>Due date</Trans>}>
        <p className="text-sm text-text-primary">{dueDateSummary}</p>
      </DetailSection>

      <DetailSection label={<Trans>Extension</Trans>}>
        <div className="text-sm">
          <ExtensionCompact policy={rule.extensionPolicy} />
        </div>
      </DetailSection>

      <DetailSection label={<Trans>Evidence</Trans>}>
        <div className="flex min-w-0 flex-col gap-1.5">
          {rule.evidence.map((evidence) => (
            <RuleEvidenceCard
              key={evidenceKey(evidence)}
              evidence={evidence}
              source={sourceLookup.get(evidence.sourceId)}
            />
          ))}
        </div>
      </DetailSection>

      <CandidateReviewSection
        key={rule.id}
        rule={rule}
        concreteDraft={concreteDraft ?? null}
        concreteDraftLoading={concreteDraftLoading}
        deferQueryInvalidation={deferQueryInvalidation}
        {...(reviewReason !== undefined ? { reviewReason } : {})}
        {...(onActionComplete ? { onActionComplete } : {})}
      />
    </div>
  )
}

function DetailSection({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  // 2026-05-26 (Yuqi /critique on Review Pending Rules modal —
  // P1-1): section labels were `text-caption uppercase tracking-
  // wider text-text-muted` kicker eyebrows. Five eyebrows in a
  // row on the review surface made the modal read as a form, not
  // a decision page. Switched to a font-semibold text-text-primary
  // section heading.
  // 2026-05-27 (Yuqi follow-up — "section title没有用正常的title"):
  // bumped `text-sm` → `text-base` so the section labels actually
  // read as title-rank between the `text-xl` dialog title and the
  // `text-sm` body. At 14px they read as emphasized body text, not
  // as section titles; 16px gives them their own tier in the
  // hierarchy.
  return (
    <section className="flex flex-col gap-3">
      <h4 className="text-base font-semibold text-text-primary">{label}</h4>
      {children}
    </section>
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
   * 2026-05-27 (Yuqi follow-up — "Practice review在最下面而且需要
   * 滑动才能看到"): the review action is the WHY of the dialog —
   * scrolling to it is wrong. The dialog now renders this section
   * as a sticky FOOTER below the scrollable body, which means it
   * should NOT carry its own rounded card chrome (the footer
   * wrapper provides the visual boundary via `border-t`). Default
   * stays `'card'` so other callers (batch-review modal in
   * coverage-tab) keep their existing chrome.
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
  reviewReason,
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
    finishAcceptAction()
  }

  function handleAcceptError(error: unknown) {
    setAcceptCompleting(false)
    toast.error(
      t`Couldn't accept rule`,
      acceptToastOptions({
        description: rpcErrorMessage(error) ?? t`Check the rule version and try again.`,
        style: ACCEPT_RULE_ERROR_TOAST_STYLE,
      }),
    )
    acceptToastIdRef.current = null
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
  // 2026-05-26 (Yuqi /critique — P0-3): when the AI concrete
  // draft isn't ready, the user used to be stuck — disabled
  // Accept + Skip = infinite "come back later" loop across 456+
  // rules. Now: `draftConcreteRule` mutation surfaced inline so
  // the user can trigger generation right from the review card.
  // On success, invalidate `listConcreteDrafts` so the new draft
  // surfaces in the panel; the disabled Accept then unlocks.
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

  // 2026-05-26 (Yuqi /critique — P2-2): preview the rule's impact
  // so the Practice review explainer can show the actual count of
  // deadlines acceptance would generate. Surfaces in the
  // explainer copy as "Accepting will generate ~N deadlines for
  // client filings in {jurisdiction}…" — the decision weight
  // depends on the magnitude, not just the jurisdiction + entity
  // labels. Errors are silently ignored — if the preview can't
  // load, we fall back to the generic copy.
  const impactQuery = useQuery({
    ...orpc.rules.previewRuleImpact.queryOptions({
      input: { ruleId: rule.id, expectedVersion: rule.version },
    }),
    staleTime: 60_000,
  })
  const estimatedObligations = impactQuery.data?.estimatedObligationCount ?? null
  function submitAccept() {
    if (acceptCompleting || isPending) return
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
    (sourceDefined && !draft && !concreteDraftLoading ? t`AI concrete draft is not ready.` : null)
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
              ? t`AI concrete draft is not ready.`
              : null
    : null
  const acceptDisabled =
    reviewDisabled || acceptDisabledReason !== null || (sourceDefined && !draft)

  const entitySummary = formatEntityApplicability(rule.entityApplicability)
  // 2026-06-01: `chrome === 'card'` now renders the wrapper as the
  // Card primitive (sm size, accent-active tone, md radius) instead
  // of a hand-rolled <section> with the same recipe. `chrome ===
  // 'flat'` keeps the bare <section> so the sticky dialog footer
  // doesn't double-wrap with its own border-t + tinted bg.
  const body = (
    <>
      {/* Section header used to include a right-aligned "Needs review"
          chip that duplicated the rule-status pill in the audit meta
          line above. Dropped per /critique — one canonical "needs
          review" signal is enough. */}
      <RuleSectionHeading>
        <Trans>Practice review</Trans>
      </RuleSectionHeading>
      <p className="text-sm text-text-secondary">
        {sourceDefined && rule.status === 'active' ? (
          <Trans>
            This rule is active for client filings in {rule.jurisdiction} for {entitySummary}, but
            it still needs concrete due-date logic before it can create deadlines.
          </Trans>
        ) : (
          <Trans>
            Accepting activates this rule for client filings in {rule.jurisdiction} for{' '}
            {entitySummary}. Skip it if the evidence, applicability, due-date logic, or extension
            handling needs more review.
          </Trans>
        )}
      </p>
      {/* 2026-05-26 (Yuqi /critique — P2-2): client-impact line.
          Shows the actual count of deadlines this rule would
          generate across the firm's clients. Renders only when
          the preview query has a count > 0 so an empty firm
          doesn't see a misleading "0 deadlines." Quiet text
          tertiary — informative, not action-demanding. */}
      {estimatedObligations !== null && estimatedObligations > 0 ? (
        <p className="text-xs text-text-tertiary">
          <Plural
            value={estimatedObligations}
            one="Generates ~# deadline across your current clients."
            other="Generates ~# deadlines across your current clients."
          />
        </p>
      ) : null}
      <RuleYearDiff
        ruleId={rule.id}
        expectedVersion={rule.version}
        {...(reviewReason !== undefined ? { reason: reviewReason } : {})}
      />
      {sourceDefined ? (
        <AiDraftReviewPanel
          draft={draft}
          errorMessage={draftPanelMessage}
          generating={(concreteDraftLoading || draftMutation.isPending) && !draft}
          {...(reviewSourceId.length > 0 ? { onGenerateDraft: requestDraft } : {})}
        />
      ) : null}

      <div className="flex justify-end gap-2">
        {/* Reject lives only in the single-rule detail review (the
            `confirmImpact` context). The batch queue is accept/skip-only
            — skipping defers a rule without a destructive decision. Reject
            does NOT depend on a concrete draft being ready (unlike Accept). */}
        {confirmImpact ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={reviewDisabled}
            data-rule-action="reject"
          >
            <Trans>Reject</Trans>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={confirmImpact ? () => setConfirmOpen(true) : submitAccept}
          disabled={acceptDisabled}
          data-rule-action="accept"
        >
          <Trans>Accept rule</Trans>
        </Button>
      </div>
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
      {confirmImpact ? (
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
      ) : null}
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
            <SparklesIcon className="size-[18px] text-text-accent" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-lg font-semibold text-text-primary">
              <Trans>Confirm impact</Trans>
            </DialogTitle>
            <p className="text-[13px] text-text-tertiary">
              <Trans>
                Accepting activates this rule for client filings in{' '}
                {jurisdictionLabel(rule.jurisdiction)}.
              </Trans>
            </p>
          </div>
          <button
            type="button"
            aria-label={t`Close`}
            onClick={() => onOpenChange(false)}
            className="-mr-1 -mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        </div>
        {/* Honest aggregate stats — only the numbers the API provides. */}
        <div className="flex items-center gap-5 border-b border-divider-subtle bg-background-subtle px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold text-text-primary tabular-nums">
              {loading ? '—' : errored ? '—' : deadlines}
            </span>
            <span className="text-[11px] font-medium text-text-muted">
              {deadlines === 1 ? t`deadline generated` : t`deadlines generated`}
            </span>
          </div>
          <span className="h-8 w-px shrink-0 bg-divider-subtle" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold text-text-primary tabular-nums">
              {rule.entityApplicability.length}
            </span>
            <span className="text-[11px] font-medium text-text-muted">
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
                    <span className="text-sm font-semibold text-text-primary tabular-nums">
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
            <Trans>Accept & apply</Trans>
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
  const presets = [
    { key: 'errors', label: t`Contains errors` },
    { key: 'wrong_source', label: t`Source or jurisdiction is incorrect` },
    { key: 'duplicate', label: t`Duplicate of an existing rule` },
    { key: 'other', label: t`Other (see note)` },
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
  const reason = isOther ? trimmedNote : (presets.find((p) => p.key === selected)?.label ?? '')
  const canSubmit = reason.length > 0 && !pending
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(480px,calc(100vw-2rem))] max-w-[480px] gap-0 overflow-hidden p-0"
      >
        <div className="flex items-start gap-3 border-b border-divider-subtle px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-lg font-semibold text-text-primary">
              <Trans>Reject rule</Trans>
            </DialogTitle>
            <p className="truncate text-[13px] text-text-tertiary" title={rule.title}>
              {rule.title}
            </p>
          </div>
          <button
            type="button"
            aria-label={t`Close`}
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="-mr-1 -mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-2 px-5 py-4">
          <span className="text-xs font-medium text-text-secondary">
            <Trans>Why are you rejecting this rule?</Trans>
          </span>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={t`Reject reason`}>
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
                    'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                    active
                      ? 'border-state-accent-solid bg-state-accent-hover text-text-primary'
                      : 'border-divider-regular text-text-secondary hover:bg-state-base-hover',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-full border',
                      active ? 'border-state-accent-solid' : 'border-divider-deep',
                    )}
                  >
                    {active ? <span className="size-2 rounded-full bg-state-accent-solid" /> : null}
                  </span>
                  {preset.label}
                </button>
              )
            })}
          </div>
          {isOther ? (
            <Textarea
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              placeholder={t`Add a short note explaining the rejection…`}
              className="mt-1 min-h-20 text-sm"
            />
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-divider-subtle px-5 py-4">
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
            variant="destructive"
            size="sm"
            onClick={() => onSubmit(reason)}
            disabled={!canSubmit}
          >
            <Trans>Reject rule</Trans>
          </Button>
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
}: {
  draft: RuleConcreteDraft | null
  errorMessage: string | null
  generating: boolean
  /**
   * 2026-05-26 (Yuqi /critique — P0-3): when no draft and not
   * actively generating, render a "Generate draft" button.
   * Optional — only rendered when caller has a viable source +
   * mutation wired up. Without this prop the panel just shows
   * the disabled / pending state as before.
   */
  onGenerateDraft?: () => void
}) {
  // 2026-06-01: hand-rolled tinted panel → Card primitive (sm size,
  // muted tone, md radius) matches the previous recipe one-for-one
  // (divider-subtle border, background-section bg) without the
  // local border+bg+rounded class soup.
  return (
    <Card size="sm" tone="muted" radius="md" aria-busy={generating && !draft ? true : undefined}>
      <p className="text-xs font-medium text-text-secondary">
        <Trans>AI concrete draft</Trans>
      </p>
      {generating && !draft ? <AiDraftReviewSkeleton /> : null}
      {!generating && errorMessage && !draft ? (
        // 2026-05-26 (Yuqi /critique — P0-2): "AI concrete draft
        // is not ready" was rendered in `text-severity-medium`
        // (amber/red). That tone implies "something is broken",
        // but the pre-generation state isn't an error — it's a
        // pending state. Switched to `text-text-tertiary` so the
        // message reads as informational. The disabled Accept
        // button already communicates "you can't proceed yet";
        // the message just explains why. Red wasn't earning the
        // urgency it claimed.
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-tertiary">{errorMessage}</p>
          {/* 2026-05-26 (Yuqi /critique — P0-3 follow-up): inline
              "Generate draft" CTA. Without it, the user could only
              Skip → revisit → still no draft → Skip again — an
              infinite loop across the 456-rule queue. Outline
              button keeps the primary "Accept rule" CTA as the
              dominant action below; this is the "make Accept
              possible" pre-action. */}
          {onGenerateDraft ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={onGenerateDraft}
              disabled={generating}
            >
              <Astroid data-icon="inline-start" />
              {generating ? <Trans>Generating…</Trans> : <Trans>Generate draft</Trans>}
            </Button>
          ) : null}
        </div>
      ) : null}
      {draft ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-text-primary">{humanizeDueDateLogic(draft.dueDateLogic)}</p>
          <div className="flex items-baseline gap-2 text-xs">
            <span className="text-text-tertiary">
              <Trans>Confidence</Trans>
            </span>
            {/* 2026-05-26 (Step 9 AI Visibility Audit F-013): qualitative
                tier (Low/Medium/High) renders alongside the raw
                percentage so a CPA reading the draft can match against
                the same Low/Medium/High vocabulary used in Alerts,
                instead of mentally translating "72%" into the canonical
                ladder. */}
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
    </Card>
  )
}

function AiDraftReviewSkeleton() {
  // 2026-05-26 (Step 9 AI Visibility Audit F-053): added explicit
  // "AI is reading the source" microcopy above the skeleton bars.
  // Before, a bare skeleton row left the user wondering whether the
  // page was loading or actually invoking a model — naming the
  // operation removes the ambiguity and sets honest latency
  // expectations.
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

// 2026-05-26 (Yuqi /critique): `RuleStatusInline` retired with the
// audit meta line in RuleDetailCompact. Status pill was redundant
// on the review surface (every rule there is "Needs review" by
// queue definition) and unused elsewhere. Recover from git if a
// non-review surface needs the inline status renderer.

function RuleSectionHeading({ children }: { children: React.ReactNode }) {
  // 2026-05-26 (Yuqi /critique — same canonical move as
  // DetailSection above). Practice review heading reads at the
  // same weight as Applicability / Due date / Extension / Evidence
  // so the action zone doesn't feel buried under meta.
  // 2026-05-27 (Yuqi follow-up): bumped `text-sm` → `text-base` —
  // matches the DetailSection bump, gives every section title in
  // the rule-detail surfaces a single voice at title-rank size.
  return <h4 className="text-base font-semibold text-text-primary">{children}</h4>
}

function ApplicabilitySection({ rule }: { rule: ObligationRule }) {
  // 2026-05-25 (Yuqi rule library #19, #20, #23): applicability
  // section tidied up. Was a mixed-type grid (some rows in mono,
  // some in proper text) with a confusing "· also filing" suffix
  // that didn't read as English. Now:
  //   - First line: full sentence "Applies to {entities} in
  //     {jurisdiction}" — answers "who does this rule cover" in
  //     plain prose before any tabular data.
  //   - Grid rows uniform `text-sm text-text-secondary` (no more
  //     mono mixed with non-mono for "Tax year" — that drift was
  //     Yuqi's #20 complaint).
  //   - Event row spells out the secondary flags ("also handles
  //     payment" instead of "· also payment") so the suffix reads
  //     as a sentence.
  return (
    <section className="flex flex-col gap-3">
      <RuleSectionHeading>
        <Trans>Applicability</Trans>
      </RuleSectionHeading>
      <p className="text-base text-text-primary">
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
    </section>
  )
}

function EventRow({ rule }: { rule: ObligationRule }) {
  // 2026-05-25 (Yuqi rule library #19): the "· also filing" suffix
  // didn't read as English — CPAs asked "what does '· also filing'
  // mean?" Now spelled out: "(also handles payment)" / "(also
  // handles filing)" so the relationship to the primary eventType
  // is obvious.
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
  // 2026-05-25 (Yuqi rule library #21): the humanizer returns a
  // dense formula sentence like "15th day of the 3rd month after
  // tax year end…" which is hard to scan. Renamed the section
  // label to "When it's due" — plain English asks "when?"
  // before reading the answer. Padding tightened so the answer
  // sits closer to the label.
  return (
    <section className="flex flex-col gap-3">
      <RuleSectionHeading>
        <Trans>When it's due</Trans>
      </RuleSectionHeading>
      <p className="text-base text-text-primary">{summary}</p>
    </section>
  )
}

function ExtensionSection({ rule }: { rule: ObligationRule }) {
  // 2026-05-25 (Yuqi rule library #22, #25): rewrote the extension
  // section as a structured grid so the relationship between
  // "extension is allowed", "form to file", "how long", "what's
  // covered" is read top-down. Before it was four loose paragraphs
  // and the form name (e.g. "Form 7004") floated on its own line
  // — Yuqi asked whether Form 7004 belonged to this section at
  // all. Now everything sits inside one labeled section with
  // explicit field labels.
  const { extensionPolicy } = rule
  const durationMonths = extensionPolicy.durationMonths
  return (
    <section className="flex flex-col gap-3">
      <RuleSectionHeading>
        <Trans>Extension</Trans>
      </RuleSectionHeading>
      {extensionPolicy.available ? (
        <div className="flex flex-col gap-2">
          <p className="text-base text-text-primary">
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
          <p className="text-base text-text-primary">
            <Trans>This deadline cannot be extended.</Trans>
          </p>
          {extensionPolicy.notes ? (
            <p className="text-xs text-text-tertiary">{extensionPolicy.notes}</p>
          ) : null}
        </div>
      )}
    </section>
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

  // 2026-05-25 (Yuqi rule library #27, #28): the callout used to
  // float at the bottom of the dialog with no label — Yuqi asked
  // "what is this? does it have an action?" Now it carries:
  //   - A RuleSectionHeading-style heading so it reads as a regular
  //     section, not a random alert box
  //   - An explicit "Needs CPA review" / "Needs CPA confirmation"
  //     icon-led heading that names the work
  //   - A `defaultTip` body that explains why
  //   - The CTA action lives in CandidateReviewSection below
  //     (Accept / Skip buttons) — this section names the WHY,
  //     the next one names the HOW.
  // RuleDetailInline pushes this section to the top of the body
  // when the rule still needs review, so the prompt isn't buried
  // below Applicability / Due date.
  // 2026-06-01: hand-rolled callouts → Alert primitive. `info` for
  // review-needed (accent tint) and `warning` for applicability
  // review (severity-medium tint) match the previous tone mapping.
  if (rule.status === 'candidate' || rule.status === 'pending_review') {
    return (
      <Alert variant="info" aria-label="Review required">
        <AlertTriangleIcon />
        <AlertTitle>
          <Trans>Needs CPA review</Trans>
        </AlertTitle>
        <AlertDescription>{rule.defaultTip}</AlertDescription>
        {/* 2026-05-27 (Yuqi follow-up — sticky-footer move): old copy
            promised "Accept / Skip buttons below" but there's no Skip
            button in this dialog (Skip lives only in the coverage-tab
            workspace queue). Since the action bar is now pinned at
            the bottom and always visible, an explicit pointer is
            redundant. Dropped. */}
      </Alert>
    )
  }

  return (
    <Alert variant="warning" aria-label="Applicability review required">
      <AlertTriangleIcon />
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
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <RuleSectionHeading>
          <Trans>Evidence</Trans>
        </RuleSectionHeading>
        <span className="font-mono text-xs tabular-nums text-text-tertiary">
          {rule.evidence.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {rule.evidence.map((evidence) => (
          <RuleEvidenceCard
            key={evidenceKey(evidence)}
            evidence={evidence}
            source={sourceLookup.get(evidence.sourceId)}
          />
        ))}
      </div>
    </section>
  )
}

function RuleEvidenceCard({
  evidence,
  source,
}: {
  evidence: RuleEvidence
  source: RuleSource | undefined
}) {
  // 2026-06-01: hand-rolled chrome (border + bg + rounded + hover/focus
  // recipe) → Card primitive. Link variant uses `interactive` so the
  // pointer + accent-border hover + focus-visible ring come from the
  // primitive, with an overlay <a> carrying href / target / onClick /
  // aria-label so behavior + a11y are unchanged.
  const inner = (
    <>
      <div className="flex w-full min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AuthorityRoleBadge role={evidence.authorityRole} />
          <span className="min-w-0 flex-1 truncate text-base font-medium text-text-primary">
            {source?.title ?? evidence.sourceId}
          </span>
        </div>
        {source?.url ? (
          <span className="shrink-0 text-sm text-text-accent" aria-hidden>
            ↗
          </span>
        ) : null}
      </div>
      <EvidenceLocator evidence={evidence} />
      <p className="line-clamp-2 text-xs text-text-secondary italic">“{evidence.sourceExcerpt}”</p>
    </>
  )

  if (source?.url) {
    const url = source.url
    // Link variant keeps the host <a> so href / target / rel / aria-label
    // / onClick remain on the focusable, semantic anchor. Visual recipe
    // mirrors Card size='sm' radius='md' interactive — couldn't render
    // Card directly as <a> (Card has no polymorphic render slot yet).
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open official source: ${source.title}`}
        onClick={(event) => openEvidenceSource(event, url)}
        className="group/card flex flex-col items-stretch gap-1.5 rounded-lg border border-components-card-border bg-components-card-bg px-3 py-2.5 text-left text-sm text-text-primary no-underline outline-none transition-colors hover:border-state-accent-active-alt hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {inner}
      </a>
    )
  }

  return (
    <Card size="sm" radius="md" className="gap-1.5 px-3 py-2.5">
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
  // 2026-05-26 (Yuqi /critique — P1-4): WATCH / BASIS / CROSS-CHECK
  // / EARLY-WARN were opaque to first-timers. Tooltip via `title`
  // explains the classification in plain English on hover. The
  // label stays short so it fits the evidence-card chip slot;
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

function EvidenceLocator({ evidence }: { evidence: RuleEvidence }) {
  const parts: string[] = []
  if (evidence.locator.heading) parts.push(evidence.locator.heading)
  if (evidence.locator.tableLabel) parts.push(`table: ${evidence.locator.tableLabel}`)
  if (evidence.locator.rowLabel) parts.push(`row: ${evidence.locator.rowLabel}`)
  if (evidence.locator.pdfPage !== undefined) parts.push(`p.${evidence.locator.pdfPage}`)
  if (parts.length === 0) return null
  return <p className="text-xs text-text-tertiary">{parts.join(' · ')}</p>
}

function VerificationSection({ rule }: { rule: ObligationRule }) {
  const practiceTimezone = usePracticeTimezone()
  if (!rule.reviewedAt) return null

  return (
    <section className="flex flex-col gap-3 border-t border-divider-subtle pt-4">
      <RuleSectionHeading>
        <Trans>Practice review</Trans>
      </RuleSectionHeading>
      <div className="grid grid-cols-[88px_1fr] gap-y-1 text-xs">
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
    </section>
  )
}

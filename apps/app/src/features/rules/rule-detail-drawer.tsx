import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, Astroid, TriangleAlertIcon } from 'lucide-react'
import { toast, type ExternalToast } from 'sonner'

import type {
  ObligationRule,
  RuleConcreteDraft,
  RuleConcreteDraftCacheEntry,
  RuleEvidence,
  RuleEvidenceAuthorityRole,
  RuleSource,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'

import {
  formatEnumLabel,
  humanizeDueDateLogic,
  RULE_AUTHORITY_ROLE_DESCRIPTION,
  RULE_AUTHORITY_ROLE_LABEL,
} from './rules-console-model'
import { JurisdictionCode } from './rules-console-primitives'
import { useSourceLookup } from './use-source-lookup'

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
  // Applicability / Due date when the rule still needs review.
  // 2026-05-27 (Yuqi — "Practice review在最下面而且需要滑动才能看到"):
  // `CandidateReviewSection` no longer renders inside the scrollable
  // body. The dialog renders it as a sticky footer below this
  // component so the Accept action is always visible without
  // scrolling past every reference section first.
  const needsReview = rule.status === 'candidate' || rule.status === 'pending_review'
  return (
    <div className="flex flex-col gap-4">
      {needsReview ? <ReviewReasonsSection rule={rule} /> : null}
      <ApplicabilitySection rule={rule} />
      <DueDateLogicSection rule={rule} />
      <ExtensionSection rule={rule} />
      {!needsReview ? <ReviewReasonsSection rule={rule} /> : null}
      <EvidenceSection rule={rule} sourceLookup={sourceLookup} />
      <VerificationSection rule={rule} />
    </div>
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
}: {
  rule: ObligationRule
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
}: {
  rule: ObligationRule
  concreteDraft?: RuleConcreteDraftCacheEntry | null
  concreteDraftLoading?: boolean
  deferQueryInvalidation?: boolean
  onActionComplete?: () => void | Promise<void>
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
}: {
  rule: ObligationRule
  concreteDraft: RuleConcreteDraftCacheEntry | null
  concreteDraftLoading?: boolean
  deferQueryInvalidation?: boolean
  onActionComplete?: () => void | Promise<void>
  chrome?: 'card' | 'flat'
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [acceptCompleting, setAcceptCompleting] = useState(false)
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
  const reviewDisabled = isPending || acceptCompleting
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
  return (
    <section
      className={cn(
        'flex flex-col gap-3',
        // 2026-05-27 (Yuqi — "Practice review最高决定review,在最下面
        // 不对"): when rendered as a sticky dialog footer (`chrome=
        // 'flat'`), drop the card border + background — the footer
        // wrapper already paints a `border-t` + tinted bg, so a
        // rounded card on top would be a card-inside-a-card. Default
        // `'card'` keeps the existing review-task card chrome for
        // other callers.
        chrome === 'card' &&
          'rounded-md border border-state-accent-active-alt bg-background-default px-3 py-3',
      )}
    >
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
      {sourceDefined ? (
        <AiDraftReviewPanel
          draft={draft}
          errorMessage={draftPanelMessage}
          generating={(concreteDraftLoading || draftMutation.isPending) && !draft}
          {...(reviewSourceId.length > 0 ? { onGenerateDraft: requestDraft } : {})}
        />
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          onClick={submitAccept}
          disabled={acceptDisabled}
          data-rule-action="accept"
        >
          <Trans>Accept rule</Trans>
        </Button>
      </div>
    </section>
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
  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-divider-regular bg-background-subtle px-3 py-2.5"
      aria-busy={generating && !draft ? true : undefined}
    >
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
          <div className="grid grid-cols-[96px_1fr] gap-x-2 gap-y-1 text-xs">
            <span className="text-text-tertiary">
              <Trans>Coverage</Trans>
            </span>
            <span className="text-text-secondary">
              {formatEnumLabel(draft.coverageStatus)}
              {draft.requiresApplicabilityReview ? (
                <span className="ml-1 text-severity-medium">
                  <Trans>needs applicability review</Trans>
                </span>
              ) : null}
            </span>
            <span className="text-text-tertiary">
              <Trans>Confidence</Trans>
            </span>
            {/* 2026-05-26 (Step 9 AI Visibility Audit F-013): qualitative
                tier (Low/Medium/High) renders alongside the raw
                percentage so a CPA reading the draft can match against
                the same Low/Medium/High vocabulary used in Pulse,
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
    </div>
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
              <span className="inline-flex items-start gap-1.5 font-medium text-severity-medium">
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
  if (rule.status === 'candidate' || rule.status === 'pending_review') {
    return (
      <section
        role="region"
        aria-label="Review required"
        className="rounded-md border border-state-accent-active-alt bg-accent-tint px-3 py-2"
      >
        <p className="flex items-center gap-1.5 text-sm font-medium text-status-review">
          <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
          <Trans>Needs CPA review</Trans>
        </p>
        <p className="mt-1 text-xs text-text-secondary">{rule.defaultTip}</p>
        {/* 2026-05-27 (Yuqi follow-up — sticky-footer move): old copy
            promised "Accept / Skip buttons below" but there's no Skip
            button in this dialog (Skip lives only in the coverage-tab
            workspace queue). Since the action bar is now pinned at
            the bottom and always visible, an explicit pointer is
            redundant. Dropped. */}
      </section>
    )
  }

  return (
    <section
      role="region"
      aria-label="Applicability review required"
      className="rounded-md border border-divider-regular bg-severity-medium-tint px-3 py-2"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-severity-medium">
        <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
        <Trans>Needs CPA confirmation each year</Trans>
      </p>
      <p className="mt-1 text-xs text-text-secondary">{rule.defaultTip}</p>
    </section>
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
  // Block-level card: render directly as <a> when source.url exists, plain
  // <div> otherwise. Avoids inheriting `inline-flex items-center` from the
  // shared SourceExternalLink (which is intended for inline link usage and
  // would force every column child to horizontally center, plus break the
  // truncate chain when the source title is long).
  const sharedClassName =
    'flex flex-col items-stretch gap-1.5 rounded-md border border-divider-regular bg-background-default px-3 py-2.5 text-left no-underline outline-none'
  const interactiveClassName =
    'hover:border-state-accent-active-alt hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt'

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
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open official source: ${source.title}`}
        onClick={(event) => openEvidenceSource(event, source.url)}
        className={cn(sharedClassName, interactiveClassName)}
      >
        {inner}
      </a>
    )
  }

  return <div className={sharedClassName}>{inner}</div>
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
    basis: 'bg-accent-tint text-text-accent',
    cross_check: 'bg-background-subtle text-text-secondary',
    watch: 'bg-severity-medium-tint text-severity-medium',
    early_warning: 'bg-severity-medium-tint text-severity-medium',
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
        'h-[18px] shrink-0 cursor-help rounded-sm border-transparent px-1.5 font-mono text-caption-xs font-medium uppercase tracking-eyebrow-tight',
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

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import type {
  ObligationRule,
  RuleEvidence,
  RuleEvidenceAuthorityRole,
  RuleSource,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { ConceptLabel } from '@/features/concepts/concept-help'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'

import {
  formatEnumLabel,
  humanizeDueDateLogic,
  RULE_AUTHORITY_ROLE_LABEL,
} from './rules-console-model'
import { JurisdictionCode, ToneDot } from './rules-console-primitives'
import { useSourceLookup } from './use-source-lookup'

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
 * `CandidateReviewSection` (Accept / Reject) so the inline view can
 * complete the daily-triage flow.
 */
export function RuleDetailInline({ rule }: { rule: ObligationRule }) {
  const sourceLookup = useSourceLookup()
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-2 text-xs text-text-tertiary">
        <span className="font-mono text-text-secondary">{rule.id}</span>
        <span aria-hidden>·</span>
        <span className="font-mono">v{rule.version}</span>
        <span aria-hidden>·</span>
        <RuleStatusInline status={rule.status} />
      </header>
      <ApplicabilitySection rule={rule} />
      <DueDateLogicSection rule={rule} />
      <ExtensionSection rule={rule} />
      <ReviewReasonsSection rule={rule} />
      <EvidenceSection rule={rule} sourceLookup={sourceLookup} />
      <CandidateReviewSection key={rule.id} rule={rule} />
      <VerificationSection rule={rule} />
    </div>
  )
}

/**
 * Compact inline detail — what a CPA actually needs at a glance to
 * Accept or Reject a pending rule, with everything else trimmed.
 * Designed for cases where the detail expands inside another list
 * (e.g. a Coverage row with 7+ pending rules) and the full footprint
 * would dominate the page.
 *
 * Trimmed out vs `RuleDetailInline`:
 *   - Tax type code (engineer-facing identifier — not part of the
 *     review decision)
 *   - Standalone "Needs review" callout (redundant with the status
 *     pill in the header)
 *   - Verification footer (Reviewed by / Reviewed at / Next review —
 *     audit history, not relevant to Accept/Reject)
 *   - Multi-row applicability grid (collapsed into a single line)
 *
 * Kept:
 *   - Rule ID + version + status (audit reference)
 *   - One-line applicability summary
 *   - Due-date logic
 *   - Extension policy (compressed)
 *   - Evidence card(s) — the audit trail the decision rests on
 *   - Accept / Reject buttons
 */
export function RuleDetailCompact({
  rule,
  onActionComplete,
}: {
  rule: ObligationRule
  onActionComplete?: () => void
}) {
  const sourceLookup = useSourceLookup()
  const dueDateSummary = useMemo(() => humanizeDueDateLogic(rule.dueDateLogic), [rule.dueDateLogic])
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* Audit meta line — quiet, small mono ID + version + status.
        Sits between the title (in panel header above) and the
        section list below. Sized smaller than section labels so it
        reads as a sub-caption, not a competing header. */}
      <header className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
        <span className="font-mono break-all">{rule.id}</span>
        <span aria-hidden>·</span>
        <span className="font-mono">v{rule.version}</span>
        <span aria-hidden>·</span>
        <RuleStatusInline status={rule.status} />
      </header>

      {/* Vertical layout — each section's label sits ABOVE its
        content, not beside. Frees the full panel width for content
        (long source titles, due-date paragraphs, evidence cards
        wrap less aggressively) and removes the eye-jump from a
        narrow label column to a wider content column. */}
      <DetailSection label={<Trans>Applicability</Trans>}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-text-primary">
          <JurisdictionCode code={rule.jurisdiction} />
          <span>{rule.entityApplicability.join(', ')}</span>
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
            <EvidenceCard
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
        {...(onActionComplete ? { onActionComplete } : {})}
      />
    </div>
  )
}

function DetailSection({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">{label}</p>
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

function CandidateReviewSection({
  rule,
  onActionComplete,
}: {
  rule: ObligationRule
  onActionComplete?: () => void
}) {
  if (rule.status !== 'candidate' && rule.status !== 'pending_review') return null
  return <CandidateReviewForm rule={rule} {...(onActionComplete ? { onActionComplete } : {})} />
}

function CandidateReviewForm({
  rule,
  onActionComplete,
}: {
  rule: ObligationRule
  onActionComplete?: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()

  const invalidateRules = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }

  const invalidateAcceptedRuleOutputs = () => {
    invalidateRules()
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
  }

  const acceptMutation = useMutation(
    orpc.rules.acceptTemplate.mutationOptions({
      onSuccess: () => {
        invalidateAcceptedRuleOutputs()
        toast.success(t`Rule accepted`)
        onActionComplete?.()
      },
      onError: (error) => {
        toast.error(t`Couldn't accept rule`, {
          description: rpcErrorMessage(error) ?? t`Check the rule version and try again.`,
        })
      },
    }),
  )
  const rejectMutation = useMutation(
    orpc.rules.rejectTemplate.mutationOptions({
      onSuccess: () => {
        invalidateRules()
        toast.success(t`Rule rejected`)
        onActionComplete?.()
      },
      onError: (error) => {
        toast.error(t`Couldn't reject rule`, {
          description: rpcErrorMessage(error) ?? t`Check the rule version and try again.`,
        })
      },
    }),
  )

  function submitAccept() {
    acceptMutation.mutate({
      ruleId: rule.id,
      expectedVersion: rule.version,
      reviewNote: t`Accepted as shown from rule detail review.`,
    })
  }

  function submitReject() {
    rejectMutation.mutate({
      ruleId: rule.id,
      expectedVersion: rule.version,
      reason: t`Rejected from rule detail review.`,
    })
  }

  const isPending = acceptMutation.isPending || rejectMutation.isPending

  const entitySummary = rule.entityApplicability.join(', ')
  return (
    <section className="flex flex-col gap-3 rounded-md border border-state-accent-active-alt bg-background-default px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>
          <Trans>Practice review</Trans>
        </SectionLabel>
        <span className="text-xs text-status-review">
          <Trans>Needs review</Trans>
        </span>
      </div>
      <p className="text-sm text-text-secondary">
        <Trans>
          Accepting activates this rule for every client filing in {rule.jurisdiction} as{' '}
          {entitySummary}. Reject it if the evidence, applicability, due-date logic, or extension
          handling should not become active.
        </Trans>
      </p>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={submitReject}
          disabled={isPending}
        >
          <Trans>Reject</Trans>
        </Button>
        <Button type="button" size="sm" onClick={submitAccept} disabled={isPending}>
          <Trans>Accept rule</Trans>
        </Button>
      </div>
    </section>
  )
}

function RuleStatusInline({ status }: { status: ObligationRule['status'] }) {
  if (status === 'candidate' || status === 'pending_review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-status-review">
        <ToneDot tone="review" />
        <ConceptLabel concept="candidateRule">
          <Trans>Needs review</Trans>
        </ConceptLabel>
      </span>
    )
  }
  if (status === 'deprecated' || status === 'archived' || status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-tertiary">
        <ToneDot tone="disabled" />
        {status === 'rejected' ? <Trans>Rejected</Trans> : <Trans>Inactive</Trans>}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-text-secondary">
      <ToneDot tone="success" />
      <ConceptLabel concept="verifiedRule">
        <Trans>Active</Trans>
      </ConceptLabel>
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
      {children}
    </p>
  )
}

function ApplicabilitySection({ rule }: { rule: ObligationRule }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>
        <Trans>Applicability</Trans>
      </SectionLabel>
      <div className="flex flex-wrap items-center gap-2 text-base">
        <JurisdictionCode code={rule.jurisdiction} />
        <span className="text-text-secondary">{rule.entityApplicability.join(', ')}</span>
      </div>
      <div className="grid grid-cols-[88px_1fr] gap-y-1.5 text-base">
        <span className="text-text-tertiary">
          <Trans>Tax type</Trans>
        </span>
        <span className="text-sm text-text-secondary">
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
        <span className="font-mono text-sm text-text-secondary">
          {rule.taxYear} → {rule.applicableYear}
        </span>
      </div>
    </section>
  )
}

function EventRow({ rule }: { rule: ObligationRule }) {
  // Surface the eventType as the canonical label and only append "+ filing /
  // + payment" when it adds non-redundant information. eventType is already
  // one of filing/payment/extension/election/information_report; rendering
  // `filing · filing` (the previous version) was a faithful but ugly mirror
  // of the contract's two flag fields.
  const extras: ('filing' | 'payment')[] = []
  if (rule.isFiling && rule.eventType !== 'filing') extras.push('filing')
  if (rule.isPayment && rule.eventType !== 'payment') extras.push('payment')
  return (
    <span className="text-text-secondary">
      {formatEnumLabel(rule.eventType)}
      {extras.length > 0 ? (
        <span className="ml-2 text-text-tertiary">· also {extras.join(' + ')}</span>
      ) : null}
    </span>
  )
}

function DueDateLogicSection({ rule }: { rule: ObligationRule }) {
  const summary = useMemo(() => humanizeDueDateLogic(rule.dueDateLogic), [rule.dueDateLogic])
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>
        <Trans>Due date logic</Trans>
      </SectionLabel>
      <p className="text-base text-text-primary">{summary}</p>
    </section>
  )
}

function ExtensionSection({ rule }: { rule: ObligationRule }) {
  const { extensionPolicy } = rule
  const durationMonths = extensionPolicy.durationMonths
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>
        <Trans>Extension</Trans>
      </SectionLabel>
      {extensionPolicy.available ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-base text-text-primary">
            <Trans>This rule allows an extension.</Trans>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-base text-text-primary">
            {extensionPolicy.formName ? (
              <span className="font-medium">{extensionPolicy.formName}</span>
            ) : null}
            {durationMonths !== undefined ? (
              <span className="text-text-secondary">
                <Trans>{durationMonths} months</Trans>
              </span>
            ) : null}
          </div>
          <div className="text-sm">
            {extensionPolicy.paymentExtended ? (
              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                <Trans>Extension also covers payment.</Trans>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-severity-medium">
                <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
                <Trans>Filing-only extension; payment is not extended.</Trans>
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary">{extensionPolicy.notes}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 text-base">
          <span className="text-text-secondary">
            <Trans>This rule does not allow an extension.</Trans>
          </span>
          <p className="text-xs text-text-tertiary">{extensionPolicy.notes}</p>
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

  if (rule.status === 'candidate' || rule.status === 'pending_review') {
    return (
      <section className="rounded-md border border-state-accent-active-alt bg-accent-tint px-3 py-2 text-xs">
        <p className="font-medium text-status-review">
          <Trans>Needs review · never generates user reminders.</Trans>
        </p>
        <p className="mt-1 text-text-secondary">{rule.defaultTip}</p>
      </section>
    )
  }

  return (
    <section className="rounded-md border border-divider-regular bg-severity-medium-tint px-3 py-2 text-xs">
      <p className="font-medium text-severity-medium">
        <Trans>Applicability review · needs CPA confirmation at generation time.</Trans>
      </p>
      <p className="mt-1 text-text-secondary">{rule.defaultTip}</p>
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
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionLabel>
          <Trans>Evidence</Trans>
        </SectionLabel>
        <span className="font-mono text-xs tabular-nums text-text-tertiary">
          {rule.evidence.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {rule.evidence.map((evidence) => (
          <EvidenceCard
            key={evidenceKey(evidence)}
            evidence={evidence}
            source={sourceLookup.get(evidence.sourceId)}
          />
        ))}
      </div>
    </section>
  )
}

function EvidenceCard({
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
      <EvidenceMeta evidence={evidence} />
    </>
  )

  if (source?.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open official source: ${source.title}`}
        onClick={(event) => event.stopPropagation()}
        className={cn(sharedClassName, interactiveClassName)}
      >
        {inner}
      </a>
    )
  }

  return <div className={sharedClassName}>{inner}</div>
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
  return (
    <Badge
      className={cn(
        'h-[18px] shrink-0 rounded-sm border-transparent px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.04em]',
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

function EvidenceMeta({ evidence }: { evidence: RuleEvidence }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] text-text-muted">
      <span>retrieved {evidence.retrievedAt}</span>
      {evidence.sourceUpdatedOn ? (
        <>
          <span aria-hidden>·</span>
          <span>updated {evidence.sourceUpdatedOn}</span>
        </>
      ) : null}
    </div>
  )
}

function VerificationSection({ rule }: { rule: ObligationRule }) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-divider-subtle pt-4">
      <SectionLabel>
        <Trans>Practice review</Trans>
      </SectionLabel>
      <div className="grid grid-cols-[88px_1fr] gap-y-1 text-xs">
        <span className="text-text-tertiary">
          <Trans>Reviewed by</Trans>
        </span>
        <span className="font-mono text-text-secondary">{rule.verifiedBy}</span>
        <span className="text-text-tertiary">
          <Trans>Reviewed at</Trans>
        </span>
        <span className="font-mono text-text-secondary">{rule.verifiedAt}</span>
        <span className="text-text-tertiary">
          <Trans>Next review</Trans>
        </span>
        <span className="font-mono text-text-secondary">{rule.nextReviewOn}</span>
      </div>
    </section>
  )
}

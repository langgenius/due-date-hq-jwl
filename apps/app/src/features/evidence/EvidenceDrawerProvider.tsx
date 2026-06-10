import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileSearchIcon,
  FileTextIcon,
  RotateCcwIcon,
  SparklesIcon,
  UserCheckIcon,
} from 'lucide-react'
import { Trans } from '@lingui/react/macro'

import type { AuditEventPublic, EvidencePublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
import { Separator } from '@duedatehq/ui/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { EmptyState } from '@/components/patterns/empty-state'
import { orpc } from '@/lib/rpc'
import { formatCents, formatDateTimeWithTimezone } from '@/lib/utils'
import { buildAuditChangeView } from '@/features/audit/audit-change-view'
import { useAuditActionLabels, useAuditChangeLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'
import {
  extensionDecisionEvidenceDescription,
  extensionDecisionEvidenceDetails,
  readExtensionDecisionEvidence,
} from '@/features/evidence/extension-decision-evidence'
import {
  EvidenceDrawerContext,
  type EvidenceDrawerContextValue,
  type OpenEvidenceInput,
} from '@/features/evidence/EvidenceDrawerContext'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import {
  useLifecycleV2StatusLabels,
  useReadinessLabels,
  useStatusLabels,
} from '@/features/obligations/status-control'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'

export function EvidenceDrawerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<OpenEvidenceInput | null>(null)
  const openEvidence = useCallback((input: OpenEvidenceInput) => setRequest(input), [])
  const closeEvidence = useCallback(() => setRequest(null), [])
  const value = useMemo<EvidenceDrawerContextValue>(
    () => ({ openEvidence, closeEvidence }),
    [closeEvidence, openEvidence],
  )

  return (
    <EvidenceDrawerContext.Provider value={value}>
      {children}
      <EvidenceDrawer request={request} onClose={closeEvidence} />
    </EvidenceDrawerContext.Provider>
  )
}

function EvidenceDrawer({
  request,
  onClose,
}: {
  request: OpenEvidenceInput | null
  onClose: () => void
}) {
  const obligationId = request?.obligationId ?? ''
  const evidenceQuery = useQuery({
    ...orpc.evidence.listByObligation.queryOptions({ input: { obligationId } }),
    enabled: request !== null,
  })
  const auditQuery = useQuery({
    ...orpc.audit.list.queryOptions({
      input: {
        entityType: 'obligation_instance',
        entityId: obligationId,
        range: 'all',
        limit: 50,
      },
    }),
    enabled: request !== null,
  })

  return (
    <Sheet open={request !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader className="border-b border-divider-subtle">
          <SheetTitle className="flex items-center gap-2">
            <FileSearchIcon className="size-4 text-text-accent" aria-hidden />
            <Trans>Evidence for this deadline</Trans>
          </SheetTitle>
          <SheetDescription>{request?.label ?? <Trans>Deadline evidence</Trans>}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-6 pb-6">
          <EvidenceSummary request={request} />
          <EvidenceTimeline
            evidence={evidenceQuery.data?.evidence ?? []}
            loading={evidenceQuery.isLoading}
            focusEvidenceId={request?.focusEvidenceId ?? null}
          />
          <Separator />
          <AuditTimeline events={auditQuery.data?.events ?? []} loading={auditQuery.isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function EvidenceSummary({ request }: { request: OpenEvidenceInput | null }) {
  // Deadline summary tile is a Card primitive (size='sm' radius='md'). The row
  // label uses the canonical text-sm font-medium text-text-secondary
  // section-label shape (no uppercase eyebrow).
  return (
    <Card size="sm" radius="md">
      <CardContent className="grid gap-2">
        <span className="text-sm font-medium text-text-secondary">
          <Trans>Deadline</Trans>
        </span>
        <div className="text-sm font-medium text-text-primary">
          {request?.label ?? <Trans>Selected deadline</Trans>}
        </div>
      </CardContent>
    </Card>
  )
}

function EvidenceTimeline({
  evidence,
  loading,
  focusEvidenceId,
}: {
  evidence: EvidencePublic[]
  loading: boolean
  focusEvidenceId: string | null
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        {/* Canonical `text-sm font-medium text-text-secondary` section
            heading (uppercase kickers are deprecated). */}
        <h3 className="text-sm font-medium text-text-secondary">
          <Trans>What this evidence says</Trans>
        </h3>
        <Badge variant="outline">{evidence.length}</Badge>
      </div>
      {loading ? (
        <div className="grid gap-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : evidence.length === 0 ? (
        <EmptyState title={<Trans>No evidence linked yet</Trans>} />
      ) : (
        <div className="grid gap-3">
          {evidence.map((item) => (
            <EvidenceCard key={item.id} item={item} focused={focusEvidenceId === item.id} />
          ))}
        </div>
      )}
    </section>
  )
}

function EvidenceCard({ item, focused }: { item: EvidencePublic; focused: boolean }) {
  const practiceTimezone = usePracticeTimezone()
  const description = evidenceDescription(item)
  const details = evidenceDetails(item)
  // Evidence row is a Card primitive (size='sm' radius='md'). Focused state
  // uses tone='accent-active' (deeper accent border + hover bg) for
  // selected/focused chrome. `interactive` is intentionally omitted because
  // this article has no onClick handler; adding it would surface a misleading
  // cursor-pointer + hover state.
  return (
    <Card size="sm" radius="md" tone={focused ? 'accent-active' : 'default'}>
      <CardContent className="grid gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-state-base-hover text-text-secondary">
            <EvidenceSourceIcon sourceType={item.sourceType} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{evidenceSourceLabel(item.sourceType)}</Badge>
              <ConfidenceBadge confidence={item.confidence} />
            </div>
            <h4 className="mt-2 text-sm font-medium text-text-primary">
              {evidenceHeadline(item.sourceType)}
            </h4>
            {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
          </div>
        </div>
        {details.length > 0 ? <EvidenceDetailList details={details} /> : null}
        {item.verbatimQuote ? (
          // Source-excerpt panel is a Card primitive (size='xs'
          // tone='warning' radius='md') with a canonical text-sm font-medium
          // text-text-secondary label.
          <Card size="xs" tone="warning" radius="md">
            <CardContent className="grid gap-1">
              <p className="text-sm font-medium text-text-secondary">
                <Trans>Source excerpt</Trans>
              </p>
              <blockquote className="text-sm text-text-primary">{item.verbatimQuote}</blockquote>
            </CardContent>
          </Card>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-tertiary">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{formatDateTimeWithTimezone(item.appliedAt, practiceTimezone)}</span>
            {item.model ? (
              <>
                <span aria-hidden>·</span>
                {/* AI-provenance disclosure: which model produced this value. */}
                <span className="font-mono text-xs">{item.model}</span>
              </>
            ) : null}
          </span>
          {item.sourceUrl ? (
            <Button
              variant="ghost"
              size="sm"
              render={<a href={item.sourceUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              <Trans>Open source</Trans>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

type EvidenceDetail = {
  id: string
  label: ReactNode
  value: ReactNode
}

type ReadableValue = {
  key: string
  node: ReactNode
}

function EvidenceDetailList({ details }: { details: EvidenceDetail[] }) {
  // Detail list is a Card primitive (size='xs' tone='muted' radius='md'). The
  // <dl> stays inside CardContent so the description-list semantic is
  // preserved while the muted-tinted panel chrome comes from Card.
  return (
    <Card size="xs" tone="muted" radius="md">
      <CardContent>
        <dl className="grid gap-2 text-sm">
          {details.map((detail) => (
            <EvidenceDetailRow key={detail.id} detail={detail} />
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function EvidenceDetailRow({ detail }: { detail: EvidenceDetail }) {
  // Row label uses the canonical text-sm font-medium text-text-secondary
  // shape (no uppercase eyebrow).
  return (
    <div className="grid gap-1 sm:grid-cols-[128px_1fr] sm:gap-3">
      <dt className="text-sm font-medium text-text-secondary">{detail.label}</dt>
      <dd className="break-words text-text-primary">{detail.value}</dd>
    </div>
  )
}

function EvidenceSourceIcon({ sourceType }: { sourceType: string }) {
  const className = 'size-4'
  if (sourceType.includes('ai')) return <SparklesIcon className={className} aria-hidden />
  if (sourceType.includes('client_response')) {
    return <UserCheckIcon className={className} aria-hidden />
  }
  if (sourceType.includes('revert')) return <RotateCcwIcon className={className} aria-hidden />
  if (sourceType === 'verified_rule') return <CheckCircle2Icon className={className} aria-hidden />
  return <FileTextIcon className={className} aria-hidden />
}

function evidenceSourceLabel(sourceType: string): ReactNode {
  if (sourceType === 'verified_rule') return <Trans>Active practice rule</Trans>
  // The "AI" prefix stays on these user-facing labels — dropping it from the
  // most prominent provenance disclosure on this surface loses the cue
  // entirely for readers without icon-literacy. The SparklesIcon is the icon
  // affordance, but the label reads the provenance honestly.
  if (sourceType === 'ai_mapper') return <Trans>AI import mapping</Trans>
  if (sourceType === 'ai_normalizer') return <Trans>AI import cleanup</Trans>
  if (sourceType === 'readiness_checklist_ai') return <Trans>AI materials checklist</Trans>
  if (sourceType === 'readiness_client_response') return <Trans>Client response</Trans>
  if (sourceType === 'penalty_override') return <Trans>Penalty input</Trans>
  if (sourceType === 'extension_decision') return <Trans>Extension decision</Trans>
  if (sourceType === 'pulse_apply') return <Trans>Rule update</Trans>
  if (sourceType === 'pulse_revert') return <Trans>Rule update undone</Trans>
  if (sourceType === 'migration_revert') return <Trans>Import undone</Trans>
  if (sourceType === 'user_override') return <Trans>Manual note</Trans>
  return humanizeToken(sourceType)
}

function evidenceHeadline(sourceType: string): ReactNode {
  if (sourceType === 'verified_rule')
    return <Trans>An active practice rule supports this deadline.</Trans>
  if (sourceType === 'ai_mapper') return <Trans>Matched an imported column to DueDateHQ.</Trans>
  if (sourceType === 'ai_normalizer') return <Trans>Cleaned up an imported value.</Trans>
  if (sourceType === 'readiness_checklist_ai') {
    return <Trans>Prepared a materials checklist.</Trans>
  }
  if (sourceType === 'readiness_client_response') {
    return <Trans>The client answered the materials questions.</Trans>
  }
  if (sourceType === 'penalty_override') return <Trans>Updated penalty inputs.</Trans>
  if (sourceType === 'extension_decision') return <Trans>Recorded an extension decision.</Trans>
  if (sourceType === 'pulse_apply') return <Trans>Applied a rule change.</Trans>
  if (sourceType === 'pulse_revert') return <Trans>Reverted a rule change.</Trans>
  if (sourceType === 'migration_revert') return <Trans>Reverted an import.</Trans>
  return <Trans>Added evidence to this deadline.</Trans>
}

function evidenceDescription(item: EvidencePublic): ReactNode {
  if (item.sourceType === 'readiness_checklist_ai') {
    const count = readJsonArray(item.normalizedValue)?.length ?? 0
    if (count > 0) return <Trans>Suggested {count} checklist items.</Trans>
  }
  if (item.sourceType === 'readiness_client_response') {
    const readiness = readRecordString(readJsonRecord(item.normalizedValue), 'readiness')
    if (readiness) return <Trans>Latest materials state: {humanizeToken(readiness)}.</Trans>
  }
  if (item.sourceType === 'verified_rule') {
    return (
      <Trans>The accepted source-backed rule matched the client facts for this deadline.</Trans>
    )
  }
  if (item.sourceType === 'extension_decision') {
    const extensionDecision = readExtensionDecisionEvidence(item)
    if (extensionDecision) return extensionDecisionEvidenceDescription(extensionDecision)
  }
  return firstReadableValue(item.normalizedValue ?? item.rawValue)?.node ?? null
}

function evidenceDetails(item: EvidencePublic): EvidenceDetail[] {
  if (item.sourceType === 'penalty_override') return penaltyInputDetails(item)
  if (item.sourceType === 'extension_decision') {
    const extensionDecision = readExtensionDecisionEvidence(item)
    return extensionDecision ? extensionDecisionEvidenceDetails(extensionDecision) : []
  }
  if (item.sourceType === 'readiness_client_response') return readinessResponseDetails(item)
  if (item.sourceType === 'readiness_checklist_ai') return readinessChecklistDetails(item)

  const raw = firstReadableValue(item.rawValue)
  const normalized = firstReadableValue(item.normalizedValue)
  if (raw && normalized && raw.key !== normalized.key) {
    return [
      { id: 'raw', label: <Trans>Original entry</Trans>, value: raw.node },
      { id: 'normalized', label: <Trans>Recorded as</Trans>, value: normalized.node },
    ]
  }
  if (normalized) {
    return [{ id: 'normalized', label: <Trans>Recorded as</Trans>, value: normalized.node }]
  }
  if (raw) return [{ id: 'raw', label: <Trans>Recorded value</Trans>, value: raw.node }]
  return []
}

function penaltyInputDetails(item: EvidencePublic): EvidenceDetail[] {
  const before = readJsonRecord(item.rawValue)
  const after = readJsonRecord(item.normalizedValue)
  return [
    changedValueDetail(
      'estimated-tax-liability',
      <Trans>Estimated tax liability</Trans>,
      formatNullableCents(readRecordNumber(before, 'estimatedTaxLiabilityCents')),
      formatNullableCents(readRecordNumber(after, 'estimatedTaxLiabilityCents')),
    ),
    changedValueDetail(
      'owner-count',
      <Trans>Owner count</Trans>,
      formatNullableNumber(readRecordNumber(before, 'equityOwnerCount')),
      formatNullableNumber(readRecordNumber(after, 'equityOwnerCount')),
    ),
  ].filter((detail): detail is EvidenceDetail => detail !== null)
}

function readinessChecklistDetails(item: EvidencePublic): EvidenceDetail[] {
  const context = readJsonRecord(item.rawValue)
  const taxType = readRecordString(context, 'taxType')
  const currentDueDate = readRecordString(context, 'currentDueDate')
  const details: Array<EvidenceDetail | null> = [
    taxType ? { id: 'tax-type', label: <Trans>Tax type</Trans>, value: taxType } : null,
    currentDueDate
      ? { id: 'due-date', label: <Trans>Internal deadline</Trans>, value: currentDueDate }
      : null,
  ]
  return details.filter((detail): detail is EvidenceDetail => detail !== null)
}

function readinessResponseDetails(item: EvidencePublic): EvidenceDetail[] {
  const responses = readJsonArray(item.rawValue)
  if (!responses) return []
  const readyCount = responses.filter(
    (response) => readRecordString(response, 'status') === 'ready',
  ).length
  const blockedCount = responses.length - readyCount
  const details: Array<EvidenceDetail | null> = [
    {
      id: 'ready-answers',
      label: <Trans>Ready answers</Trans>,
      value: `${readyCount} of ${responses.length}`,
    },
    blockedCount > 0
      ? {
          id: 'needs-follow-up',
          label: <Trans>Needs follow-up</Trans>,
          value: String(blockedCount),
        }
      : null,
  ]
  return details.filter((detail): detail is EvidenceDetail => detail !== null)
}

function changedValueDetail(
  id: string,
  label: ReactNode,
  before: ReadableValue,
  after: ReadableValue,
): EvidenceDetail | null {
  if (before.key === after.key) return null
  if (before.key === 'not-set') {
    return {
      id,
      label,
      value: (
        <span>
          <Trans>Set to {after.node}</Trans>
        </span>
      ),
    }
  }
  if (after.key === 'not-set') {
    return {
      id,
      label,
      value: (
        <span>
          <Trans>Cleared from {before.node}</Trans>
        </span>
      ),
    }
  }
  return {
    id,
    label,
    value: (
      <span>
        <Trans>
          Changed from {before.node} to {after.node}
        </Trans>
      </span>
    ),
  }
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return (
      <Badge variant="secondary">
        <Trans>Recorded</Trans>
      </Badge>
    )
  }
  if (confidence >= 0.95) {
    return (
      <Badge variant="success">
        <Trans>Confirmed</Trans>
      </Badge>
    )
  }
  if (confidence >= 0.8) {
    return (
      <Badge variant="info">
        <Trans>High confidence</Trans>
      </Badge>
    )
  }
  if (confidence >= 0.5) {
    return (
      <Badge variant="warning">
        <Trans>Review suggested</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="destructive">
      <Trans>Needs review</Trans>
    </Badge>
  )
}

function firstReadableValue(value: string | null): ReadableValue | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const record = readJsonRecord(trimmed)
  if (record) {
    const summary = recordSummary(record)
    return summary ? { key: `record:${summary}`, node: summary } : null
  }

  const array = readJsonArray(trimmed)
  if (array) {
    return {
      key: `array:${array.length}`,
      node: <Trans>{array.length} items recorded</Trans>,
    }
  }

  return { key: trimmed, node: humanizeToken(trimmed) }
}

function readJsonRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function readJsonArray(value: string | null): Record<string, unknown>[] | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    const records = parsed.filter(isRecord)
    return records.length === parsed.length ? records : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecordString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readRecordNumber(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function recordSummary(record: Record<string, unknown>): string | null {
  const entries = Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 3)
  if (entries.length === 0) return null
  return entries
    .map(([key, value]) => `${humanizeFieldName(key)}: ${humanizeEvidenceFieldValue(key, value)}`)
    .join(' · ')
}

function humanizeEvidenceFieldValue(key: string, value: unknown): string {
  if (key === 'estimatedTaxLiabilityCents' && typeof value === 'number') {
    return formatCents(value)
  }
  return humanizeEvidenceValue(value)
}

function humanizeEvidenceValue(value: unknown): string {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') return humanizeToken(value)
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'item' : 'items'}`
  if (isRecord(value)) return recordSummary(value) ?? 'Recorded'
  return 'Recorded'
}

function humanizeFieldName(value: string): string {
  if (value === 'estimatedTaxLiabilityCents') return 'Estimated tax liability'
  if (value === 'equityOwnerCount') return 'Owner count'
  if (value === 'currentDueDate') return 'Internal deadline'
  if (value === 'taxType') return 'Tax type'
  if (value === 'entityType') return 'Entity type'
  if (value === 'readiness') return 'Readiness'
  return humanizeToken(value)
}

function humanizeToken(value: string): string {
  const normalized = value
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!normalized) return value
  return normalized
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (['ai', 'api', 'ein', 'id', 'ip', 'ssn', 'url'].includes(lower)) return lower.toUpperCase()
      return index === 0 ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower
    })
    .join(' ')
}

function formatNullableCents(value: number | null): ReadableValue {
  return value === null
    ? { key: 'not-set', node: <Trans>Not set</Trans> }
    : { key: String(value), node: formatCents(value) }
}

function formatNullableNumber(value: number | null): ReadableValue {
  return value === null
    ? { key: 'not-set', node: <Trans>Not set</Trans> }
    : { key: String(value), node: String(value) }
}

function AuditTimeline({ events, loading }: { events: AuditEventPublic[]; loading: boolean }) {
  const practiceTimezone = usePracticeTimezone()
  const actionLabels = useAuditActionLabels()
  // v2-aware status labels — audit timeline reads the same vocabulary
  // as the queue ("Filed" not "Paid"). Raw status values are still in
  // beforeJson/afterJson for forensic reconstruction.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  const readinessLabels = useReadinessLabels()
  const changeLabels = useAuditChangeLabels({ actionLabels, readinessLabels, statusLabels })

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        {/* Canonical `text-sm font-medium text-text-secondary` section
            heading (uppercase kickers are deprecated). */}
        <h3 className="text-sm font-medium text-text-secondary">
          <Trans>Audit timeline</Trans>
        </h3>
        <Badge variant="outline">{events.length}</Badge>
      </div>
      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : events.length === 0 ? (
        <EmptyState title={<Trans>No audit events recorded for this deadline.</Trans>} />
      ) : (
        <div className="grid gap-3">
          {events.map((event) => {
            const actionLabel = formatAuditActionLabel(event.action, actionLabels)
            const changeView = buildAuditChangeView(event, changeLabels, practiceTimezone)
            return (
              // Audit timeline row is a Card primitive (size='sm'
              // radius='md') matching the dense in-drawer surface. The
              // <article> semantic is intentionally dropped — Card renders a
              // <div>.
              <Card key={event.id} size="sm" radius="md">
                <CardContent className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{actionLabel}</Badge>
                    <span className="font-mono text-xs text-text-tertiary">
                      {formatDateTimeWithTimezone(event.createdAt, practiceTimezone)}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{changeView.headline}</p>
                  {changeView.changes.length > 0 ? (
                    <dl className="grid gap-1 text-xs text-text-secondary">
                      {changeView.changes.slice(0, 3).map((row) => (
                        <div key={row.field} className="grid grid-cols-[96px_1fr] gap-2">
                          <dt className="font-medium text-text-tertiary">{row.field}</dt>
                          <dd className="break-words">
                            {row.previous} to {row.next}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {changeView.notes.length > 0 ? (
                    <p className="text-xs text-text-tertiary">{changeView.notes[0]}</p>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}

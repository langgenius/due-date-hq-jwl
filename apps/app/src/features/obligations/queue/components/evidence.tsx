// Evidence + readiness display components for the obligation queue (/deadlines).
// Extracted from routes/obligations.tsx.
import { type ReactNode } from 'react'

import { Trans } from '@lingui/react/macro'
import { LinkIcon } from 'lucide-react'

import { type ReadinessChecklistItem } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { buttonVariants } from '@duedatehq/ui/components/ui/button'
import {
  extensionDecisionEvidenceDescription,
  extensionDecisionEvidenceDetails,
  readExtensionDecisionEvidence,
} from '@/features/evidence/extension-decision-evidence'
import { cn, formatCents, formatDate, formatDateTimeWithTimezone } from '@/lib/utils'

import type {
  AuditSummaryRow,
  ObligationQueueEvidenceItem,
  ReadinessResponseEvidenceItem,
} from '../types'
import { openExternalUrlFromAnchorClick, parseGeneratedReadinessChecklist } from '../helpers'
import { AuditSummaryRows } from './primitives'

export function readJsonRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Object.fromEntries(Object.entries(parsed))
  } catch {
    return null
  }
}

export function readRecordString(
  record: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function readRecordNumber(
  record: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function humanizeToken(value: string): string {
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

export function parseReadinessResponseEvidence(
  value: string | null,
): ReadinessResponseEvidenceItem[] | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    const responses = parsed
      .map((entry): ReadinessResponseEvidenceItem | null => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
        const record = Object.fromEntries(Object.entries(entry))
        const itemId = readRecordString(record, 'itemId')
        const status = readRecordString(record, 'status')
        if (!itemId || (status !== 'ready' && status !== 'not_yet' && status !== 'need_help')) {
          return null
        }
        return {
          itemId,
          status,
          note: readRecordString(record, 'note'),
          etaDate: readRecordString(record, 'etaDate'),
        }
      })
      .filter((entry): entry is ReadinessResponseEvidenceItem => entry !== null)
    return responses.length === parsed.length ? responses : null
  } catch {
    return null
  }
}

export function evidenceSourceLabel(sourceType: string): ReactNode {
  if (sourceType === 'verified_rule') return <Trans>Active practice rule</Trans>
  if (sourceType === 'penalty_override') return <Trans>Penalty input</Trans>
  if (sourceType === 'extension_decision') return <Trans>Extension decision</Trans>
  if (sourceType === 'pulse_apply') return <Trans>Rule update</Trans>
  if (sourceType === 'pulse_revert') return <Trans>Rule update undone</Trans>
  if (sourceType === 'migration_revert') return <Trans>Import undone</Trans>
  if (sourceType === 'user_override') return <Trans>Manual note</Trans>
  if (sourceType === 'readiness_checklist_ai') return <Trans>AI materials checklist</Trans>
  if (sourceType === 'readiness_client_response') return <Trans>Client materials response</Trans>
  return humanizeToken(sourceType)
}

export function EvidenceInlineItem({
  item,
  practiceTimezone,
}: {
  item: ObligationQueueEvidenceItem
  practiceTimezone: string
}) {
  const checklist =
    item.sourceType === 'readiness_checklist_ai'
      ? parseGeneratedReadinessChecklist(item.normalizedValue)
      : null
  const readinessResponses =
    item.sourceType === 'readiness_client_response'
      ? parseReadinessResponseEvidence(item.rawValue)
      : null
  const penaltyRows = item.sourceType === 'penalty_override' ? penaltyInputEvidenceRows(item) : null
  const extensionDecision =
    item.sourceType === 'extension_decision' ? readExtensionDecisionEvidence(item) : null
  const sourceUrl = item.sourceUrl

  return (
    <div className="rounded-lg border border-divider-regular p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{evidenceSourceLabel(item.sourceType)}</span>
        <span className="text-xs text-text-tertiary">
          {formatDateTimeWithTimezone(item.appliedAt, practiceTimezone)}
        </span>
      </div>
      {penaltyRows ? (
        <div className="mt-2 grid gap-2">
          <p className="text-sm text-text-secondary">
            <Trans>Updated penalty inputs.</Trans>
          </p>
          <AuditSummaryRows rows={penaltyRows} />
        </div>
      ) : extensionDecision ? (
        <div className="mt-2 grid gap-2">
          <p className="text-sm text-text-secondary">
            {extensionDecisionEvidenceDescription(extensionDecision)}
          </p>
          <AuditSummaryRows rows={extensionDecisionEvidenceDetails(extensionDecision)} />
        </div>
      ) : checklist ? (
        <ReadinessChecklistEvidence checklist={checklist} context={readJsonRecord(item.rawValue)} />
      ) : readinessResponses ? (
        <ReadinessClientResponseEvidence
          responses={readinessResponses}
          summary={readJsonRecord(item.normalizedValue)}
        />
      ) : item.normalizedValue ? (
        <p className="mt-2 break-words text-sm text-text-secondary">{item.normalizedValue}</p>
      ) : item.rawValue ? (
        <p className="mt-2 break-words text-sm text-text-secondary">{item.rawValue}</p>
      ) : null}
      {sourceUrl ? (
        <a
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-2 w-fit')}
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => openExternalUrlFromAnchorClick(event, sourceUrl)}
        >
          <LinkIcon data-icon="inline-start" />
          <Trans>Open source</Trans>
        </a>
      ) : null}
    </div>
  )
}

export function penaltyInputEvidenceRows(item: ObligationQueueEvidenceItem): AuditSummaryRow[] {
  const before = readJsonRecord(item.rawValue)
  const after = readJsonRecord(item.normalizedValue)
  return [
    changedPenaltyEvidenceRow(
      'estimated-tax-liability',
      <Trans>Estimated tax liability</Trans>,
      formatOptionalCents(readRecordNumber(before, 'estimatedTaxLiabilityCents')),
      formatOptionalCents(readRecordNumber(after, 'estimatedTaxLiabilityCents')),
    ),
    changedPenaltyEvidenceRow(
      'owner-count',
      <Trans>Owner count</Trans>,
      formatOptionalNumber(readRecordNumber(before, 'equityOwnerCount')),
      formatOptionalNumber(readRecordNumber(after, 'equityOwnerCount')),
    ),
  ].filter((row): row is AuditSummaryRow => row !== null)
}

export function changedPenaltyEvidenceRow(
  id: string,
  label: ReactNode,
  before: string | null,
  after: string | null,
): AuditSummaryRow | null {
  if (before === after) return null
  if (!before && after) {
    return { id, label, value: <Trans>Set to {after}</Trans> }
  }
  if (before && !after) {
    return { id, label, value: <Trans>Cleared from {before}</Trans> }
  }
  if (before && after) {
    return {
      id,
      label,
      value: (
        <Trans>
          Changed from {before} to {after}
        </Trans>
      ),
    }
  }
  return null
}

export function formatOptionalCents(value: number | null): string | null {
  return value === null ? null : formatCents(value)
}

export function formatOptionalNumber(value: number | null): string | null {
  return value === null ? null : String(value)
}

export function ReadinessChecklistEvidence({
  checklist,
  context,
}: {
  checklist: ReadinessChecklistItem[]
  context: Record<string, unknown> | null
}) {
  const taxType = readRecordString(context, 'taxType')
  const entityType = readRecordString(context, 'entityType')
  const state = readRecordString(context, 'state')
  const currentDueDate = readRecordString(context, 'currentDueDate')

  return (
    <div className="mt-3 grid gap-3">
      {taxType || entityType || state || currentDueDate ? (
        <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
          {taxType ? <Badge variant="outline">{taxType}</Badge> : null}
          {entityType ? <Badge variant="outline">{entityType}</Badge> : null}
          {state ? <Badge variant="outline">{state}</Badge> : null}
          {currentDueDate ? (
            <Badge variant="outline">
              <Trans>Due {formatDate(currentDueDate)}</Trans>
            </Badge>
          ) : null}
        </div>
      ) : null}
      <ol className="grid gap-2">
        {checklist.map((entry, index) => (
          <li
            key={entry.id}
            className="grid gap-1 border-t border-divider-subtle pt-2 first:border-0 first:pt-0"
          >
            <div className="flex min-w-0 gap-2">
              <span className="text-xs tabular-nums text-text-tertiary">{index + 1}.</span>
              <span className="min-w-0 font-medium text-text-primary">{entry.label}</span>
            </div>
            {entry.description ? (
              <p className="pl-6 text-sm text-text-secondary">{entry.description}</p>
            ) : null}
            {entry.reason || entry.sourceHint ? (
              <div className="flex flex-wrap gap-2 pl-6 text-xs text-text-tertiary">
                {entry.reason ? <span>{entry.reason}</span> : null}
                {entry.sourceHint ? <Badge variant="secondary">{entry.sourceHint}</Badge> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function ReadinessClientResponseEvidence({
  responses,
  summary,
}: {
  responses: ReadinessResponseEvidenceItem[]
  summary: Record<string, unknown> | null
}) {
  const readiness = readRecordString(summary, 'readiness')

  return (
    <div className="mt-3 grid gap-3">
      {readiness ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-secondary">
            <Trans>Resulting materials state</Trans>
          </span>
          <Badge variant="outline">{humanizeToken(readiness)}</Badge>
        </div>
      ) : null}
      <ol className="grid gap-2">
        {responses.map((response) => (
          <li
            key={response.itemId}
            className="grid gap-1 border-t border-divider-subtle pt-2 first:border-0 first:pt-0"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-medium text-text-primary">
                {humanizeToken(response.itemId)}
              </span>
              <ReadinessResponseStatusBadge status={response.status} />
            </div>
            {response.etaDate ? (
              <p className="text-xs text-text-tertiary">
                <Trans>ETA {formatDate(response.etaDate)}</Trans>
              </p>
            ) : null}
            {response.note ? <p className="text-sm text-text-secondary">{response.note}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function ReadinessResponseStatusBadge({
  status,
}: {
  status: ReadinessResponseEvidenceItem['status']
}) {
  if (status === 'ready') {
    return (
      <Badge variant="success">
        <Trans>Ready</Trans>
      </Badge>
    )
  }
  if (status === 'need_help') {
    return (
      <Badge variant="warning">
        <Trans>Need help</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <Trans>Not yet</Trans>
    </Badge>
  )
}

// `ObligationQueueAuditEventCard` retired 2026-05-21 with the
// Audit/Timeline tab removal. Bring back when raw audit events
// surface somewhere again.

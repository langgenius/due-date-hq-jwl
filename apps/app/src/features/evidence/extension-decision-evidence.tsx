import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'

import { formatDate } from '@/lib/utils'

type ExtensionDecisionEvidenceSummary = {
  decision: string
  internalTargetDate: string | null
  memo: string | null
  source: string | null
  paymentStillDue: boolean | null
}

type ExtensionDecisionEvidenceDetail = {
  id: string
  label: ReactNode
  value: ReactNode
}

function readJsonRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Object.fromEntries(Object.entries(parsed))
  } catch {
    return null
  }
}

function readRecordString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readRecordBoolean(record: Record<string, unknown> | null, key: string): boolean | null {
  const value = record?.[key]
  return typeof value === 'boolean' ? value : null
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

function parseExtensionDecisionEvidence(
  value: string | null,
): ExtensionDecisionEvidenceSummary | null {
  const record = readJsonRecord(value)
  const decision = readRecordString(record, 'decision')
  if (!record || !decision) return null

  return {
    decision,
    internalTargetDate:
      readRecordString(record, 'internalTargetDate') ??
      readRecordString(record, 'expectedExtendedDueDate') ??
      readRecordString(record, 'extensionInternalTargetDate'),
    memo: readRecordString(record, 'memo'),
    source: readRecordString(record, 'source'),
    paymentStillDue: readRecordBoolean(record, 'paymentStillDue'),
  }
}

export function readExtensionDecisionEvidence(input: {
  normalizedValue: string | null
  rawValue: string | null
}): ExtensionDecisionEvidenceSummary | null {
  return (
    parseExtensionDecisionEvidence(input.normalizedValue) ??
    parseExtensionDecisionEvidence(input.rawValue)
  )
}

export function extensionDecisionEvidenceDescription({
  decision,
}: ExtensionDecisionEvidenceSummary): ReactNode {
  if (decision === 'applied') return <Trans>Extension plan saved</Trans>
  if (decision === 'rejected') return <Trans>Rejected</Trans>
  return <Trans>Extension decision</Trans>
}

function extensionDecisionValue(decision: string): ReactNode {
  if (decision === 'applied') return <Trans>Applied</Trans>
  if (decision === 'rejected') return <Trans>Rejected</Trans>
  if (decision === 'not_considered') return <Trans>Not recorded</Trans>
  return humanizeToken(decision)
}

function paymentStillDueValue(paymentStillDue: boolean): ReactNode {
  return paymentStillDue ? (
    <Trans>Payment still due by original deadline</Trans>
  ) : (
    <Trans>Extension also covers payment.</Trans>
  )
}

export function extensionDecisionEvidenceDetails({
  decision,
  internalTargetDate,
  memo,
  paymentStillDue,
  source,
}: ExtensionDecisionEvidenceSummary): ExtensionDecisionEvidenceDetail[] {
  const details: Array<ExtensionDecisionEvidenceDetail | null> = [
    {
      id: 'decision',
      label: <Trans>Extension decision</Trans>,
      value: extensionDecisionValue(decision),
    },
    internalTargetDate
      ? {
          id: 'internal-target-date',
          label: <Trans>Internal extension target date</Trans>,
          value: formatDate(internalTargetDate),
        }
      : null,
    paymentStillDue !== null
      ? {
          id: 'payment',
          label: <Trans>Payment</Trans>,
          value: paymentStillDueValue(paymentStillDue),
        }
      : null,
    source
      ? {
          id: 'source',
          label: <Trans>Source</Trans>,
          value: source,
        }
      : null,
    memo
      ? {
          id: 'memo',
          label: <Trans>Extension memo</Trans>,
          value: memo,
        }
      : null,
  ]

  return details.filter((detail): detail is ExtensionDecisionEvidenceDetail => detail !== null)
}

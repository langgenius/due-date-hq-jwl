// Shared type definitions for the obligation queue route (/deadlines).
// Extracted from routes/obligations.tsx — pure types, no runtime deps.
import type { ReactNode } from 'react'

import type { TableFilterOption } from '@/components/patterns/table-header-filter'
import type {
  ObligationFiledRejectionNextStep,
  ObligationQueueListInput,
} from '@duedatehq/contracts'

export type ObligationQueueCursor = NonNullable<ObligationQueueListInput['cursor']> | null

export type ObligationQueueListInputWithoutCursor = Omit<ObligationQueueListInput, 'cursor'>

export type ObligationQueueExportQuery = Omit<ObligationQueueListInput, 'cursor' | 'limit'>

export type ObligationExportDialogScope =
  | 'selected'
  | 'filtered'
  | 'all_active'
  | 'date_range'
  | 'client'

export type ObligationExportRecipient = 'download' | 'email_self' | 'email_teammate'

export type ExtensionPlanDraft = {
  obligationId: string
  memo: string
  source: string
  internalTargetDate: string
  // Manually-entered extended filing deadline — only used for rules with no
  // statutory durationMonths (the server computes it otherwise).
  extendedFilingDate: string
}

export type DeadlineInputRequestAudit = {
  recipientName: string | null
  recipientRole: string | null
  message: string | null
  createdAt: string
}

export type DeadlineInputRequestDraft = {
  obligationId: string
  recipientUserId: string
  message: string
}

export type DueDaysTone = {
  variant: 'destructive' | 'warning' | 'success' | 'outline'
  dot: 'error' | 'warning' | 'success' | 'normal'
  badgeClassName?: string
  dotClassName?: string
}

export type FilterOption = TableFilterOption

export interface ClientFilterOption extends FilterOption {
  state: string | null
  county: string | null
}

export type AuthorityRejectionDraft = {
  rejectedAt: string
  authority: string
  reference: string
  reason: string
  nextStep: ObligationFiledRejectionNextStep
}

export type AuthorityRejectionAuditDetails = {
  rejectedAt: string | null
  authority: string | null
  reference: string | null
  reason: string | null
  nextStep: ObligationFiledRejectionNextStep | null
}

export type SignatureReminderTarget =
  | { mode: 'single'; obligationId: string | null }
  | { mode: 'bulk'; ids: string[] }

export type ObligationQueueEvidenceItem = {
  id: string
  sourceType: string
  sourceUrl: string | null
  rawValue: string | null
  normalizedValue: string | null
  appliedAt: string
}

export type ReadinessResponseEvidenceItem = {
  itemId: string
  status: 'ready' | 'not_yet' | 'need_help'
  note: string | null
  etaDate: string | null
}

export type AuditSummaryRow = {
  id: string
  label: ReactNode
  value: ReactNode
}

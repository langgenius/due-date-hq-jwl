import type { AuditEventPublic } from '@duedatehq/contracts'
import { formatCents, formatDate, formatDateTimeWithTimezone } from '@/lib/utils'

import {
  AUDIT_ACTION_LABEL_KEYS,
  formatAuditActionLabel,
  type AuditActionLabels,
} from './audit-log-model'

export type AuditChangeRow = {
  field: string
  previous: string
  next: string
}

export type AuditChangeView = {
  headline: string
  changes: AuditChangeRow[]
  notes: string[]
}

export type AuditChangeLabels = {
  actionLabels: AuditActionLabels
  statusLabels: Record<string, string>
  readinessLabels: Record<string, string>
  fields: Record<string, string>
  values: {
    detailsUpdated: string
    multipleValues: string
    no: string
    none: string
    notRecorded: string
    notSet: string
    unchanged: string
    yes: string
  }
  enumValues: Record<string, string>
  headlines: {
    actionRecorded: (action: string) => string
    assigneeChanged: (assignee: string, count: number | null) => string
    batchCreated: (action: string, count: number | null) => string
    deadlineDueDateChanged: (previous: string, next: string) => string
    deadlineReadinessChanged: (previous: string, next: string) => string
    deadlineStatusChanged: (previous: string, next: string) => string
    fieldChanged: (field: string, previous: string, next: string) => string
    firmUpdated: string
    importCompleted: (
      clientCount: number | null,
      obligationCount: number | null,
      skippedCount: number | null,
    ) => string
    memberRoleChanged: (previous: string, next: string) => string
    multipleFieldsChanged: (action: string, count: number) => string
    penaltyInputsChanged: string
    pulseDueDateChanged: (previous: string, next: string) => string
    savedViewUpdated: (name: string | null) => string
  }
  notes: {
    additionalChanges: (count: number) => string
    countUpdated: (count: number, noun: string) => string
    noDetailedSnapshot: string
    noFieldChange: string
  }
  nouns: {
    clients: string
    deadlines: string
    events: string
    files: string
    fields: string
    rows: string
  }
}

type KnownAuditAction = keyof typeof AUDIT_ACTION_LABEL_KEYS
type AuditChangePresenter = (context: AuditChangeContext) => AuditChangeView

type AuditChangeContext = {
  actionLabel: string
  after: Record<string, unknown> | null
  before: Record<string, unknown> | null
  event: Pick<AuditEventPublic, 'action' | 'beforeJson' | 'afterJson'>
  labels: AuditChangeLabels
  timeZone: string
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const DEFAULT_AUDIT_TIMEZONE = 'UTC'

const TECHNICAL_FIELD_KEYS = new Set([
  'actorId',
  'afterDueDate',
  'aiOutputId',
  'beforeDueDate',
  'clientId',
  'clientIds',
  'entityId',
  'firmId',
  'id',
  'invitationId',
  'migrationBatchId',
  'obligationId',
  'obligationIds',
  'opsActorId',
  'pulseId',
  'rawInputR2Key',
  'r2Key',
  'scopeEntityId',
  'sha256Hash',
  'sourceId',
  'userId',
])

const TECHNICAL_FIELD_SUFFIXES = ['Hash', 'Id', 'Ids', 'IDs', '_id']

const COUNT_FIELD_NOUNS: Record<string, keyof AuditChangeLabels['nouns']> = {
  clientCount: 'clients',
  clientsAffected: 'clients',
  count: 'rows',
  createdCount: 'deadlines',
  fileCount: 'files',
  matchedCount: 'clients',
  needsReviewCount: 'clients',
  obligationCount: 'deadlines',
  rowCount: 'rows',
  skippedCount: 'rows',
}

export const AUDIT_CHANGE_PRESENTERS: Record<KnownAuditAction, AuditChangePresenter> = {
  'ai.guard_failed': genericPresenter,
  'ai.refusal': genericPresenter,
  'ask.query_run': genericPresenter,
  'auth.denied': genericPresenter,
  'auth.login.failed': genericPresenter,
  'auth.login.success': genericPresenter,
  'auth.mfa.disabled': genericPresenter,
  'auth.mfa.enabled': genericPresenter,
  'auth.mfa.setup.started': genericPresenter,
  'auth.session.revoked': genericPresenter,
  'client.assignee.updated': clientAssigneePresenter,
  'client.batch_created': (context) => countPresenter(context, 'count', 'clients'),
  'client.created': genericPresenter,
  'client.deleted': genericPresenter,
  'export.audit_package.downloaded': genericPresenter,
  'export.audit_package.failed': genericPresenter,
  'export.audit_package.ready': exportPackageReadyPresenter,
  'export.audit_package.requested': exportPackageRequestedPresenter,
  'firm.created': genericPresenter,
  'firm.deleted': genericPresenter,
  'firm.switched': genericPresenter,
  'firm.updated': firmUpdatedPresenter,
  'member.accepted': memberSnapshotPresenter,
  'member.invitation.canceled': memberSnapshotPresenter,
  'member.invitation.resent': memberSnapshotPresenter,
  'member.invited': memberSnapshotPresenter,
  'member.reactivated': memberStatusPresenter,
  'member.removed': memberSnapshotPresenter,
  'member.role.updated': memberRolePresenter,
  'member.suspended': memberStatusPresenter,
  'migration.batch.created': migrationBatchCreatedPresenter,
  'migration.imported': migrationImportedPresenter,
  'migration.mapper.confirmed': migrationReviewStepPresenter,
  'migration.matrix.applied': migrationMatrixPresenter,
  'migration.normalizer.confirmed': migrationReviewStepPresenter,
  'migration.raw_uploaded': migrationRawUploadedPresenter,
  'migration.reverted': migrationRevertPresenter,
  'migration.single_undo': migrationRevertPresenter,
  'obligation.annual_rollover.created': annualRolloverPresenter,
  'obligation.batch_created': (context) => countPresenter(context, 'count', 'deadlines'),
  'obligation.due_date.updated': obligationDueDatePresenter,
  'obligation.extension.decided': genericPresenter,
  'obligation.readiness.updated': obligationReadinessPresenter,
  'obligation.status.updated': obligationStatusPresenter,
  'obligation.tax_year_profile.updated': genericPresenter,
  'onboarding.agent.dry_run.previewed': genericPresenter,
  'onboarding.agent.fallback.triggered': genericPresenter,
  'onboarding.agent.handoff.chosen': genericPresenter,
  'onboarding.agent.handoff.offered': genericPresenter,
  'onboarding.agent.import.committed': migrationImportedPresenter,
  'onboarding.agent.intake.submitted': genericPresenter,
  'onboarding.agent.matrix.preloaded': migrationMatrixPresenter,
  'onboarding.agent.normalize.confirmed': migrationReviewStepPresenter,
  'onboarding.agent.preview_card.clicked': genericPresenter,
  'onboarding.agent.state.advanced': genericPresenter,
  'onboarding.agent.turn.opened': genericPresenter,
  'penalty.override': penaltyPresenter,
  'pulse.apply': pulseDueDatePresenter,
  'pulse.approve': pulseAlertPresenter,
  'pulse.dismiss': pulseAlertPresenter,
  'pulse.extract': genericPresenter,
  'pulse.ingest': genericPresenter,
  'pulse.quarantine': pulseOpsPresenter,
  'pulse.reactivate': pulseAlertPresenter,
  'pulse.reject': pulseOpsPresenter,
  'pulse.revert': pulseDueDatePresenter,
  'pulse.review_requested': genericPresenter,
  'pulse.snooze': pulseAlertPresenter,
  'pulse.source_revoked': pulseOpsPresenter,
  'role.check': genericPresenter,
  'rule.report_issue': genericPresenter,
  'rule.updated': genericPresenter,
  'rule.verified': genericPresenter,
  'rules.candidate.created': genericPresenter,
  'rules.accepted': genericPresenter,
  'rules.bulk_accepted': genericPresenter,
  'rules.rejected': genericPresenter,
  'rules.created': genericPresenter,
  'rules.updated': genericPresenter,
  'rules.archived': genericPresenter,
  'rules.published': genericPresenter,
  'rules.review.rejected': genericPresenter,
  'rules.review.required': genericPresenter,
  'rules.source.changed': genericPresenter,
  'obligations.exported': obligationQueueExportPresenter,
  'obligations.saved_view.created': savedViewPresenter,
  'obligations.saved_view.deleted': genericPresenter,
  'obligations.saved_view.updated': savedViewPresenter,
}

function isKnownAuditAction(action: string): action is KnownAuditAction {
  return action in AUDIT_CHANGE_PRESENTERS
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
}

function readNumber(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function valuesDiffer(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) !== JSON.stringify(right ?? null)
}

function fieldLabel(key: string, labels: AuditChangeLabels): string {
  return labels.fields[key] ?? humanizeIdentifier(key)
}

function humanizeIdentifier(value: string): string {
  const normalized = value
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!normalized) return value

  return normalized
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (
        ['ai', 'api', 'csv', 'd1', 'ein', 'id', 'ip', 'pdf', 'r2', 'ssn', 'ua', 'url'].includes(
          lower,
        )
      ) {
        return lower.toUpperCase()
      }
      return index === 0 ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower
    })
    .join(' ')
}

function humanizeValue(value: string, labels: AuditChangeLabels): string {
  if (labels.enumValues[value]) return labels.enumValues[value]
  return humanizeIdentifier(value)
}

function isTechnicalField(key: string): boolean {
  if (TECHNICAL_FIELD_KEYS.has(key)) return true
  return TECHNICAL_FIELD_SUFFIXES.some((suffix) => key.endsWith(suffix))
}

function formatCountValue(
  count: number | null,
  nounKey: keyof AuditChangeLabels['nouns'],
  labels: AuditChangeLabels,
): string {
  if (count === null) return labels.values.notRecorded
  return `${count} ${labels.nouns[nounKey]}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`
}

function formatValue(key: string, value: unknown, context: AuditChangeContext): string {
  const { labels, timeZone } = context

  if (value === null || value === undefined || value === '') return labels.values.notSet
  if (typeof value === 'boolean') return value ? labels.values.yes : labels.values.no
  if (typeof value === 'number') {
    if (key.endsWith('Cents')) return formatCents(value)
    if (key === 'sizeBytes') return formatBytes(value)
    return String(value)
  }
  if (typeof value === 'string') {
    if (
      key === 'status' &&
      context.event.action.startsWith('obligation.') &&
      labels.statusLabels[value]
    ) {
      return labels.statusLabels[value]
    }
    if (key === 'readiness' && labels.readinessLabels[value]) return labels.readinessLabels[value]
    if (labels.enumValues[value]) return labels.enumValues[value]
    if (ISO_DATE_PATTERN.test(value)) return formatDate(value)
    if (ISO_DATETIME_PATTERN.test(value)) return formatDateTimeWithTimezone(value, timeZone)
    if (key.toLowerCase().includes('status') || key === 'role' || key === 'kind') {
      return humanizeValue(value, labels)
    }
    return value
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return labels.values.none
    if (value.every((entry) => typeof entry === 'string' || typeof entry === 'number')) {
      const visible = value.slice(0, 3).map((entry) => String(entry))
      const remaining = value.length - visible.length
      return remaining > 0 ? `${visible.join(', ')} +${remaining}` : visible.join(', ')
    }
    return `${value.length} ${labels.nouns.rows}`
  }
  return labels.values.detailsUpdated
}

function makeRow(
  context: AuditChangeContext,
  key: string,
  previousValue: unknown,
  nextValue: unknown,
): AuditChangeRow {
  return {
    field: fieldLabel(key, context.labels),
    previous: formatValue(key, previousValue, context),
    next: formatValue(key, nextValue, context),
  }
}

function rowFromAfter(context: AuditChangeContext, key: string): AuditChangeRow | null {
  if (!context.after || !(key in context.after)) return null
  return makeRow(context, key, context.before?.[key], context.after[key])
}

function rowsForKeys(context: AuditChangeContext, keys: readonly string[]): AuditChangeRow[] {
  return keys
    .map((key) => rowFromAfter(context, key))
    .filter((row): row is AuditChangeRow => row !== null)
}

function changedRowsForKeys(
  context: AuditChangeContext,
  keys: readonly string[],
): AuditChangeRow[] {
  return keys
    .filter((key) => valuesDiffer(context.before?.[key], context.after?.[key]))
    .map((key) => makeRow(context, key, context.before?.[key], context.after?.[key]))
}

function genericRows(context: AuditChangeContext): AuditChangeRow[] {
  const keys = new Set([...Object.keys(context.before ?? {}), ...Object.keys(context.after ?? {})])
  return [...keys]
    .filter((key) => !isTechnicalField(key))
    .filter((key) => valuesDiffer(context.before?.[key], context.after?.[key]))
    .slice(0, 5)
    .map((key) => makeRow(context, key, context.before?.[key], context.after?.[key]))
}

function view(
  headline: string,
  changes: AuditChangeRow[] = [],
  notes: string[] = [],
): AuditChangeView {
  return { headline, changes, notes }
}

function appendGenericNotes(
  context: AuditChangeContext,
  changes: AuditChangeRow[],
  notes: string[] = [],
): string[] {
  if (!context.before && !context.after) return [...notes, context.labels.notes.noDetailedSnapshot]
  if (changes.length === 0) return [...notes, context.labels.notes.noFieldChange]

  const visibleFields = new Set(changes.map((row) => row.field))
  const allChangedFields = genericRows(context).filter((row) => !visibleFields.has(row.field))
  if (allChangedFields.length > 0) {
    return [...notes, context.labels.notes.additionalChanges(allChangedFields.length)]
  }
  return notes
}

function headlineFromRows(context: AuditChangeContext, rows: AuditChangeRow[]): string {
  if (rows.length === 1) {
    const row = rows[0]!
    if (row.previous !== row.next) {
      return context.labels.headlines.fieldChanged(row.field, row.previous, row.next)
    }
    return context.labels.headlines.actionRecorded(context.actionLabel)
  }
  if (rows.length > 1) {
    return context.labels.headlines.multipleFieldsChanged(context.actionLabel, rows.length)
  }
  return context.labels.headlines.actionRecorded(context.actionLabel)
}

function genericPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = genericRows(context)
  return view(headlineFromRows(context, rows), rows, appendGenericNotes(context, rows))
}

function countPresenter(
  context: AuditChangeContext,
  key: string,
  nounKey: keyof AuditChangeLabels['nouns'],
): AuditChangeView {
  const count = readNumber(context.after, key)
  const rows = [
    {
      field: fieldLabel(key, context.labels),
      previous: context.labels.values.notSet,
      next: formatCountValue(count, nounKey, context.labels),
    },
  ]
  return view(
    context.labels.headlines.batchCreated(context.actionLabel, count),
    rows,
    count === null ? [context.labels.notes.noDetailedSnapshot] : [],
  )
}

function obligationStatusPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['status', 'readiness'])
  const statusRow = rows.find((row) => row.field === fieldLabel('status', context.labels))
  return view(
    statusRow
      ? context.labels.headlines.deadlineStatusChanged(statusRow.previous, statusRow.next)
      : headlineFromRows(context, rows),
    rows,
    appendGenericNotes(context, rows),
  )
}

function obligationReadinessPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['readiness'])
  const row = rows[0]
  return view(
    row
      ? context.labels.headlines.deadlineReadinessChanged(row.previous, row.next)
      : headlineFromRows(context, rows),
    rows,
    appendGenericNotes(context, rows),
  )
}

function obligationDueDatePresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['currentDueDate'])
  const row = rows[0]
  return view(
    row
      ? context.labels.headlines.deadlineDueDateChanged(row.previous, row.next)
      : headlineFromRows(context, rows),
    rows,
    appendGenericNotes(context, rows),
  )
}

function pulseDueDatePresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['currentDueDate'])
  const row = rows[0]
  return view(
    row
      ? context.labels.headlines.pulseDueDateChanged(row.previous, row.next)
      : headlineFromRows(context, rows),
    rows,
    appendGenericNotes(context, rows),
  )
}

function penaltyPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['estimatedTaxLiabilityCents', 'equityOwnerCount'])
  return view(
    context.labels.headlines.penaltyInputsChanged,
    rows,
    appendGenericNotes(context, rows),
  )
}

function clientAssigneePresenter(context: AuditChangeContext): AuditChangeView {
  const count = readNumber(context.after, 'count')
  const assignee = readString(context.after, 'assigneeName') ?? context.labels.values.notSet
  const row = {
    field: fieldLabel('assigneeName', context.labels),
    previous: context.labels.values.multipleValues,
    next: assignee,
  }
  return view(
    context.labels.headlines.assigneeChanged(assignee, count),
    [row],
    [
      count === null
        ? context.labels.notes.noDetailedSnapshot
        : context.labels.notes.countUpdated(count, context.labels.nouns.clients),
    ],
  )
}

function memberRolePresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['role'])
  const row = rows[0]
  return view(
    row
      ? context.labels.headlines.memberRoleChanged(row.previous, row.next)
      : headlineFromRows(context, rows),
    rows,
    appendGenericNotes(context, rows),
  )
}

function memberStatusPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['status'])
  return view(headlineFromRows(context, rows), rows, appendGenericNotes(context, rows))
}

function memberSnapshotPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['email', 'role', 'status'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function firmUpdatedPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['name', 'timezone', 'plan', 'seatLimit'])
  return view(context.labels.headlines.firmUpdated, rows, appendGenericNotes(context, rows))
}

function migrationBatchCreatedPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['source', 'presetUsed'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function migrationRawUploadedPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['fileName', 'kind', 'contentType', 'sizeBytes'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function migrationReviewStepPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['rowCount', 'errorCount'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function migrationMatrixPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['cells', 'enabledCells', 'disabledCells', 'clientsAffected'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function migrationImportedPresenter(context: AuditChangeContext): AuditChangeView {
  const clientCount = readNumber(context.after, 'clientCount')
  const obligationCount = readNumber(context.after, 'obligationCount')
  const skippedCount = readNumber(context.after, 'skippedCount')
  const rows = rowsForKeys(context, ['clientCount', 'obligationCount', 'skippedCount'])
  return view(
    context.labels.headlines.importCompleted(clientCount, obligationCount, skippedCount),
    rows,
    appendGenericNotes(context, rows),
  )
}

function migrationRevertPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['clientCount', 'obligationCount'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function annualRolloverPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['sourceFilingYear', 'targetFilingYear', 'createdCount'])
  const createdCount = readNumber(context.after, 'createdCount')
  return view(
    context.labels.headlines.batchCreated(context.actionLabel, createdCount),
    rows,
    appendGenericNotes(context, rows),
  )
}

function pulseAlertPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['status']).concat(
    rowsForKeys(context, ['snoozedUntil', 'matchedCount', 'needsReviewCount']),
  )
  return view(headlineFromRows(context, rows), rows, appendGenericNotes(context, rows))
}

function pulseOpsPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = changedRowsForKeys(context, ['pulseStatus', 'alertStatus']).concat(
    rowsForKeys(context, ['matchedCount', 'needsReviewCount']),
  )
  return view(headlineFromRows(context, rows), rows, appendGenericNotes(context, rows))
}

function exportPackageReadyPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['fileCount'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function exportPackageRequestedPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['scope'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function obligationQueueExportPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['format', 'rowCount', 'clientCount'])
  return view(
    context.labels.headlines.actionRecorded(context.actionLabel),
    rows,
    appendGenericNotes(context, rows),
  )
}

function savedViewPresenter(context: AuditChangeContext): AuditChangeView {
  const rows = rowsForKeys(context, ['name', 'isPinned'])
  return view(
    context.labels.headlines.savedViewUpdated(readString(context.after, 'name')),
    rows,
    appendGenericNotes(context, rows),
  )
}

export function buildAuditChangeView(
  event: Pick<AuditEventPublic, 'action' | 'beforeJson' | 'afterJson'>,
  labels: AuditChangeLabels,
  timeZone = DEFAULT_AUDIT_TIMEZONE,
): AuditChangeView {
  const actionLabel = formatAuditActionLabel(event.action, labels.actionLabels)
  const context: AuditChangeContext = {
    actionLabel,
    after: readRecord(event.afterJson),
    before: readRecord(event.beforeJson),
    event,
    labels,
    timeZone,
  }
  const presenter = isKnownAuditAction(event.action)
    ? AUDIT_CHANGE_PRESENTERS[event.action]
    : genericPresenter
  return presenter(context)
}

export function describeAuditChangeCount(
  key: string,
  count: number | null,
  labels: AuditChangeLabels,
): string {
  return formatCountValue(count, COUNT_FIELD_NOUNS[key] ?? 'rows', labels)
}

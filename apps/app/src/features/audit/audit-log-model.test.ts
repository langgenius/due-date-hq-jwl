import { describe, expect, it } from 'vitest'
import {
  AUDIT_CHANGE_PRESENTERS,
  buildAuditChangeView,
  type AuditChangeLabels,
} from './audit-change-view'
import {
  AUDIT_ACTION_LABEL_KEYS,
  categoryToInput,
  formatAuditActionLabel,
  formatAuditJson,
  formatAuditEntityTypeLabel,
  getAuditEntityDisplay,
  getAuditExportUnavailableReason,
  humanizeAuditAction,
  humanizeAuditEntityType,
  isAuditCategoryOption,
  isAuditRange,
  shortenAuditId,
  type AuditActionLabels,
  type AuditEntityTypeLabels,
} from './audit-log-model'

function assertAuditActionLabels(
  value: Record<string, string>,
): asserts value is AuditActionLabels {
  const missingKey = Object.values(AUDIT_ACTION_LABEL_KEYS).find((key) => !(key in value))
  if (missingKey) throw new Error(`Missing audit action label test value: ${missingKey}`)
}

function makeActionLabels(overrides: Partial<AuditActionLabels>): AuditActionLabels {
  const labels: Record<string, string> = {}
  for (const key of Object.values(AUDIT_ACTION_LABEL_KEYS)) {
    labels[key] = key
  }
  assertAuditActionLabels(labels)
  Object.assign(labels, overrides)
  return labels
}

function makeChangeLabels(overrides: Partial<AuditActionLabels> = {}): AuditChangeLabels {
  const actionLabels = makeActionLabels({
    clientAssigneeUpdated: 'Client assignee changed',
    clientBatchCreated: 'Client batch created',
    memberRoleUpdated: 'Member role changed',
    migrationImported: 'Import completed',
    obligationDueDateUpdated: 'Internal deadline changed',
    obligationStatusUpdated: 'Deadline status changed',
    penaltyOverride: 'Penalty inputs changed',
    pulseApply: 'Pulse applied',
    obligationQueueSavedViewUpdated: 'Saved view updated',
    ...overrides,
  })

  return {
    actionLabels,
    statusLabels: {
      pending: 'Not started',
      in_progress: 'In progress',
      waiting_on_client: 'Waiting on client',
      review: 'Needs review',
      done: 'Filed',
      paid: 'Paid',
      extended: 'Extended',
      not_applicable: 'Not applicable',
    },
    readinessLabels: {
      ready: 'Ready',
      waiting: 'Waiting',
      // 2026-05-23: was 'Needs review' — renamed to 'Needs CPA action'
      // to disambiguate from the obligation status `review` which also
      // displays as a "Needs review" / "In review" label.
      needs_review: 'Needs CPA action',
    },
    fields: {
      assigneeName: 'Assignee',
      clientCount: 'Clients',
      currentDueDate: 'Internal deadline',
      equityOwnerCount: 'Owner count',
      estimatedTaxLiabilityCents: 'Estimated tax liability',
      isPinned: 'Pinned',
      name: 'Name',
      obligationCount: 'Deadlines',
      readiness: 'Readiness',
      role: 'Role',
      skippedCount: 'Skipped rows',
      status: 'Status',
    },
    values: {
      detailsUpdated: 'Details updated',
      multipleValues: 'Multiple values',
      no: 'No',
      none: 'None',
      notRecorded: 'Not recorded',
      notSet: 'Not set',
      unchanged: 'Unchanged',
      yes: 'Yes',
    },
    enumValues: {
      active: 'Active',
      manager: 'Manager',
      preparer: 'Preparer',
      pending_review: 'Pending review',
      applied: 'Applied',
    },
    headlines: {
      actionRecorded: (action) => `${action} recorded`,
      assigneeChanged: (assignee, count) =>
        count === null
          ? `Client assignee changed to ${assignee}`
          : `Client assignee changed to ${assignee} for ${count} clients`,
      batchCreated: (action, count) =>
        count === null ? `${action} recorded` : `${action}: ${count} rows`,
      deadlineDueDateChanged: (previous, next) =>
        `Internal deadline changed from ${previous} to ${next}`,
      deadlineReadinessChanged: (previous, next) =>
        `Deadline readiness changed from ${previous} to ${next}`,
      deadlineStatusChanged: (previous, next) =>
        `Deadline status changed from ${previous} to ${next}`,
      fieldChanged: (field, previous, next) => `${field} changed from ${previous} to ${next}`,
      firmUpdated: 'Practice profile changed',
      importCompleted: (clientCount, obligationCount, skippedCount) =>
        `Import completed: ${clientCount ?? 0} clients, ${obligationCount ?? 0} deadlines, ${skippedCount ?? 0} skipped rows`,
      memberRoleChanged: (previous, next) => `Member role changed from ${previous} to ${next}`,
      multipleFieldsChanged: (action, count) => `${action}: ${count} fields changed`,
      penaltyInputsChanged: 'Penalty inputs changed',
      pulseDueDateChanged: (previous, next) => `Pulse changed due date from ${previous} to ${next}`,
      savedViewUpdated: (name) => (name ? `Saved view updated: ${name}` : 'Saved view updated'),
    },
    notes: {
      additionalChanges: (count) => `${count} additional fields changed`,
      countUpdated: (count, noun) => `${count} ${noun} updated`,
      noDetailedSnapshot: 'Event recorded without a detailed change snapshot.',
      noFieldChange: 'No user-facing field change was recorded.',
    },
    nouns: {
      clients: 'clients',
      deadlines: 'deadlines',
      events: 'events',
      fields: 'fields',
      files: 'files',
      rows: 'rows',
    },
  }
}

describe('audit-log-model', () => {
  it('gates audit export by owner role and plan entitlement', () => {
    const baseFirm = {
      coordinatorCanSeeDollars: false,
      role: 'owner' as const,
      plan: 'team' as const,
    }

    expect(getAuditExportUnavailableReason(baseFirm)).toBeNull()
    expect(getAuditExportUnavailableReason({ ...baseFirm, plan: 'firm' })).toBeNull()
    expect(getAuditExportUnavailableReason({ ...baseFirm, plan: 'solo' })).toBe('plan')
    expect(getAuditExportUnavailableReason({ ...baseFirm, plan: 'pro' })).toBe('plan')
    expect(getAuditExportUnavailableReason({ ...baseFirm, role: 'manager' })).toBe('permission')
  })

  it('validates category and range options', () => {
    expect(isAuditCategoryOption('migration')).toBe(true)
    expect(isAuditCategoryOption('unknown')).toBe(false)
    expect(categoryToInput('all')).toBeUndefined()
    expect(categoryToInput('client')).toBe('client')
    expect(isAuditRange('7d')).toBe(true)
    expect(isAuditRange('90d')).toBe(false)
  })

  it('registers user-facing presenters for every known audit action', () => {
    expect(Object.keys(AUDIT_CHANGE_PRESENTERS).toSorted()).toEqual(
      Object.keys(AUDIT_ACTION_LABEL_KEYS).toSorted(),
    )
  })

  it('formats identifiers and JSON blocks', () => {
    expect(shortenAuditId('33333333-3333-4333-8333-333333333333')).toBe('33333333...3333')
    expect(formatAuditJson({ status: 'done' })).toContain('"status": "done"')
    expect(formatAuditJson({ createdAt: '2026-04-29T09:14:32.883Z' })).toMatch(
      /2026-04-\d{2} \d{2}:14:32 .+/,
    )
    expect(
      formatAuditJson({ createdAt: '2026-04-29T09:14:32.883Z' }, 'America/Los_Angeles'),
    ).toContain('2026-04-29 02:14:32')
    expect(formatAuditJson(null)).toBe('null')
  })

  it('builds user-facing deadline status and date change views', () => {
    const labels = makeChangeLabels()

    expect(
      buildAuditChangeView(
        {
          action: 'obligation.status.updated',
          beforeJson: { status: 'pending', readiness: 'ready' },
          afterJson: { status: 'done', readiness: 'ready' },
        },
        labels,
      ),
    ).toMatchObject({
      headline: 'Deadline status changed from Not started to Filed',
      changes: [{ field: 'Status', previous: 'Not started', next: 'Filed' }],
    })

    expect(
      buildAuditChangeView(
        {
          action: 'obligation.due_date.updated',
          beforeJson: { currentDueDate: '2026-04-15' },
          afterJson: { currentDueDate: '2026-05-15' },
        },
        labels,
        'America/Los_Angeles',
      ),
    ).toMatchObject({
      headline: 'Internal deadline changed from 2026-04-15 to 2026-05-15',
      changes: [{ field: 'Internal deadline', previous: '2026-04-15', next: '2026-05-15' }],
    })
  })

  it('builds user-facing views for common client, import, pulse, member, and saved view events', () => {
    const labels = makeChangeLabels()

    expect(
      buildAuditChangeView(
        {
          action: 'penalty.override',
          beforeJson: { estimatedTaxLiabilityCents: null, equityOwnerCount: 2 },
          afterJson: { estimatedTaxLiabilityCents: 125000, equityOwnerCount: 3 },
        },
        labels,
      ),
    ).toMatchObject({
      headline: 'Penalty inputs changed',
      changes: [
        { field: 'Estimated tax liability', previous: 'Not set', next: '$1,250' },
        { field: 'Owner count', previous: '2', next: '3' },
      ],
    })

    expect(
      buildAuditChangeView(
        {
          action: 'client.assignee.updated',
          beforeJson: { clients: [{ id: 'client_1', assigneeName: 'Mina' }] },
          afterJson: { count: 3, assigneeName: 'Sarah', clientIds: ['client_1'] },
        },
        labels,
      ).headline,
    ).toBe('Client assignee changed to Sarah for 3 clients')

    expect(
      buildAuditChangeView(
        {
          action: 'migration.imported',
          beforeJson: { status: 'reviewing' },
          afterJson: { clientCount: 2, obligationCount: 5, skippedCount: 1 },
        },
        labels,
      ).headline,
    ).toBe('Import completed: 2 clients, 5 deadlines, 1 skipped rows')

    expect(
      buildAuditChangeView(
        {
          action: 'pulse.apply',
          beforeJson: { obligationId: 'obl_1', currentDueDate: '2026-03-15' },
          afterJson: { pulseId: 'pulse_1', obligationId: 'obl_1', currentDueDate: '2026-05-25' },
        },
        labels,
      ).headline,
    ).toBe('Pulse changed due date from 2026-03-15 to 2026-05-25')

    expect(
      buildAuditChangeView(
        {
          action: 'member.role.updated',
          beforeJson: { role: 'preparer' },
          afterJson: { role: 'manager' },
        },
        labels,
      ).headline,
    ).toBe('Member role changed from Preparer to Manager')

    expect(
      buildAuditChangeView(
        {
          action: 'obligations.saved_view.updated',
          beforeJson: null,
          afterJson: { name: 'Pinned high-risk clients', isPinned: true },
        },
        labels,
      ),
    ).toMatchObject({
      headline: 'Saved view updated: Pinned high-risk clients',
      changes: [
        { field: 'Name', previous: 'Not set', next: 'Pinned high-risk clients' },
        { field: 'Pinned', previous: 'Not set', next: 'Yes' },
      ],
    })
  })

  it('keeps fallback change views readable without raw JSON or technical action strings', () => {
    const view = buildAuditChangeView(
      {
        action: 'custom.settings_changed',
        beforeJson: { settings: { nested: true }, firmId: 'firm_1' },
        afterJson: { settings: { nested: false }, firmId: 'firm_2' },
      },
      makeChangeLabels(),
    )

    const rendered = [
      view.headline,
      ...view.changes.flatMap((row) => [row.field, row.previous, row.next]),
    ].join(' ')
    expect(rendered).toContain('Custom settings changed')
    expect(rendered).toContain('Settings')
    expect(rendered).toContain('Details updated')
    expect(rendered).not.toContain('custom.settings_changed')
    expect(rendered).not.toContain('firmId')
    expect(rendered).not.toContain('"nested"')
    expect(rendered).not.toContain('object')
  })

  it('formats audit entity type labels for user-facing surfaces', () => {
    const labels = {
      auth: 'Authentication',
      auditEvidencePackage: 'Audit export package',
      client: 'Client',
      clientBatch: 'Client import batch',
      firm: 'Practice',
      member: 'Team member',
      memberInvitation: 'Member invitation',
      migrationBatch: 'Import batch',
      obligationBatch: 'Deadline batch',
      obligationInstance: 'Deadline',
      pulseApplication: 'Pulse application',
      pulseAlert: 'Pulse alert',
      rule: 'Rule',
      ruleSource: 'Rule source',
      obligationQueueExport: 'Obligations export',
      obligationQueueSavedView: 'Saved obligation view',
    } satisfies AuditEntityTypeLabels

    expect(formatAuditEntityTypeLabel('obligation_saved_view', labels)).toBe(
      'Saved obligation view',
    )
    expect(formatAuditEntityTypeLabel('obligation_instance', labels)).toBe('Deadline')
    expect(humanizeAuditEntityType('custom_ai_output')).toBe('Custom AI output')
  })

  it('formats audit action labels for user-facing surfaces', () => {
    const labels = makeActionLabels({
      obligationExtensionDecided: 'Extension plan saved',
      obligationStatusUpdated: 'Deadline status changed',
      obligationQueueSavedViewDeleted: 'Saved view deleted',
    })

    expect(formatAuditActionLabel('obligation.extension.decided', labels)).toBe(
      'Extension plan saved',
    )
    expect(formatAuditActionLabel('obligations.saved_view.deleted', labels)).toBe(
      'Saved view deleted',
    )
    expect(formatAuditActionLabel('obligation.status.updated', labels)).toBe(
      'Deadline status changed',
    )
    expect(formatAuditActionLabel('custom.object_changed', labels)).toBe('Custom object changed')
    expect(humanizeAuditAction('custom.object_changed')).toBe('Custom object changed')
  })

  it('derives audit entity display names from payloads', () => {
    expect(
      getAuditEntityDisplay(
        {
          entityId: '33333333-3333-4333-8333-333333333333',
          beforeJson: null,
          afterJson: { name: 'Pinned high-risk clients' },
        },
        'Saved obligation view',
      ),
    ).toEqual({
      primary: 'Pinned high-risk clients',
      secondary: 'Saved obligation view · 33333333...3333',
    })

    expect(
      getAuditEntityDisplay(
        {
          entityId: '33333333-3333-4333-8333-333333333333',
          beforeJson: null,
          afterJson: null,
        },
        'Deadline',
      ),
    ).toEqual({
      primary: 'Deadline',
      secondary: '33333333...3333',
    })
  })
})

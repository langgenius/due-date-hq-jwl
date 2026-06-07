import { call } from '@orpc/server'
import { describe, expect, it, vi } from 'vitest'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import type { MemberRow, MembersRepo } from '@duedatehq/ports/tenants'
import type { Env } from '../../env'
import type { RpcContext } from '../_context'
import {
  groupReadinessChecklistForEmail,
  reconcileChecklistForObligation,
  renderReadinessRequestEmail,
  readinessHandlers,
  toPortalChecklist,
} from './index'

function publicChecklistItem(index: number) {
  const now = '2026-05-22T00:00:00.000Z'
  return {
    id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    firmId: 'firm_1',
    obligationInstanceId: '22222222-2222-4222-8222-222222222222',
    label: `Document item ${index}`,
    description: `Description ${index}`,
    source: 'template' as const,
    // η pass: ai-provenance fields default to manual / null for legacy fixtures.
    origin: 'manual' as const,
    aiGeneratedAt: null,
    userEditedAt: null,
    status: 'missing' as const,
    sortOrder: index,
    note: null,
    receivedAt: null,
    receivedByUserId: null,
    createdByUserId: 'user_1',
    createdAt: now,
    updatedAt: now,
  }
}

function repoChecklistItem(index: number) {
  const item = publicChecklistItem(index)
  return {
    ...item,
    templateKey: `template.item.${index}`,
    templateVersion: 1,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    receivedAt: null,
    aiGeneratedAt: null,
    userEditedAt: null,
  }
}

type RepoChecklistItemFixture = Omit<
  ReturnType<typeof repoChecklistItem>,
  'status' | 'receivedAt'
> & {
  status: 'missing' | 'received' | 'needs_review' | 'waived'
  receivedAt: Date | null
}

function emailPayloadText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''
  const text = Reflect.get(payload, 'text')
  return typeof text === 'string' ? text : ''
}

function makeReadinessContext(input: {
  clientEmail?: string | null
  templateActive?: boolean
  obligationPatch?: Partial<ObligationInstanceRow>
  checklistRows?: RepoChecklistItemFixture[]
}) {
  const now = new Date('2026-05-22T00:00:00.000Z')
  const dueDate = new Date('2026-05-15T00:00:00.000Z')
  const obligation: ObligationInstanceRow = {
    id: '22222222-2222-4222-8222-222222222222',
    firmId: 'firm_1',
    confirmed: true,
    clientId: '33333333-3333-4333-8333-333333333333',
    clientFilingProfileId: null,
    taxType: 'Form 1065',
    taxYear: 2025,
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    taxPeriodStart: null,
    taxPeriodEnd: null,
    taxPeriodKind: 'calendar',
    taxPeriodSource: 'client_default',
    taxPeriodReviewReason: null,
    ruleId: null,
    ruleVersion: null,
    rulePeriod: null,
    generationSource: null,
    jurisdiction: 'FED',
    obligationType: 'filing',
    formName: '1065',
    authority: 'IRS',
    filingDueDate: dueDate,
    paymentDueDate: null,
    sourceEvidenceJson: null,
    recurrence: 'annual',
    riskLevel: 'low',
    baseDueDate: dueDate,
    currentDueDate: dueDate,
    status: 'in_progress',
    blockedByObligationInstanceId: null,
    readiness: 'waiting',
    extensionDecision: 'not_considered',
    extensionMemo: null,
    extensionSource: null,
    extensionExpectedDueDate: null,
    extensionDecidedAt: null,
    extensionDecidedByUserId: null,
    extensionState: 'not_started',
    extensionFormName: null,
    extensionFiledAt: null,
    extensionAcceptedAt: null,
    prepStage: 'waiting_on_client',
    reviewStage: 'not_required',
    reviewerUserId: null,
    reviewCompletedAt: null,
    paymentState: 'not_applicable',
    paymentConfirmedAt: null,
    efileState: 'not_applicable',
    efileAuthorizationForm: null,
    efileSubmittedAt: null,
    efileAcceptedAt: null,
    efileRejectedAt: null,
    migrationBatchId: null,
    estimatedTaxDueCents: null,
    estimatedExposureCents: null,
    exposureStatus: 'needs_input',
    penaltyFactsJson: null,
    penaltyFactsVersion: null,
    penaltyBreakdownJson: null,
    penaltyFormulaVersion: null,
    missingPenaltyFactsJson: null,
    penaltySourceRefsJson: null,
    penaltyFormulaLabel: null,
    exposureCalculatedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  Object.assign(obligation, input.obligationPatch)
  const client: ClientRow = {
    id: obligation.clientId,
    firmId: 'firm_1',
    name: 'Acme LLC',
    ein: null,
    state: 'CA',
    county: null,
    entityType: 'partnership',
    legalEntity: 'partnership',
    taxClassification: 'partnership',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    externalClientId: null,
    addressLine1: null,
    city: null,
    postalCode: null,
    primaryPhone: null,
    sourceStatus: null,
    email: input.clientEmail === undefined ? 'client@example.com' : input.clientEmail,
    notes: null,
    assigneeId: null,
    assigneeName: null,
    ownerCount: null,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: false,
    hasK1Activity: true,
    primaryContactName: null,
    primaryContactEmail: null,
    importanceWeight: 1,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: null,
    estimatedTaxLiabilitySource: null,
    equityOwnerCount: null,
    migrationBatchId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  const checklistRows = input.checklistRows ?? [
    {
      ...repoChecklistItem(1),
      label: 'K-1 packages',
      description: 'Partnership K-1 packages.',
    },
    {
      ...repoChecklistItem(2),
      label: 'Prior-year return',
      description: 'Prior-year filing copy.',
      status: 'received' as const,
      receivedAt: new Date('2026-05-22T00:00:00.000Z'),
    },
  ]
  const reconcileDocumentChecklistItems = vi.fn(async () => checklistRows)
  const createRequest = vi.fn(
    async (request: Parameters<ScopedRepo['readiness']['createRequest']>[0]) => ({
      ...request,
      firmId: 'firm_1',
      status: 'sent' as const,
      firstOpenedAt: null,
      lastRespondedAt: null,
      createdAt: new Date('2026-05-22T00:00:00.000Z'),
      updatedAt: new Date('2026-05-22T00:00:00.000Z'),
      responses: [],
    }),
  )
  type EnqueueEmailInput = Parameters<NonNullable<ScopedRepo['notifications']>['enqueueEmail']>[0]
  const enqueueEmailCalls: EnqueueEmailInput[] = []
  const enqueueEmail = vi.fn(async (email: EnqueueEmailInput) => {
    enqueueEmailCalls.push(email)
    return { id: '55555555-5555-4555-8555-555555555555', created: true }
  })
  const emailQueueSend = vi.fn(async () => undefined)
  const member: MemberRow = {
    id: 'member_1',
    organizationId: 'firm_1',
    userId: 'user_1',
    name: 'Owner',
    email: 'owner@example.com',
    image: null,
    role: 'owner',
    status: 'active',
    createdAt: new Date('2026-05-22T00:00:00.000Z'),
  }
  const members: MembersRepo = {
    listMembers: null!,
    listInvitations: null!,
    findMembership: vi.fn(async () => member),
    findMember: null!,
    findMemberByEmail: null!,
    findInvitation: null!,
    findPendingInvitationByEmail: null!,
    seatLimit: null!,
    seatUsage: null!,
    updateRole: null!,
    setMemberStatus: null!,
    writeAudit: null!,
  }
  const scoped = {
    firmId: 'firm_1',
    obligations: { findById: vi.fn(async () => obligation) },
    clients: { findById: vi.fn(async () => client) },
    readiness: {
      firmId: 'firm_1',
      reconcileDocumentChecklistItems,
      createRequest,
    },
    reminders: {
      listTemplates: vi.fn(async () => [
        {
          id: 'template_1',
          firmId: 'firm_1',
          templateKey: 'client-materials-request',
          kind: 'readiness_request' as const,
          name: 'Client checklist collection email',
          subject: '{{client_name}}: secure materials request for {{tax_type}}',
          bodyText:
            'Open {{request_url}}\n\nOutstanding:\n{{outstanding_checklist}}\n\nReceived:\n{{received_checklist}}',
          active: input.templateActive ?? true,
          isSystem: false,
          usageCount: 0,
          lastSentAt: null,
          createdAt: null,
          updatedAt: null,
        },
      ]),
    },
    notifications: { enqueueEmail },
    audit: { write: vi.fn(async () => ({ id: '44444444-4444-4444-8444-444444444444' })) },
  } as unknown as ScopedRepo
  const context: RpcContext = {
    env: {
      AUTH_SECRET: '01234567890123456789012345678901',
      APP_URL: 'https://app.test',
      EMAIL_QUEUE: { send: emailQueueSend },
    } as unknown as Env,
    request: new Request('https://app.test/rpc/readiness/sendRequest'),
    vars: {
      requestId: 'req_1',
      tenantContext: {
        firmId: 'firm_1',
        timezone: 'America/New_York',
        plan: 'solo',
        seatLimit: 1,
        status: 'active',
        internalDeadlineOffsetDays: 14,
        monitoringStartDate: '2026-05-29',
        ownerUserId: 'user_1',
        coordinatorCanSeeDollars: false,
      },
      userId: 'user_1',
      members,
      scoped,
    },
  }
  return { context, createRequest, enqueueEmail, enqueueEmailCalls, emailQueueSend }
}

describe('readiness procedure helpers', () => {
  it('maps the full portal checklist instead of truncating at eight items', () => {
    const checklist = Array.from({ length: 14 }, (_, index) => publicChecklistItem(index))

    expect(toPortalChecklist(checklist)).toHaveLength(14)
  })

  // η pass — F-022 / F-023: marker drops + audit event proof. Run against
  // a stub readiness repo so we can assert the procedure passes
  // dropsAiOrigin correctly, AND that the audit writer received
  // previousActorType: 'ai' + the override action string.
  describe('updateChecklistItem AI override (F-022 / F-023)', () => {
    interface UpdateInput {
      label?: string
      description?: string | null
      status?: 'missing' | 'received' | 'needs_review' | 'waived'
      note?: string | null
      receivedByUserId?: string | null
      dropsAiOrigin?: boolean
      id: string
      now: Date
    }

    function makeContext(input: { previousOrigin: 'ai' | 'manual' }) {
      const auditWrites: Array<Record<string, unknown>> = []
      const updateCalls: UpdateInput[] = []
      const updateDocumentChecklistItem = vi.fn(async (params: UpdateInput) => {
        updateCalls.push(params)
        return {
          ...repoChecklistItem(1),
          // The repo returns the row with previousOrigin attached so the
          // procedure can shape the audit event without a second query.
          previousOrigin: input.previousOrigin,
          origin:
            input.previousOrigin === 'ai' && params.dropsAiOrigin
              ? ('manual' as const)
              : ('ai' as const),
          userEditedAt:
            input.previousOrigin === 'ai' && params.dropsAiOrigin
              ? new Date('2026-05-27T00:00:00.000Z')
              : null,
          label: params.label ?? 'K-1 packages',
        }
      })
      const scoped = {
        firmId: 'firm_1',
        readiness: {
          firmId: 'firm_1',
          updateDocumentChecklistItem,
          listDocumentChecklistByObligation: vi.fn(async () => []),
        },
        audit: {
          write: vi.fn(async (event: Record<string, unknown>) => {
            auditWrites.push(event)
            return { id: '44444444-4444-4444-8444-444444444444' }
          }),
        },
      } as unknown as ScopedRepo

      const member: MemberRow = {
        id: 'member_1',
        organizationId: 'firm_1',
        userId: 'user_1',
        name: 'Owner',
        email: 'owner@example.com',
        image: null,
        role: 'owner',
        status: 'active',
        createdAt: new Date('2026-05-22T00:00:00.000Z'),
      }
      const members: MembersRepo = {
        listMembers: null!,
        listInvitations: null!,
        findMembership: vi.fn(async () => member),
        findMember: null!,
        findMemberByEmail: null!,
        findInvitation: null!,
        findPendingInvitationByEmail: null!,
        seatLimit: null!,
        seatUsage: null!,
        updateRole: null!,
        setMemberStatus: null!,
        writeAudit: null!,
      }

      const context: RpcContext = {
        env: {} as unknown as Env,
        request: new Request('https://app.test/rpc/readiness/updateChecklistItem'),
        vars: {
          requestId: 'req_1',
          tenantContext: {
            firmId: 'firm_1',
            timezone: 'America/New_York',
            plan: 'solo',
            seatLimit: 1,
            status: 'active',
            ownerUserId: 'user_1',
            internalDeadlineOffsetDays: 14,
            monitoringStartDate: '2026-05-29',
            coordinatorCanSeeDollars: false,
          },
          userId: 'user_1',
          members,
          scoped,
        },
      }
      return { context, auditWrites, updateCalls }
    }

    it('drops AI origin and emits override audit event when a label edit overrides AI value', async () => {
      const { context, auditWrites, updateCalls } = makeContext({ previousOrigin: 'ai' })

      await call(
        readinessHandlers.updateChecklistItem,
        {
          itemId: '11111111-1111-4111-8111-000000000001',
          label: 'Payroll W-2s (verified subset)',
        },
        { context },
      )

      // Procedure signalled the intent to flip origin.
      expect(updateCalls[0]?.dropsAiOrigin).toBe(true)
      // Exactly one audit row, shaped for the override path.
      expect(auditWrites).toHaveLength(1)
      const event = auditWrites[0]!
      expect(event.action).toBe('readiness.checklist_item.ai_overridden')
      expect(event.actorType).toBe('user')
      expect(event.previousActorType).toBe('ai')
      expect(event.after).toMatchObject({ previousOrigin: 'ai', origin: 'manual' })
    })

    it('keeps the AI marker intact for a status-only change (mark received)', async () => {
      const { context, auditWrites, updateCalls } = makeContext({ previousOrigin: 'ai' })

      await call(
        readinessHandlers.updateChecklistItem,
        {
          itemId: '11111111-1111-4111-8111-000000000001',
          status: 'received',
        },
        { context },
      )

      // Status-only = no value touch = no origin flip.
      expect(updateCalls[0]?.dropsAiOrigin).toBe(false)
      expect(auditWrites).toHaveLength(1)
      const event = auditWrites[0]!
      expect(event.action).toBe('readiness.checklist_item.updated')
      expect(event.previousActorType).toBeNull()
    })

    it('emits the regular updated event when the row was never AI-sourced', async () => {
      const { context, auditWrites } = makeContext({ previousOrigin: 'manual' })

      await call(
        readinessHandlers.updateChecklistItem,
        {
          itemId: '11111111-1111-4111-8111-000000000001',
          label: 'Renamed manual item',
        },
        { context },
      )

      const event = auditWrites[0]!
      // Even though dropsAiOrigin was set by the procedure, the previous
      // row WASN'T AI, so the override-action path stays off.
      expect(event.action).toBe('readiness.checklist_item.updated')
      expect(event.previousActorType).toBeNull()
    })
  })

  it('groups all checklist items for materials request email preview', () => {
    const missing = publicChecklistItem(1)
    const received = { ...publicChecklistItem(2), status: 'received' as const }
    const needsReview = { ...publicChecklistItem(3), status: 'needs_review' as const }

    expect(groupReadinessChecklistForEmail([missing, received, needsReview])).toEqual({
      outstanding: [missing, needsReview],
      received: [received],
    })
  })

  it('groups only needs-review items for correction request email preview', () => {
    const missing = publicChecklistItem(1)
    const received = { ...publicChecklistItem(2), status: 'received' as const }
    const needsReview = { ...publicChecklistItem(3), status: 'needs_review' as const }

    expect(
      groupReadinessChecklistForEmail([missing, received, needsReview], { correctionOnly: true }),
    ).toEqual({
      outstanding: [needsReview],
      received: [],
    })
  })

  it('renders materials request emails with grouped checklist text', () => {
    const missing = publicChecklistItem(1)
    const received = { ...publicChecklistItem(2), status: 'received' as const }

    expect(
      renderReadinessRequestEmail({
        template: {
          subject: '{{client_name}}: materials needed for {{tax_type}}',
          bodyText:
            'Open {{request_url}}\n\nOutstanding:\n{{outstanding_checklist}}\n\nReceived:\n{{received_checklist}}',
        },
        clientName: 'Acme LLC',
        taxType: 'Form 1065',
        dueDate: '2026-05-15',
        requestUrl: 'https://app.test/readiness/token',
        checklist: groupReadinessChecklistForEmail([missing, received]),
      }),
    ).toEqual({
      subject: 'Acme LLC: materials needed for Form 1065',
      bodyText: [
        'Open https://app.test/readiness/token',
        '',
        'Outstanding:',
        '- Document item 1 - Description 1',
        '',
        'Received:',
        '- Document item 2 - Description 2',
      ].join('\n'),
    })
  })

  it('renders correction request emails without received checklist items', () => {
    const received = { ...publicChecklistItem(2), status: 'received' as const }
    const needsReview = { ...publicChecklistItem(3), status: 'needs_review' as const }

    const result = renderReadinessRequestEmail({
      template: {
        subject: '{{client_name}}: materials needed for {{tax_type}}',
        bodyText:
          'Open {{request_url}}\n\nOutstanding:\n{{outstanding_checklist}}\n\nReceived:\n{{received_checklist}}',
      },
      clientName: 'Acme LLC',
      taxType: 'Form 1065',
      dueDate: '2026-05-15',
      requestUrl: 'https://app.test/readiness/token',
      checklist: groupReadinessChecklistForEmail([received, needsReview], {
        correctionOnly: true,
      }),
      correctionOnly: true,
    })

    expect(result.subject).toBe('Acme LLC: corrections needed for Form 1065')
    expect(result.bodyText).toContain('Items needing correction:')
    expect(result.bodyText).toContain('Document item 3')
    expect(result.bodyText).not.toContain('Document item 2')
    expect(result.bodyText).not.toContain('Received:')
  })

  it('previews readiness request email with current grouped checklist items', async () => {
    const { context } = makeReadinessContext({})

    const result = await call(
      readinessHandlers.previewRequestEmail,
      { obligationId: '22222222-2222-4222-8222-222222222222' },
      { context },
    )

    expect(result.emailWillBeQueued).toBe(true)
    expect(result.recipientEmail).toBe('client@example.com')
    expect(result.subject).toBe('Acme LLC: secure materials request for Form 1065')
    expect(result.checklist.outstanding).toEqual([
      expect.objectContaining({ label: 'K-1 packages', status: 'missing' }),
    ])
    expect(result.checklist.received).toEqual([
      expect.objectContaining({ label: 'Prior-year return', status: 'received' }),
    ])
    expect(result.bodyText).toContain(
      'A secure materials link will be generated when you send this request.',
    )
  })

  it('previews rejected-return correction emails with only needs-review items', async () => {
    const { context } = makeReadinessContext({
      obligationPatch: {
        status: 'review',
        efileRejectedAt: new Date('2026-05-22T00:00:00.000Z'),
      },
      checklistRows: [
        {
          ...repoChecklistItem(1),
          label: 'Original spreadsheet',
          description: 'Already accepted by the firm.',
          status: 'received',
          receivedAt: new Date('2026-05-21T00:00:00.000Z'),
        },
        {
          ...repoChecklistItem(2),
          label: 'Corrected K-1 package',
          description: 'Re-send the corrected K-1.',
          status: 'needs_review',
          receivedAt: null,
        },
      ],
    })

    const result = await call(
      readinessHandlers.previewRequestEmail,
      { obligationId: '22222222-2222-4222-8222-222222222222' },
      { context },
    )

    expect(result.subject).toBe('Acme LLC: corrections needed for Form 1065')
    expect(result.checklist.outstanding).toEqual([
      expect.objectContaining({ label: 'Corrected K-1 package', status: 'needs_review' }),
    ])
    expect(result.checklist.received).toEqual([])
    expect(result.bodyText).toContain('Corrected K-1 package')
    expect(result.bodyText).not.toContain('Original spreadsheet')
  })

  it('uses the normal materials template when a non-review deadline has rejection history', async () => {
    const { context } = makeReadinessContext({
      obligationPatch: {
        status: 'done',
        efileRejectedAt: new Date('2026-05-22T00:00:00.000Z'),
      },
      checklistRows: [
        {
          ...repoChecklistItem(1),
          label: 'Archived workpaper',
          description: 'Already accepted by the firm.',
          status: 'received',
          receivedAt: new Date('2026-05-21T00:00:00.000Z'),
        },
        {
          ...repoChecklistItem(2),
          label: 'Open organizer item',
          description: 'Still missing for the ordinary request.',
          status: 'missing',
          receivedAt: null,
        },
      ],
    })

    const result = await call(
      readinessHandlers.previewRequestEmail,
      { obligationId: '22222222-2222-4222-8222-222222222222' },
      { context },
    )

    expect(result.subject).toBe('Acme LLC: secure materials request for Form 1065')
    expect(result.checklist.outstanding).toEqual([
      expect.objectContaining({ label: 'Open organizer item', status: 'missing' }),
    ])
    expect(result.checklist.received).toEqual([
      expect.objectContaining({ label: 'Archived workpaper', status: 'received' }),
    ])
    expect(result.bodyText).toContain('Outstanding:')
    expect(result.bodyText).toContain('Received:')
    expect(result.bodyText).toContain('Archived workpaper')
  })

  it('sends readiness requests with the active Reminders materials template', async () => {
    const { context, enqueueEmail, enqueueEmailCalls, emailQueueSend } = makeReadinessContext({})

    const result = await call(
      readinessHandlers.sendRequest,
      { obligationId: '22222222-2222-4222-8222-222222222222' },
      { context },
    )

    expect(result.emailQueued).toBe(true)
    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'readiness_request',
        payloadJson: expect.objectContaining({
          recipients: ['client@example.com'],
          subject: 'Acme LLC: secure materials request for Form 1065',
          text: expect.stringContaining('- K-1 packages - Partnership K-1 packages.'),
        }),
      }),
    )
    const queuedEmail = enqueueEmailCalls[0]
    expect(queuedEmail).toBeDefined()
    const queuedText = emailPayloadText(queuedEmail?.payloadJson)
    expect(queuedText).toContain('https://app.test/readiness/')
    expect(queuedText).toContain('- Prior-year return - Prior-year filing copy.')
    expect(emailQueueSend).toHaveBeenCalledWith({ type: 'email.flush' })
  })

  it('sends rejected-return correction requests with only needs-review portal items', async () => {
    const { context, createRequest, enqueueEmailCalls } = makeReadinessContext({
      obligationPatch: {
        status: 'review',
        efileRejectedAt: new Date('2026-05-22T00:00:00.000Z'),
      },
      checklistRows: [
        {
          ...repoChecklistItem(1),
          label: 'Accepted workpaper',
          description: 'Already accepted by the firm.',
          status: 'received',
          receivedAt: new Date('2026-05-21T00:00:00.000Z'),
        },
        {
          ...repoChecklistItem(2),
          label: 'Corrected state worksheet',
          description: 'Client must update this worksheet.',
          status: 'needs_review',
          receivedAt: null,
        },
      ],
    })

    await call(
      readinessHandlers.sendRequest,
      { obligationId: '22222222-2222-4222-8222-222222222222' },
      { context },
    )

    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        checklistJson: [
          expect.objectContaining({
            label: 'Corrected state worksheet',
          }),
        ],
      }),
    )
    const queuedEmail = enqueueEmailCalls[0]
    const queuedText = emailPayloadText(queuedEmail?.payloadJson)
    expect(queuedText).toContain('Corrected state worksheet')
    expect(queuedText).not.toContain('Accepted workpaper')
  })

  it('creates a materials link without queueing email when the client has no email', async () => {
    const { context, enqueueEmail, emailQueueSend } = makeReadinessContext({ clientEmail: null })

    const result = await call(
      readinessHandlers.sendRequest,
      { obligationId: '22222222-2222-4222-8222-222222222222' },
      { context },
    )

    expect(result.emailQueued).toBe(false)
    expect(enqueueEmail).not.toHaveBeenCalled()
    expect(emailQueueSend).not.toHaveBeenCalled()
  })

  it('reconciles through the repository with versioned template metadata', async () => {
    const reconcileDocumentChecklistItems = vi.fn(async () => [])

    await reconcileChecklistForObligation({
      readiness: { reconcileDocumentChecklistItems },
      obligation: {
        id: 'obligation_1',
        taxType: 'federal_1040_estimated_tax',
        formName: '1040-ES',
        obligationType: 'payment',
        jurisdiction: 'FED',
      },
      client: {
        entityType: 'individual',
        taxClassification: 'individual',
        state: 'CA',
      },
      userId: 'user_1',
      now: new Date('2026-05-22T00:00:00.000Z'),
    })

    expect(reconcileDocumentChecklistItems).toHaveBeenCalledWith(
      expect.objectContaining({
        obligationInstanceId: 'obligation_1',
        createdByUserId: 'user_1',
        template: expect.arrayContaining([
          expect.objectContaining({
            templateKey: 'estimated_tax.payment_voucher.prior_year_return',
            templateVersion: 1,
          }),
        ]),
      }),
    )
  })
})

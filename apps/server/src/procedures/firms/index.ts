import { ORPCError } from '@orpc/server'
import { billingCheckoutConfig } from '@duedatehq/auth'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { slugifyPracticeName } from '@duedatehq/core/practice-name'
import {
  ErrorCodes,
  type FirmBillingSubscriptionPublic,
  type FirmPublic,
  type SmartPriorityProfile,
} from '@duedatehq/contracts'
import type { FirmBillingSubscriptionRow } from '@duedatehq/ports/tenants'
import { createWorkerAuth } from '../../auth'
import { requireSession } from '../_context'
import { os } from '../_root'
import { dateInTimezone, isDateOnly } from '../../lib/date-only'

const MAX_RETRIES_ON_SLUG_COLLISION = 1
const SLUG_CONFLICT_PATTERN = /unique|already exists|slug/i
const SELF_SERVE_ACTIVE_FIRM_LIMIT = 1

type FirmRow = Omit<
  FirmPublic,
  'isCurrent' | 'smartPriorityProfile' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  smartPriorityProfile: SmartPriorityProfile
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

function toIso(value: Date): string {
  return value.toISOString()
}

export function canReadSmartPriorityProfile(
  row: Pick<FirmRow, 'role' | 'ownerUserId'>,
  userId: string,
): boolean {
  return isOwner(row, userId)
}

function toFirmPublic(
  row: FirmRow,
  currentFirmId: string | null | undefined,
  userId: string,
): FirmPublic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    seatLimit: row.seatLimit,
    timezone: row.timezone,
    internalDeadlineOffsetDays: row.internalDeadlineOffsetDays,
    monitoringStartDate: row.monitoringStartDate,
    status: row.status,
    role: row.role,
    ownerUserId: row.ownerUserId,
    coordinatorCanSeeDollars: row.coordinatorCanSeeDollars,
    smartPriorityProfile: canReadSmartPriorityProfile(row, userId)
      ? row.smartPriorityProfile
      : null,
    openObligationCount: row.openObligationCount,
    isCurrent: row.id === currentFirmId,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
  }
}

function toNullableIso(value: Date | null): string | null {
  return value ? toIso(value) : null
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function toBillingSubscriptionPublic(
  row: FirmBillingSubscriptionRow,
): FirmBillingSubscriptionPublic {
  return {
    ...row,
    periodStart: toNullableIso(row.periodStart),
    periodEnd: toNullableIso(row.periodEnd),
    trialStart: toNullableIso(row.trialStart),
    trialEnd: toNullableIso(row.trialEnd),
    cancelAt: toNullableIso(row.cancelAt),
    canceledAt: toNullableIso(row.canceledAt),
    endedAt: toNullableIso(row.endedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function isOwner(row: Pick<FirmRow, 'role' | 'ownerUserId'>, userId: string): boolean {
  return row.role === 'owner' || row.ownerUserId === userId
}

// billing.read is owner-only (mirrors core's FIRM_PERMISSION_ROLES).
function canReadBilling(row: FirmRow, userId: string): boolean {
  return isOwner(row, userId)
}

export function canCreateAdditionalFirm(
  ownedActiveFirms: ReadonlyArray<Pick<FirmRow, 'plan'>>,
): boolean {
  if (ownedActiveFirms.length < SELF_SERVE_ACTIVE_FIRM_LIMIT) return true
  return ownedActiveFirms.some((firm) => planHasFeature(firm.plan, 'multiplePractices'))
}

function readObjectString(value: object, key: 'message' | 'status'): string | undefined {
  if (!(key in value)) return undefined
  const next = Reflect.get(value, key)
  return typeof next === 'string' ? next : undefined
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined
  const status = Reflect.get(error, 'status')
  return typeof status === 'number' ? status : undefined
}

function toConflictMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const direct = readObjectString(error, 'message')
  if (direct) return direct
  if (!('error' in error) || !error.error || typeof error.error !== 'object') return ''
  return readObjectString(error.error, 'message') ?? ''
}

function isSlugConflict(error: unknown): boolean {
  const status = readStatus(error)
  return status === 409 || status === 422 || SLUG_CONFLICT_PATTERN.test(toConflictMessage(error))
}

async function tryCreateOrganization(input: {
  auth: ReturnType<typeof createWorkerAuth>
  headers: Headers
  name: string
}): Promise<string> {
  const organization = await input.auth.api.createOrganization({
    body: {
      name: input.name,
      slug: slugifyPracticeName(input.name),
      keepCurrentActiveOrganization: false,
    },
    headers: input.headers,
  })
  if (organization.id) return organization.id
  throw new ORPCError('INTERNAL_SERVER_ERROR', {
    message: 'Created firm response did not include an id.',
  })
}

async function createOrganizationWithRetry(input: {
  auth: ReturnType<typeof createWorkerAuth>
  headers: Headers
  name: string
}): Promise<string> {
  try {
    return await tryCreateOrganization(input)
  } catch (err) {
    if (!isSlugConflict(err) || MAX_RETRIES_ON_SLUG_COLLISION < 1) throw err
    return tryCreateOrganization(input)
  }
}

const listMine = os.firms.listMine.handler(async ({ context }) => {
  const { firms, session, userId } = requireSession(context)
  const rows = await firms.listMine(userId)
  return rows.map((row) => toFirmPublic(row, session.activeOrganizationId, userId))
})

const getCurrent = os.firms.getCurrent.handler(async ({ context }) => {
  const { firms, session, userId } = requireSession(context)
  const activeFirmId = session.activeOrganizationId
  if (!activeFirmId) return null
  const row = await firms.findActiveForUser(userId, activeFirmId)
  return row ? toFirmPublic(row, activeFirmId, userId) : null
})

const create = os.firms.create.handler(async ({ input, context }) => {
  const { firms, session, userId } = requireSession(context)
  const ownedActiveFirms = await firms.listOwnedActive(userId)
  if (!canCreateAdditionalFirm(ownedActiveFirms)) {
    throw new ORPCError('FORBIDDEN', {
      message: ErrorCodes.FIRM_LIMIT_EXCEEDED,
    })
  }
  const today = dateInTimezone(input.timezone)
  const monitoringStartDate = input.monitoringStartDate ?? today
  if (!isDateOnly(monitoringStartDate) || monitoringStartDate > today) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Monitoring start date cannot be in the future.',
    })
  }

  const auth = createWorkerAuth(context.env)
  const firmId = await createOrganizationWithRetry({
    auth,
    headers: context.request.headers,
    name: input.name,
  })

  await firms.updateProfile(firmId, {
    name: input.name,
    timezone: input.timezone,
    internalDeadlineOffsetDays: input.internalDeadlineOffsetDays,
    monitoringStartDate,
  })
  // Launch offer: the welcome step's "Claim 3 months of Team free" sets this, so
  // grant the Team plan + trial window before the firm is loaded back.
  if (input.grantTeamTrialMonths) {
    await firms.grantTeamTrial(firmId, input.grantTeamTrialMonths)
  }
  await firms.setActiveSession(session.id, userId, firmId)

  const row = await firms.findActiveForUser(userId, firmId)
  if (!row) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Created firm could not be loaded for the current user.',
    })
  }

  await firms.writeAudit({
    firmId,
    actorId: userId,
    entityType: 'firm',
    entityId: firmId,
    action: 'firm.created',
    after: {
      name: row.name,
      plan: row.plan,
      timezone: row.timezone,
      internalDeadlineOffsetDays: row.internalDeadlineOffsetDays,
      monitoringStartDate: row.monitoringStartDate,
    },
  })

  return toFirmPublic(row, firmId, userId)
})

const switchActive = os.firms.switchActive.handler(async ({ input, context }) => {
  const { firms, session, userId } = requireSession(context)
  const row = await firms.findActiveForUser(userId, input.firmId)
  if (!row) {
    throw new ORPCError('FORBIDDEN', {
      message: ErrorCodes.FIRM_FORBIDDEN,
    })
  }

  await firms.setActiveSession(session.id, userId, input.firmId)
  await firms.writeAudit({
    firmId: input.firmId,
    actorId: userId,
    entityType: 'firm',
    entityId: input.firmId,
    action: 'firm.switched',
  })

  return toFirmPublic(row, input.firmId, userId)
})

const updateCurrent = os.firms.updateCurrent.handler(async ({ input, context }) => {
  const { firms, session, userId } = requireSession(context)
  const activeFirmId = session.activeOrganizationId
  if (!activeFirmId) {
    throw new ORPCError('UNAUTHORIZED', { message: ErrorCodes.TENANT_MISSING })
  }

  const before = await firms.findActiveForUser(userId, activeFirmId)
  if (!before) {
    throw new ORPCError('NOT_FOUND', { message: ErrorCodes.FIRM_NOT_FOUND })
  }
  if (!isOwner(before, userId)) {
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.FIRM_FORBIDDEN })
  }

  await firms.updateProfile(activeFirmId, {
    name: input.name,
    timezone: input.timezone,
    internalDeadlineOffsetDays: input.internalDeadlineOffsetDays,
    ...(input.coordinatorCanSeeDollars !== undefined
      ? { coordinatorCanSeeDollars: input.coordinatorCanSeeDollars }
      : {}),
    ...(input.smartPriorityProfile !== undefined
      ? { smartPriorityProfile: input.smartPriorityProfile }
      : {}),
  })
  const deadlinePolicyChanged =
    before.internalDeadlineOffsetDays !== input.internalDeadlineOffsetDays
  const recalculatedObligationCount = deadlinePolicyChanged
    ? await firms.applyInternalDeadlineOffset(activeFirmId, input.internalDeadlineOffsetDays)
    : 0
  const after = await firms.findActiveForUser(userId, activeFirmId)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated firm could not be loaded for the current user.',
    })
  }

  await firms.writeAudit({
    firmId: activeFirmId,
    actorId: userId,
    entityType: 'firm',
    entityId: activeFirmId,
    action: 'firm.updated',
    before: {
      name: before.name,
      timezone: before.timezone,
      internalDeadlineOffsetDays: before.internalDeadlineOffsetDays,
      coordinatorCanSeeDollars: before.coordinatorCanSeeDollars,
      smartPriorityProfile: before.smartPriorityProfile,
    },
    after: {
      name: after.name,
      timezone: after.timezone,
      internalDeadlineOffsetDays: after.internalDeadlineOffsetDays,
      coordinatorCanSeeDollars: after.coordinatorCanSeeDollars,
      smartPriorityProfile: after.smartPriorityProfile,
      ...(deadlinePolicyChanged ? { recalculatedObligationCount } : {}),
    },
  })

  return toFirmPublic(after, activeFirmId, userId)
})

const previewSmartPriorityProfile = os.firms.previewSmartPriorityProfile.handler(
  async ({ input, context }) => {
    const { firms, session, userId } = requireSession(context)
    const activeFirmId = session.activeOrganizationId
    if (!activeFirmId) {
      throw new ORPCError('UNAUTHORIZED', { message: ErrorCodes.TENANT_MISSING })
    }

    const current = await firms.findActiveForUser(userId, activeFirmId)
    if (!current) {
      throw new ORPCError('NOT_FOUND', { message: ErrorCodes.FIRM_NOT_FOUND })
    }
    if (!isOwner(current, userId)) {
      throw new ORPCError('FORBIDDEN', { message: ErrorCodes.FIRM_FORBIDDEN })
    }

    const asOfDate = input.asOfDate ?? dateInTimezone(current.timezone)
    const result = await firms.previewSmartPriorityProfile(activeFirmId, {
      smartPriorityProfile: input.smartPriorityProfile,
      asOfDate,
      limit: input.limit ?? 8,
    })
    return {
      asOfDate: result.asOfDate,
      rows: result.rows.map((row) =>
        Object.assign({}, row, { currentDueDate: toDateOnly(row.currentDueDate) }),
      ),
    }
  },
)

const listSubscriptions = os.firms.listSubscriptions.handler(async ({ context }) => {
  const { firms, session, userId } = requireSession(context)
  const activeFirmId = session.activeOrganizationId
  if (!activeFirmId) return []

  const row = await firms.findActiveForUser(userId, activeFirmId)
  if (!row) {
    throw new ORPCError('NOT_FOUND', { message: ErrorCodes.FIRM_NOT_FOUND })
  }
  if (!canReadBilling(row, userId)) {
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.FIRM_FORBIDDEN })
  }

  const subscriptions = await firms.listBillingSubscriptions(activeFirmId)
  return subscriptions.map(toBillingSubscriptionPublic)
})

const billingCheckoutConfigHandler = os.firms.billingCheckoutConfig.handler(async ({ context }) => {
  requireSession(context)
  return billingCheckoutConfig(context.env)
})

const softDeleteCurrent = os.firms.softDeleteCurrent.handler(async ({ context }) => {
  const { firms, session, userId } = requireSession(context)
  const activeFirmId = session.activeOrganizationId
  if (!activeFirmId) {
    throw new ORPCError('UNAUTHORIZED', { message: ErrorCodes.TENANT_MISSING })
  }

  const current = await firms.findActiveForUser(userId, activeFirmId)
  if (!current) {
    throw new ORPCError('NOT_FOUND', { message: ErrorCodes.FIRM_NOT_FOUND })
  }
  if (!isOwner(current, userId)) {
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.FIRM_FORBIDDEN })
  }

  await firms.writeAudit({
    firmId: activeFirmId,
    actorId: userId,
    entityType: 'firm',
    entityId: activeFirmId,
    action: 'firm.deleted',
    before: {
      name: current.name,
      timezone: current.timezone,
      internalDeadlineOffsetDays: current.internalDeadlineOffsetDays,
    },
  })
  await firms.softDelete(activeFirmId)

  const next = (await firms.listMine(userId)).find((firm) => firm.id !== activeFirmId)
  const nextFirmId = next?.id ?? null
  await firms.setActiveSession(session.id, userId, nextFirmId)

  return { nextFirmId }
})

export const firmsHandlers = {
  listMine,
  getCurrent,
  create,
  switchActive,
  updateCurrent,
  previewSmartPriorityProfile,
  listSubscriptions,
  billingCheckoutConfig: billingCheckoutConfigHandler,
  softDeleteCurrent,
}

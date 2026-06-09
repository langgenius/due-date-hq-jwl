import type { FirmPlan, FirmRole, FirmStatus, InvitationStatus, MemberStatus } from './shared'
import type { AuditEventInput } from './audit'
import type { SmartPriorityFactorKey, SmartPriorityProfile } from './priority'

export interface TenantContext {
  readonly firmId: string
  readonly plan: FirmPlan
  readonly seatLimit: number
  readonly timezone: string
  readonly internalDeadlineOffsetDays: number
  readonly monitoringStartDate: string
  readonly status: FirmStatus
  readonly ownerUserId: string
  readonly coordinatorCanSeeDollars: boolean
  // True for the public no-signup demo visitor (userId `public_demo_*`). When
  // set, all write procedures reject with DEMO_READ_ONLY. Optional so other
  // TenantContext constructions (tests, e2e) don't all need to set it.
  readonly isReadOnlyDemo?: boolean
  readonly createdAt?: Date
}

export interface FirmMembershipRow {
  id: string
  name: string
  slug: string
  plan: FirmPlan
  seatLimit: number
  timezone: string
  internalDeadlineOffsetDays: number
  monitoringStartDate: string
  status: FirmStatus
  role: FirmRole
  ownerUserId: string
  coordinatorCanSeeDollars: boolean
  smartPriorityProfile: SmartPriorityProfile
  openObligationCount: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface FirmUpdateInput {
  name: string
  timezone: string
  internalDeadlineOffsetDays: number
  monitoringStartDate?: string
  coordinatorCanSeeDollars?: boolean
  smartPriorityProfile?: SmartPriorityProfile
}

export interface FirmSmartPriorityPreviewInput {
  smartPriorityProfile: SmartPriorityProfile
  asOfDate: string
  limit: number
}

export interface FirmSmartPriorityPreviewRow {
  obligationId: string
  clientName: string
  taxType: string
  currentDueDate: Date
  currentScore: number
  previewScore: number
  scoreDelta: number
  currentRank: number | null
  previewRank: number
  rankDelta: number | null
  // 2026-06-07 (Pencil H1YSCd): dominant factor behind the preview score
  // (largest contribution). Null when every factor contributes zero.
  topDriver: { factor: SmartPriorityFactorKey; contribution: number } | null
}

export interface FirmSmartPriorityPreviewOutput {
  asOfDate: string
  rows: FirmSmartPriorityPreviewRow[]
}

export interface MemberRow {
  id: string
  organizationId: string
  userId: string
  name: string
  email: string
  image: string | null
  role: FirmRole
  status: MemberStatus
  createdAt: Date
}

export interface InvitationRow {
  id: string
  organizationId: string
  email: string
  role: Exclude<FirmRole, 'owner'>
  status: InvitationStatus
  inviterId: string
  expiresAt: Date
  createdAt: Date
}

export interface FirmBillingSubscriptionRow {
  id: string
  plan: string
  referenceId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string
  periodStart: Date | null
  periodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  cancelAtPeriodEnd: boolean
  cancelAt: Date | null
  canceledAt: Date | null
  endedAt: Date | null
  seats: number | null
  billingInterval: string | null
  stripeScheduleId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SeatUsage {
  activeMembers: number
  pendingInvitations: number
  usedSeats: number
  seatLimit: number
}

export interface FirmsRepo {
  listMine(userId: string): Promise<FirmMembershipRow[]>
  listOwnedActive(userId: string): Promise<FirmMembershipRow[]>
  findActiveForUser(userId: string, firmId: string): Promise<FirmMembershipRow | undefined>
  applyInternalDeadlineOffset(firmId: string, offsetDays: number): Promise<number>
  updateProfile(firmId: string, input: FirmUpdateInput): Promise<void>
  previewSmartPriorityProfile(
    firmId: string,
    input: FirmSmartPriorityPreviewInput,
  ): Promise<FirmSmartPriorityPreviewOutput>
  softDelete(firmId: string): Promise<void>
  listBillingSubscriptions(firmId: string): Promise<FirmBillingSubscriptionRow[]>
  setActiveSession(sessionId: string, userId: string, firmId: string | null): Promise<void>
  writeAudit(event: AuditEventInput): Promise<{ id: string }>
}

export interface MembersRepo {
  listMembers(firmId: string): Promise<MemberRow[]>
  listInvitations(firmId: string, now?: Date): Promise<InvitationRow[]>
  findMembership(firmId: string, userId: string): Promise<MemberRow | undefined>
  findMember(firmId: string, memberId: string): Promise<MemberRow | undefined>
  findMemberByEmail(firmId: string, email: string): Promise<MemberRow | undefined>
  findInvitation(
    firmId: string,
    invitationId: string,
    now?: Date,
  ): Promise<InvitationRow | undefined>
  findPendingInvitationByEmail(
    firmId: string,
    email: string,
    now?: Date,
  ): Promise<InvitationRow | undefined>
  seatLimit(firmId: string): Promise<number>
  seatUsage(firmId: string, now?: Date): Promise<SeatUsage>
  updateRole(firmId: string, memberId: string, role: Exclude<FirmRole, 'owner'>): Promise<void>
  setMemberStatus(firmId: string, memberId: string, status: MemberStatus): Promise<void>
  writeAudit(event: AuditEventInput): Promise<{ id: string }>
}

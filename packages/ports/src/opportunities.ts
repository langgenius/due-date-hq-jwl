// 2026-05-24 (critique P2): port for the opportunity_dismissal
// side-channel. Opportunities themselves are computed, not stored;
// this repo only tracks user-driven hides (dismiss/snooze) that
// shadow whatever the computer produces.

export type OpportunityDismissalKind = 'dismissed' | 'snoozed'

export interface OpportunityDismissalRow {
  id: string
  firmId: string
  opportunityKey: string
  kind: OpportunityDismissalKind
  snoozeUntil: Date | null
  reason: string | null
  createdByUserId: string
  createdAt: Date
}

export interface OpportunityDismissalUpsertInput {
  opportunityKey: string
  kind: OpportunityDismissalKind
  snoozeUntil: Date | null
  reason: string | null
  createdByUserId: string
}

export interface OpportunityDismissalsRepo {
  listActive(now: Date): Promise<OpportunityDismissalRow[]>
  upsert(input: OpportunityDismissalUpsertInput): Promise<OpportunityDismissalRow>
}

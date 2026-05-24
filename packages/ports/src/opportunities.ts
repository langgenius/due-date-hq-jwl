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

// 2026-05-24 (critique /polish — un-dismiss):
//   - `delete(opportunityKey)` reverses a prior dismiss/snooze.
//     Returns true if a row was removed, false if no row existed
//     (idempotent — restore-on-not-found is not an error from the
//     repo's perspective).
//   - `listActiveDetailed` returns the same active set as
//     `listActive` but joined with the user table so the UI can
//     show "Dismissed by Sarah" without a second round-trip.
export interface OpportunityDismissalRowDetailed extends OpportunityDismissalRow {
  createdByName: string | null
}

export interface OpportunityDismissalsRepo {
  listActive(now: Date): Promise<OpportunityDismissalRow[]>
  listActiveDetailed(now: Date): Promise<OpportunityDismissalRowDetailed[]>
  upsert(input: OpportunityDismissalUpsertInput): Promise<OpportunityDismissalRow>
  delete(opportunityKey: string): Promise<boolean>
}

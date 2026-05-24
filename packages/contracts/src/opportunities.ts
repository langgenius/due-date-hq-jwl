import { oc } from '@orpc/contract'
import * as z from 'zod'
import { EntityTypeSchema, StateCodeSchema } from './shared/enums'
import { EntityIdSchema } from './shared/ids'

export const OpportunityKindSchema = z.enum([
  'advisory_conversation',
  'scope_review',
  'retention_check_in',
])
export type OpportunityKind = z.infer<typeof OpportunityKindSchema>

export const OpportunityTimingSchema = z.enum(['now', 'next_30_days', 'next_quarter'])
export type OpportunityTiming = z.infer<typeof OpportunityTimingSchema>

export const OpportunitySeveritySchema = z.enum(['high', 'medium', 'low'])
export type OpportunitySeverity = z.infer<typeof OpportunitySeveritySchema>

export const OpportunityListInputSchema = z
  .object({
    clientId: EntityIdSchema.optional(),
    kinds: z.array(OpportunityKindSchema).max(OpportunityKindSchema.options.length).optional(),
    limit: z.number().int().min(1).max(50).default(12).optional(),
  })
  .optional()
export type OpportunityListInput = z.infer<typeof OpportunityListInputSchema>

export const OpportunityClientSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  entityType: EntityTypeSchema,
  state: StateCodeSchema.nullable(),
  assigneeName: z.string().nullable(),
})
export type OpportunityClient = z.infer<typeof OpportunityClientSchema>

export const OpportunityEvidenceSchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(160),
})
export type OpportunityEvidence = z.infer<typeof OpportunityEvidenceSchema>

export const OpportunityPublicSchema = z.object({
  id: z.string().min(1).max(160),
  kind: OpportunityKindSchema,
  client: OpportunityClientSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  timing: OpportunityTimingSchema,
  severity: OpportunitySeveritySchema,
  evidence: z.array(OpportunityEvidenceSchema).min(1).max(5),
  primaryAction: z.object({
    label: z.string().min(1).max(80),
    href: z.string().min(1).max(240),
  }),
})
export type OpportunityPublic = z.infer<typeof OpportunityPublicSchema>

export const OpportunitySummarySchema = z.object({
  total: z.number().int().min(0),
  advisoryConversationCount: z.number().int().min(0),
  scopeReviewCount: z.number().int().min(0),
  retentionCheckInCount: z.number().int().min(0),
})
export type OpportunitySummary = z.infer<typeof OpportunitySummarySchema>

export const OpportunityListOutputSchema = z.object({
  opportunities: z.array(OpportunityPublicSchema),
  summary: OpportunitySummarySchema,
})
export type OpportunityListOutput = z.infer<typeof OpportunityListOutputSchema>

// 2026-05-24 (critique P2 — dismiss/snooze): user-driven hide for
// computed opportunities. The opportunityKey is the row's deterministic
// `id` from buildClientOpportunities (e.g. `retention_check_in:client:
// <id>`); a single dismissal row per (firmId, opportunityKey) shadows
// the computed result on subsequent list calls. Snooze carries a TTL —
// the row reappears when `now >= snoozeUntil`; Dismiss is forever.
export const OpportunityDismissInputSchema = z.object({
  opportunityKey: z.string().min(1).max(160),
  reason: z.string().max(500).optional(),
})
export type OpportunityDismissInput = z.infer<typeof OpportunityDismissInputSchema>

export const OpportunitySnoozeInputSchema = z.object({
  opportunityKey: z.string().min(1).max(160),
  // ISO datetime; server clamps to a sensible window.
  until: z.iso.datetime(),
  reason: z.string().max(500).optional(),
})
export type OpportunitySnoozeInput = z.infer<typeof OpportunitySnoozeInputSchema>

export const OpportunityMutationOutputSchema = z.object({
  opportunityKey: z.string().min(1).max(160),
  kind: z.enum(['dismissed', 'snoozed']),
  snoozeUntil: z.iso.datetime().nullable(),
})
export type OpportunityMutationOutput = z.infer<typeof OpportunityMutationOutputSchema>

// 2026-05-24 (critique /polish — un-dismiss): Restore reverses a
// prior dismiss/snooze by deleting the dismissal row. The
// opportunity returns on the next list call IF the computer still
// produces it; if the underlying client state has shifted, the
// row may not reappear.
export const OpportunityRestoreInputSchema = z.object({
  opportunityKey: z.string().min(1).max(160),
})
export type OpportunityRestoreInput = z.infer<typeof OpportunityRestoreInputSchema>

export const OpportunityRestoreOutputSchema = z.object({
  opportunityKey: z.string().min(1).max(160),
  restored: z.boolean(),
})
export type OpportunityRestoreOutput = z.infer<typeof OpportunityRestoreOutputSchema>

// `listDismissed` returns the user-driven hides currently shadowing
// computed opportunities. Each row carries the deterministic
// `opportunityKey` (e.g. `retention_check_in:client:<id>`), the
// `kind` ('dismissed' | 'snoozed'), optional snoozeUntil + reason,
// and the actor's display name when available.
export const OpportunityDismissalRowSchema = z.object({
  opportunityKey: z.string().min(1).max(160),
  kind: z.enum(['dismissed', 'snoozed']),
  snoozeUntil: z.iso.datetime().nullable(),
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  createdByUserId: z.string().min(1),
  createdByName: z.string().nullable(),
  /**
   * Friendly client name resolved from the `opportunityKey`. Opportunity
   * keys are formatted `<kind>:client:<clientId>`; the server splits the
   * key, batch-fetches the client rows, and surfaces the name so the UI
   * can render "Retention check-in · Lakeview Manufacturing" instead of
   * just "Retention check-in". `null` when the client was deleted or
   * the key isn't a client-scoped opportunity.
   */
  clientName: z.string().nullable(),
})
export type OpportunityDismissalRow = z.infer<typeof OpportunityDismissalRowSchema>

export const OpportunityListDismissedOutputSchema = z.object({
  dismissals: z.array(OpportunityDismissalRowSchema),
})
export type OpportunityListDismissedOutput = z.infer<typeof OpportunityListDismissedOutputSchema>

export const opportunitiesContract = oc.router({
  list: oc.input(OpportunityListInputSchema).output(OpportunityListOutputSchema),
  dismiss: oc.input(OpportunityDismissInputSchema).output(OpportunityMutationOutputSchema),
  snooze: oc.input(OpportunitySnoozeInputSchema).output(OpportunityMutationOutputSchema),
  restore: oc.input(OpportunityRestoreInputSchema).output(OpportunityRestoreOutputSchema),
  listDismissed: oc.output(OpportunityListDismissedOutputSchema),
})
export type OpportunitiesContract = typeof opportunitiesContract

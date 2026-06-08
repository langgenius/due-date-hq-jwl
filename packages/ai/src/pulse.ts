import * as z from 'zod'

export const PulseExtractInputSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  officialSourceUrl: z.string().url(),
  rawText: z.string().min(1),
})
export type PulseExtractInput = z.infer<typeof PulseExtractInputSchema>

// 2026-06-08 (Aogxu parity Phase 3): typed shape for the AI-extracted
// deadline-shift facts the model writes into the freeform `structuredChange`
// JSON for `deadline_shift` alerts. `structuredChange` itself stays
// `z.unknown()` below (freeform, no DB migration — the protective_claim_window
// path already relies on that), so this schema is NOT folded into a union; it's
// the documented/validatable shape the prompt targets and the UI parses. Every
// field is optional/nullable so the model can OMIT anything the source doesn't
// state — the F-041 verification gate forbids guessing relief details.
export const PulseDeadlineShiftFactsSchema = z.object({
  reliefType: z.string().min(1).nullable().optional(),
  deadlineTypes: z.array(z.enum(['filing', 'payment'])).optional(),
  optInRequired: z.boolean().nullable().optional(),
  penaltyRelief: z.boolean().nullable().optional(),
})
export type PulseDeadlineShiftFacts = z.infer<typeof PulseDeadlineShiftFactsSchema>

export const PulseExtractOutputSchema = z.object({
  classification: z.enum(['regulatory_change', 'no_regulatory_change']),
  changeKind: z
    .enum([
      'deadline_shift',
      'filing_requirement',
      'applicability_scope',
      'form_instruction',
      'source_status',
      'new_obligation',
      'protective_claim_window',
      'other',
    ])
    .nullable(),
  actionMode: z.enum(['due_date_overlay', 'review_only']).nullable(),
  summary: z.string().min(1),
  sourceExcerpt: z.string().min(1),
  jurisdiction: z.union([z.literal('FED'), z.string().length(2)]),
  counties: z.array(z.string()),
  forms: z.array(z.string().min(1)),
  entityTypes: z.array(
    z.enum(['llc', 's_corp', 'partnership', 'c_corp', 'sole_prop', 'trust', 'individual', 'other']),
  ),
  originalDueDate: z.iso.date().nullable(),
  newDueDate: z.iso.date().nullable(),
  effectiveFrom: z.iso.date().nullable(),
  effectiveUntil: z.iso.date().nullable(),
  affectedRuleIds: z.array(z.string()).default([]),
  structuredChange: z.unknown().nullable().default(null),
  confidence: z.number().min(0).max(1),
})
export type PulseExtractOutput = z.infer<typeof PulseExtractOutputSchema>

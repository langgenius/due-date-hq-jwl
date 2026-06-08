import * as z from 'zod'

export const PulseExtractInputSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  officialSourceUrl: z.string().url(),
  rawText: z.string().min(1),
})
export type PulseExtractInput = z.infer<typeof PulseExtractInputSchema>

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

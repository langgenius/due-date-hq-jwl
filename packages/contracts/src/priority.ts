import * as z from 'zod'

export const SmartPriorityFactorKeySchema = z.enum([
  'urgency',
  'importance',
  'history',
  'readiness',
])
export type SmartPriorityFactorKey = z.infer<typeof SmartPriorityFactorKeySchema>

export const SmartPriorityProfileVersionSchema = z.literal('smart-priority-profile-v2')

export const SmartPriorityWeightsSchema = z
  .object({
    urgency: z.number().int().min(0).max(100),
    importance: z.number().int().min(0).max(100),
    history: z.number().int().min(0).max(100),
    readiness: z.number().int().min(0).max(100),
  })
  .refine(
    (weights) => weights.urgency + weights.importance + weights.history + weights.readiness === 100,
    { message: 'Smart Priority weights must total 100.' },
  )
export type SmartPriorityWeights = z.infer<typeof SmartPriorityWeightsSchema>

export const SmartPriorityProfileSchema = z.object({
  version: SmartPriorityProfileVersionSchema,
  weights: SmartPriorityWeightsSchema,
  urgencyWindowDays: z.number().int().min(1).max(365),
  historyCapCount: z.number().int().min(1).max(20),
})
export type SmartPriorityProfile = z.infer<typeof SmartPriorityProfileSchema>

export const SMART_PRIORITY_DEFAULT_PROFILE = {
  version: 'smart-priority-profile-v2',
  weights: {
    urgency: 70,
    importance: 15,
    history: 10,
    readiness: 5,
  },
  urgencyWindowDays: 30,
  historyCapCount: 5,
} as const satisfies SmartPriorityProfile

export const SmartPriorityFactorSchema = z.object({
  key: SmartPriorityFactorKeySchema,
  label: z.string().min(1),
  weight: z.number().min(0).max(1),
  rawValue: z.string().min(1),
  normalized: z.number().min(0).max(1),
  contribution: z.number().min(0),
  sourceLabel: z.string().min(1),
})
export type SmartPriorityFactor = z.infer<typeof SmartPriorityFactorSchema>

export const SmartPriorityBreakdownSchema = z.object({
  version: z.literal('smart-priority-v1'),
  score: z.number().min(0),
  rank: z.number().int().positive().nullable(),
  factors: z.array(SmartPriorityFactorSchema),
})
export type SmartPriorityBreakdown = z.infer<typeof SmartPriorityBreakdownSchema>

import { oc } from '@orpc/contract'
import * as z from 'zod'
import { SmartPriorityProfileSchema } from './priority'
import { TenantIdSchema } from './shared/ids'

export const FirmPlanSchema = z.enum(['solo', 'pro', 'team', 'firm'])
export const FirmStatusSchema = z.enum(['active', 'suspended', 'deleted'])
export const FirmRoleSchema = z.enum(['owner', 'partner', 'manager', 'preparer', 'coordinator'])
export const DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS = 14
export const MIN_INTERNAL_DEADLINE_OFFSET_DAYS = 0
export const MAX_INTERNAL_DEADLINE_OFFSET_DAYS = 365
export const InternalDeadlineOffsetDaysSchema = z
  .number()
  .int()
  .min(MIN_INTERNAL_DEADLINE_OFFSET_DAYS)
  .max(MAX_INTERNAL_DEADLINE_OFFSET_DAYS)
export const US_FIRM_TIMEZONES = [
  'America/New_York',
  'America/Detroit',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/Indiana/Indianapolis',
  'America/Indiana/Marengo',
  'America/Indiana/Vincennes',
  'America/Indiana/Petersburg',
  'America/Indiana/Winamac',
  'America/Indiana/Vevay',
  'America/Chicago',
  'America/Menominee',
  'America/Indiana/Tell_City',
  'America/Indiana/Knox',
  'America/North_Dakota/Center',
  'America/North_Dakota/New_Salem',
  'America/North_Dakota/Beulah',
  'America/Denver',
  'America/Boise',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Juneau',
  'America/Sitka',
  'America/Metlakatla',
  'America/Yakutat',
  'America/Nome',
  'America/Adak',
  'Pacific/Honolulu',
  'America/Puerto_Rico',
  'America/St_Thomas',
  'Pacific/Guam',
  'Pacific/Saipan',
  'Pacific/Pago_Pago',
  'Pacific/Midway',
  'Pacific/Wake',
] as const

export const US_FIRM_TIMEZONE_OPTIONS = [
  { value: 'America/New_York', group: 'Eastern', region: 'New York / Eastern states' },
  { value: 'America/Detroit', group: 'Eastern', region: 'Michigan' },
  { value: 'America/Kentucky/Louisville', group: 'Eastern', region: 'Kentucky - Louisville' },
  { value: 'America/Kentucky/Monticello', group: 'Eastern', region: 'Kentucky - Monticello' },
  { value: 'America/Indiana/Indianapolis', group: 'Eastern', region: 'Indiana - Indianapolis' },
  { value: 'America/Indiana/Marengo', group: 'Eastern', region: 'Indiana - Marengo' },
  { value: 'America/Indiana/Vincennes', group: 'Eastern', region: 'Indiana - Vincennes' },
  { value: 'America/Indiana/Petersburg', group: 'Eastern', region: 'Indiana - Petersburg' },
  { value: 'America/Indiana/Winamac', group: 'Eastern', region: 'Indiana - Winamac' },
  { value: 'America/Indiana/Vevay', group: 'Eastern', region: 'Indiana - Vevay' },
  { value: 'America/Chicago', group: 'Central', region: 'Chicago / Central states' },
  { value: 'America/Menominee', group: 'Central', region: 'Michigan - Menominee' },
  { value: 'America/Indiana/Tell_City', group: 'Central', region: 'Indiana - Tell City' },
  { value: 'America/Indiana/Knox', group: 'Central', region: 'Indiana - Knox' },
  { value: 'America/North_Dakota/Center', group: 'Central', region: 'North Dakota - Center' },
  {
    value: 'America/North_Dakota/New_Salem',
    group: 'Central',
    region: 'North Dakota - New Salem',
  },
  { value: 'America/North_Dakota/Beulah', group: 'Central', region: 'North Dakota - Beulah' },
  { value: 'America/Denver', group: 'Mountain', region: 'Denver / Mountain states' },
  { value: 'America/Boise', group: 'Mountain', region: 'Idaho - Boise' },
  { value: 'America/Phoenix', group: 'Mountain', region: 'Arizona - Phoenix' },
  { value: 'America/Los_Angeles', group: 'Pacific', region: 'Los Angeles / Pacific states' },
  { value: 'America/Anchorage', group: 'Alaska', region: 'Alaska - Anchorage' },
  { value: 'America/Juneau', group: 'Alaska', region: 'Alaska - Juneau' },
  { value: 'America/Sitka', group: 'Alaska', region: 'Alaska - Sitka' },
  { value: 'America/Metlakatla', group: 'Alaska', region: 'Alaska - Metlakatla' },
  { value: 'America/Yakutat', group: 'Alaska', region: 'Alaska - Yakutat' },
  { value: 'America/Nome', group: 'Alaska', region: 'Alaska - Nome' },
  { value: 'America/Adak', group: 'Hawaii-Aleutian', region: 'Alaska - Aleutian Islands' },
  { value: 'Pacific/Honolulu', group: 'Hawaii-Aleutian', region: 'Hawaii / Johnston Atoll' },
  { value: 'America/Puerto_Rico', group: 'Atlantic', region: 'Puerto Rico' },
  { value: 'America/St_Thomas', group: 'Atlantic', region: 'U.S. Virgin Islands' },
  { value: 'Pacific/Guam', group: 'Chamorro', region: 'Guam' },
  { value: 'Pacific/Saipan', group: 'Chamorro', region: 'Northern Mariana Islands' },
  { value: 'Pacific/Pago_Pago', group: 'Samoa', region: 'American Samoa' },
  { value: 'Pacific/Midway', group: 'Samoa', region: 'Midway Atoll' },
  { value: 'Pacific/Wake', group: 'Wake', region: 'Wake Island' },
] as const satisfies readonly {
  value: (typeof US_FIRM_TIMEZONES)[number]
  group: string
  region: string
}[]

export const USFirmTimezoneSchema = z.enum(US_FIRM_TIMEZONES)

export const FirmPublicSchema = z.object({
  id: TenantIdSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: FirmPlanSchema,
  seatLimit: z.number().int().min(1),
  timezone: z.string().min(1),
  internalDeadlineOffsetDays: InternalDeadlineOffsetDaysSchema,
  status: FirmStatusSchema,
  role: FirmRoleSchema,
  ownerUserId: z.string().min(1),
  coordinatorCanSeeDollars: z.boolean(),
  smartPriorityProfile: SmartPriorityProfileSchema.nullable(),
  openObligationCount: z.number().int().min(0),
  isCurrent: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
})

export const FirmCreateInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: USFirmTimezoneSchema.default('America/New_York'),
  internalDeadlineOffsetDays: InternalDeadlineOffsetDaysSchema.default(
    DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  ),
})

export const FirmUpdateInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: USFirmTimezoneSchema,
  internalDeadlineOffsetDays: InternalDeadlineOffsetDaysSchema,
  coordinatorCanSeeDollars: z.boolean().optional(),
  smartPriorityProfile: SmartPriorityProfileSchema.optional(),
})

export const FirmSmartPriorityPreviewInputSchema = z.object({
  smartPriorityProfile: SmartPriorityProfileSchema,
  asOfDate: z.iso.date().optional(),
  limit: z.number().int().min(1).max(20).default(8).optional(),
})

export const FirmSmartPriorityPreviewRowSchema = z.object({
  obligationId: z.string().min(1),
  clientName: z.string().min(1),
  taxType: z.string().min(1),
  currentDueDate: z.iso.date(),
  currentScore: z.number().min(0),
  previewScore: z.number().min(0),
  scoreDelta: z.number(),
  currentRank: z.number().int().positive().nullable(),
  previewRank: z.number().int().positive(),
  rankDelta: z.number().int().nullable(),
})

export const FirmSmartPriorityPreviewOutputSchema = z.object({
  asOfDate: z.iso.date(),
  rows: z.array(FirmSmartPriorityPreviewRowSchema),
})

export const FirmPenaltyExposureBackfillOutputSchema = z.object({
  recalculatedObligationCount: z.number().int().min(0),
})

export const FirmBillingSubscriptionPublicSchema = z.object({
  id: z.string().min(1),
  plan: z.string().min(1),
  referenceId: TenantIdSchema,
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  status: z.string().min(1),
  periodStart: z.iso.datetime().nullable(),
  periodEnd: z.iso.datetime().nullable(),
  trialStart: z.iso.datetime().nullable(),
  trialEnd: z.iso.datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  cancelAt: z.iso.datetime().nullable(),
  canceledAt: z.iso.datetime().nullable(),
  endedAt: z.iso.datetime().nullable(),
  seats: z.number().int().nullable(),
  billingInterval: z.string().nullable(),
  stripeScheduleId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const FirmSelfServeBillingPlanSchema = z.enum(['solo', 'pro', 'team'])

export const FirmBillingCheckoutConfigSchema = z.object({
  stripeConfigured: z.boolean(),
  plans: z.object({
    solo: z.object({ monthly: z.boolean(), yearly: z.boolean() }),
    pro: z.object({ monthly: z.boolean(), yearly: z.boolean() }),
    team: z.object({ monthly: z.boolean(), yearly: z.boolean() }),
  }),
})

export const firmsContract = oc.router({
  listMine: oc.input(z.undefined()).output(z.array(FirmPublicSchema)),
  getCurrent: oc.input(z.undefined()).output(FirmPublicSchema.nullable()),
  create: oc.input(FirmCreateInputSchema).output(FirmPublicSchema),
  switchActive: oc.input(z.object({ firmId: TenantIdSchema })).output(FirmPublicSchema),
  updateCurrent: oc.input(FirmUpdateInputSchema).output(FirmPublicSchema),
  previewSmartPriorityProfile: oc
    .input(FirmSmartPriorityPreviewInputSchema)
    .output(FirmSmartPriorityPreviewOutputSchema),
  backfillPenaltyExposure: oc.input(z.undefined()).output(FirmPenaltyExposureBackfillOutputSchema),
  listSubscriptions: oc.input(z.undefined()).output(z.array(FirmBillingSubscriptionPublicSchema)),
  billingCheckoutConfig: oc.input(z.undefined()).output(FirmBillingCheckoutConfigSchema),
  softDeleteCurrent: oc
    .input(z.undefined())
    .output(z.object({ nextFirmId: TenantIdSchema.nullable() })),
})

export type FirmCreateInput = z.infer<typeof FirmCreateInputSchema>
export type FirmBillingCheckoutConfig = z.infer<typeof FirmBillingCheckoutConfigSchema>
export type FirmBillingSubscriptionPublic = z.infer<typeof FirmBillingSubscriptionPublicSchema>
export type FirmPlan = z.infer<typeof FirmPlanSchema>
export type FirmPublic = z.infer<typeof FirmPublicSchema>
export type FirmRole = z.infer<typeof FirmRoleSchema>
export type FirmSelfServeBillingPlan = z.infer<typeof FirmSelfServeBillingPlanSchema>
export type FirmSmartPriorityPreviewInput = z.infer<typeof FirmSmartPriorityPreviewInputSchema>
export type FirmSmartPriorityPreviewOutput = z.infer<typeof FirmSmartPriorityPreviewOutputSchema>
export type FirmSmartPriorityPreviewRow = z.infer<typeof FirmSmartPriorityPreviewRowSchema>
export type FirmPenaltyExposureBackfillOutput = z.infer<
  typeof FirmPenaltyExposureBackfillOutputSchema
>
export type FirmStatus = z.infer<typeof FirmStatusSchema>
export type FirmUpdateInput = z.infer<typeof FirmUpdateInputSchema>
export type FirmsContract = typeof firmsContract
export type USFirmTimezone = z.infer<typeof USFirmTimezoneSchema>

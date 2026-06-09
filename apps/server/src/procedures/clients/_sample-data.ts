import type { ClientCreateInput } from '@duedatehq/ports/clients'
import type { ClientFilingProfileInput } from '@duedatehq/ports/client-filing-profiles'
import type { ObligationCreateInput } from '@duedatehq/ports/obligations'

/**
 * Curated onboarding sample data ("Load sample data"). All clients are flagged
 * `isSample: true` (excluded from clientLimit, one-click removable). Entity
 * types / states / tax types mirror the demo-seed specs for realism. Due dates
 * are computed RELATIVE TO `now` at seed time so the sample always looks
 * current (a mix of overdue / this-month / future, plus pending + in_progress).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

interface SampleObligationSpec {
  taxType: string
  jurisdiction: string
  formName: string
  /** Offset from "now" at seed time. Negative = overdue. */
  dueInDays: number
  status: 'pending' | 'in_progress'
}

interface SampleClientSpec {
  name: string
  entityType: NonNullable<ClientCreateInput['entityType']>
  legalEntity: NonNullable<ClientCreateInput['legalEntity']>
  state: string
  county: string | null
  taxTypes: string[]
  equityOwnerCount: number | null
  obligations: SampleObligationSpec[]
}

export const SAMPLE_CLIENTS: SampleClientSpec[] = [
  {
    name: 'Riverside Bakery LLC',
    entityType: 'llc',
    legalEntity: 'multi_member_llc',
    state: 'CA',
    county: 'Los Angeles',
    taxTypes: ['federal_1065', 'ca_llc_568'],
    equityOwnerCount: 3,
    obligations: [
      {
        taxType: 'federal_1065',
        jurisdiction: 'FED',
        formName: 'Form 1065',
        dueInDays: 18,
        status: 'pending',
      },
      {
        taxType: 'ca_llc_568',
        jurisdiction: 'CA',
        formName: 'CA Form 568',
        dueInDays: 40,
        status: 'pending',
      },
    ],
  },
  {
    name: 'Hartwell Consulting Inc',
    entityType: 's_corp',
    legalEntity: 'corporation',
    state: 'NY',
    county: 'New York',
    taxTypes: ['federal_1120s', 'ny_ct3s'],
    equityOwnerCount: 2,
    obligations: [
      {
        taxType: 'federal_1120s',
        jurisdiction: 'FED',
        formName: 'Form 1120-S',
        dueInDays: -6,
        status: 'in_progress',
      },
      {
        taxType: 'ny_ct3s',
        jurisdiction: 'NY',
        formName: 'NY CT-3-S',
        dueInDays: 12,
        status: 'pending',
      },
    ],
  },
  {
    name: 'Jordan Avery',
    entityType: 'individual',
    legalEntity: 'individual',
    state: 'CA',
    county: null,
    taxTypes: ['federal_1040'],
    equityOwnerCount: null,
    obligations: [
      {
        taxType: 'federal_1040',
        jurisdiction: 'FED',
        formName: 'Form 1040',
        dueInDays: 28,
        status: 'pending',
      },
    ],
  },
  {
    name: 'Beacon Property Trust',
    entityType: 'trust',
    legalEntity: 'trust',
    state: 'TX',
    county: null,
    taxTypes: ['federal_1041'],
    equityOwnerCount: null,
    obligations: [
      {
        taxType: 'federal_1041',
        jurisdiction: 'FED',
        formName: 'Form 1041',
        dueInDays: 55,
        status: 'pending',
      },
    ],
  },
]

export function toSampleClientInput(spec: SampleClientSpec): ClientCreateInput {
  return {
    name: spec.name,
    entityType: spec.entityType,
    legalEntity: spec.legalEntity,
    state: spec.state,
    county: spec.county,
    taxClassification: 'unknown',
    equityOwnerCount: spec.equityOwnerCount,
    isSample: true,
  }
}

export function buildSampleFilingProfile(
  spec: SampleClientSpec,
  clientId: string,
): ClientFilingProfileInput {
  return {
    clientId,
    state: spec.state,
    taxTypes: spec.taxTypes,
    isPrimary: true,
    source: 'demo_seed',
  }
}

export function buildSampleObligations(
  spec: SampleClientSpec,
  clientId: string,
  now: Date,
): ObligationCreateInput[] {
  const taxYear = now.getUTCFullYear()
  return spec.obligations.map((o) => ({
    clientId,
    taxType: o.taxType,
    jurisdiction: o.jurisdiction,
    formName: o.formName,
    obligationType: 'filing' as const,
    baseDueDate: new Date(now.getTime() + o.dueInDays * MS_PER_DAY),
    status: o.status,
    taxYear,
    recurrence: 'annual' as const,
    riskLevel: 'med' as const,
    generationSource: 'manual' as const,
  }))
}

/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- minimal test
   fakes: only the fields the recompute reads are populated; the rest is cast
   away so the test stays readable. */
import { describe, expect, it } from 'vitest'

import { OBLIGATION_RULES } from '@duedatehq/core/rules'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ClientFilingProfileRow } from '@duedatehq/ports/client-filing-profiles'
import type { ScopedRepo } from '@duedatehq/ports/scoped'

import { runClassificationRecompute } from './_classification-recompute'

// Regression guard for the reclassify impact dialog: changing a client's
// entity type can only ever *remove* obligations, never conjure the new
// entity's federal return — generation is gated by the filing profile's tax
// types, which the recompute holds constant. So the new return surfaces as an
// advisory `suggestedFederalForms` hint instead. (User report: Harbor Lights
// Nonprofit → individual showed the 990 removal but no 1040 to confirm.)

type OblRow = Awaited<ReturnType<ScopedRepo['obligations']['listByClient']>>[number]

// Harbor Lights Nonprofit, as seeded: entity_type 'other', no tax
// classification, NY, files federal_990 + ny_it204. Only the fields the
// generator + suggestion path read are meaningful; the rest are filler.
const HARBOR_LIGHTS = {
  id: 'client_harbor',
  entityType: 'other',
  taxClassification: null,
  legalEntity: null,
  state: 'NY',
  taxYearType: 'calendar',
  fiscalYearEndMonth: null,
  fiscalYearEndDay: null,
  estimatedTaxLiabilityCents: null,
  equityOwnerCount: null,
  migrationBatchId: null,
} as unknown as ClientRow

const NY_PROFILE = {
  id: 'profile_harbor',
  state: 'NY',
  taxTypes: ['federal_990', 'ny_it204'],
} as unknown as ClientFilingProfileRow

function obligation(taxType: string): OblRow {
  // ruleId null keeps it out of the orphan/baseline diff; the suggestion path
  // reads only `taxType`, which is all we exercise here.
  return {
    id: `obl_${taxType}`,
    clientId: 'client_harbor',
    taxType,
    ruleId: null,
    taxYear: null,
    rulePeriod: null,
  } as unknown as OblRow
}

function previewSwitchToIndividual(existing: OblRow[]) {
  return runClassificationRecompute({
    scoped: {
      filingProfiles: { listByClient: async () => [NY_PROFILE] },
      obligations: { listByClient: async () => existing },
    } as unknown as ScopedRepo,
    userId: 'user_1',
    client: HARBOR_LIGHTS,
    candidate: { entityType: 'individual' },
    rules: OBLIGATION_RULES,
    internalDeadlineOffsetDays: 0,
    now: new Date('2026-04-26T00:00:00.000Z'),
    mode: 'preview',
  })
}

describe('runClassificationRecompute — suggested federal forms', () => {
  it("suggests the new entity's federal return when the client lacks it", async () => {
    const outcome = await previewSwitchToIndividual([obligation('federal_990')])
    expect(outcome.suggestedFederalForms).toContain('federal_1040')
  })

  it('does not suggest a federal return the client already has', async () => {
    const outcome = await previewSwitchToIndividual([
      obligation('federal_1040'),
      obligation('ny_it204'),
    ])
    expect(outcome.suggestedFederalForms).not.toContain('federal_1040')
  })
})

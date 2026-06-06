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
// entity's filings — generation is gated by the filing profile's tax types,
// which the recompute holds constant. So the preview exposes `expectedTaxTypes`
// (the full federal + state set the new classification typically files, from
// the default-matrix) as an advisory hint the dialog shows for every client and
// every entity type. (User report: the hint must be universal, not 990→1040 /
// individual-only.)

type OblRow = Awaited<ReturnType<ScopedRepo['obligations']['listByClient']>>[number]

// Harbor Lights Nonprofit, as seeded: entity_type 'other', no tax
// classification, NY. Only the fields inferTaxTypes + the generator read are
// meaningful; the rest are filler.
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

function previewSwitchTo(entityType: ClientRow['entityType'], existing: OblRow[] = []) {
  return runClassificationRecompute({
    scoped: {
      filingProfiles: { listByClient: async () => [NY_PROFILE] },
      obligations: { listByClient: async () => existing },
    } as unknown as ScopedRepo,
    userId: 'user_1',
    client: HARBOR_LIGHTS,
    candidate: { entityType },
    rules: OBLIGATION_RULES,
    internalDeadlineOffsetDays: 0,
    now: new Date('2026-04-26T00:00:00.000Z'),
    mode: 'preview',
  })
}

describe('runClassificationRecompute — expected tax types for the new entity', () => {
  it('lists the new entity’s federal + state filings (individual → 1040 + NY IT-201)', async () => {
    const outcome = await previewSwitchTo('individual')
    expect(outcome.expectedTaxTypes).toContain('federal_1040')
    expect(outcome.expectedTaxTypes).toContain('ny_it201')
  })

  it('works for every entity type, not just individual (s_corp → 1120-S)', async () => {
    const outcome = await previewSwitchTo('s_corp')
    expect(outcome.expectedTaxTypes).toContain('federal_1120s')
  })
})

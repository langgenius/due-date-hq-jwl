/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- minimal test
   fakes: only the fields the recompute reads are populated; the rest is cast
   away so the test stays readable. */
import { describe, expect, it } from 'vitest'

import type { ClientRow } from '@duedatehq/ports/clients'
import type { ClientFilingProfileRow } from '@duedatehq/ports/client-filing-profiles'
import type { ScopedRepo } from '@duedatehq/ports/scoped'

import { runClassificationRecompute } from './_classification-recompute'

// Regression guard for the reclassify impact dialog: changing a client's
// entity type can only ever *remove* obligations, never conjure the new
// entity's filings. So the preview exposes `expectedTaxTypes` (the full federal
// + state set the new classification typically files, from the default-matrix)
// as an advisory hint the dialog shows for every client and every entity type.
// (User report: the hint must be universal, not 990→1040 / individual-only.)

type OblRow = Awaited<ReturnType<ScopedRepo['obligations']['listByClient']>>[number]

// Harbor Lights Nonprofit, as seeded: entity_type 'other', no tax
// classification, NY. Only the fields inferTaxTypes reads are meaningful; the
// rest are filler.
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
const PROJECTED_APPLY_NOW = new Date('2025-04-26T00:00:00.000Z')
const CURRENT_YEAR_APPLY_NOW = new Date('2026-04-26T00:00:00.000Z')

function obligation(taxType: string, status = 'pending', overrides: Partial<OblRow> = {}): OblRow {
  return {
    id: `obl_${taxType}`,
    clientId: 'client_harbor',
    taxType,
    taxYear: 2025,
    status,
    ruleId: null,
    confirmed: true,
    formName: null,
    jurisdiction: null,
    rulePeriod: null,
    baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
    prepStage: 'not_started',
    reviewStage: 'not_required',
    efileState: 'not_applicable',
    extensionState: 'not_applicable',
    paymentState: 'not_applicable',
    extensionDecision: 'not_considered',
    ...overrides,
  } as unknown as OblRow
}

function previewSwitchTo(entityType: ClientRow['entityType'], existing: OblRow[] = []) {
  return runClassificationRecompute({
    scoped: {
      filingProfiles: { listByClient: async () => [NY_PROFILE] },
      obligations: { listByClient: async () => existing },
    } as unknown as ScopedRepo,
    userId: 'user_1',
    client: HARBOR_LIGHTS,
    candidate: { entityType },
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

  it('counts current-year and projected existing deadlines regardless of status', async () => {
    const outcome = await previewSwitchTo('individual', [
      obligation('federal_990', 'pending'),
      obligation('ny_it204', 'completed'),
      obligation('federal_1120s', 'pending', { taxYear: 2026, confirmed: false }),
      obligation('federal_1099_nec', 'completed'),
      obligation('prior_year_1065', 'pending', { taxYear: 2024 }),
    ])
    expect(outcome.existingDeadlineCount).toBe(4)
  })

  it('supersedes projected deadlines without explicit confirmation and adds none', async () => {
    const projected = obligation('federal_990', 'pending', {
      id: 'projected_federal_990',
      taxYear: 2025,
      confirmed: false,
      efileState: 'submitted',
    })
    const manual = obligation('manual_sales_tax', 'pending', {
      id: 'manual_projected',
      taxYear: 2026,
    })
    const supersedeCalls: string[][] = []

    const outcome = await runClassificationRecompute({
      scoped: {
        filingProfiles: { listByClient: async () => [NY_PROFILE] },
        obligations: {
          listByClient: async () => [projected, manual],
          supersedeByIds: async (ids: string[]) => {
            supersedeCalls.push(ids)
            return { supersededIds: ids }
          },
        },
        clients: { updateClassification: async () => undefined },
        audit: { write: async () => ({ id: 'audit_1' }) },
      } as unknown as ScopedRepo,
      userId: 'user_1',
      client: HARBOR_LIGHTS,
      candidate: { entityType: 'individual' },
      now: PROJECTED_APPLY_NOW,
      mode: 'apply',
      confirmedOrphanObligationIds: [],
    })

    expect(supersedeCalls).toEqual([[projected.id, manual.id]])
    expect(outcome.addedObligationIds).toEqual([])
    expect(outcome.supersededObligationIds).toEqual([projected.id, manual.id])
  })

  it('rejects current-year deadlines without explicit confirmation', async () => {
    const current = obligation('federal_990', 'pending', { id: 'current_990', taxYear: 2025 })
    const supersedeCalls: string[][] = []

    await expect(
      runClassificationRecompute({
        scoped: {
          filingProfiles: { listByClient: async () => [NY_PROFILE] },
          obligations: {
            listByClient: async () => [current],
            supersedeByIds: async (ids: string[]) => {
              supersedeCalls.push(ids)
              return { supersededIds: ids }
            },
          },
          clients: { updateClassification: async () => undefined },
          audit: { write: async () => ({ id: 'audit_1' }) },
        } as unknown as ScopedRepo,
        userId: 'user_1',
        client: HARBOR_LIGHTS,
        candidate: { entityType: 'individual' },
        now: CURRENT_YEAR_APPLY_NOW,
        mode: 'apply',
        confirmedOrphanObligationIds: [],
      }),
    ).rejects.toThrow('Current-tax-year deadlines require confirmation')

    expect(supersedeCalls).toEqual([])
  })

  it('supersedes every existing deadline after current-year confirmation', async () => {
    const current = obligation('federal_990', 'pending', { id: 'current_990', taxYear: 2025 })
    const projected = obligation('ny_it204', 'pending', { id: 'projected_it204', taxYear: 2026 })
    const supersedeCalls: string[][] = []

    const outcome = await runClassificationRecompute({
      scoped: {
        filingProfiles: { listByClient: async () => [NY_PROFILE] },
        obligations: {
          listByClient: async () => [current, projected],
          supersedeByIds: async (ids: string[]) => {
            supersedeCalls.push(ids)
            return { supersededIds: ids }
          },
        },
        clients: { updateClassification: async () => undefined },
        audit: { write: async () => ({ id: 'audit_1' }) },
      } as unknown as ScopedRepo,
      userId: 'user_1',
      client: HARBOR_LIGHTS,
      candidate: { entityType: 'individual' },
      now: CURRENT_YEAR_APPLY_NOW,
      mode: 'apply',
      confirmedOrphanObligationIds: [current.id],
    })

    expect(supersedeCalls).toEqual([[current.id, projected.id]])
    expect(outcome.addedObligationIds).toEqual([])
    expect(outcome.supersededObligationIds).toEqual([current.id, projected.id])
  })
})

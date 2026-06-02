import { describe, expect, it } from 'vitest'

import type { MigrationBatch } from '@duedatehq/contracts'

import { hydrateStateFromBatch, statusToResumeStep } from './state'

function makeBatch(overrides: Partial<MigrationBatch> = {}): MigrationBatch {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    firmId: '550e8400-e29b-41d4-a716-4466554400f1',
    userId: '550e8400-e29b-41d4-a716-4466554400f2',
    source: 'preset_drake',
    rawInputR2Key: null,
    rawInputFileName: 'drake-export.csv',
    rawInputContentType: 'text/csv',
    rawInputSizeBytes: 123,
    mappingJson: null,
    presetUsed: 'drake',
    rowCount: 1,
    successCount: 0,
    skippedCount: 0,
    aiGlobalConfidence: null,
    status: 'reviewing',
    appliedAt: null,
    revertExpiresAt: null,
    revertedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('statusToResumeStep', () => {
  it('maps an in-progress status to the step the user left off on', () => {
    expect(statusToResumeStep('draft')).toBe(1)
    expect(statusToResumeStep('mapping')).toBe(2)
    expect(statusToResumeStep('reviewing')).toBe(3)
  })
})

describe('hydrateStateFromBatch', () => {
  it('rebuilds wizard state from a reviewing batch payload', () => {
    const batch = makeBatch({
      status: 'reviewing',
      mappingJson: {
        rawInput: {
          kind: 'csv',
          headers: ['Name', 'EIN'],
          rows: [['Acme LLC', '99-1000001']],
          rowCount: 1,
          truncated: false,
        },
        confirmedMappings: [
          { sourceHeader: 'Name', targetField: 'client.name', confidence: 0.99, userOverridden: false },
          { sourceHeader: 'EIN', targetField: 'client.ein', confidence: 0.98, userOverridden: false },
        ],
        confirmedNormalizations: [],
        matrixSelections: [{ entityType: 'llc', state: 'CA', enabled: true }],
      },
    })

    const state = hydrateStateFromBatch(batch)

    expect(state.step).toBe(3)
    expect(state.batchId).toBe(batch.id)
    expect(state.intake.preset).toBe('drake')
    expect(state.intake.presetSource).toBe('detected')
    expect(state.intake.rowCount).toBe(1)
    expect(state.intake.rawText).toContain('Acme LLC')
    expect(state.intake.rawText).toContain('99-1000001')
    expect(state.mapping.rows).toHaveLength(2)
    expect(state.mapping.status).toBe('success')
    expect(state.normalize.applyToAll['llc::CA']).toBe(true)
    // Dry-run is recomputed (with fresh conflict detection) on the next Continue.
    expect(state.dryRun.summary).toBeNull()
  })

  it('resumes a fresh draft to Step 1 with an empty intake', () => {
    const state = hydrateStateFromBatch(
      makeBatch({ status: 'draft', mappingJson: null, source: 'paste', presetUsed: null }),
    )
    expect(state.step).toBe(1)
    expect(state.intake.preset).toBeNull()
    expect(state.mapping.rows).toEqual([])
    expect(state.normalize.rows).toEqual([])
  })
})

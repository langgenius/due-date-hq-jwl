import { describe, expect, it } from 'vitest'

import {
  INITIAL_STATE,
  PRESET_TO_SOURCE,
  TAX_SOFTWARE_PRESET_IDS,
  hasDiscardableWizardWork,
  wizardReducer,
} from './state'

describe('migration wizard state', () => {
  it('does not require discard confirmation before the user starts work', () => {
    expect(hasDiscardableWizardWork(INITIAL_STATE)).toBe(false)
  })

  it('requires discard confirmation after intake input or choices', () => {
    expect(
      hasDiscardableWizardWork(
        wizardReducer(INITIAL_STATE, {
          type: 'INTAKE_TEXT',
          text: 'Client\nAcme',
        }),
      ),
    ).toBe(true)

    expect(
      hasDiscardableWizardWork(
        wizardReducer(INITIAL_STATE, {
          type: 'INTAKE_PRESET',
          preset: 'taxdome',
        }),
      ),
    ).toBe(true)

    expect(
      hasDiscardableWizardWork(
        wizardReducer(INITIAL_STATE, {
          type: 'INTAKE_MODE',
          mode: 'integration',
        }),
      ),
    ).toBe(true)

    expect(
      hasDiscardableWizardWork(
        wizardReducer(INITIAL_STATE, {
          type: 'INTAKE_PREVIOUS_SYNC',
          batchId: 'batch-1',
        }),
      ),
    ).toBe(true)
  })

  it('requires discard confirmation after the wizard advances or produces results', () => {
    expect(
      hasDiscardableWizardWork(
        wizardReducer(INITIAL_STATE, {
          type: 'GO_TO_STEP',
          step: 2,
        }),
      ),
    ).toBe(true)

    expect(
      hasDiscardableWizardWork(
        wizardReducer(INITIAL_STATE, {
          type: 'MAPPER_RESULT',
          rows: [],
          fallback: null,
        }),
      ),
    ).toBe(true)
  })

  it('clears upload metadata when the intake switches back to paste', () => {
    const uploaded = wizardReducer(INITIAL_STATE, {
      type: 'INTAKE_TEXT',
      text: 'Client\nAcme',
      fileName: 'clients.csv',
      fileKind: 'csv',
      rawFileBase64: null,
      contentType: 'text/csv',
      sizeBytes: 42,
    })

    const pasted = wizardReducer(uploaded, {
      type: 'INTAKE_TEXT',
      text: 'Client\nBright Books',
      fileName: null,
      fileKind: 'paste',
      rawFileBase64: null,
      contentType: null,
      sizeBytes: 0,
    })

    expect(pasted.intake.fileName).toBeNull()
    expect(pasted.intake.fileKind).toBe('paste')
    expect(pasted.intake.rawFileBase64).toBeNull()
    expect(pasted.intake.contentType).toBeNull()
    expect(pasted.intake.sizeBytes).toBe(0)
  })

  it('maps tax software presets to migration sources', () => {
    expect(TAX_SOFTWARE_PRESET_IDS).toEqual([
      'cch_axcess',
      'cch_prosystem_fx',
      'lacerte',
      'proseries',
      'ultratax_cs',
      'proconnect_tax',
    ])
    expect(PRESET_TO_SOURCE.cch_axcess).toBe('preset_cch_axcess')
    expect(PRESET_TO_SOURCE.proconnect_tax).toBe('preset_proconnect_tax')
  })
})

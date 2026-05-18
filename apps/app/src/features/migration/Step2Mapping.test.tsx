import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nProvider } from '@lingui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MappingRow, MigrationError } from '@duedatehq/contracts'

import { activateLocale, i18n } from '../../i18n/i18n'
import { Step2Mapping } from './Step2Mapping'
import type { MapperState } from './state'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  activateLocale('en')
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
})

const baseRow: MappingRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  batchId: '550e8400-e29b-41d4-a716-446655440001',
  sourceHeader: 'Client Name',
  targetField: 'client.name',
  confidence: 0.92,
  reasoning: 'Name-like column.',
  userOverridden: false,
  model: 'test-model',
  promptVersion: 'mapper@v1',
  createdAt: '2026-05-04T00:00:00.000Z',
}

function renderStep(mapping: MapperState, errors: MigrationError[] = []) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <I18nProvider i18n={i18n}>
        <Step2Mapping
          mapping={mapping}
          sampleByHeader={{ 'Client Name': 'Acme LLC' }}
          errors={errors}
          onUserEdit={vi.fn()}
          onRerun={vi.fn()}
        />
      </I18nProvider>,
    )
  })
}

function mappingState(patch: Partial<MapperState> = {}): MapperState {
  return {
    status: 'success',
    rows: [baseRow],
    fallback: null,
    errorBanner: null,
    ...patch,
  }
}

describe('Step2Mapping capability disclosure', () => {
  it('shows AI Mapper when structured AI mapping was used', () => {
    renderStep(mappingState())

    expect(document.body.textContent).toContain('AI Mapper')
    expect(document.querySelector('button[aria-label="Explain AI Mapper"]')).toHaveProperty(
      'title',
      'AI Mapper means AI suggested the fields.',
    )
  })

  it('shows Import template when AI uses the selected import template', () => {
    renderStep(mappingState({ status: 'fallback', fallback: 'preset' }))

    expect(document.body.textContent).toContain('Import template')
    expect(document.body.textContent).toContain('Automatic field matching is unavailable')
    expect(
      document.querySelector('button[aria-label="Explain import template suggestions"]'),
    ).toHaveProperty(
      'title',
      'Import template suggestions mean AI was unavailable and the selected import template filled defaults.',
    )
  })

  it('shows Manual mapping when AI is unavailable and no preset was selected', () => {
    renderStep(mappingState({ status: 'fallback', fallback: 'all_ignore' }))

    expect(document.body.textContent).toContain('Manual mapping')
    expect(document.querySelector('button[aria-label="Explain Manual mapping"]')).toHaveProperty(
      'title',
      'Manual mapping means no AI or import template result was available.',
    )
  })

  it('does not show internal validation codes to users', () => {
    renderStep(mappingState(), [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        batchId: '550e8400-e29b-41d4-a716-446655440001',
        rowIndex: 13,
        rawRowJson: { 'Entity Type': 'sole-prop' },
        errorCode: 'ENTITY_ENUM',
        errorMessage: "Entity type 'sole-prop' is outside the 8-item enum.",
        createdAt: '2026-05-04T00:00:00.000Z',
      },
    ])

    expect(document.body.textContent).toContain(
      "We couldn't recognize the entity type. Review the mapped entity type before import.",
    )
    expect(document.body.textContent).not.toContain('ENTITY_ENUM')
    expect(document.body.textContent).not.toContain('8-item enum')
  })
})

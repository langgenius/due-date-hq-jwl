import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { I18nProvider } from '@lingui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MappingRow } from '@duedatehq/contracts'

import { activateLocale, i18n } from '../../i18n/i18n'
import { Step3Normalize } from './Step3Normalize'
import type { NormalizeState } from './state'

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

const entityMapping: MappingRow = {
  id: '550e8400-e29b-41d4-a716-446655440020',
  batchId: '550e8400-e29b-41d4-a716-446655440001',
  sourceHeader: 'Entity',
  targetField: 'client.entity_type',
  confidence: 0.95,
  reasoning: null,
  userOverridden: false,
  model: 'test-model',
  promptVersion: 'mapper@v2',
  createdAt: '2026-05-04T00:00:00.000Z',
}

function renderStep(
  normalize: NormalizeState,
  options: {
    rawText?: string
    mappings?: MappingRow[]
  } = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const onToggleApplyToAll = vi.fn()

  act(() => {
    root?.render(
      <HotkeysProvider>
        <I18nProvider i18n={i18n}>
          <Step3Normalize
            normalize={normalize}
            rawText={options.rawText}
            mappings={options.mappings}
            matrix={[
              {
                entityType: 'c_corp',
                state: 'TX',
                taxTypes: ['federal_1120', 'tx_state_franchise_or_entity_tax'],
                needsReview: true,
                confidence: 0.7,
                matrixVersion: 'v1.0',
                enabled: true,
                appliedClientCount: 1,
                applicationMode: 'federal_return_type_plus_state',
              },
            ]}
            onToggleApplyToAll={onToggleApplyToAll}
          />
        </I18nProvider>
      </HotkeysProvider>,
    )
  })

  return { onToggleApplyToAll }
}

function clickButtonContaining(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  )
  expect(button, `Could not find button containing "${label}"`).toBeTruthy()
  act(() => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('Step3Normalize matrix state context', () => {
  it('auto-expands the tax-type defaults card when a cell needs review', () => {
    renderStep({ status: 'success', rows: [], applyToAll: {}, errorBanner: null })

    expect(document.body.textContent).toContain('AI standardized your values')
    expect(document.body.textContent).toContain('Tax type defaults')
    // Tax-type defaults card auto-expands because the fixture cell has
    // `needsReview: true`. The detail rows render inline — no separate
    // "Adjust tax type defaults" toggle is required anymore.
    expect(document.body.textContent).toContain('Saved as default')
    expect(document.body.textContent).toContain('State context added')
    expect(document.body.textContent).toContain('tx_state_franchise_or_entity_tax')
    expect(document.body.textContent).toContain('Use suggested filings')
    expect(document.body.textContent).not.toContain('Use for this group')
    expect(document.body.textContent).not.toContain('Apply to all')
  })

  it('shows normalization fallbacks as read-only import outcomes', () => {
    renderStep({
      status: 'success',
      applyToAll: {},
      errorBanner: null,
      rows: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          batchId: '550e8400-e29b-41d4-a716-446655440001',
          field: 'entity_type',
          rawValue: 'Nonprofit',
          normalizedValue: 'other',
          confidence: 0.25,
          model: null,
          promptVersion: 'preset@v1',
          reasoning: 'No entity type match; marked as Other for review.',
          userOverridden: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          batchId: '550e8400-e29b-41d4-a716-446655440001',
          field: 'state',
          rawValue: 'Unknown',
          normalizedValue: null,
          confidence: null,
          model: null,
          promptVersion: 'preset@v1',
          reasoning: 'No state match.',
          userOverridden: false,
          createdAt: new Date().toISOString(),
        },
      ],
    })

    // Header readout calls out the two fallback groups across categories.
    expect(document.body.textContent).toContain('need review')

    // Categories with fallbacks auto-expand inline — no click required.
    expect(document.body.textContent).toContain('Nonprofit')
    expect(document.body.textContent).toContain('Other')
    expect(document.body.textContent).toContain('Using Other')
    expect(document.body.textContent).toContain('No state match')
    expect(document.body.textContent).toContain('No state deadlines')
    expect(document.querySelector('input[type="text"]')).toBeNull()
  })

  it('auto-corrects dotted state codes and empty tax-type arrays before showing Step 3', () => {
    renderStep({
      status: 'success',
      applyToAll: {},
      errorBanner: null,
      rows: [
        {
          id: '550e8400-e29b-41d4-a716-446655440014',
          batchId: '550e8400-e29b-41d4-a716-446655440001',
          field: 'state',
          rawValue: 'C.A.',
          normalizedValue: null,
          confidence: null,
          model: null,
          promptVersion: 'preset@v1',
          reasoning: 'No state match.',
          userOverridden: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440015',
          batchId: '550e8400-e29b-41d4-a716-446655440001',
          field: 'tax_types',
          rawValue: 'Form 990',
          normalizedValue: '[]',
          confidence: 0.72,
          model: 'test-model',
          promptVersion: 'normalizer-tax-types@v1',
          reasoning: 'No match in model output.',
          userOverridden: false,
          createdAt: new Date().toISOString(),
        },
      ],
    })

    // Repaired values are non-fallback, so the categories collapse by
    // default and the header reads "all matched".
    expect(document.body.textContent).toContain('all matched')
    expect(document.body.textContent).not.toContain('No state match')
    expect(document.body.textContent).not.toContain('[]')
    expect(document.body.textContent).not.toContain('value group needs review')

    // Expand each category to verify the repaired values render inside.
    clickButtonContaining('state')
    clickButtonContaining('tax type')

    expect(document.body.textContent).toContain('"C.A."')
    expect(document.body.textContent).toContain('CA')
    expect(document.body.textContent).toContain('"Form 990"')
    expect(document.body.textContent).toContain('federal_990')
    expect(document.body.textContent).not.toContain('No state match')
    expect(document.body.textContent).not.toContain('[]')
    expect(document.body.textContent).not.toContain('value group needs review')
  })

  it('groups repeated normalized values by affected client count', () => {
    renderStep(
      {
        status: 'success',
        applyToAll: {},
        errorBanner: null,
        rows: [
          {
            id: '550e8400-e29b-41d4-a716-446655440012',
            batchId: '550e8400-e29b-41d4-a716-446655440001',
            field: 'entity_type',
            rawValue: 'L.L.C.',
            normalizedValue: 'llc',
            confidence: 0.92,
            model: 'test-model',
            promptVersion: 'normalizer@v1',
            reasoning: null,
            userOverridden: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440013',
            batchId: '550e8400-e29b-41d4-a716-446655440001',
            field: 'entity_type',
            rawValue: 'LLC',
            normalizedValue: 'llc',
            confidence: 0.98,
            model: 'test-model',
            promptVersion: 'normalizer@v1',
            reasoning: null,
            userOverridden: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        rawText: [
          'Client,Entity',
          'Acme,L.L.C.',
          'Beta,L.L.C.',
          'Cedar,L.L.C.',
          'Delta,LLC',
          'Echo,LLC',
        ].join('\n'),
        mappings: [entityMapping],
      },
    )

    // All matched → entity-type category is collapsed by default.
    expect(document.body.textContent).not.toContain('"L.L.C." / "LLC"')

    // Expand the entity-type category to see the grouped row.
    clickButtonContaining('entity type')

    expect(document.body.textContent).toContain('"L.L.C." / "LLC"')
    expect(document.body.textContent).toContain('5 clients')
    expect(document.body.textContent).toContain('LLC')
  })
})

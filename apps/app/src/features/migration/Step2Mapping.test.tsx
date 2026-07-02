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
  const onUserEdit = vi.fn()
  const onRerun = vi.fn()

  act(() => {
    root?.render(
      <I18nProvider i18n={i18n}>
        <Step2Mapping
          mapping={mapping}
          sampleByHeader={{
            'Client Name': 'Acme LLC',
            State: 'TX',
            EIN: '12-3456789',
          }}
          errors={errors}
          onUserEdit={onUserEdit}
          onRerun={onRerun}
        />
      </I18nProvider>,
    )
  })

  return { onUserEdit, onRerun }
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

describe('Step2Mapping banner rows', () => {
  it('shows AI Mapper badge and the single-line headline readout', () => {
    renderStep(mappingState())

    expect(document.body.textContent).toContain('AI prepared your columns')
    // 2026-05-27: the multi-tile SummaryMetric grid (Columns used /
    // Confidence / EIN / Exceptions) collapses to a single quiet
    // text readout ("N columns mapped · M needs review · K ignored").
    expect(document.body.textContent).toContain('1 column mapped')
    expect(document.body.textContent).toContain('AI Mapper')
    expect(document.querySelector('button[aria-label="Explain AI Mapper"]')).toHaveProperty(
      'title',
      'AI Mapper means AI suggested the fields.',
    )
    // Every row is a banner — there is no separate "Column details" table.
    expect(document.querySelector('[data-slot="step2-mapping-rows"]')).not.toBeNull()
    expect(document.body.textContent).not.toContain('Review column details')
    expect(document.body.textContent).not.toContain('Your column')
  })

  it('renders every row as an expandable banner with inline Change link', () => {
    renderStep(
      mappingState({
        rows: [
          baseRow,
          {
            ...baseRow,
            id: '550e8400-e29b-41d4-a716-446655440002',
            sourceHeader: 'State',
            targetField: 'client.state',
            confidence: 0.71,
          },
        ],
      }),
    )

    // Both rows render up-front — no "Review column details" gate.
    const rows = document.querySelectorAll('[data-slot="step2-mapping-rows"] > li')
    expect(rows.length).toBe(2)
    expect(document.body.textContent).toContain('Client Name')
    expect(document.body.textContent).toContain('State')
    // Plain-text confidence — no traffic-light badge.
    expect(document.body.textContent).toContain('Auto-mapped · 92%')
    expect(document.body.textContent).toContain('Low match · 71%')
    // Inline "Change" affordance is always visible on every row.
    const changeButtons = Array.from(document.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('Change'),
    )
    expect(changeButtons.length).toBeGreaterThanOrEqual(2)

    // Click the banner expand header (a div role="button" carrying
    // aria-expanded — NOT a <button>, since it hosts the nested "Change →"
    // dropdown trigger), then assert the body reveals sample / data-type.
    const expandButton = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="step2-mapping-rows"] [role="button"][aria-expanded]',
      ),
    ).find((btn) => btn.textContent?.includes('Client Name'))
    expect(expandButton).toBeTruthy()
    act(() => {
      expandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('Sample values')
    expect(document.body.textContent).toContain('Data type')
    expect(document.body.textContent).toContain('Acme LLC')
  })

  it('floats rows needing attention to the top of the list', () => {
    renderStep(
      mappingState({
        rows: [
          // High-confidence first in props order ...
          baseRow,
          // ... but the unmapped + low-confidence rows should sort up.
          {
            ...baseRow,
            id: '550e8400-e29b-41d4-a716-446655440002',
            sourceHeader: 'State',
            targetField: 'client.state',
            confidence: 0.71,
          },
          {
            ...baseRow,
            id: '550e8400-e29b-41d4-a716-446655440003',
            sourceHeader: 'EIN',
            targetField: 'client.ein',
            confidence: null,
          },
        ],
      }),
    )

    const rows = Array.from(
      document.querySelectorAll<HTMLLIElement>('[data-slot="step2-mapping-rows"] > li'),
    )
    expect(rows.length).toBe(3)
    // Unmapped (null confidence) → top, then low-confidence, then high.
    expect(rows[0]?.textContent).toContain('EIN')
    expect(rows[1]?.textContent).toContain('State')
    expect(rows[2]?.textContent).toContain('Client Name')
  })

  it('shows the From-template badge when AI uses the selected import template', () => {
    renderStep(mappingState({ status: 'fallback', fallback: 'preset' }))

    // The visible badge reads "From template"; the longer "Import template …"
    // copy lives in the explain tooltip (title/aria-label), asserted below.
    expect(document.body.textContent).toContain('From template')
    expect(document.body.textContent).toContain(
      'Automatic field matching is unavailable. We used the selected import template',
    )
    expect(
      document.querySelector('button[aria-label="Explain import template suggestions"]'),
    ).toHaveProperty(
      'title',
      'Import template suggestions mean AI was unavailable and the selected import template filled defaults.',
    )
  })

  it('shows Manual mapping when AI is unavailable and no preset was selected', () => {
    renderStep(
      mappingState({
        status: 'fallback',
        fallback: 'all_ignore',
        rows: [{ ...baseRow, targetField: 'IGNORE', confidence: null }],
      }),
    )

    expect(document.body.textContent).toContain('Manual mapping')
    expect(document.body.textContent).toContain('1 column is currently ignored.')
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

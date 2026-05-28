import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  DryRunSummary,
  MapperRunOutput,
  MappingRow,
  MappingTarget,
  MigrationBatch,
  NormalizationRow,
} from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { Wizard } from './Wizard'

const rpcMocks = vi.hoisted(() => ({
  callOrder: [] as string[],
  createBatchMutationFn: vi.fn(),
  uploadRawMutationFn: vi.fn(),
  runMapperMutationFn: vi.fn(),
  confirmMappingMutationFn: vi.fn(),
  runNormalizerMutationFn: vi.fn(),
  confirmNormalizationMutationFn: vi.fn(),
  applyDefaultMatrixMutationFn: vi.fn(),
  applyMutationFn: vi.fn(),
  revertMutationFn: vi.fn(),
  listErrorsMutationFn: vi.fn(),
  mutationOptions: (mutationFn: unknown, options: Record<string, unknown> = {}) => ({
    ...options,
    mutationFn,
  }),
}))

vi.mock('@/lib/rpc', () => {
  return {
    orpc: {
      clients: {
        listByFirm: { key: () => ['clients', 'listByFirm'] },
      },
      dashboard: {
        load: {
          key: () => ['dashboard', 'load'],
          queryOptions: () => ({
            queryKey: ['dashboard', 'load'],
            queryFn: async () => ({}),
          }),
        },
      },
      migration: {
        key: () => ['migration'],
        getBatch: {
          queryKey: ({ input }: { input: unknown }) => ['migration', 'getBatch', input],
        },
        createBatch: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.createBatchMutationFn, options),
        },
        uploadRaw: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.uploadRawMutationFn, options),
        },
        runMapper: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.runMapperMutationFn, options),
        },
        confirmMapping: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.confirmMappingMutationFn, options),
        },
        runNormalizer: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.runNormalizerMutationFn, options),
        },
        confirmNormalization: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.confirmNormalizationMutationFn, options),
        },
        applyDefaultMatrix: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.applyDefaultMatrixMutationFn, options),
        },
        apply: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.applyMutationFn, options),
        },
        revert: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.revertMutationFn, options),
        },
        listErrors: {
          mutationOptions: (options: Record<string, unknown> = {}) =>
            rpcMocks.mutationOptions(rpcMocks.listErrorsMutationFn, options),
        },
      },
      obligations: {
        list: {
          key: () => ['obligations', 'list'],
          infiniteOptions: (options: {
            initialPageParam: unknown
            getNextPageParam: (lastPage: { nextCursor: unknown }) => unknown
          }) => ({
            queryKey: ['obligations', 'list'],
            queryFn: async () => ({ rows: [], nextCursor: null }),
            initialPageParam: options.initialPageParam,
            getNextPageParam: options.getNextPageParam,
          }),
        },
      },
    },
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const BATCH_ID = '550e8400-e29b-41d4-a716-446655440001'
const NOW = '2026-05-25T00:00:00.000Z'

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  bootstrapI18n()
  activateLocale('en')
  rpcMocks.callOrder.length = 0
  resetRpcMocks()
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
  activateLocale('en')
})

describe('Migration Wizard RPC flow', () => {
  it('continues from Step 1 to Step 4 without manual edits and preserves RPC order', async () => {
    renderWizard()

    await pasteRows(
      'Client Name\tEntity Type\tState\tEIN\nAcme Advisory LLC\tL.L.C.\tTX\t12-3456789\n',
    )

    await clickButton('Continue')
    await waitForText('AI prepared your columns')

    // 2026-05-27 (Step 2 banner-row redesign): the "Review column details"
    // toggle is gone — every row is its own review affordance. Anchor on
    // the new summary header instead.
    expect(document.body.textContent).toContain('columns mapped')
    expect(document.body.textContent).not.toContain('Your column')

    await clickButton('Continue')
    await waitForText('AI standardized your values')

    // 2026-05-27 (Yuqi #step3 normalize redesign): Step 3 swapped the
    // 4-tile SummaryMetric grid ("Value groups", "Ready", etc.) for
    // a single quiet readout and per-category cards. The wizard-level
    // smoke test now asserts the readout phrasing and the tax-type
    // defaults card label.
    expect(document.body.textContent).toContain('values across')
    expect(document.body.textContent).toContain('Tax type defaults')

    await clickButton('Continue')
    await waitForText('Ready to import')

    expect(rpcMocks.callOrder.filter((name) => !name.startsWith('listErrors'))).toEqual([
      'createBatch',
      'uploadRaw',
      'runMapper',
      'confirmMapping',
      'runNormalizer',
      'confirmNormalization',
      'applyDefaultMatrix',
    ])
    expect(rpcMocks.applyMutationFn).not.toHaveBeenCalled()
  })

  it('keeps the all-ignore fallback from continuing out of Step 2', async () => {
    rpcMocks.runMapperMutationFn.mockImplementation(async () => {
      rpcMocks.callOrder.push('runMapper')
      return {
        mappings: [mappingRow('Client Name', 'IGNORE', 0), mappingRow('Entity Type', 'IGNORE', 1)],
        meta: { fallback: 'all_ignore' },
      } satisfies MapperRunOutput
    })

    renderWizard()
    await pasteRows('Client Name\tEntity Type\nAcme Advisory LLC\tL.L.C.\n')
    await clickButton('Continue')
    await waitForText('AI prepared your columns')

    expect(document.body.textContent).toContain('Manual mapping')
    expect(getButton('Continue').disabled).toBe(true)
    expect(rpcMocks.confirmMappingMutationFn).not.toHaveBeenCalled()
  })

  it('repairs return-type mapping and normalizer misses before Step 3 is shown', async () => {
    rpcMocks.runMapperMutationFn.mockImplementation(async () => {
      rpcMocks.callOrder.push('runMapper')
      return {
        mappings: [
          mappingRow('Client Name', 'client.name', 0),
          mappingRow('State', 'client.state', 1),
          mappingRow('Tax Return Type', 'client.entity_type', 2),
        ],
        meta: { fallback: null },
      } satisfies MapperRunOutput
    })
    rpcMocks.runNormalizerMutationFn.mockImplementation(async () => {
      rpcMocks.callOrder.push('runNormalizer')
      return {
        normalizations: [
          normalizationRow('state', 'C.A.', null, 0),
          normalizationRow('tax_types', 'Form 990', '[]', 1),
        ],
      }
    })

    renderWizard()
    await pasteRows('Client Name\tState\tTax Return Type\nNonprofit Client\tC.A.\tForm 990\n')

    await clickButton('Continue')
    await waitForText('AI prepared your columns')
    await clickButton('Continue')
    await waitForText('AI standardized your values')

    expect(document.body.textContent).not.toContain('CA')
    expect(document.body.textContent).not.toContain('federal_990')
    expect(document.body.textContent).not.toContain('No state match')
    expect(document.body.textContent).not.toContain('[]')

    // 2026-05-27 (Yuqi #step3 normalize redesign): the single "Review
    // all groups" button is gone — each category card (State, Tax
    // types) collapses/expands independently. Expand both to verify
    // the repaired values surface inside.
    await clickButton('state')
    await clickButton('tax type')

    expect(document.body.textContent).toContain('CA')
    expect(document.body.textContent).toContain('federal_990')
    expect(document.body.textContent).not.toContain('No state match')
    expect(document.body.textContent).not.toContain('[]')
  })
})

function resetRpcMocks() {
  rpcMocks.createBatchMutationFn.mockReset()
  rpcMocks.uploadRawMutationFn.mockReset()
  rpcMocks.runMapperMutationFn.mockReset()
  rpcMocks.confirmMappingMutationFn.mockReset()
  rpcMocks.runNormalizerMutationFn.mockReset()
  rpcMocks.confirmNormalizationMutationFn.mockReset()
  rpcMocks.applyDefaultMatrixMutationFn.mockReset()
  rpcMocks.applyMutationFn.mockReset()
  rpcMocks.revertMutationFn.mockReset()
  rpcMocks.listErrorsMutationFn.mockReset()

  rpcMocks.createBatchMutationFn.mockImplementation(async () => {
    rpcMocks.callOrder.push('createBatch')
    return migrationBatch()
  })
  rpcMocks.uploadRawMutationFn.mockImplementation(async () => {
    rpcMocks.callOrder.push('uploadRaw')
    return { rawInputR2Key: 'migration/raw/test.csv' }
  })
  rpcMocks.runMapperMutationFn.mockImplementation(async () => {
    rpcMocks.callOrder.push('runMapper')
    return { mappings: defaultMappings(), meta: { fallback: null } } satisfies MapperRunOutput
  })
  rpcMocks.confirmMappingMutationFn.mockImplementation(async (_input: unknown) => {
    rpcMocks.callOrder.push('confirmMapping')
    return { mappings: defaultMappings(), meta: { fallback: null } } satisfies MapperRunOutput
  })
  rpcMocks.runNormalizerMutationFn.mockImplementation(async () => {
    rpcMocks.callOrder.push('runNormalizer')
    return { normalizations: defaultNormalizations() }
  })
  rpcMocks.confirmNormalizationMutationFn.mockImplementation(async (_input: unknown) => {
    rpcMocks.callOrder.push('confirmNormalization')
    return { normalizations: defaultNormalizations() }
  })
  rpcMocks.applyDefaultMatrixMutationFn.mockImplementation(async () => {
    rpcMocks.callOrder.push('applyDefaultMatrix')
    return dryRunSummary()
  })
  rpcMocks.applyMutationFn.mockImplementation(async () => {
    rpcMocks.callOrder.push('apply')
    return {
      batchId: BATCH_ID,
      clientCount: 1,
      obligationCount: 1,
      skippedCount: 0,
      revertibleUntil: '2026-05-26T00:00:00.000Z',
    }
  })
  rpcMocks.revertMutationFn.mockImplementation(async () => {
    rpcMocks.callOrder.push('revert')
    return { revertedAt: NOW }
  })
  rpcMocks.listErrorsMutationFn.mockImplementation(async (input: { stage?: string }) => {
    rpcMocks.callOrder.push(`listErrors:${input.stage ?? 'all'}`)
    return { errors: [] }
  })
}

function renderWizard(children: ReactNode = <div />) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  act(() => {
    root?.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <HotkeysProvider>
            <AppI18nProvider>
              <Wizard open onClose={() => {}} variant="route" intro={children} />
            </AppI18nProvider>
          </HotkeysProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
}

async function pasteRows(rows: string) {
  // 2026-05-27 (bold-IA Step 1 redesign): the paste textarea is opt-in —
  // Step 1 shows a file dropzone by default. Click "Paste a list instead →"
  // to reveal the textarea before driving it.
  if (!document.querySelector('textarea[aria-label="Paste client data"]')) {
    await clickButton('Paste a list instead')
  }
  const textarea = document.querySelector('textarea[aria-label="Paste client data"]')
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error('Expected paste textarea to render.')
  }
  const valueSetter = Reflect.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  await act(async () => {
    valueSetter?.call(textarea, rows)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clickButton(label: string) {
  const button = getButton(label)
  await act(async () => {
    button.click()
  })
}

function getButton(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.replace(/\s+/g, ' ').trim().includes(label),
  )
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button not found: ${label}.`)
  }
  return button
}

async function waitForText(text: string, attempts = 100): Promise<void> {
  if (document.body.textContent?.includes(text)) return
  if (attempts <= 0) {
    throw new Error(`Expected text not found: ${text}; body=${document.body.textContent ?? ''}`)
  }
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
  return waitForText(text, attempts - 1)
}

function migrationBatch(): MigrationBatch {
  return {
    id: BATCH_ID,
    firmId: 'firm_test',
    userId: 'user_test',
    source: 'paste',
    rawInputR2Key: null,
    rawInputFileName: null,
    rawInputContentType: null,
    rawInputSizeBytes: null,
    mappingJson: null,
    presetUsed: null,
    rowCount: 1,
    successCount: 0,
    skippedCount: 0,
    aiGlobalConfidence: null,
    status: 'draft',
    appliedAt: null,
    revertExpiresAt: null,
    revertedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function defaultMappings(): MappingRow[] {
  return [
    mappingRow('Client Name', 'client.name', 0),
    mappingRow('Entity Type', 'client.entity_type', 1),
    mappingRow('State', 'client.state', 2),
    mappingRow('EIN', 'client.ein', 3),
  ]
}

function mappingRow(sourceHeader: string, targetField: MappingTarget, index: number): MappingRow {
  return {
    id: `550e8400-e29b-41d4-a716-4466554400${10 + index}`,
    batchId: BATCH_ID,
    sourceHeader,
    targetField,
    confidence: targetField === 'IGNORE' ? null : 0.96,
    reasoning: null,
    userOverridden: false,
    model: 'test-model',
    promptVersion: 'mapper@test',
    createdAt: NOW,
  }
}

function defaultNormalizations(): NormalizationRow[] {
  return [
    normalizationRow('entity_type', 'L.L.C.', 'llc', 0),
    normalizationRow('state', 'TX', 'TX', 1),
  ]
}

function normalizationRow(
  field: string,
  rawValue: string,
  normalizedValue: string | null,
  index: number,
): NormalizationRow {
  return {
    id: `550e8400-e29b-41d4-a716-4466554401${10 + index}`,
    batchId: BATCH_ID,
    field,
    rawValue,
    normalizedValue,
    confidence: 0.96,
    model: 'test-model',
    promptVersion: 'normalizer@test',
    reasoning: null,
    userOverridden: false,
    createdAt: NOW,
  }
}

function dryRunSummary(): DryRunSummary {
  return {
    batchId: BATCH_ID,
    clientsToCreate: 1,
    obligationsToCreate: 1,
    skippedRows: 0,
    errors: [],
    ruleReviewWarnings: [],
  }
}

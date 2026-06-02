import type {
  MapperFallback,
  MappingRow,
  MatrixSelection,
  MigrationBatch,
  MigrationError,
  NormalizationRow,
  DryRunSummary,
  MigrationSource,
  MigrationSourceManifest,
} from '@duedatehq/contracts'

/**
 * Wizard state machine — single useReducer at the wizard root.
 *
 * Authority: docs/product-design/migration-copilot/02-ux-4step-wizard.md
 *
 * The reducer is the only mutator; child steps dispatch typed actions. Side
 * effects (RPC calls) live in the parent Wizard component using
 * useTransition + TanStack Query mutations — never inside reducers.
 */

export type StepIndex = 1 | 2 | 3 | 4

export type PresetId =
  | 'taxdome'
  | 'drake'
  | 'karbon'
  | 'quickbooks'
  | 'file_in_time'
  | 'cch_axcess'
  | 'cch_prosystem_fx'
  | 'lacerte'
  | 'proseries'
  | 'ultratax_cs'
  | 'proconnect_tax'

export type PresetSelectionSource = 'manual' | 'detected'

export interface IntakeState {
  /** Raw paste text or file content as utf-8 string. */
  rawText: string
  fileName: string | null
  fileKind: 'paste' | 'csv' | 'tsv' | 'xlsx'
  rawFileBase64: string | null
  contentType: string | null
  sizeBytes: number
  sourceManifest: MigrationSourceManifest | null
  preset: PresetId | null
  presetSource: PresetSelectionSource | null
  /** Header indexes blocked by SSN regex on the client side. */
  ssnBlockedColumnIndexes: number[]
  rowCount: number
  truncated: boolean
  parseError: string | null
  /**
   * Server-side error captured when Step 1 Continue fails (e.g. a 409
   * CONFLICT because another draft is already in progress). Rendered as a
   * persistent inline alert so it survives the toast auto-dismiss.
   */
  submitError: string | null
}

export interface MapperState {
  status: 'idle' | 'loading' | 'success' | 'fallback' | 'error'
  /** Always the latest authoritative array — both AI rows and user-edited rows. */
  rows: MappingRow[]
  fallback: MapperFallback
  /** Banner / toast string (transient). */
  errorBanner: string | null
}

export interface NormalizeState {
  status: 'idle' | 'loading' | 'success' | 'fallback' | 'error'
  rows: NormalizationRow[]
  /** Toggle map for Default Matrix cell application; key = `${entity}::${state}`. */
  applyToAll: Record<string, boolean>
  errorBanner: string | null
}

interface DryRunState {
  summary: DryRunSummary | null
}

export interface WizardState {
  step: StepIndex
  batchId: string | null
  /** Most recent batch row from the server (status / counts update over time). */
  batch: MigrationBatch | null
  intake: IntakeState
  mapping: MapperState
  normalize: NormalizeState
  dryRun: DryRunState
  errors: MigrationError[]
  /** True while a mutation is in flight; child steps disable Continue. */
  isBusy: boolean
}

export const INITIAL_STATE: WizardState = {
  step: 1,
  batchId: null,
  batch: null,
  intake: {
    rawText: '',
    fileName: null,
    fileKind: 'paste',
    rawFileBase64: null,
    contentType: null,
    sizeBytes: 0,
    sourceManifest: null,
    preset: null,
    presetSource: null,
    ssnBlockedColumnIndexes: [],
    rowCount: 0,
    truncated: false,
    parseError: null,
    submitError: null,
  },
  mapping: { status: 'idle', rows: [], fallback: null, errorBanner: null },
  normalize: { status: 'idle', rows: [], applyToAll: {}, errorBanner: null },
  dryRun: { summary: null },
  errors: [],
  isBusy: false,
}

export function hasDiscardableWizardWork(state: WizardState): boolean {
  if (state.step !== INITIAL_STATE.step) return true
  if (state.batchId !== null || state.batch !== null) return true

  const intake = state.intake
  if (
    intake.rawText !== '' ||
    intake.fileName !== null ||
    intake.fileKind !== INITIAL_STATE.intake.fileKind ||
    intake.rawFileBase64 !== null ||
    intake.contentType !== null ||
    intake.sizeBytes !== 0 ||
    intake.sourceManifest !== null ||
    intake.preset !== null ||
    intake.presetSource !== INITIAL_STATE.intake.presetSource ||
    intake.ssnBlockedColumnIndexes.length > 0 ||
    intake.rowCount !== 0 ||
    intake.truncated ||
    intake.parseError !== null ||
    intake.submitError !== null
  ) {
    return true
  }

  if (
    state.mapping.status !== 'idle' ||
    state.mapping.rows.length > 0 ||
    state.mapping.fallback !== null ||
    state.mapping.errorBanner !== null
  ) {
    return true
  }

  if (
    state.normalize.status !== 'idle' ||
    state.normalize.rows.length > 0 ||
    Object.keys(state.normalize.applyToAll).length > 0 ||
    state.normalize.errorBanner !== null
  ) {
    return true
  }

  return state.dryRun.summary !== null || state.errors.length > 0
}

type WizardAction =
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'GO_TO_STEP'; step: StepIndex }
  | {
      type: 'INTAKE_TEXT'
      text: string
      fileName?: string | null
      fileKind?: 'paste' | 'csv' | 'tsv' | 'xlsx'
      rawFileBase64?: string | null
      contentType?: string | null
      sizeBytes?: number
      sourceManifest?: MigrationSourceManifest | null
    }
  | { type: 'INTAKE_PRESET'; preset: PresetId | null; source?: PresetSelectionSource }
  | {
      type: 'INTAKE_PARSED'
      rowCount: number
      truncated: boolean
      ssnBlockedColumnIndexes: number[]
    }
  | { type: 'INTAKE_PARSE_ERROR'; error: string | null }
  | { type: 'INTAKE_SUBMIT_ERROR'; error: string | null }
  | { type: 'BATCH_CREATED'; batch: MigrationBatch }
  | { type: 'BATCH_UPDATED'; batch: MigrationBatch }
  | { type: 'MAPPER_LOADING' }
  | { type: 'MAPPER_RESULT'; rows: MappingRow[]; fallback: MapperFallback }
  | { type: 'MAPPER_USER_EDIT'; rows: MappingRow[] }
  | { type: 'MAPPER_ERROR'; message: string }
  | { type: 'NORMALIZE_LOADING' }
  | { type: 'NORMALIZE_RESULT'; rows: NormalizationRow[] }
  | { type: 'NORMALIZE_USER_EDIT'; rows: NormalizationRow[] }
  | { type: 'NORMALIZE_TOGGLE_APPLY_TO_ALL'; key: string; value: boolean }
  | { type: 'NORMALIZE_ERROR'; message: string }
  | { type: 'DRY_RUN_RESULT'; summary: DryRunSummary }
  | { type: 'ERRORS_SET'; errors: MigrationError[] }
  | { type: 'HYDRATE'; batch: MigrationBatch }
  | { type: 'RESET' }

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_BUSY':
      return { ...state, isBusy: action.busy }
    case 'GO_TO_STEP':
      return { ...state, step: action.step }
    case 'INTAKE_TEXT':
      return {
        ...state,
        intake: {
          ...state.intake,
          rawText: action.text,
          fileName: action.fileName === undefined ? state.intake.fileName : action.fileName,
          fileKind: action.fileKind ?? state.intake.fileKind,
          rawFileBase64:
            action.rawFileBase64 === undefined ? state.intake.rawFileBase64 : action.rawFileBase64,
          contentType:
            action.contentType === undefined ? state.intake.contentType : action.contentType,
          sizeBytes: action.sizeBytes ?? state.intake.sizeBytes,
          sourceManifest:
            action.sourceManifest === undefined
              ? state.intake.sourceManifest
              : action.sourceManifest,
          parseError: null,
          submitError: null,
        },
      }
    case 'INTAKE_PRESET':
      return {
        ...state,
        intake: {
          ...state.intake,
          preset: action.preset,
          presetSource: action.preset === null ? null : (action.source ?? 'manual'),
        },
      }
    case 'INTAKE_PARSED':
      return {
        ...state,
        intake: {
          ...state.intake,
          rowCount: action.rowCount,
          truncated: action.truncated,
          ssnBlockedColumnIndexes: action.ssnBlockedColumnIndexes,
          parseError: null,
        },
      }
    case 'INTAKE_PARSE_ERROR':
      return { ...state, intake: { ...state.intake, parseError: action.error } }
    case 'INTAKE_SUBMIT_ERROR':
      return { ...state, intake: { ...state.intake, submitError: action.error } }
    case 'BATCH_CREATED':
      return { ...state, batchId: action.batch.id, batch: action.batch }
    case 'BATCH_UPDATED':
      return { ...state, batch: action.batch }
    case 'MAPPER_LOADING':
      return {
        ...state,
        mapping: { ...state.mapping, status: 'loading', errorBanner: null },
      }
    case 'MAPPER_RESULT':
      return {
        ...state,
        mapping: {
          status: action.fallback ? 'fallback' : 'success',
          rows: action.rows,
          fallback: action.fallback,
          errorBanner: null,
        },
      }
    case 'MAPPER_USER_EDIT':
      return { ...state, mapping: { ...state.mapping, rows: action.rows } }
    case 'MAPPER_ERROR':
      return {
        ...state,
        mapping: { ...state.mapping, status: 'error', errorBanner: action.message },
      }
    case 'NORMALIZE_LOADING':
      return {
        ...state,
        normalize: { ...state.normalize, status: 'loading', errorBanner: null },
      }
    case 'NORMALIZE_RESULT':
      return {
        ...state,
        normalize: {
          ...state.normalize,
          status: 'success',
          rows: action.rows,
          errorBanner: null,
        },
      }
    case 'NORMALIZE_USER_EDIT':
      return { ...state, normalize: { ...state.normalize, rows: action.rows } }
    case 'NORMALIZE_TOGGLE_APPLY_TO_ALL':
      return {
        ...state,
        normalize: {
          ...state.normalize,
          applyToAll: { ...state.normalize.applyToAll, [action.key]: action.value },
        },
      }
    case 'NORMALIZE_ERROR':
      return {
        ...state,
        normalize: { ...state.normalize, status: 'error', errorBanner: action.message },
      }
    case 'DRY_RUN_RESULT':
      return { ...state, dryRun: { summary: action.summary } }
    case 'ERRORS_SET':
      return { ...state, errors: action.errors }
    case 'HYDRATE':
      return hydrateStateFromBatch(action.batch)
    case 'RESET':
      return INITIAL_STATE
    default:
      return state
  }
}

export const PRESET_IDS: ReadonlyArray<PresetId> = [
  'taxdome',
  'drake',
  'karbon',
  'quickbooks',
  'file_in_time',
]

export const TAX_SOFTWARE_PRESET_IDS: ReadonlyArray<PresetId> = [
  'cch_axcess',
  'cch_prosystem_fx',
  'lacerte',
  'proseries',
  'ultratax_cs',
  'proconnect_tax',
]

export const PRESET_TO_SOURCE: Record<PresetId, MigrationSource> = {
  taxdome: 'preset_taxdome',
  drake: 'preset_drake',
  karbon: 'preset_karbon',
  quickbooks: 'preset_quickbooks',
  file_in_time: 'preset_file_in_time',
  cch_axcess: 'preset_cch_axcess',
  cch_prosystem_fx: 'preset_cch_prosystem_fx',
  lacerte: 'preset_lacerte',
  proseries: 'preset_proseries',
  ultratax_cs: 'preset_ultratax_cs',
  proconnect_tax: 'preset_proconnect_tax',
}

const SOURCE_TO_PRESET: Partial<Record<MigrationSource, PresetId>> = {
  preset_taxdome: 'taxdome',
  preset_drake: 'drake',
  preset_karbon: 'karbon',
  preset_quickbooks: 'quickbooks',
  preset_file_in_time: 'file_in_time',
  preset_cch_axcess: 'cch_axcess',
  preset_cch_prosystem_fx: 'cch_prosystem_fx',
  preset_lacerte: 'lacerte',
  preset_proseries: 'proseries',
  preset_ultratax_cs: 'ultratax_cs',
  preset_proconnect_tax: 'proconnect_tax',
}

// Subset of migration_batch.mapping_json the wizard needs to rebuild its state
// when resuming an in-progress import. mappingJson is `unknown` on the wire.
interface ResumePayload {
  rawInput?: {
    kind?: 'csv' | 'tsv' | 'paste' | 'xlsx'
    headers?: string[]
    rows?: string[][]
    rowCount?: number
    truncated?: boolean
  }
  sourceManifest?: MigrationSourceManifest
  ssnBlockedColumns?: number[]
  aiMappings?: MappingRow[]
  confirmedMappings?: MappingRow[]
  aiNormalizations?: NormalizationRow[]
  confirmedNormalizations?: NormalizationRow[]
  matrixSelections?: MatrixSelection[]
  mapperFallback?: MapperFallback
}

/** Resume step from batch status: draft→1, mapping→2, reviewing→3 (re-confirm to re-run dry-run). */
export function statusToResumeStep(status: MigrationBatch['status']): StepIndex {
  if (status === 'mapping') return 2
  if (status === 'reviewing') return 3
  return 1
}

/**
 * Rebuild the wizard state from a persisted in-progress batch so the user can
 * resume where they left off. `dryRun.summary` is intentionally left null —
 * Step 4 recomputes it (with fresh conflict detection) on the next Continue.
 */
export function hydrateStateFromBatch(batch: MigrationBatch): WizardState {
  const payload = (batch.mappingJson ?? {}) as ResumePayload
  const rawInput = payload.rawInput
  const headers = rawInput?.headers ?? []
  const rows = rawInput?.rows ?? []
  const rawText =
    headers.length > 0 ? [headers, ...rows].map((cells) => cells.join('\t')).join('\n') : ''
  const mappingRows = payload.confirmedMappings ?? payload.aiMappings ?? []
  const normalizeRows = payload.confirmedNormalizations ?? payload.aiNormalizations ?? []
  const applyToAll: Record<string, boolean> = {}
  for (const sel of payload.matrixSelections ?? []) {
    applyToAll[`${sel.entityType}::${sel.state}`] = sel.enabled
  }
  const kind = rawInput?.kind
  const fileKind = kind === 'csv' || kind === 'tsv' || kind === 'xlsx' ? kind : 'paste'
  const preset = SOURCE_TO_PRESET[batch.source] ?? null

  return {
    ...INITIAL_STATE,
    step: statusToResumeStep(batch.status),
    batchId: batch.id,
    batch,
    intake: {
      ...INITIAL_STATE.intake,
      rawText,
      fileName: batch.rawInputFileName ?? null,
      fileKind,
      contentType: batch.rawInputContentType ?? null,
      sizeBytes: batch.rawInputSizeBytes ?? 0,
      sourceManifest: payload.sourceManifest ?? null,
      preset,
      presetSource: preset ? 'detected' : null,
      ssnBlockedColumnIndexes: payload.ssnBlockedColumns ?? [],
      rowCount: rawInput?.rowCount ?? rows.length,
      truncated: rawInput?.truncated ?? false,
    },
    mapping: {
      status: payload.mapperFallback ? 'fallback' : mappingRows.length > 0 ? 'success' : 'idle',
      rows: mappingRows,
      fallback: payload.mapperFallback ?? null,
      errorBanner: null,
    },
    normalize: {
      status: normalizeRows.length > 0 ? 'success' : 'idle',
      rows: normalizeRows,
      applyToAll,
      errorBanner: null,
    },
    dryRun: { summary: null },
    errors: [],
    isBusy: false,
  }
}

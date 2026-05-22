import type {
  MapperFallback,
  MappingRow,
  MigrationBatch,
  MigrationError,
  NormalizationRow,
  DryRunSummary,
  MigrationSource,
  MigrationSourceManifest,
  MigrationExternalStagingRowInput,
  MigrationIntegrationProvider,
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

export type IntakeMode = 'paste' | 'upload' | 'integration' | 'previous_sync'

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
export type IntegrationProvider = MigrationIntegrationProvider

export interface IntakeState {
  mode: IntakeMode
  /** Raw paste text or file content as utf-8 string. */
  rawText: string
  fileName: string | null
  fileKind: 'paste' | 'csv' | 'tsv' | 'xlsx'
  rawFileBase64: string | null
  contentType: string | null
  sizeBytes: number
  sourceManifest: MigrationSourceManifest | null
  preset: PresetId | null
  integrationProvider: IntegrationProvider
  integrationRawText: string
  integrationRows: MigrationExternalStagingRowInput[]
  previousSyncBatchId: string | null
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

export interface DryRunState {
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
    mode: 'paste',
    rawText: '',
    fileName: null,
    fileKind: 'paste',
    rawFileBase64: null,
    contentType: null,
    sizeBytes: 0,
    sourceManifest: null,
    preset: null,
    integrationProvider: 'karbon',
    integrationRawText: '',
    integrationRows: [],
    previousSyncBatchId: null,
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
    intake.mode !== INITIAL_STATE.intake.mode ||
    intake.rawText !== '' ||
    intake.fileName !== null ||
    intake.fileKind !== INITIAL_STATE.intake.fileKind ||
    intake.rawFileBase64 !== null ||
    intake.contentType !== null ||
    intake.sizeBytes !== 0 ||
    intake.sourceManifest !== null ||
    intake.preset !== null ||
    intake.integrationProvider !== INITIAL_STATE.intake.integrationProvider ||
    intake.integrationRawText !== '' ||
    intake.integrationRows.length > 0 ||
    intake.previousSyncBatchId !== null ||
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

export type WizardAction =
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'GO_TO_STEP'; step: StepIndex }
  | { type: 'INTAKE_MODE'; mode: IntakeMode }
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
  | { type: 'INTAKE_PRESET'; preset: PresetId | null }
  | { type: 'INTAKE_INTEGRATION_PROVIDER'; provider: IntegrationProvider }
  | {
      type: 'INTAKE_INTEGRATION_ROWS'
      rawText: string
      tabularText: string
      rows: MigrationExternalStagingRowInput[]
      parseError: string | null
    }
  | { type: 'INTAKE_PREVIOUS_SYNC'; batchId: string | null }
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
  | { type: 'RESET' }

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_BUSY':
      return { ...state, isBusy: action.busy }
    case 'GO_TO_STEP':
      return { ...state, step: action.step }
    case 'INTAKE_MODE':
      return { ...state, intake: { ...state.intake, mode: action.mode } }
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
      return { ...state, intake: { ...state.intake, preset: action.preset } }
    case 'INTAKE_INTEGRATION_PROVIDER':
      return {
        ...state,
        intake: {
          ...state.intake,
          integrationProvider: action.provider,
          integrationRows: [],
          integrationRawText: '',
          rawText: '',
          fileName: null,
          fileKind: 'paste',
          rawFileBase64: null,
          contentType: null,
          sizeBytes: 0,
          sourceManifest: null,
          rowCount: 0,
          parseError: null,
          submitError: null,
        },
      }
    case 'INTAKE_INTEGRATION_ROWS':
      return {
        ...state,
        intake: {
          ...state.intake,
          mode: 'integration',
          integrationRawText: action.rawText,
          integrationRows: action.rows,
          rawText: action.tabularText,
          fileName: `${state.intake.integrationProvider}-integration.json`,
          fileKind: 'csv',
          rawFileBase64: null,
          contentType: 'application/json',
          sizeBytes: action.rawText.length,
          sourceManifest: null,
          rowCount: action.rows.length,
          truncated: false,
          ssnBlockedColumnIndexes: [],
          parseError: action.parseError,
          submitError: null,
        },
      }
    case 'INTAKE_PREVIOUS_SYNC':
      return {
        ...state,
        intake: {
          ...state.intake,
          mode: 'previous_sync',
          previousSyncBatchId: action.batchId,
          rawText: '',
          fileName: null,
          fileKind: 'paste',
          rawFileBase64: null,
          contentType: null,
          sizeBytes: 0,
          sourceManifest: null,
          rowCount: action.batchId ? 1 : 0,
          parseError: null,
          submitError: null,
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

export const INTEGRATION_PROVIDERS: ReadonlyArray<IntegrationProvider> = [
  'karbon',
  'taxdome',
  'soraban',
  'safesend',
  'proconnect',
]

export const PROVIDER_TO_SOURCE: Record<IntegrationProvider, MigrationSource> = {
  taxdome: 'integration_taxdome_zapier',
  karbon: 'integration_karbon_api',
  soraban: 'integration_soraban_api',
  safesend: 'integration_safesend_api',
  proconnect: 'integration_proconnect_export',
}

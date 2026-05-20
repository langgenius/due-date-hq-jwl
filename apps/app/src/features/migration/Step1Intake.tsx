import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { LoaderCircleIcon, LockIcon, UploadCloudIcon } from 'lucide-react'
import readXlsxFile, { type SheetData } from 'read-excel-file/browser'
import type {
  MigrationBatch,
  MigrationExternalEntityType,
  MigrationExternalStagingRowInput,
  MigrationIntegrationProvider,
} from '@duedatehq/contracts'

import { parseTabular, TabularParseError } from '@duedatehq/core/csv-parser'
import { detectSsnColumns } from '@duedatehq/core/pii'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { formatDateTimeWithTimezone } from '@/lib/utils'

import {
  INTEGRATION_PROVIDERS,
  PRESET_IDS,
  type IntakeMode,
  type IntakeState,
  type PresetId,
} from './state'
import {
  PROVIDER_CAPABILITY_BY_PROVIDER,
  PROVIDER_CAPABILITY_TIER_LABELS,
  type ProviderCapabilityTier,
} from './provider-capabilities'

const MAX_FILE_BYTES = 2 * 1024 * 1024

const PRESET_LABELS: Record<PresetId, string> = {
  taxdome: 'TaxDome',
  drake: 'Drake',
  karbon: 'Karbon',
  quickbooks: 'QuickBooks',
  file_in_time: 'File In Time',
}

const PROVIDER_DEFAULT_ENTITY: Record<MigrationIntegrationProvider, MigrationExternalEntityType> = {
  karbon: 'work_item',
  taxdome: 'account',
  soraban: 'organizer',
  safesend: 'delivery',
  proconnect: 'return',
}

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function formatXlsxCell(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toISOString()
  if (typeof cell === 'string') return cell
  if (typeof cell === 'number' || typeof cell === 'boolean' || typeof cell === 'bigint') {
    return String(cell)
  }
  if (typeof cell === 'symbol') return cell.description ?? ''
  return JSON.stringify(cell) ?? ''
}

interface Step1Props {
  density?: 'comfortable' | 'compact' | undefined
  intake: IntakeState
  onText: (
    text: string,
    fileName: string | null,
    options?: {
      fileKind?: IntakeState['fileKind']
      rawFileBase64?: string | null
      contentType?: string | null
      sizeBytes?: number
    },
  ) => void
  onPreset: (preset: PresetId | null) => void
  previousSyncBatches: MigrationBatch[]
  onMode: (mode: IntakeMode) => void
  onIntegrationProvider: (provider: MigrationIntegrationProvider) => void
  onIntegrationRows: (args: {
    rawText: string
    tabularText: string
    rows: MigrationExternalStagingRowInput[]
    parseError: string | null
  }) => void
  onPreviousSync: (batchId: string | null) => void
  onParsed: (args: {
    rowCount: number
    truncated: boolean
    ssnBlockedColumnIndexes: number[]
  }) => void
  onParseError: (error: string | null) => void
}

/**
 * Step 1 Intake — Paste / Upload / Preset chips + SSN block + bad row banner.
 * Authority: docs/product-design/migration-copilot/02-ux-4step-wizard.md §4.
 */
export function Step1Intake({
  density = 'comfortable',
  intake,
  onText,
  onPreset,
  previousSyncBatches,
  onMode,
  onIntegrationProvider,
  onIntegrationRows,
  onPreviousSync,
  onParsed,
  onParseError,
}: Step1Props) {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const pasteId = useId()
  const uploadHintId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileDragDepthRef = useRef(0)
  const fileReadSerialRef = useRef(0)
  const [isFileDragActive, setIsFileDragActive] = useState(false)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const compact = density === 'compact'

  function handleIntegrationText(text: string) {
    try {
      const rows = parseIntegrationRows(text, intake.integrationProvider)
      onIntegrationRows({
        rawText: text,
        tabularText: integrationRowsToTabularText(rows, intake.integrationProvider),
        rows,
        parseError: rows.length === 0 ? t`Add at least one provider record to continue.` : null,
      })
    } catch (err) {
      onIntegrationRows({
        rawText: text,
        tabularText: '',
        rows: [],
        parseError:
          err instanceof Error
            ? err.message
            : t`Paste provider records in the integration handoff format.`,
      })
    }
  }

  function handleIntegrationPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData('text')
    if (!pastedText.trim()) return

    const target = event.currentTarget
    const nextText =
      target.value.slice(0, target.selectionStart) +
      pastedText +
      target.value.slice(target.selectionEnd)
    const normalizedText = normalizeIntegrationJsonText(nextText)
    if (!normalizedText) return

    event.preventDefault()
    handleIntegrationText(normalizedText)
  }

  function resetParsedRows() {
    onParsed({ rowCount: 0, truncated: false, ssnBlockedColumnIndexes: [] })
  }

  function commitText(
    text: string,
    fileName: string | null,
    options: {
      fileKind?: IntakeState['fileKind']
      rawFileBase64?: string | null
      contentType?: string | null
      sizeBytes?: number
    } = {},
  ) {
    onText(text, fileName, options)

    if (!text.trim()) {
      resetParsedRows()
      onParseError(
        fileName
          ? t`That file doesn't contain any rows. Upload a CSV, TSV, or XLSX with a header and at least one data row.`
          : null,
      )
      return
    }

    try {
      const parsed = parseTabular(text, { kind: 'paste' })
      if (parsed.rowCount === 0) {
        resetParsedRows()
        onParseError(
          t`We found a header, but no data rows. Add at least one client row to continue.`,
        )
        return
      }
      const ssn = detectSsnColumns(parsed.headers, parsed.rows)
      onParsed({
        rowCount: parsed.rowCount,
        truncated: parsed.truncated,
        ssnBlockedColumnIndexes: ssn.blockedColumnIndexes,
      })
      onParseError(null)
    } catch (err) {
      const message =
        err instanceof TabularParseError
          ? friendlyParseError(err)
          : t`We couldn't read that file. Try exporting as CSV.`
      resetParsedRows()
      onParseError(message)
    }
  }

  function handleTextChange(text: string) {
    fileReadSerialRef.current += 1
    setIsReadingFile(false)
    commitText(text, null, {
      fileKind: 'paste',
      rawFileBase64: null,
      contentType: null,
      sizeBytes: 0,
    })
  }

  function handleRowsPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData('text')
    if (!pastedText.trim()) return

    const target = event.currentTarget
    const nextText =
      target.value.slice(0, target.selectionStart) +
      pastedText +
      target.value.slice(target.selectionEnd)
    const normalizedText = normalizePastedRowsText(nextText)
    if (!normalizedText) return

    event.preventDefault()
    handleTextChange(normalizedText)
  }

  const ssnBlockedHeaders = useMemo(() => {
    if (intake.ssnBlockedColumnIndexes.length === 0) return [] as string[]
    try {
      const parsed = parseTabular(intake.rawText, { kind: 'paste' })
      return intake.ssnBlockedColumnIndexes
        .map((i) => parsed.headers[i] ?? '')
        .filter((label) => label.length > 0)
    } catch {
      return []
    }
  }, [intake.ssnBlockedColumnIndexes, intake.rawText])

  const integrationProvidersByTier = useMemo(() => {
    const groups = new Map<ProviderCapabilityTier, MigrationIntegrationProvider[]>()
    for (const provider of INTEGRATION_PROVIDERS) {
      const tier = PROVIDER_CAPABILITY_BY_PROVIDER[provider].tier
      groups.set(tier, [...(groups.get(tier) ?? []), provider])
    }
    return groups
  }, [])

  function resetFileDragState() {
    fileDragDepthRef.current = 0
    setIsFileDragActive(false)
  }

  function handleFileDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    fileDragDepthRef.current += 1
    setIsFileDragActive(true)
  }

  function handleFileDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsFileDragActive(true)
  }

  function handleFileDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1)
    if (fileDragDepthRef.current === 0) setIsFileDragActive(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    resetFileDragState()
    const file = event.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  function handleFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) loadFile(file)
    event.target.value = ''
  }

  function loadFile(file: File) {
    const lowerName = file.name.toLowerCase()
    const fileKind: IntakeState['fileKind'] = lowerName.endsWith('.xlsx')
      ? 'xlsx'
      : lowerName.endsWith('.tsv')
        ? 'tsv'
        : 'csv'
    const contentType =
      file.type ||
      (fileKind === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : fileKind === 'tsv'
          ? 'text/tab-separated-values'
          : 'text/csv')
    const readSerial = startFileRead(file, fileKind, contentType)

    if (file.size > MAX_FILE_BYTES) {
      setIsReadingFile(false)
      onParseError(t`File is larger than 2 MB. Please trim or split the export.`)
      return
    }
    if (fileKind === 'xlsx') {
      void loadXlsxFile(file, readSerial, contentType)
      return
    }
    void file
      .text()
      .then((text) => {
        if (!isCurrentFileRead(readSerial)) return
        commitText(text, file.name, {
          fileKind,
          contentType,
          sizeBytes: file.size,
        })
      })
      .catch(() => {
        if (!isCurrentFileRead(readSerial)) return
        resetParsedRows()
        onParseError(t`We couldn't read that file. Try exporting as CSV.`)
      })
      .finally(() => {
        if (isCurrentFileRead(readSerial)) setIsReadingFile(false)
      })
  }

  function startFileRead(
    file: File,
    fileKind: IntakeState['fileKind'],
    contentType: string,
  ): number {
    fileReadSerialRef.current += 1
    setIsReadingFile(true)
    onText('', file.name, {
      fileKind,
      rawFileBase64: null,
      contentType,
      sizeBytes: file.size,
    })
    resetParsedRows()
    onParseError(null)
    return fileReadSerialRef.current
  }

  function isCurrentFileRead(serial: number) {
    return fileReadSerialRef.current === serial
  }

  async function loadXlsxFile(file: File, readSerial: number, contentType: string) {
    try {
      const [sheets, rawFileBase64] = await Promise.all([readXlsxFile(file), fileToBase64(file)])
      if (!isCurrentFileRead(readSerial)) return
      const rows: SheetData = sheets.find((sheet) =>
        sheet.data.some((row) => row.some((cell) => formatXlsxCell(cell).trim() !== '')),
      )?.data ?? [[]]
      const text = rows
        .map((row) =>
          row
            .map((cell) => formatXlsxCell(cell).replaceAll('\t', ' ').replaceAll('\n', ' '))
            .join('\t'),
        )
        .join('\n')
      commitText(text, file.name, {
        fileKind: 'xlsx',
        rawFileBase64,
        contentType,
        sizeBytes: file.size,
      })
    } catch {
      if (!isCurrentFileRead(readSerial)) return
      resetParsedRows()
      onParseError(t`We couldn't read that XLSX file. Try exporting the first sheet as CSV.`)
    } finally {
      if (isCurrentFileRead(readSerial)) setIsReadingFile(false)
    }
  }

  return (
    <div
      className={cn('flex flex-col', compact ? 'gap-3 py-3' : 'gap-5 pt-5 pb-5')}
      id="wizard-step1-body"
    >
      <div className={cn('flex flex-col', compact ? 'gap-0.5' : 'gap-1')}>
        <h2 className={cn('font-semibold text-text-primary', compact ? 'text-md' : 'text-lg')}>
          <Trans>Where is your data coming from?</Trans>
        </h2>
        <p className={cn('text-text-secondary', compact ? 'text-sm' : 'text-md')}>
          <Trans>We&apos;ll figure out the shape — paste or upload, your call.</Trans>
        </p>
        <p className={cn('text-sm text-text-tertiary', compact ? 'hidden lg:block' : '')}>
          <Trans>
            Columns named Estimated tax due, Estimated tax liability, Owner count, or Owners can
            power the penalty exposure preview.
          </Trans>
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t`Import source type`}>
        <SourceModeButton
          compact={compact}
          selected={intake.mode === 'paste' || intake.mode === 'upload'}
          onClick={() => onMode('paste')}
        >
          <Trans>Paste / Upload</Trans>
        </SourceModeButton>
        <SourceModeButton
          compact={compact}
          selected={intake.mode === 'integration'}
          onClick={() => onMode('integration')}
        >
          <Trans>Integration records</Trans>
        </SourceModeButton>
        <SourceModeButton
          compact={compact}
          selected={intake.mode === 'previous_sync'}
          onClick={() => onMode('previous_sync')}
        >
          <Trans>Reuse provider import</Trans>
        </SourceModeButton>
      </div>

      {intake.mode === 'integration' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-divider-regular bg-components-panel-bg p-3">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase">
              <Trans>Integration record source</Trans>
            </span>
            <div className="flex flex-col gap-3">
              {Array.from(integrationProvidersByTier.entries()).map(([tier, providers]) => (
                <div key={tier} className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-text-tertiary">
                    {PROVIDER_CAPABILITY_TIER_LABELS[tier]}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {providers.map((provider) => {
                      const capability = PROVIDER_CAPABILITY_BY_PROVIDER[provider]
                      return (
                        <button
                          key={provider}
                          type="button"
                          aria-pressed={intake.integrationProvider === provider}
                          onClick={() => onIntegrationProvider(provider)}
                          title={capability.helper}
                          className={cn(
                            'inline-flex min-h-9 cursor-pointer items-center rounded-md border px-3 py-1 text-left text-md font-medium transition-colors',
                            intake.integrationProvider === provider
                              ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
                              : 'border-divider-regular bg-background-body text-text-secondary hover:border-state-accent-solid hover:text-text-accent',
                          )}
                        >
                          {capability.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-text-tertiary">
              {PROVIDER_CAPABILITY_BY_PROVIDER[intake.integrationProvider].helper}
            </p>
          </div>
          <Alert variant="warning">
            <AlertTitle>
              <Trans>Imported records still need review</Trans>
            </AlertTitle>
            <AlertDescription>
              <Trans>
                Most provider exports are CSV or XLSX. Use Paste / Upload with an import template
                for those. This path is for records copied from integration tools or converted
                provider reports, and generated obligations still require enough imported facts.
              </Trans>
            </AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${pasteId}-integration`}
              className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase"
            >
              <Trans>Provider client records</Trans>
            </label>
            <Textarea
              id={`${pasteId}-integration`}
              aria-label={t`Paste provider client records`}
              value={intake.integrationRawText}
              onChange={(event) => handleIntegrationText(event.target.value)}
              onPaste={handleIntegrationPaste}
              placeholder={t`Paste client records from an integration tool or converted provider report. For CSV/XLSX exports, switch to Paste / Upload and choose an import template.`}
              className="h-[180px] resize-y bg-background-body font-mono text-base tabular-nums"
            />
          </div>
          <p className="text-sm text-text-tertiary">
            <Trans>
              These choices mark where the records came from and keep source-system IDs for future
              audit and status matching. They do not convert CSV exports into another format.
            </Trans>
          </p>
        </div>
      ) : null}

      {intake.mode === 'previous_sync' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-divider-regular bg-components-panel-bg p-3">
          <span className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase">
            <Trans>Choose a previous provider import</Trans>
          </span>
          {previousSyncBatches.length > 0 ? (
            <div className="grid gap-2">
              {previousSyncBatches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => onPreviousSync(batch.id)}
                  aria-pressed={intake.previousSyncBatchId === batch.id}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                    intake.previousSyncBatchId === batch.id
                      ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
                      : 'border-divider-regular bg-background-body text-text-secondary hover:border-state-accent-solid hover:text-text-accent',
                  )}
                >
                  <span className="font-medium">{batch.source.replace('integration_', '')}</span>
                  <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {batch.rowCount} rows ·{' '}
                    {formatDateTimeWithTimezone(batch.createdAt, practiceTimezone)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-md text-text-secondary">
              <Trans>No previous provider imports are available yet.</Trans>
            </p>
          )}
        </div>
      ) : null}

      {intake.mode === 'paste' || intake.mode === 'upload' ? (
        <div
          className={cn(
            compact ? 'grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]' : 'contents',
          )}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor={pasteId}
              className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase"
            >
              <Trans>Paste rows</Trans>
            </label>
            <div className="rounded-lg border border-divider-regular bg-components-panel-bg p-1 shadow-subtle">
              <Textarea
                id={pasteId}
                aria-label={t`Paste client data`}
                aria-describedby="paste-hint"
                value={intake.rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                onPaste={handleRowsPaste}
                placeholder={t`Paste here — any shape, we'll figure it out. Include the header row if you have one.`}
                className={cn(
                  'resize-y border-0 bg-transparent p-2 font-mono text-base tabular-nums shadow-none focus-visible:ring-0',
                  compact ? 'h-[104px]' : 'h-[142px]',
                )}
              />
            </div>
          </div>

          <div className={cn('flex items-center gap-3', compact ? 'hidden' : '')}>
            <span aria-hidden className="h-px flex-1 bg-divider-regular" />
            <span className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase">
              <Trans>or</Trans>
            </span>
            <span aria-hidden className="h-px flex-1 bg-divider-regular" />
          </div>

          <div className="flex flex-col gap-2">
            {compact ? (
              <span className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase">
                <Trans>Upload file</Trans>
              </span>
            ) : null}
            <div
              role="button"
              tabIndex={0}
              onDrop={handleDrop}
              onDragEnter={handleFileDragEnter}
              onDragOver={handleFileDragOver}
              onDragLeave={handleFileDragLeave}
              onClick={() => fileInputRef.current?.click()}
              aria-describedby={uploadHintId}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                compact ? 'h-[104px] text-sm' : 'h-[120px] text-md',
                isFileDragActive || isReadingFile
                  ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
                  : 'border-divider-regular bg-components-panel-bg text-text-secondary hover:border-state-accent-solid hover:bg-state-accent-hover-alt',
              )}
            >
              {isReadingFile ? (
                <LoaderCircleIcon className="size-5 animate-spin text-text-accent" aria-hidden />
              ) : (
                <UploadCloudIcon
                  className={cn(
                    'size-5',
                    isFileDragActive ? 'text-text-accent' : 'text-text-tertiary',
                  )}
                  aria-hidden
                />
              )}
              <span id={uploadHintId}>
                <Trans>Drop CSV / TSV / XLSX here or click to choose · max 1000 rows · 2 MB</Trans>
              </span>
              {isReadingFile ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="font-mono text-md text-text-accent"
                >
                  <Trans>Reading file…</Trans>
                </span>
              ) : intake.fileName ? (
                <span className="font-mono text-md text-text-secondary tabular-nums">
                  {intake.fileName}
                </span>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onClick={(event) => event.stopPropagation()}
                onChange={handleFilePicked}
              />
            </div>
          </div>

          <div className={cn('flex flex-col gap-2', compact ? 'xl:col-span-2' : '')}>
            <span className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase">
              <Trans>I&apos;m coming from… (optional)</Trans>
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_IDS.map((id) => (
                <PresetChip
                  key={id}
                  id={id}
                  label={PRESET_LABELS[id]}
                  selected={intake.preset === id}
                  compact={compact}
                  onToggle={() => onPreset(intake.preset === id ? null : id)}
                />
              ))}
            </div>
            <p className={cn('text-sm text-text-tertiary', compact ? 'hidden xl:block' : '')}>
              <Trans>
                The AI mapper runs first. Selecting an import template adds source context and
                provides default suggestions if AI is unavailable.
              </Trans>
            </p>
          </div>
        </div>
      ) : null}

      <p
        id="paste-hint"
        className={cn(
          'flex items-center gap-1.5 text-text-tertiary',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        <LockIcon className="size-4" aria-hidden />
        <Trans>We block SSN-like patterns before sending anything to the AI.</Trans>
      </p>

      {intake.ssnBlockedColumnIndexes.length > 0 ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>
            <Trans>SSN-like columns blocked</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>
              We blocked SSN-like patterns to protect your clients. Those columns won&apos;t be sent
              to the AI. Columns flagged: {ssnBlockedHeaders.join(', ')} → forced IGNORE.
            </Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      {intake.truncated ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            <Trans>Row limit hit</Trans>
          </AlertTitle>
          <AlertDescription>
            <Plural
              value={intake.rowCount}
              one="We imported the first 1000 of # row. Split your file to import more."
              other="We imported the first 1000 of # rows. Split your file to import more."
            />
          </AlertDescription>
        </Alert>
      ) : null}

      {intake.parseError ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>
            <Trans>Couldn&apos;t parse the input</Trans>
          </AlertTitle>
          <AlertDescription>{intake.parseError}</AlertDescription>
        </Alert>
      ) : null}

      {intake.submitError ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>
            <Trans>Couldn&apos;t start the import</Trans>
          </AlertTitle>
          <AlertDescription>{intake.submitError}</AlertDescription>
        </Alert>
      ) : null}

      {intake.rowCount > 0 && intake.parseError === null ? (
        <p className="text-md text-text-success">
          <Plural
            value={intake.rowCount}
            one="# row ready to import"
            other="# rows ready to import"
          />
        </p>
      ) : null}
    </div>
  )
}

interface PresetChipProps {
  id: PresetId
  label: string
  selected: boolean
  compact?: boolean | undefined
  onToggle: () => void
}

function PresetChip({ id, label, selected, compact = false, onToggle }: PresetChipProps) {
  const chip = (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-md border font-medium transition-colors',
        compact ? 'h-8 px-2.5 text-sm' : 'h-9 px-3 text-md',
        selected
          ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
          : 'border-divider-regular bg-background-body text-text-secondary hover:border-state-accent-solid hover:text-text-accent',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'block size-1.5 rounded-full transition-colors',
          selected ? 'bg-state-accent-solid' : 'bg-state-accent-solid/60',
        )}
      />
      {label}
    </button>
  )
  if (id === 'file_in_time') {
    return (
      <Tooltip>
        <TooltipTrigger render={chip} />
        <TooltipContent className="max-w-[240px]">
          <Trans>
            Coming from File In Time? We&apos;ll map available calendar fields and flag gaps before
            generating deadlines.
          </Trans>
        </TooltipContent>
      </Tooltip>
    )
  }
  return chip
}

interface SourceModeButtonProps {
  selected: boolean
  compact?: boolean | undefined
  onClick: () => void
  children: ReactNode
}

function SourceModeButton({ selected, compact = false, onClick, children }: SourceModeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center rounded-md border font-medium transition-colors',
        compact ? 'h-8 px-2.5 text-sm' : 'h-9 px-3 text-md',
        selected
          ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
          : 'border-divider-regular bg-background-body text-text-secondary hover:border-state-accent-solid hover:text-text-accent',
      )}
    >
      {children}
    </button>
  )
}

export function parseIntegrationRows(
  text: string,
  provider: MigrationIntegrationProvider,
): MigrationExternalStagingRowInput[] {
  if (!text.trim()) return []
  const records = parseIntegrationRecords(text)
  if (!records) {
    throw new Error('Paste provider records in the integration handoff format.')
  }
  return records.map((record, index) => {
    const rawJson = toPlainRecord(record)
    if (!rawJson) {
      throw new Error(`Record ${index + 1} must be a JSON object.`)
    }
    return {
      externalId: pickString(rawJson, [
        'externalId',
        'external_id',
        'id',
        'Id',
        'ID',
        'workId',
        'work_id',
        'accountId',
        'account_id',
      ]),
      externalUrl: pickUrl(rawJson, [
        'externalUrl',
        'external_url',
        'url',
        'Url',
        'permalink',
        'webUrl',
      ]),
      externalEntityType: inferExternalEntityType(rawJson, provider),
      rawJson,
    }
  })
}

export function normalizeIntegrationJsonText(text: string): string | null {
  try {
    const records = parseIntegrationRecords(text)
    return records ? JSON.stringify(records, null, 2) : null
  } catch {
    return null
  }
}

function parseIntegrationRecords(text: string): unknown[] | null {
  const parsed = parseFlexibleJsonInput(text)
  return integrationRecords(parsed)
}

export function normalizePastedRowsText(text: string): string | null {
  const cleaned = stripMarkdownCodeFence(text).trim()
  if (!cleaned) return null

  const jsonTable = parseJsonRowsToTabularText(cleaned)
  if (jsonTable) return jsonTable

  try {
    const parsed = parseTabular(cleaned, { kind: 'paste' })
    if (parsed.rowCount === 0) return null
    return tabularToTsv(parsed.headers, parsed.rows)
  } catch {
    return null
  }
}

function parseJsonRowsToTabularText(text: string): string | null {
  try {
    const parsed = parseFlexibleJsonInput(text)
    const records = jsonTabularRecords(parsed)
    return records && records.length > 0 ? recordsToTabularText(records) : null
  } catch {
    return null
  }
}

function parseFlexibleJsonInput(text: string): unknown {
  const cleaned = stripMarkdownCodeFence(text).trim()
  const candidates = [cleaned, stripTrailingJsonCommas(cleaned)]

  let firstError: unknown
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown
    } catch (err) {
      firstError ??= err
    }

    const sequence = parseJsonSequence(candidate)
    if (sequence) return sequence.length === 1 ? sequence[0] : sequence
  }

  throw firstError instanceof Error ? firstError : new Error('Invalid JSON input.')
}

function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim().replace(/^\uFEFF/, '')
  const match = /^```[^\r\n]*\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return match ? (match[1] ?? '') : trimmed
}

function stripTrailingJsonCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, '$1')
}

function parseJsonSequence(text: string): unknown[] | null {
  const values: unknown[] = []
  let cursor = 0

  while (cursor < text.length) {
    cursor = skipJsonSequenceSeparators(text, cursor, values.length > 0)
    if (cursor >= text.length) break

    const startChar = text[cursor]
    if (startChar !== '{' && startChar !== '[') return null

    const end = findJsonValueEnd(text, cursor)
    if (end === -1) return null

    try {
      values.push(JSON.parse(text.slice(cursor, end + 1)) as unknown)
    } catch {
      return null
    }
    cursor = end + 1
  }

  return values.length > 0 ? values : null
}

function skipJsonSequenceSeparators(text: string, cursor: number, allowComma: boolean): number {
  let index = cursor
  while (index < text.length) {
    const char = text[index] ?? ''
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (allowComma && char === ',') {
      index += 1
      allowComma = false
      continue
    }
    break
  }
  return index
}

function findJsonValueEnd(text: string, start: number): number {
  const stack: string[] = []
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index] ?? ''

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') {
      stack.push('}')
      continue
    }
    if (char === '[') {
      stack.push(']')
      continue
    }
    if (char === '}' || char === ']') {
      if (stack.pop() !== char) return -1
      if (stack.length === 0) return index
    }
  }

  return -1
}

function jsonTabularRecords(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    const records: Record<string, unknown>[] = []
    for (const item of value) {
      const record = toPlainRecord(item)
      if (record) {
        records.push(record)
        continue
      }

      const nested = jsonTabularRecords(item)
      if (!nested) return null
      records.push(...nested)
    }
    return records
  }

  const record = toPlainRecord(value)
  if (!record) return null
  for (const key of ['records', 'items', 'data', 'results', 'rows']) {
    const records = record[key]
    if (Array.isArray(records)) return jsonTabularRecords(records)
  }
  return [record]
}

function recordsToTabularText(records: readonly Record<string, unknown>[]): string {
  const headers = Array.from(
    new Set(records.flatMap((record) => Object.keys(record).filter((key) => key.trim()))),
  )
  return tabularToTsv(
    headers,
    records.map((record) => headers.map((header) => stringifyRowsCell(record[header]))),
  )
}

function tabularToTsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [
    headers.map((header) => stringifyRowsCell(header)).join('\t'),
    ...rows.map((row) => row.map((cell) => stringifyRowsCell(cell)).join('\t')),
  ].join('\n')
}

function stringifyRowsCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.replaceAll('\t', ' ').replaceAll('\n', ' ')
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value).replaceAll('\t', ' ').replaceAll('\n', ' ')
}

function integrationRecords(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    const records: unknown[] = []
    for (const item of value) {
      if (toPlainRecord(item)) {
        records.push(item)
        continue
      }

      const nested = integrationRecords(item)
      if (!nested) return null
      records.push(...nested)
    }
    return records
  }

  const record = toPlainRecord(value)
  if (!record) return null
  for (const key of ['records', 'items', 'data', 'results']) {
    const records = record[key]
    if (Array.isArray(records)) return integrationRecords(records)
  }
  return [record]
}

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) out[key] = item
  return out
}

function inferExternalEntityType(
  rawJson: Record<string, unknown>,
  provider: MigrationIntegrationProvider,
): MigrationExternalEntityType {
  const explicit = pickString(rawJson, ['externalEntityType', 'external_entity_type', 'type'])
  if (isExternalEntityType(explicit)) return explicit
  return PROVIDER_DEFAULT_ENTITY[provider]
}

function pickString(rawJson: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = rawJson[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function pickUrl(rawJson: Record<string, unknown>, keys: readonly string[]): string | undefined {
  const value = pickString(rawJson, keys)
  if (!value) return undefined
  return /^https?:\/\//i.test(value) ? value : undefined
}

function isExternalEntityType(value: string | undefined): value is MigrationExternalEntityType {
  return (
    value === 'account' ||
    value === 'contact' ||
    value === 'organization' ||
    value === 'work_item' ||
    value === 'client' ||
    value === 'return' ||
    value === 'organizer' ||
    value === 'delivery' ||
    value === 'signature' ||
    value === 'payment' ||
    value === 'unknown'
  )
}

function integrationRowsToTabularText(
  rows: readonly MigrationExternalStagingRowInput[],
  provider: MigrationIntegrationProvider,
): string {
  if (rows.length === 0) return ''
  const rawHeaders = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.rawJson).filter((key) => key.trim()))),
  ).toSorted((a, b) => a.localeCompare(b))
  const headers = [
    'External Provider',
    'External Entity Type',
    'External ID',
    'External URL',
    ...rawHeaders,
  ]
  const body = rows.map((row) =>
    [
      provider,
      row.externalEntityType ?? 'unknown',
      row.externalId ?? '',
      row.externalUrl ?? '',
      ...rawHeaders.map((header) => stringifyIntegrationCell(row.rawJson[header])),
    ].join('\t'),
  )
  return [headers.join('\t'), ...body].join('\n')
}

function stringifyIntegrationCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.replaceAll('\t', ' ').replaceAll('\n', ' ')
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value).replaceAll('\t', ' ').replaceAll('\n', ' ')
}

function friendlyParseError(error: TabularParseError): string {
  switch (error.code) {
    case 'empty_input':
      return 'Paste or upload to continue.'
    case 'no_data_rows':
      return "We couldn't find a header row. Make sure the first line lists your column names."
    case 'xlsx_not_supported':
      return "XLSX couldn't be parsed. Export as CSV and re-upload."
    default:
      return "We couldn't read that file. Try exporting as CSV."
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(reader.error))
    reader.addEventListener('load', () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      resolve(value.includes(',') ? value.split(',').slice(1).join(',') : value)
    })
    reader.readAsDataURL(file)
  })
}

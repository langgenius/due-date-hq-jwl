import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from 'react'
import { msg } from '@lingui/core/macro'
import { type MessageDescriptor } from '@lingui/core'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { LoaderCircleIcon, LockIcon, UploadCloudIcon } from 'lucide-react'
import type { MigrationSourceManifest } from '@duedatehq/contracts'

import { parseTabular, TabularParseError } from '@duedatehq/core/csv-parser'
import { detectSsnColumns } from '@duedatehq/core/pii'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import cchAxcessLogoUrl from './assets/source-logos/cch-axcess.png?url'
import cchProSystemFxLogoUrl from './assets/source-logos/cch-prosystem-fx.png?url'
import drakeLogoUrl from './assets/source-logos/drake.png?url'
import fileInTimeLogoUrl from './assets/source-logos/file-in-time.svg?url'
import karbonLogoUrl from './assets/source-logos/karbon.png?url'
import lacerteLogoUrl from './assets/source-logos/lacerte.png?url'
import proconnectTaxLogoUrl from './assets/source-logos/proconnect-tax.png?url'
import proseriesLogoUrl from './assets/source-logos/proseries.png?url'
import quickbooksLogoUrl from './assets/source-logos/quickbooks.svg?url'
import taxdomeLogoUrl from './assets/source-logos/taxdome.png?url'
import ultrataxCsLogoUrl from './assets/source-logos/ultratax-cs.png?url'
import {
  PRESET_IDS,
  TAX_SOFTWARE_PRESET_IDS,
  type IntakeState,
  type PresetId,
  type PresetSelectionSource,
} from './state'
import {
  prepareUploadFile,
  UnsupportedUploadError,
  unsupportedUploadMessageDescriptor,
} from './intake-files'

const MAX_FILE_BYTES = 5 * 1024 * 1024

const PRESET_LABELS: Record<PresetId, string> = {
  taxdome: 'TaxDome',
  drake: 'Drake',
  karbon: 'Karbon',
  quickbooks: 'QuickBooks',
  file_in_time: 'File In Time',
  cch_axcess: 'CCH Axcess',
  cch_prosystem_fx: 'CCH ProSystem fx',
  lacerte: 'Lacerte',
  proseries: 'ProSeries',
  ultratax_cs: 'UltraTax CS',
  proconnect_tax: 'ProConnect Tax',
}

export const SOURCE_PRESET_IDS: ReadonlyArray<PresetId> = [
  ...PRESET_IDS,
  ...TAX_SOFTWARE_PRESET_IDS,
].toSorted((left, right) => PRESET_LABELS[left].localeCompare(PRESET_LABELS[right], 'en-US'))

const PRESET_LOGOS: Record<
  PresetId,
  {
    src: string
    tileClassName?: string | undefined
    imageClassName?: string | undefined
  }
> = {
  taxdome: { src: taxdomeLogoUrl },
  drake: { src: drakeLogoUrl },
  karbon: { src: karbonLogoUrl },
  quickbooks: { src: quickbooksLogoUrl },
  file_in_time: { src: fileInTimeLogoUrl },
  cch_axcess: { src: cchAxcessLogoUrl },
  cch_prosystem_fx: { src: cchProSystemFxLogoUrl },
  lacerte: { src: lacerteLogoUrl, imageClassName: 'max-w-[30px]' },
  proseries: { src: proseriesLogoUrl },
  ultratax_cs: { src: ultrataxCsLogoUrl },
  proconnect_tax: { src: proconnectTaxLogoUrl },
}

interface PresetExportGuide {
  title: string
  preferredFiles: string
  steps: string[]
  note: string
}

const SOURCE_PRODUCT_LABELS: Record<MigrationSourceManifest['product'], string> = {
  generic: 'Generic',
  drake: 'Drake',
  file_in_time: 'File In Time',
  quickbooks_online: 'QuickBooks Online',
  quickbooks_desktop: 'QuickBooks Desktop',
  taxdome: 'TaxDome',
  karbon: 'Karbon',
  cch_axcess: 'CCH Axcess',
  cch_prosystem_fx: 'CCH ProSystem fx',
  lacerte: 'Lacerte',
  proseries: 'ProSeries',
  ultratax_cs: 'UltraTax CS',
  proconnect_tax: 'ProConnect Tax',
}

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes('Files')
}

type PresetSelectionState = Pick<IntakeState, 'preset' | 'presetSource'>

export function shouldApplyDetectedPreset(
  intake: PresetSelectionState,
  suggestedPreset: PresetId | null,
): suggestedPreset is PresetId {
  return suggestedPreset !== null && (intake.preset === null || intake.presetSource === 'detected')
}

export function shouldOfferDetectedPresetSwitch(
  intake: PresetSelectionState,
  suggestedPreset: PresetId | null,
): suggestedPreset is PresetId {
  return (
    suggestedPreset !== null &&
    intake.preset !== null &&
    intake.presetSource === 'manual' &&
    intake.preset !== suggestedPreset
  )
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
      sourceManifest?: MigrationSourceManifest | null
    },
  ) => void
  onPreset: (preset: PresetId | null, source?: PresetSelectionSource) => void
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
  onParsed,
  onParseError,
}: Step1Props) {
  const { i18n, t } = useLingui()
  const pasteId = useId()
  const uploadHintId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileDragDepthRef = useRef(0)
  const fileReadSerialRef = useRef(0)
  const [isFileDragActive, setIsFileDragActive] = useState(false)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [detectedPresetSuggestion, setDetectedPresetSuggestion] = useState<PresetId | null>(null)
  const compact = density === 'compact'
  const selectedPreset = intake.preset
  const selectedExportGuide = getPresetExportGuide(selectedPreset, i18n)
  const selectedPresetLabel = selectedPreset ? PRESET_LABELS[selectedPreset] : ''
  const detectedPresetSuggestionLabel = detectedPresetSuggestion
    ? PRESET_LABELS[detectedPresetSuggestion]
    : ''

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
      sourceManifest?: MigrationSourceManifest | null
    } = {},
  ) {
    onText(text, fileName, options)

    if (!text.trim()) {
      resetParsedRows()
      onParseError(
        fileName
          ? // 2026-05-25 (Wizard #40 copy polish): action-led.
            // Original led with what's wrong ("that file doesn't
            // contain rows") and made the user infer the fix.
            // New: tell them what to do to recover.
            t`That file has no data rows. Add a header and at least one row, then re-upload.`
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
          ? i18n._(friendlyParseErrorDescriptor(err))
          : t`We couldn't read that file. Try exporting as CSV.`
      resetParsedRows()
      onParseError(message)
    }
  }

  function handleTextChange(text: string) {
    fileReadSerialRef.current += 1
    setIsReadingFile(false)
    setDetectedPresetSuggestion(null)
    commitText(text, null, {
      fileKind: 'paste',
      rawFileBase64: null,
      contentType: null,
      sizeBytes: 0,
      sourceManifest: null,
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
  const sourceManifest = intake.sourceManifest
  const sourceProductLabel = sourceManifest ? SOURCE_PRODUCT_LABELS[sourceManifest.product] : ''
  const sourceWarnings = sourceManifest?.warnings ?? []

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
    const contentType = file.type || 'application/octet-stream'
    const readSerial = startFileRead(file, 'csv', contentType)

    if (file.size > MAX_FILE_BYTES) {
      setIsReadingFile(false)
      onParseError(t`File is larger than 5 MB. Please trim or split the export.`)
      return
    }
    void prepareUploadFile(file)
      .then((prepared) => {
        if (!isCurrentFileRead(readSerial)) return
        const suggestedPreset = prepared.suggestedPreset
        if (shouldApplyDetectedPreset(intake, suggestedPreset)) {
          onPreset(suggestedPreset, 'detected')
          setDetectedPresetSuggestion(null)
        } else if (shouldOfferDetectedPresetSwitch(intake, suggestedPreset)) {
          setDetectedPresetSuggestion(suggestedPreset)
        } else {
          setDetectedPresetSuggestion(null)
        }
        commitText(prepared.text, prepared.fileName, {
          fileKind: prepared.fileKind,
          rawFileBase64: prepared.rawFileBase64,
          contentType: prepared.contentType,
          sizeBytes: prepared.sizeBytes,
          sourceManifest: prepared.sourceManifest,
        })
      })
      .catch((err) => {
        if (!isCurrentFileRead(readSerial)) return
        setDetectedPresetSuggestion(null)
        resetParsedRows()
        if (err instanceof UnsupportedUploadError) {
          // 2026-05-25 (Wizard #40 — MessageDescriptor refactor):
          // render the rejection message through `i18n._()` so it
          // translates with the rest of the wizard. Previously
          // returned the English-only string baked into
          // intake-files.ts.
          onParseError(i18n._(unsupportedUploadMessageDescriptor(err.upload)))
        } else if (err instanceof Error && err.message) {
          onParseError(err.message)
        } else {
          // 2026-05-26 (Step 7 onboarding audit F11-02): the
          // generic fallback recommended "export as CSV" — but
          // the user may have uploaded a CSV that we couldn't
          // parse, in which case the recommendation makes no
          // sense. Rewrote to recommend a structural check
          // (header row + at least one row) that applies to
          // CSV, TSV, XLSX, and JSON equally.
          onParseError(
            t`We couldn't read that file. Make sure it has a header row followed by at least one row of data.`,
          )
        }
      })
      .finally(() => {
        if (isCurrentFileRead(readSerial)) setIsReadingFile(false)
      })
  }

  function handlePresetToggle(id: PresetId) {
    setDetectedPresetSuggestion(null)
    onPreset(intake.preset === id ? null : id, 'manual')
  }

  function switchToDetectedPreset() {
    if (!detectedPresetSuggestion) return
    onPreset(detectedPresetSuggestion, 'manual')
    setDetectedPresetSuggestion(null)
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

  return (
    <div
      className={cn('flex flex-col', compact ? 'gap-3 py-3' : 'gap-4 pt-5 pb-5')}
      id="wizard-step1-body"
    >
      <div className={cn('flex flex-col', compact ? 'gap-0.5' : 'gap-1')}>
        <h2 className={cn('font-semibold text-text-primary', compact ? 'text-base' : 'text-lg')}>
          <Trans>Where is your data coming from?</Trans>
        </h2>
        {/* 2026-05-25 (Yuqi #38 + Wizard #40 copy audit): tightened
            the body. Original ran to 30 words across two clauses
            with awkward "your call" filler. Final version leads
            with the action ("Paste or upload"), drops the filler,
            and lists the high-value columns as a short example
            (the AI mapper handles the rest regardless).
            2026-05-25 (Yuqi Today #25): the column-name examples
            now italicize — they're literal strings the CPA should
            look for in their export ("see if a column matches one
            of these"), not narrative prose. Italics typeset them as
            quoted data tokens without resorting to code-font, which
            would over-state them as identifiers. */}
        {/* 2026-05-25 (Wizard #40 length fix): trimmed "give us
            a head start on payment and penalty context" (wordy +
            abstract) to "help us flag penalty risk" (concrete +
            shorter). "Any shape works" replaces "we'll figure out
            the shape" — both promise the same thing; the
            imperative is tighter. */}
        <p className={cn('text-text-secondary', compact ? 'text-sm' : 'text-base')}>
          <Trans>
            Paste or upload — any shape works. Columns like{' '}
            <em className="font-medium not-italic text-text-primary">Estimated tax due</em>,{' '}
            <em className="font-medium not-italic text-text-primary">Owner count</em>, or{' '}
            <em className="font-medium not-italic text-text-primary">Owners</em> help us flag
            penalty risk.
          </Trans>
        </p>
      </div>

      {/* 2026-05-25 (Yuqi Today #27): dialog and onboarding now use
          the same vertical paste/upload stack. The side-by-side
          dialog treatment made upload read like a separate panel
          instead of the second import option in Step 1. */}
      <div className={cn('flex flex-col gap-3', compact ? 'min-h-0' : '')}>
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
                'h-[104px]',
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase">
            <Trans>Upload file</Trans>
          </span>
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
              'flex h-[104px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 text-center transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none',
              compact ? 'text-sm' : 'text-base',
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
            {/* 2026-05-25 (Wizard #40 copy polish): mixed three
                concerns (file types, action, limits) into one
                run-on line. Split: primary line names the file
                types; secondary line carries the limits with a
                comma-separated 1,000 (readable count notation). */}
            <span id={uploadHintId} className="flex flex-col items-center gap-0.5">
              <span>
                <Trans>Drop a CSV, Excel, ZIP, TXT, or IIF file</Trans>
              </span>
              <span className="font-mono text-xs tabular-nums text-text-tertiary">
                <Trans>Up to 1,000 rows · 5 MB</Trans>
              </span>
            </span>
            {isReadingFile ? (
              <span
                role="status"
                aria-live="polite"
                className="font-mono text-base text-text-accent"
              >
                <Trans>Reading file…</Trans>
              </span>
            ) : intake.fileName ? (
              <span className="font-mono text-base text-text-secondary tabular-nums">
                {intake.fileName}
              </span>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.zip,.iif,.json,.fbk,.qbb,.qbw,.qbm,.cab,.pdf,.xls,.dif,.rtnbak,.rctrl,.dbf,.mdx,.csd,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
              className="hidden"
              onClick={(event) => event.stopPropagation()}
              onChange={handleFilePicked}
            />
          </div>
        </div>
      </div>

      {/* Preset chips live BELOW the paste/upload stack — they're a
          separate "tell us more about your data source" affordance,
          not a third entry method. */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.16em] text-text-tertiary uppercase">
          <Trans>I&apos;m coming from… (optional)</Trans>
        </span>
        <div className="flex flex-wrap gap-2">
          {SOURCE_PRESET_IDS.map((id) => (
            <PresetChip
              key={id}
              id={id}
              label={PRESET_LABELS[id]}
              selected={intake.preset === id}
              compact={compact}
              onToggle={() => handlePresetToggle(id)}
            />
          ))}
        </div>
        {selectedExportGuide && selectedPreset ? (
          <PresetExportGuideCard
            id={selectedPreset}
            label={PRESET_LABELS[selectedPreset]}
            guide={selectedExportGuide}
            uploadedFileName={intake.fileName}
            compact={compact}
          />
        ) : null}
        {/* 2026-05-25 (Wizard #40 copy polish): verb-led, ~30%
            shorter. The original led with "the AI mapper runs
            first" and trailed off with "provides default
            suggestions if AI is unavailable" — three concepts in
            one sentence. New version names the AI path up front
            and clarifies templates as the fallback. Also unifies
            on lowercase "AI mapper" (Step 2 badge uses title-case
            "AI Mapper" as a proper-noun label; here in body
            prose the lowercase form is correct). */}
        <p className={cn('text-sm text-text-tertiary', compact ? 'hidden xl:block' : '')}>
          <Trans>
            Pick a source to add context. The AI mapper runs either way; templates also fill
            defaults if AI is unavailable.
          </Trans>
        </p>
      </div>

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
        /* 2026-05-26 (Step 7 onboarding audit F6-08): trailing
           "→ AI default IGNORE" was developer-shorthand leaking
           into user-facing copy — read as a debug log entry on
           a sensitive trust message. Dropped it; the
           "Those columns won't be sent to the AI" sentence
           already carries the meaning, and the field list now
           ends as prose instead of a console arrow. */
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>
            <Trans>SSN-like columns blocked</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>
              We blocked SSN-like patterns to protect your clients. Those columns won&apos;t be sent
              to the AI. If a flagged column is actually an EIN, choose EIN yourself in Mapping;
              true SSN/ITIN values should stay ignored. Columns flagged:{' '}
              {ssnBlockedHeaders.join(', ')}.
            </Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      {sourceManifest ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            <Trans>Detected export source</Trans>
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <span>
              <Trans>
                Using {sourceProductLabel} data from {sourceManifest.selectedFileName}.
              </Trans>
            </span>
            {sourceWarnings.length > 0 ? (
              <span>{sourceWarnings.map((warning) => warning.message).join(' ')}</span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {detectedPresetSuggestion && selectedPreset ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            <Trans>Preset mismatch</Trans>
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <Trans>
                This file looks like {detectedPresetSuggestionLabel}. Current preset is{' '}
                {selectedPresetLabel}.
              </Trans>
            </span>
            <button
              type="button"
              className="h-8 shrink-0 rounded-sm border border-divider-regular bg-background-body px-2.5 text-sm font-medium text-text-primary outline-none transition hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              onClick={switchToDetectedPreset}
            >
              <Trans>Switch preset</Trans>
            </button>
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
            {/* 2026-05-25 (Wizard #40 copy polish): "the input"
                is developer prose; "your data" matches the
                user's mental model and the rest of the wizard
                ("Couldn't read that file…", "We couldn't…"). */}
            <Trans>Couldn&apos;t read your data</Trans>
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
        <p className="text-base text-text-success">
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
  const logo = PRESET_LOGOS[id]
  // 2026-05-25 (Yuqi Today #27): heights and typography now snap to
  // the canonical Button tokens (h-8 default / h-7 compact, text-sm
  // body, font-medium). The previous h-9 + text-md was an off-scale
  // size unique to this chip, which made the chip row read taller
  // than the inputs above and below. Aligning to Button means these
  // chips visually live in the same "click target" family as the
  // rest of the dialog's primary buttons.
  // 2026-05-25 (Yuqi Today #24): logo tile drops the hardcoded
  // `bg-white ring-black/10`. White-on-white was specifically
  // jarring against PNG logos with non-white backgrounds — the
  // bright square framed each brand mark with a hard rectangle
  // that fought the brand color. Now: subtle bg + divider ring, so
  // transparent/SVG logos integrate, and logos that ship with their
  // own background look intentional rather than awkwardly clipped.
  // Per-brand tile colors can still be overridden via
  // `logo.tileClassName` for marks that need a specific brand
  // surface.
  const chip = (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-md border text-sm font-medium transition-colors',
        compact ? 'h-7 px-2 pl-1.5' : 'h-8 px-3 pl-1.5',
        selected
          ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
          : 'border-divider-regular bg-background-body text-text-secondary hover:border-state-accent-solid hover:text-text-accent',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden rounded-sm bg-background-subtle ring-1 ring-divider-subtle transition-transform',
          compact ? 'size-5' : 'size-5.5',
          logo.tileClassName,
          selected && 'scale-105',
        )}
      >
        <img
          src={logo.src}
          alt=""
          draggable={false}
          className={cn(
            'max-h-[18px] max-w-[22px] object-contain',
            compact && 'max-h-4 max-w-5',
            logo.imageClassName,
          )}
        />
      </span>
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

interface PresetExportGuideCardProps {
  id: PresetId
  label: string
  guide: PresetExportGuide
  uploadedFileName?: string | null
  compact?: boolean | undefined
}

function PresetExportGuideCard({
  id,
  label,
  guide,
  uploadedFileName,
  compact = false,
}: PresetExportGuideCardProps) {
  const logo = PRESET_LOGOS[id]
  const fileBadgeLabel = uploadedFileName ?? guide.preferredFiles

  return (
    <div
      className={cn(
        'rounded-md border border-divider-regular bg-background-subtle px-3 py-2.5',
        compact ? 'space-y-2' : 'space-y-2.5',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* 2026-05-24 (design-system audit): was `rounded-[5px]`, an
            off-scale value with no Tailwind equivalent. `rounded-sm`
            matches the chip variant above and aligns with the app's
            small-logo-tile treatment elsewhere.
            2026-05-25 (Yuqi Today #24): same tile-bg shift as the
            chip variant above — replaced bg-white ring-black/10 with
            subtle bg + divider ring so logos with their own brand
            colour stop fighting a hard white square. */}
        <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-sm bg-background-subtle ring-1 ring-divider-subtle">
          <img
            src={logo.src}
            alt=""
            draggable={false}
            className={cn('max-h-5 max-w-5 object-contain', logo.imageClassName)}
          />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-text-primary">{guide.title}</span>
            <span
              className="inline-block max-w-[min(28rem,100%)] truncate rounded-sm border border-divider-subtle bg-background-body px-1.5 py-0.5 font-mono text-xs text-text-tertiary"
              title={fileBadgeLabel}
            >
              {fileBadgeLabel}
            </span>
          </div>
          <span className="sr-only">{label}</span>
        </div>
      </div>
      <ol className="list-decimal space-y-1 pl-9 text-sm text-text-secondary">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="pl-9 text-xs text-text-tertiary">{guide.note}</p>
    </div>
  )
}

type LinguiI18n = ReturnType<typeof useLingui>['i18n']

function getPresetExportGuide(preset: PresetId | null, i18n: LinguiI18n): PresetExportGuide | null {
  switch (preset) {
    case 'taxdome':
      return {
        title: i18n._(msg`Export TaxDome accounts and contacts`),
        preferredFiles: i18n._(msg`ZIP or CSV`),
        steps: [
          i18n._(
            msg`Go to Clients > Accounts, click the export icon, then download the emailed zipped CSV.`,
          ),
          i18n._(
            msg`Go to Clients > Contacts, click Export contacts, then download that zipped CSV too.`,
          ),
          i18n._(
            msg`Optional: export Workflow > Jobs if you want TaxDome due dates and internal deadlines.`,
          ),
          i18n._(msg`Upload the ZIPs or extracted CSVs so accounts can be matched to contacts.`),
        ],
        note: i18n._(msg`Avoid document archives; they are not client account or contact lists.`),
      }
    case 'drake':
      return {
        title: i18n._(msg`Export Drake client data`),
        preferredFiles: i18n._(msg`CSV or TXT`),
        steps: [
          i18n._(msg`Use Tools > File Maintenance > Export Client/EF Data.`),
          i18n._(
            msg`Choose Export client data files, select Export to CSV for a spreadsheet-friendly file, then Continue.`,
          ),
          i18n._(
            msg`Use Reports > Report Manager > Tax return data only when you need a custom column report.`,
          ),
          i18n._(
            msg`Review SSN-like columns before upload; DueDateHQ blocks those columns from AI mapping.`,
          ),
        ],
        note: i18n._(
          msg`Do not use Backup or Restore for this import; those are for moving Drake data between Drake installs.`,
        ),
      }
    case 'karbon':
      return {
        title: i18n._(msg`Export Karbon contacts`),
        preferredFiles: i18n._(msg`Spreadsheet`),
        steps: [
          i18n._(
            msg`Open Contacts and select the cloud export icon; Admin access may be required.`,
          ),
          i18n._(
            msg`Choose the contact data to download; Karbon saves a spreadsheet to your device.`,
          ),
          i18n._(msg`For deadline history, export Work separately from the Work page cloud icon.`),
        ],
        note: i18n._(msg`Karbon columns vary by firm setup, so keep the header row in the file.`),
      }
    case 'quickbooks':
      return {
        title: i18n._(msg`Export QuickBooks customers`),
        preferredFiles: i18n._(msg`XLSX or IIF`),
        steps: [
          i18n._(
            msg`QuickBooks Online: export from Customers with the Export to Excel icon, or use Reports > Sales and Customers > Customer Contact List.`,
          ),
          i18n._(
            msg`QuickBooks Desktop: open Customer Center, then use Excel > Export Customer List.`,
          ),
          i18n._(
            msg`For Desktop IIF, use File > Utilities > Export > Lists to IIF Files and select Customer List.`,
          ),
          i18n._(
            msg`Upload the customer list file; ZIP exports are okay only if they contain readable customer reports.`,
          ),
        ],
        note: i18n._(msg`Do not upload QBB, QBW, QBM, or CAB backups; those are not client lists.`),
      }
    case 'file_in_time':
      return {
        title: i18n._(msg`Export File In Time client information`),
        preferredFiles: i18n._(msg`TXT, CSV, or Excel`),
        steps: [
          i18n._(
            msg`In the client export/report screen, select the clients and fields to export, then click Export.`,
          ),
          i18n._(msg`For existing tasks or due dates, use Tools > Display Task View in Excel.`),
          i18n._(msg`Upload the exported client file, task-view spreadsheet, or both.`),
        ],
        note: i18n._(msg`Do not upload FBK database backups; export client information instead.`),
      }
    case 'cch_axcess':
      return {
        title: i18n._(msg`Export CCH Axcess clients`),
        preferredFiles: i18n._(msg`CSV, XLS, or XLSX`),
        steps: [
          i18n._(
            msg`Use Dashboard > Application Links > Utilities > Create client list for Portal.`,
          ),
          i18n._(msg`Select Quick Search criteria, run Go, then choose Export.`),
          i18n._(msg`Save the client list as CSV, XLS, or XLSX before uploading.`),
          i18n._(
            msg`Alternative: in Return Manager, run Quick Search with filters set to All, then use Home > Export Grid.`,
          ),
        ],
        note: i18n._(msg`Do not upload RTNBAK or RCTRL return backup files.`),
      }
    case 'cch_prosystem_fx':
      return {
        title: i18n._(msg`Export CCH ProSystem fx clients`),
        preferredFiles: i18n._(msg`CSV, XLS, or XLSX`),
        steps: [
          i18n._(
            msg`Use Create client list for Portal to export a client-list spreadsheet, not Office Manager backup.`,
          ),
          i18n._(msg`Go to Dashboard > Applications > Utilities > Create client list for Portal.`),
          i18n._(msg`Select Quick Search criteria, run Go, then choose Export.`),
          i18n._(msg`Save the client list as CSV, XLS, or XLSX before uploading.`),
        ],
        note: i18n._(
          msg`Office Manager > Backup Client Data creates CLNTBKUP and proprietary ZIP files for tax-software conversion, not DueDateHQ import.`,
        ),
      }
    case 'lacerte':
      return {
        title: i18n._(msg`Export Lacerte clients`),
        preferredFiles: i18n._(msg`CSV`),
        steps: [
          i18n._(msg`In the Clients tab, highlight the clients to export.`),
          i18n._(msg`Use Client > Export > Export to File, then choose Comma Delimited.`),
          i18n._(msg`Save the export as EXPORT.CSV or choose your own CSV file name.`),
          i18n._(
            msg`Include client number, client name, email, phone, address, return type, and preparer fields.`,
          ),
        ],
        note: i18n._(
          msg`Do not use Client > Backup for this import; backups and IDATA/DBF/MDX files are return-data files, not client-list CSVs.`,
        ),
      }
    case 'proseries':
      return {
        title: i18n._(msg`Export ProSeries contacts`),
        preferredFiles: i18n._(msg`HomeBase contacts CSV`),
        steps: [
          i18n._(msg`Open HomeBase View and make sure you are not inside a client return.`),
          i18n._(
            msg`Optionally customize HomeBase columns for client status, return type, address, phone, email, and preparer.`,
          ),
          i18n._(
            msg`Use HomeBase > Export Contacts, then upload the exported contacts CSV; the file name can be anything.`,
          ),
        ],
        note: i18n._(
          msg`Do not use File > Client File Maintenance > Copy/Backup for this import; that backs up return files such as YYi, YYp, YYc, or YYs.`,
        ),
      }
    case 'ultratax_cs':
      return {
        title: i18n._(msg`Export UltraTax CS client reports`),
        preferredFiles: i18n._(msg`XLS or DIF`),
        steps: [
          i18n._(msg`Use Utilities > Client Listing Reports.`),
          i18n._(
            msg`Choose Client Contact, General Client Information, or General Return Information, then select clients.`,
          ),
          i18n._(msg`Export to Excel 97-2003 Workbook and include column headings when prompted.`),
        ],
        note: i18n._(msg`Do not upload CSD client data files; export a listing report instead.`),
      }
    case 'proconnect_tax':
      return {
        title: i18n._(msg`Export ProConnect Tax clients`),
        preferredFiles: i18n._(msg`XLSX or CSV`),
        steps: [
          i18n._(msg`For the client list, open Clients and use the top-right download arrow.`),
          i18n._(msg`Export the client list to Excel; it includes client names and addresses.`),
          i18n._(
            msg`For return facts, use Reporting > Download return data to download the eligible e-filed return CSV.`,
          ),
          i18n._(
            msg`For supplemental organizer data, open Intuit Link and download client responses as CSV.`,
          ),
        ],
        note: i18n._(
          msg`Reporting CSV covers only supported e-filed federal returns; Intuit Link document ZIPs are not a primary client list.`,
        ),
      }
  }
  return null
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

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) out[key] = item
  return out
}

/**
 * 2026-05-25 (Wizard #40 — i18n bug fix): `friendlyParseError`
 * used to return bare English strings, which then rendered
 * untranslated into the parse-error `<Alert>` at L597. Now
 * returns a Lingui `MessageDescriptor` produced via the `msg`
 * macro so callers can render through `i18n._()` at React
 * render time. Same shape as `unsupportedUploadMessageDescriptor`
 * in `intake-files.ts`.
 */
function friendlyParseErrorDescriptor(error: TabularParseError): MessageDescriptor {
  switch (error.code) {
    case 'empty_input':
      return msg`Paste or upload to continue.`
    case 'no_data_rows':
      return msg`We couldn't find a header row. Make sure the first line lists your column names.`
    case 'xlsx_not_supported':
      return msg`XLSX couldn't be parsed. Export as CSV and re-upload.`
    default:
      // 2026-05-26 (Step 7 onboarding audit F11-02): the
      // default fallback recommended "Try exporting as CSV"
      // even when the user had already uploaded a CSV — the
      // recommendation didn't match the situation. Rewrote to
      // a structural check that applies regardless of source
      // format. The xlsx_not_supported branch above keeps its
      // CSV-specific recommendation because that *is* the
      // right answer for XLSX failures.
      return msg`We couldn't read that file. Make sure it has a header row followed by at least one row of data.`
  }
}

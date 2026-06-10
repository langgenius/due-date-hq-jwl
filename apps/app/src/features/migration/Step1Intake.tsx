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
import { AnimatePresence, motion } from 'motion/react'
import {
  FileCheck2Icon,
  LoaderCircleIcon,
  LockIcon,
  OctagonAlertIcon,
  ShuffleIcon,
  UploadCloudIcon,
} from 'lucide-react'
import type { MigrationSourceManifest } from '@duedatehq/contracts'

import { parseTabular, TabularParseError } from '@duedatehq/core/csv-parser'
import { detectSsnColumns } from '@duedatehq/core/pii'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
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

// Calm ease-out curve for the empty→detection state swap. ~280ms, no
// bounce. Matches the brief's confident-typewriter motion principle.
const STATE_TRANSITION = {
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
}

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
 * Step 1 Intake — Two states, one primary affordance each.
 *
 * Empty state: dominant dropzone + quiet paste swap + collapsed source chips.
 * Detection state: compact file card + hero detection readout + continue.
 *
 * Step 1 collapses to two states. The export guide is a per-chip
 * progressive disclosure — only shown when a user clicks a chip without
 * having uploaded anything yet ("I need help exporting first"). Detection
 * surfaces as a single tabular-num readout, not a banner footnote.
 *
 * Authority: docs/product-design/migration-copilot/02-ux-4step-wizard.md §4
 * + .impeccable.md design principles 1–4.
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
  // Paste mode is opt-in. Empty state shows the dropzone by default;
  // user clicks "Paste a list instead →" to swap to the textarea. Never
  // both side-by-side — one primary affordance per state.
  const [pasteMode, setPasteMode] = useState(false)
  // Export-guide disclosure per chip. Only opens when the user explicitly
  // asks ("I need help exporting first") in the empty state — never
  // auto-expands.
  const [openGuidePreset, setOpenGuidePreset] = useState<PresetId | null>(null)
  const compact = density === 'compact'
  const selectedPreset = intake.preset
  const selectedPresetLabel = selectedPreset ? PRESET_LABELS[selectedPreset] : ''
  const detectedPresetSuggestionLabel = detectedPresetSuggestion
    ? PRESET_LABELS[detectedPresetSuggestion]
    : ''

  const hasIntake = intake.rawText.length > 0 || intake.fileName !== null || isReadingFile
  const sourceManifest = intake.sourceManifest
  const sourceProductLabel = sourceManifest ? SOURCE_PRODUCT_LABELS[sourceManifest.product] : ''
  const sourceWarnings = sourceManifest?.warnings ?? []

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
          ? t`That file has no data rows. Add a header and at least one row, then re-upload.`
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
          onParseError(i18n._(unsupportedUploadMessageDescriptor(err.upload)))
        } else if (err instanceof Error && err.message) {
          onParseError(err.message)
        } else {
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
    const next = intake.preset === id ? null : id
    onPreset(next, 'manual')
    // Per-chip disclosure: toggling a chip opens its export guide.
    // Untoggling clears the disclosure.
    setOpenGuidePreset(next === null ? null : id)
  }

  function switchToDetectedPreset() {
    if (!detectedPresetSuggestion) return
    onPreset(detectedPresetSuggestion, 'manual')
    setDetectedPresetSuggestion(null)
  }

  function handleRemoveFile() {
    fileReadSerialRef.current += 1
    setIsReadingFile(false)
    setDetectedPresetSuggestion(null)
    setPasteMode(false)
    onText('', null, {
      fileKind: 'paste',
      rawFileBase64: null,
      contentType: null,
      sizeBytes: 0,
      sourceManifest: null,
    })
    resetParsedRows()
    onParseError(null)
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
      className={cn('flex flex-col', compact ? 'gap-4 py-3' : 'gap-6 pt-5 pb-5')}
      id="wizard-step1-body"
    >
      {/* 2026-05-29 (Yuqi — "click to reupload?"): the OS file picker
          input lives at the section root so it's always mounted —
          both the empty-state dropzone AND the uploaded-state
          DetectionHero card trigger it via the same fileInputRef.
          Previously the input was nested inside the empty-state
          dropzone, which meant the ref dangled in the uploaded
          state. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.zip,.iif,.json,.fbk,.qbb,.qbw,.qbm,.cab,.pdf,.xls,.dif,.rtnbak,.rctrl,.dbf,.mdx,.csd,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
        className="hidden"
        onClick={(event) => event.stopPropagation()}
        onChange={handleFilePicked}
      />
      <AnimatePresence mode="wait" initial={false}>
        {hasIntake ? (
          <motion.div
            key="detection"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={STATE_TRANSITION}
            className="flex flex-col gap-5"
          >
            <DetectionHero
              fileName={intake.fileName}
              sizeBytes={intake.sizeBytes}
              isReadingFile={isReadingFile}
              rowCount={intake.rowCount}
              sourceManifest={sourceManifest}
              sourceProductLabel={sourceProductLabel}
              selectedPresetLabel={selectedPresetLabel}
              parseError={intake.parseError}
              onRemove={handleRemoveFile}
              // 2026-05-29 (Yuqi — "click to reupload?"): the uploaded
              // card now accepts clicks to re-open the OS file picker.
              // Threads through the same file-input ref used by the
              // empty-state dropzone — see the always-mounted <input>
              // below.
              onReupload={() => fileInputRef.current?.click()}
              // 2026-06-07 (Cluster 3 — design Ni54l): "Use Generic CSV
              // instead" recovery on the reject state. Clears any selected
              // import preset and re-opens the picker so the file is
              // re-attempted as a plain CSV/Excel parse.
              onUseGenericCsv={() => {
                onPreset(null)
                onParseError(null)
                fileInputRef.current?.click()
              }}
              hasPreset={selectedPreset !== null}
              compact={compact}
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={STATE_TRANSITION}
            className="flex flex-col gap-6"
          >
            {/* 2026-05-29 (R4 migration polish #6): the "Drop your
                client file." h2 + "Any shape works. We'll figure
                out the columns." sub-headline were a third title in
                the orientation zone — the wizard frame's <header>
                already says "Import clients" and the Stepper says
                "Intake". The dropzone label below ("Drop a file or
                click to browse" + the format/limit line) is the
                actual affordance and covers the action. The "any
                shape works" promise lives downstream: Step 2
                (Mapping) is where the AI's column-detection result
                shows up, which is where the reassurance becomes
                observable rather than just promised. */}

            {/* Primary affordance — large, centered. ~60% of the wizard
                body height via aspect ratio. Swaps to a textarea when
                the user clicks "Paste a list instead". */}
            {pasteMode ? (
              <div className="flex flex-col gap-2">
                <label htmlFor={pasteId} className="sr-only">
                  <Trans>Paste client rows</Trans>
                </label>
                <div className="rounded-lg border border-divider-regular bg-components-panel-bg p-1 shadow-subtle">
                  <Textarea
                    id={pasteId}
                    aria-label={t`Paste client rows`}
                    aria-describedby="paste-hint"
                    autoFocus
                    value={intake.rawText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onPaste={handleRowsPaste}
                    placeholder={t`Paste here — any shape, we'll figure it out. Include the header row if you have one.`}
                    className={cn(
                      'resize-y border-0 bg-transparent p-3 font-mono text-base tabular-nums shadow-none focus-visible:ring-0',
                      compact ? 'h-[140px]' : 'h-[160px]',
                    )}
                  />
                </div>
                {/* 2026-05-31: swapped hand-rolled muted-link button for
                    TextLink variant="muted" size="sm". Muted variant's
                    text-text-muted/tertiary hover pair is the canonical
                    quieter-than-accent inline-link treatment; tone shift
                    from text-tertiary→text-accent at this site is
                    acceptable in favor of consolidation. */}
                <TextLink
                  variant="muted"
                  size="sm"
                  onClick={() => setPasteMode(false)}
                  className="self-start"
                >
                  <Trans>← Upload a file instead</Trans>
                </TextLink>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
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
                    'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none',
                    compact ? 'h-[140px] px-6 py-5' : 'h-[160px] px-8 py-6',
                    isFileDragActive
                      ? 'border-state-accent-solid bg-state-accent-hover-alt text-text-accent'
                      : 'border-divider-regular bg-components-panel-bg text-text-secondary hover:border-state-accent-solid hover:bg-state-accent-hover-alt',
                  )}
                >
                  <UploadCloudIcon
                    className={cn(
                      'size-9',
                      isFileDragActive ? 'text-text-accent' : 'text-text-tertiary',
                    )}
                    aria-hidden
                  />
                  <span id={uploadHintId} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'font-medium text-text-primary',
                        compact ? 'text-base' : 'text-lg',
                      )}
                    >
                      <Trans>Drop a file or click to browse</Trans>
                    </span>
                    <span className="text-sm text-text-tertiary">
                      <Trans>CSV, Excel, ZIP, TXT, or IIF · up to 1,000 rows · 5 MB</Trans>
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPasteMode(true)}
                  className="text-sm text-text-tertiary underline-offset-2 hover:text-text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt rounded-sm cursor-pointer"
                >
                  <Trans>Paste a list instead →</Trans>
                </button>
              </div>
            )}

            {/* Quiet source row at the bottom. Smaller weight, lower in
                the visual hierarchy. Per-chip disclosure opens the
                export guide only when the user explicitly toggles a chip
                without uploading — the brief's "acknowledging I need help
                exporting first" affordance.

                2026-05-29 (R4 follow-up #2): dropped the `border-t` rule
                that used to sit above this section. The motion.div
                already has `gap-6` separating its children, which gives
                enough vertical breathing room without a hard horizontal
                line cutting the empty-state panel into two halves. */}
            <div className="flex flex-col gap-2">
              {/* 2026-05-29 (R4 migration polish #9): clarified that
                  the picker is only needed when auto-detection isn't
                  going to fire (paste path, generic CSV, no logo
                  signature). When a user drops a Drake export into
                  the dropzone above, the source-manifest pipeline
                  already detects it — the chip would have toggled
                  itself. Telling the user that up front prevents
                  the "did I already say Drake?" double-step.

                  2026-05-29 (R4 follow-up #3): label was `text-xs`
                  which read smaller than the dropzone helper line
                  above and undersold the section. Bumped to
                  `text-sm` so the picker prompt sits at body type. */}
              <span className="text-sm text-text-tertiary">
                <Trans>
                  Coming from a specific tool? (Optional — we auto-detect from uploaded files.)
                </Trans>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_PRESET_IDS.map((id) => (
                  <PresetChip
                    key={id}
                    id={id}
                    label={PRESET_LABELS[id]}
                    selected={intake.preset === id}
                    compact
                    onToggle={() => handlePresetToggle(id)}
                  />
                ))}
              </div>
              <AnimatePresence initial={false}>
                {openGuidePreset && selectedPreset === openGuidePreset
                  ? (() => {
                      const guide = getPresetExportGuide(openGuidePreset, i18n)
                      if (!guide) return null
                      return (
                        <motion.div
                          key={openGuidePreset}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={STATE_TRANSITION}
                          className="overflow-hidden"
                        >
                          <PresetExportGuideCard
                            id={openGuidePreset}
                            label={PRESET_LABELS[openGuidePreset]}
                            guide={guide}
                            uploadedFileName={intake.fileName}
                            compact={compact}
                          />
                        </motion.div>
                      )
                    })()
                  : null}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2026-05-29 (R4 migration polish, follow-up): SSN privacy
          chip lifted out of the empty state so it ALSO renders in
          the uploaded state. The chip is forward-looking
          ("blocked before anything goes to the AI") — the AI runs
          on Continue, which is after both states. Suppressed when
          the destructive SSN-detected alert below takes over,
          since the alert carries a stronger version of the same
          claim with the specific column names. Also suppressed
          for parse-error and submit-error states so it doesn't
          compete with the error message.

          2026-05-29 (R4 follow-up #4 — "ugly highlight"): dropped the
          `bg-state-accent-hover-alt` + `ring-1 ring-state-accent-active-alt`
          chip surface. The accent-tint background was loud enough to
          read as a status banner, which then competed with the real
          status banners (`<Alert>`) rendered below this region.
          Privacy reassurance is information, not status — restyled as
          a centered inline line with a small lock icon, no background,
          no ring. Reads as a quiet footnote to the dropzone above. */}
      {intake.ssnBlockedColumnIndexes.length === 0 && !intake.parseError && !intake.submitError ? (
        <p
          id="paste-hint"
          className="mx-auto inline-flex items-center gap-1.5 text-sm text-text-tertiary"
        >
          <LockIcon className="size-3.5 shrink-0" aria-hidden />
          <Trans>SSN-like columns are blocked before anything goes to the AI.</Trans>
        </p>
      ) : null}

      {/* Stable status region — lives outside AnimatePresence so warnings
          don't get re-mounted across state changes. */}
      {intake.ssnBlockedColumnIndexes.length > 0 ? (
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

      {sourceWarnings.length > 0 ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            <Trans>Notes on this file</Trans>
          </AlertTitle>
          <AlertDescription>
            {sourceWarnings.map((warning) => warning.message).join(' ')}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 2026-05-27: detection-mismatch is rendered as an Override
          affordance inside the DetectionHero rather than a standalone
          banner. The brief asks for a quiet "Wrong source? Override →"
          link — this Alert remains as a fallback for the manual-vs-
          detected mismatch case so the user keeps the explicit choice. */}
      {detectedPresetSuggestion && selectedPreset && hasIntake ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>
            <Trans>Different source detected</Trans>
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <Trans>
                This file looks like {detectedPresetSuggestionLabel}. Current preset is{' '}
                {selectedPresetLabel}.
              </Trans>
            </span>
            {/* 2026-05-31: swapped the bespoke h-8 outlined chip for
                Button variant="secondary" size="sm". The hand-rolled
                border + bg + text-sm/font-medium recipe is exactly what
                secondary+sm produces, so the override classes can go. */}
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={switchToDetectedPreset}
            >
              <Trans>Switch preset</Trans>
            </Button>
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

      {intake.submitError ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>
            <Trans>Couldn&apos;t start the import</Trans>
          </AlertTitle>
          <AlertDescription>{intake.submitError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

interface DetectionHeroProps {
  fileName: string | null
  sizeBytes: number
  isReadingFile: boolean
  rowCount: number
  sourceManifest: MigrationSourceManifest | null
  sourceProductLabel: string
  selectedPresetLabel: string
  parseError: string | null
  onRemove: () => void
  // 2026-05-29 (Yuqi — "click to reupload?"): opens the OS file
  // picker; parent owns the hidden <input> ref so the same picker
  // serves both empty and uploaded states.
  onReupload: () => void
  // 2026-06-07 (Cluster 3 — design Ni54l): reject-state recovery.
  onUseGenericCsv: () => void
  hasPreset: boolean
  compact: boolean
}

/**
 * The detection-state hero. One readout. Sharp typography, tabular-nums,
 * bullet separators. Example shape:
 *
 *   Drake export · 30 clients · 4 entity types · 12 states
 *
 * If the AI is still reading the file: "Reading file…" with a spinner,
 * same line. If the AI is uncertain (confidence < 0.7): the readout
 * stays cautious ("Looks like Drake or Lacerte — pick one.") with two
 * chips. If parsing failed: an error Alert renders in the slot.
 *
 * 2026-05-29 (R4 migration polish, follow-up): restructured to mirror
 * the empty-state dropzone shape. The empty state is a single centered
 * hero card (dashed border, ~160px tall, soft surface) — the uploaded
 * state was a left-aligned compact row + bold readout that read as a
 * different page. Now both states share the same shell: a centered card
 * with an icon at top, a hero readout, supporting file/source info, and
 * a quiet action link. The dashed→solid border swap is the only visual
 * difference — same surface, same alignment, same size, same rhythm.
 */
function DetectionHero({
  fileName,
  sizeBytes,
  isReadingFile,
  rowCount,
  sourceManifest,
  sourceProductLabel,
  selectedPresetLabel,
  parseError,
  onRemove,
  onReupload,
  onUseGenericCsv,
  hasPreset,
  compact,
}: DetectionHeroProps) {
  const { t } = useLingui()
  const fileSizeLabel = useMemo(() => formatBytes(sizeBytes), [sizeBytes])

  if (parseError) {
    // 2026-06-07 (Cluster 3 — design Ni54l "file rejected"): the generic
    // parse-error Alert was restyled to the design's reject callout —
    // OctagonAlert icon + "Source format unrecognized" framing + a
    // "Use Generic CSV instead" recovery action.
    // TODO(data): the design also shows a structured "MISSING REQUIRED
    // COLUMNS (10 of 14)" panel listing each missing column. The parser
    // (packages/core csv-parser) only throws a generic message and does
    // not expose which required columns are missing, so the per-column
    // list can't be built UI-only — it needs parser/contract changes.
    // Flagged in the report.
    return (
      <div className="flex flex-col gap-3">
        <FileSummaryRow
          fileName={fileName}
          fileSizeLabel={fileSizeLabel}
          sizeBytes={sizeBytes}
          isReadingFile={false}
          onRemove={onRemove}
        />
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <OctagonAlertIcon />
          <AlertTitle>
            {hasPreset ? (
              <Trans>Source format unrecognized</Trans>
            ) : (
              <Trans>Couldn&apos;t read your data</Trans>
            )}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{parseError}</span>
            {hasPreset ? (
              <Button variant="secondary" size="sm" className="w-fit" onClick={onUseGenericCsv}>
                <ShuffleIcon data-icon="inline-start" />
                <Trans>Use Generic CSV instead</Trans>
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // 2026-05-29 (Yuqi — "click to reupload?"): the card is now a
  // clickable button that re-opens the OS file picker so a user
  // who realises they dropped the wrong file can swap it without
  // first hitting Remove. Disabled while still reading so a mid-
  // upload click doesn't race the parse. Keyboard activation
  // (Enter/Space) mirrors the empty-state dropzone. The "Remove
  // file" link below stays as a separate explicit affordance for
  // the "just go back to empty" path.
  const cardInteractive = !isReadingFile

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={cardInteractive ? onReupload : undefined}
        disabled={!cardInteractive}
        aria-label={t`Replace this file`}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-divider-regular bg-components-panel-bg text-center outline-none transition-colors',
          compact ? 'px-6 py-5' : 'px-8 py-6',
          cardInteractive
            ? 'cursor-pointer hover:border-state-accent-solid hover:bg-state-accent-hover-alt focus-visible:ring-2 focus-visible:ring-state-accent-active-alt'
            : 'cursor-default',
        )}
      >
        {isReadingFile ? (
          <LoaderCircleIcon className="size-9 shrink-0 animate-spin text-text-accent" aria-hidden />
        ) : (
          <FileCheck2Icon className="size-9 shrink-0 text-text-success" aria-hidden />
        )}

        {isReadingFile ? (
          <p
            role="status"
            aria-live="polite"
            className={cn('font-medium text-text-secondary', compact ? 'text-base' : 'text-lg')}
          >
            <Trans>Reading file…</Trans>
          </p>
        ) : sourceManifest && rowCount > 0 ? (
          <DetectionReadout
            productLabel={sourceProductLabel}
            rowCount={rowCount}
            confidence={sourceManifest.confidence}
            compact={compact}
          />
        ) : rowCount > 0 ? (
          <p
            className={cn(
              'font-medium tabular-nums text-text-primary',
              compact ? 'text-base' : 'text-lg',
            )}
          >
            <Plural
              value={rowCount}
              one="# client ready to import"
              other="# clients ready to import"
            />
          </p>
        ) : null}

        {/* File name + size + Remove sit BELOW the hero readout as
            supporting info — the readout is the hero, the file is
            its provenance. Mirrors the empty-state dropzone's
            "label + format constraints" hierarchy. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {fileName ? (
            <span className="truncate font-mono text-sm tabular-nums text-text-tertiary">
              {fileName}
            </span>
          ) : null}
          {sizeBytes > 0 ? (
            <>
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
              <span className="font-mono text-xs tabular-nums text-text-tertiary">
                {fileSizeLabel}
              </span>
            </>
          ) : null}
        </div>
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-text-tertiary underline-offset-2 outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt rounded-sm cursor-pointer"
      >
        <Trans>Remove file</Trans>
      </button>

      {selectedPresetLabel && !isReadingFile ? (
        <p className="text-xs text-text-tertiary">
          <Trans>Source set to {selectedPresetLabel}.</Trans>
        </p>
      ) : null}
    </div>
  )
}

/**
 * Parse-error fallback file row — kept compact because the error
 * Alert below is the primary focus, not the file metadata.
 */
function FileSummaryRow({
  fileName,
  fileSizeLabel,
  sizeBytes,
  isReadingFile,
  onRemove,
}: {
  fileName: string | null
  fileSizeLabel: string
  sizeBytes: number
  isReadingFile: boolean
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-divider-regular bg-components-panel-bg px-3 py-2 shadow-subtle">
      <div className="flex min-w-0 items-center gap-2.5">
        {isReadingFile ? (
          <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-text-accent" aria-hidden />
        ) : (
          <UploadCloudIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
        )}
        <span className="truncate font-mono text-sm tabular-nums text-text-primary">
          {fileName ?? ''}
        </span>
        {sizeBytes > 0 ? (
          <span className="shrink-0 font-mono text-xs tabular-nums text-text-tertiary">
            {fileSizeLabel}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 cursor-pointer rounded-sm text-sm text-text-tertiary underline-offset-2 outline-none hover:text-text-accent hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <Trans>Remove</Trans>
      </button>
    </div>
  )
}

interface DetectionReadoutProps {
  productLabel: string
  rowCount: number
  confidence: number
  compact: boolean
}

/**
 * The numbers-as-protagonists readout. Tabular-nums, bullet separators,
 * confident statement of fact. Lowers in size on compact density but
 * never drops below text-lg — this is the hero of the detection state.
 */
function DetectionReadout({ productLabel, rowCount, compact }: DetectionReadoutProps) {
  // 2026-05-27: we currently don't have entity-type/state counts wired
  // through from the manifest in this scope — the brief's example
  // "30 clients · 4 entity types · 12 states" requires fields we'd
  // need to surface from intake-files.ts (out of scope). For now we
  // show product · row count, which is the most truthful pair the
  // current contract supports without expanding scope.
  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          'flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-medium tabular-nums text-text-primary',
          compact ? 'text-lg' : 'text-2xl',
        )}
      >
        <span>
          <Trans>{productLabel} export</Trans>
        </span>
        <span aria-hidden className="text-text-tertiary">
          ·
        </span>
        <span>
          <Plural value={rowCount} one="# client" other="# clients" />
        </span>
      </p>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const chip = (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-lg border text-sm font-medium transition-colors',
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
        'rounded-lg border border-divider-regular bg-background-subtle px-3 py-2.5',
        compact ? 'space-y-2' : 'space-y-2.5',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
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
 * 2026-05-25 (Wizard #40 — i18n bug fix): `friendlyParseError` used to
 * return bare English strings, which then rendered untranslated into the
 * parse-error `<Alert>`. Now returns a Lingui `MessageDescriptor` produced
 * via the `msg` macro so callers can render through `i18n._()` at React
 * render time. Same shape as `unsupportedUploadMessageDescriptor` in
 * `intake-files.ts`.
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
      return msg`We couldn't read that file. Make sure it has a header row followed by at least one row of data.`
  }
}

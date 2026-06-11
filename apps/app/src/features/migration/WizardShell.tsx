import { useState, type ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, CheckIcon, HistoryIcon, LoaderCircleIcon, XIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Card } from '@duedatehq/ui/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAppHotkey, isEditableEventTarget } from '@/components/patterns/keyboard-shell'
import { KbdHint } from '@/components/patterns/kbd'
import { ConceptLabel } from '@/features/concepts/concept-help'

import { Stepper } from './Stepper'
import type { StepIndex } from './state'

type WizardTransitionPhase = 'intake' | 'mapping' | 'rerun_mapper' | 'normalize' | 'import'

export interface WizardTransitionState {
  phase: WizardTransitionPhase
  activeIndex: number
}

interface WizardFrameProps {
  step: StepIndex
  busy: boolean
  transition?: WizardTransitionState | null | undefined
  layout?: 'dialog' | 'route' | undefined
  canContinue: boolean
  continueLabel?: ReactNode | undefined
  onBack?: (() => void) | undefined
  onContinue: () => void
  onRequestClose: () => void
  showCloseControl?: boolean | undefined
  /**
   * Opens the Import history surface from the header (design SLw8Q/dCUv7
   * "Import history" ghost button). When omitted, the header button is
   * not rendered.
   */
  onOpenImportHistory?: (() => void) | undefined
  closeLabel?: ReactNode | undefined
  closeShortcutLabel?: string | undefined
  hotkeysEnabled?: boolean | undefined
  backDisabled?: boolean | undefined
  children: ReactNode
}

interface WizardShellProps extends Omit<WizardFrameProps, 'onRequestClose'> {
  open: boolean
  onClose: () => void
  confirmOnClose: boolean
}

interface WizardRouteShellProps extends Omit<WizardFrameProps, 'onRequestClose'> {
  intro: ReactNode | ((actions: { onSkip: () => void }) => ReactNode)
  onClose: () => void
  confirmOnClose: boolean
}

function WizardFrame({
  step,
  busy,
  transition,
  layout = 'dialog',
  canContinue,
  continueLabel,
  onBack,
  onContinue,
  onRequestClose,
  showCloseControl = true,
  onOpenImportHistory,
  closeLabel,
  closeShortcutLabel,
  hotkeysEnabled = true,
  backDisabled,
  children,
}: WizardFrameProps) {
  const { t } = useLingui()

  useAppHotkey('Escape', requestClose, {
    enabled: hotkeysEnabled && !busy,
    requireReset: true,
    // Multiple Escape handlers ship across the app (wizard, queue
    // drawer, rule review). They're context-scoped via `enabled` and
    // mutually exclusive in practice, so the global default 'warn'
    // logs noise without catching real bugs. Opt this one out.
    conflictBehavior: 'allow',
    meta: {
      id: 'wizard.escape',
      name: 'Close wizard',
      description: 'Close the wizard or open the discard import confirmation.',
      category: 'wizard',
      scope: 'overlay',
    },
  })

  useAppHotkey(
    'Enter',
    (event) => {
      if (isEditableEventTarget(event.target)) return
      onContinue()
    },
    {
      enabled: hotkeysEnabled && canContinue && !busy,
      requireReset: true,
      ignoreInputs: false,
      meta: {
        id: 'wizard.continue',
        name: 'Continue wizard',
        description: 'Advance the current migration step.',
        category: 'wizard',
        scope: 'overlay',
      },
    },
  )

  return (
    // The outer frame uses the canonical Dialog primitive's radius +
    // border token (`rounded-lg`, `border-components-panel-border`) but
    // bypasses Dialog's `p-6` body padding because it owns its own header
    // / stepper / body / footer layout — the p-3 here is just the outer
    // chrome, so each region can pad independently.
    <div
      className={cn(
        'flex w-full flex-col gap-0 overflow-hidden rounded-lg border border-components-panel-border bg-components-panel-bg p-3 shadow-overlay',
        layout === 'route' ? 'min-h-0 flex-none' : 'max-h-[calc(100vh-4rem)]',
      )}
    >
      {/* The wizard title is the MASTER for this card (each step's h2
          below describes the current step's outcome — child content), so
          it sits at `text-lg`: the hierarchy reads page-H1 (text-2xl) >
          wizard title (text-lg) > step h2 (text-base). Step progress
          lives in the Stepper below as the single source of truth, not a
          breadcrumb. */}
      <header
        className={cn(
          'flex shrink-0 items-center justify-between gap-3 border-b border-divider-subtle px-4',
          // Bumped row height to keep the larger title vertically
          // centered with the close-button cluster on the right.
          'h-12',
        )}
      >
        <h2 className="text-lg font-semibold text-text-primary">
          <ConceptLabel concept="migrationCopilot">
            <Trans>Import clients</Trans>
          </ConceptLabel>
        </h2>
        <div className="flex items-center gap-2">
          {/* "Import history" ghost button present in every migration
              frame's header. Opens the ImportHistoryDrawer when the parent
              supplies a handler. */}
          {onOpenImportHistory ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-text-muted"
              disabled={busy}
              onClick={onOpenImportHistory}
            >
              <HistoryIcon data-icon="inline-start" />
              <Trans>Import history</Trans>
            </Button>
          ) : null}
          {showCloseControl ? (
            <>
              {/* Canonical KbdHint pattern. The sm:inline-flex breakpoint
                gates the hint to wider viewports. */}
              <KbdHint
                className="hidden sm:inline-flex"
                items={[
                  {
                    keys: ['Esc'],
                    label: busy ? t`Working…` : (closeShortcutLabel ?? t`Close`),
                  },
                ]}
              />
              <Button
                variant="ghost"
                size={closeLabel ? 'sm' : 'icon-sm'}
                aria-label={t`Close wizard`}
                disabled={busy}
                onClick={onRequestClose}
              >
                {closeLabel ?? <XIcon />}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <Stepper current={step} />

      {transition ? (
        <div className="relative min-h-[300px] flex-1" aria-busy={busy || undefined}>
          <ProcessingOverlay transition={transition} />
        </div>
      ) : (
        // Body sits at `px-4` (matching header, Stepper, and footer) so
        // the dropzone's left edge stacks with the wizard title + the
        // step-1 pill down the leading edge.
        <div className="relative min-h-0 flex-1 overflow-y-auto px-4" aria-busy={busy || undefined}>
          {children}
        </div>
      )}

      {/* Back has no icon — the label already says where the click goes,
          and a pair of weighted arrows would read as two equal actions
          rather than a primary/secondary pair. Continue keeps its forward
          arrow as a "next step" cue. The Back button is hidden entirely on
          Step 1 (rather than disabled-visible) — a disabled control on the
          first step reads as a dead affordance and steals weight from the
          active Continue. */}
      <footer className="flex h-12 shrink-0 items-center justify-end gap-4 border-divider-subtle px-4">
        {step > 1 && onBack ? (
          <Button variant="outline" size="lg" onClick={onBack} disabled={busy || backDisabled}>
            <Trans>Back</Trans>
          </Button>
        ) : null}
        <Button
          size="lg"
          onClick={onContinue}
          disabled={busy || !canContinue}
          aria-busy={busy || undefined}
        >
          {busy ? (
            step === 4 ? (
              <Trans>Importing…</Trans>
            ) : (
              <Trans>Working…</Trans>
            )
          ) : (
            (continueLabel ?? <Trans>Continue</Trans>)
          )}
          {busy ? null : <ArrowRightIcon data-icon="inline-end" />}
        </Button>
      </footer>
    </div>
  )

  function requestClose() {
    if (busy) return
    onRequestClose()
  }
}

export function WizardShell({ open, onClose, confirmOnClose, ...frameProps }: WizardShellProps) {
  const [confirming, setConfirming] = useState(false)

  function requestClose() {
    if (frameProps.busy) return
    if (confirmOnClose) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    onClose()
  }

  function handleOpenChange(next: boolean) {
    if (next) return
    requestClose()
  }

  function handleDiscard() {
    setConfirming(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'w-[960px] max-w-[calc(100%-3rem)] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[calc(100%-3rem)]',
        )}
      >
        <DialogTitle className="sr-only">
          <Trans>Import clients · Step {frameProps.step} of 4</Trans>
        </DialogTitle>
        <DialogDescription className="sr-only">
          <Trans>
            Migration Copilot wizard — paste or upload your client roster, review the AI mapping,
            normalize values, and preview the import before committing.
          </Trans>
        </DialogDescription>
        <WizardFrame
          {...frameProps}
          hotkeysEnabled={open && !confirming}
          onRequestClose={requestClose}
        />
      </DialogContent>

      {confirming ? (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              {/* "Leave without importing?" — the user hasn't imported
                  yet (they're still inside the wizard), so the verb matches
                  the state rather than implying destruction of committed
                  work. */}
              <AlertDialogTitle>
                <Trans>Leave without importing?</Trans>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                <Trans>Your pasted data and unsaved edits will be discarded.</Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel size="sm">
                <Trans>Keep editing</Trans>
              </AlertDialogCancel>
              <AlertDialogAction variant="destructive-primary" size="sm" onClick={handleDiscard}>
                <Trans>Discard import</Trans>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </Dialog>
  )
}

export function WizardRouteShell({
  intro,
  onClose,
  confirmOnClose,
  ...frameProps
}: WizardRouteShellProps) {
  const [confirming, setConfirming] = useState(false)

  function requestClose() {
    if (frameProps.busy) return
    if (confirmOnClose) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    onClose()
  }

  function handleDiscard() {
    setConfirming(false)
    onClose()
  }

  const resolvedIntro = typeof intro === 'function' ? intro({ onSkip: requestClose }) : intro

  return (
    <>
      <div className="mx-auto flex min-h-0 w-full max-w-[1120px] flex-none flex-col gap-4">
        <div className="shrink-0">{resolvedIntro}</div>
        <WizardFrame
          {...frameProps}
          hotkeysEnabled={!confirming}
          layout="route"
          onRequestClose={requestClose}
          showCloseControl={false}
        />
      </div>

      {confirming ? (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              {/* "Leave without importing?" — the user hasn't imported
                  yet (they're still inside the wizard), so the verb matches
                  the state rather than implying destruction of committed
                  work. */}
              <AlertDialogTitle>
                <Trans>Leave without importing?</Trans>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                <Trans>Your pasted data and unsaved edits will be discarded.</Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel size="sm">
                <Trans>Keep editing</Trans>
              </AlertDialogCancel>
              <AlertDialogAction variant="destructive-primary" size="sm" onClick={handleDiscard}>
                <Trans>Discard import</Trans>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}

function ProcessingOverlay({ transition }: { transition: WizardTransitionState }) {
  const copy = transitionCopy(transition.phase)
  const activeIndex = Math.min(Math.max(transition.activeIndex, 0), copy.steps.length - 1)
  const progressValue = Math.round((activeIndex / copy.steps.length) * 100)

  return (
    <div className="absolute inset-0 overflow-y-auto bg-components-panel-bg/85">
      <div className="grid min-h-full place-items-center px-6 py-6">
        {/* Processing-overlay modal uses Card size="sm" tone="accent".
            Card's gap-4 supplies the spacing between header/progress/steps;
            px-4 adds horizontal padding (size=sm only provides py-4).
            role="status" + aria-live="polite" on the Card div preserve the
            live-region announcement; max-w-[520px] + shadow-overlay are
            overlay-context overrides. */}
        <Card
          role="status"
          aria-live="polite"
          size="sm"
          tone="accent"
          className="w-full max-w-[520px] px-4 shadow-overlay"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-state-accent-hover-alt text-text-accent">
              <LoaderCircleIcon className="size-5 animate-spin" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary">{copy.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{copy.description}</p>
            </div>
          </div>

          <div
            className="h-1 overflow-hidden rounded-full bg-state-accent-hover-alt"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
          >
            <div
              className="h-full rounded-full bg-state-accent-solid transition-[width] duration-300 ease-apple motion-reduce:transition-none"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <ol className="grid gap-2">
            {copy.steps.map((step, index) => {
              const complete = index < activeIndex
              const active = index === activeIndex
              // Each step marker carries an explicit accessibility label so
              // the tooltip + screen reader read "Step N — completed / in
              // progress / pending".
              const stateLabel = complete ? 'Completed' : active ? 'In progress' : 'Pending'
              return (
                <li
                  key={step.key}
                  className={cn(
                    'flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors',
                    active
                      ? 'border-state-accent-active bg-state-accent-hover text-text-primary'
                      : complete
                        ? 'border-divider-regular bg-background-body text-text-secondary'
                        : 'border-divider-subtle bg-background-default-subtle text-text-tertiary',
                  )}
                >
                  <span
                    role="img"
                    aria-label={stateLabel}
                    title={stateLabel}
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-sm border',
                      active
                        ? 'border-state-accent-solid bg-state-accent-solid text-text-primary-on-surface'
                        : complete
                          ? 'border-state-success-solid bg-state-success-hover text-text-success'
                          : 'border-divider-regular bg-background-body text-text-muted',
                    )}
                  >
                    {complete ? (
                      <CheckIcon className="size-3.5" aria-hidden />
                    ) : active ? (
                      <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" aria-hidden />
                    )}
                  </span>
                  <span className="truncate">{step.label}</span>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>
    </div>
  )
}

interface TransitionStep {
  key: string
  label: ReactNode
}

function transitionCopy(phase: WizardTransitionPhase): {
  title: ReactNode
  description: ReactNode
  steps: TransitionStep[]
} {
  switch (phase) {
    case 'intake':
      return {
        title: <Trans>Preparing your mapping</Trans>,
        description: (
          <Trans>Creating a safe import batch, uploading rows, and mapping your columns.</Trans>
        ),
        steps: [
          { key: 'create-batch', label: <Trans>Create batch</Trans> },
          { key: 'upload-rows', label: <Trans>Upload rows</Trans> },
          { key: 'map-columns', label: <Trans>Map columns</Trans> },
        ],
      }
    case 'mapping':
      return {
        title: <Trans>Preparing normalization</Trans>,
        description: <Trans>Saving your confirmed fields and grouping values for review.</Trans>,
        steps: [
          { key: 'save-mapping', label: <Trans>Save mapping</Trans> },
          { key: 'read-field-values', label: <Trans>Read field values</Trans> },
          { key: 'suggest-clean-values', label: <Trans>Suggest clean values</Trans> },
        ],
      }
    case 'rerun_mapper':
      return {
        title: <Trans>Refreshing the AI mapping</Trans>,
        description: <Trans>Re-reading your columns with the latest overrides applied.</Trans>,
        steps: [
          { key: 'read-columns', label: <Trans>Read columns</Trans> },
          { key: 'remap-fields', label: <Trans>Re-map fields</Trans> },
          { key: 'refresh-confidence', label: <Trans>Refresh confidence</Trans> },
        ],
      }
    case 'normalize':
      return {
        title: <Trans>Building the import preview</Trans>,
        description: (
          <Trans>
            Saving organized values, applying tax type suggestions, and calculating totals.
          </Trans>
        ),
        steps: [
          { key: 'save-normalized-values', label: <Trans>Save organized values</Trans> },
          { key: 'apply-default-matrix', label: <Trans>Apply tax type suggestions</Trans> },
          { key: 'calculate-preview', label: <Trans>Calculate preview</Trans> },
        ],
      }
    case 'import':
      return {
        title: <Trans>Generating deadlines…</Trans>,
        description: <Trans>Creating clients, deadlines, evidence links, and audit records.</Trans>,
        steps: [
          { key: 'create-clients', label: <Trans>Create clients</Trans> },
          { key: 'generate-deadlines', label: <Trans>Generate deadlines</Trans> },
          { key: 'record-audit-trail', label: <Trans>Record audit trail</Trans> },
        ],
      }
  }
  const exhaustive: never = phase
  return exhaustive
}

import { useState, type ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, LoaderCircleIcon, XIcon } from 'lucide-react'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { cn } from '@duedatehq/ui/lib/utils'

import { useAppHotkey, isEditableEventTarget } from '@/components/patterns/keyboard-shell'
import { ConceptLabel } from '@/features/concepts/concept-help'

import { Stepper } from './Stepper'
import type { StepIndex } from './state'

export type WizardTransitionPhase = 'intake' | 'mapping' | 'rerun_mapper' | 'normalize' | 'import'

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
  closeLabel?: ReactNode | undefined
  closeShortcutLabel?: ReactNode | undefined
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
    <div
      className={cn(
        'flex w-full flex-col gap-0 overflow-hidden rounded-xl border border-divider-regular bg-components-panel-bg p-3 shadow-overlay',
        layout === 'route' ? 'min-h-0 flex-none' : 'max-h-[calc(100vh-4rem)]',
      )}
    >
      <div className="sr-only">
        <Trans>Import clients · Step {step} of 4</Trans>
        <Trans>
          Migration Copilot wizard — paste or upload your client roster, review the AI mapping,
          normalize values, and preview the import before committing.
        </Trans>
      </div>

      {/* 2026-05-25 (Yuqi #32, #33, #34, #39): header was a
          monospace breadcrumb "Import / Step N / 4" with a mystery
          green dot. Three problems:
          - The green dot had no meaning (Yuqi #32, #39).
          - `font-mono` made "Import" read as a code path, not as
            the wizard's actual title (#33).
          - The "Step N / 4" breadcrumb duplicated the Stepper
            below — same info, two surfaces (#34, #36).
          Fixed: dropped the dot, drop the breadcrumb, set
          "Import" as a real `text-base font-semibold` title in
          regular case. Step progress lives in the Stepper below
          as the single source of truth. */}
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-divider-subtle px-4">
        <h2 className="text-base font-semibold text-text-primary">
          <ConceptLabel concept="migrationCopilot">
            <Trans>Import clients</Trans>
          </ConceptLabel>
        </h2>
        {showCloseControl ? (
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 font-mono text-xs text-text-tertiary sm:inline-flex">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-divider-regular bg-components-panel-bg px-1.5 text-xs text-text-primary">
                Esc
              </kbd>
              <span className="text-text-tertiary">
                {busy ? <Trans>Working…</Trans> : (closeShortcutLabel ?? <Trans>Close</Trans>)}
              </span>
            </span>
            <Button
              variant="ghost"
              size={closeLabel ? 'sm' : 'icon-sm'}
              aria-label={t`Close wizard`}
              disabled={busy}
              onClick={onRequestClose}
            >
              {closeLabel ?? <XIcon />}
            </Button>
          </div>
        ) : null}
      </header>

      <Stepper current={step} />

      {transition ? (
        <div className="relative min-h-[300px] flex-1" aria-busy={busy || undefined}>
          <ProcessingOverlay transition={transition} />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto px-6" aria-busy={busy || undefined}>
          {children}
        </div>
      )}

      <footer className="flex h-12 shrink-0 items-center justify-end gap-4 border-divider-subtle px-4">
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={busy || backDisabled || step === 1 || !onBack}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          <Trans>Back</Trans>
        </Button>
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
              <AlertDialogTitle>
                <Trans>Discard import?</Trans>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-md">
                <Trans>Your pasted data and unsaved edits in this wizard will be lost.</Trans>
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
              <AlertDialogTitle>
                <Trans>Discard import?</Trans>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-md">
                <Trans>Your pasted data and unsaved edits in this wizard will be lost.</Trans>
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
        <section
          role="status"
          aria-live="polite"
          className="w-full max-w-[520px] rounded-lg border border-state-accent-active bg-background-body p-4 shadow-overlay"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-state-accent-hover-alt text-text-accent">
              <LoaderCircleIcon className="size-5 animate-spin" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-md font-semibold text-text-primary">{copy.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{copy.description}</p>
            </div>
          </div>

          <div
            className="mt-4 h-1 overflow-hidden rounded-full bg-state-accent-hover-alt"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
          >
            <div
              className="h-full rounded-full bg-state-accent-solid transition-[width] duration-500 ease-out"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <ol className="mt-4 grid gap-2">
            {copy.steps.map((step, index) => {
              const complete = index < activeIndex
              const active = index === activeIndex
              // 2026-05-25 (Yuqi critique #32, #39): the stepper bullet
              // was a bare green dot with no aria-label. Hovering told
              // the user nothing about why it was green. Now each step
              // marker carries an explicit accessibility label so the
              // tooltip + screen reader read "Step N — completed /
              // in progress / pending".
              const stateLabel = complete ? 'Completed' : active ? 'In progress' : 'Pending'
              return (
                <li
                  key={step.key}
                  className={cn(
                    'flex min-h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors',
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
        </section>
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
        title: <Trans>Generating your deadline list…</Trans>,
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

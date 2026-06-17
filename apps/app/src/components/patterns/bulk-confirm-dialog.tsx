import { type ReactNode, useId, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { AlertTriangleIcon, type LucideIcon } from 'lucide-react'

import { FieldLabel } from '@/components/primitives/field-label'

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
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * BulkConfirmDialog — the canonical bulk-action confirmation modal
 * family (Pencil `X4t2E`). One reusable AlertDialog standardizes the
 * three confirmation patterns the workbench needs:
 *
 *   - `neutral`   — a reversible commit (e.g. "Mark 12 deadlines as
 *                   filed"). Dark icon tile, neutral primary button,
 *                   optional follow-on checkbox option.
 *   - `destructive` — an irreversible removal (e.g. "Delete 8 rules").
 *                   Red icon tile + warning card, destructive primary,
 *                   optional type-to-confirm guard that disables the
 *                   primary until the user types the confirm phrase.
 *   - `accent`    — a broadcast/apply action (e.g. "Apply 4 alerts to
 *                   clients"). Accent icon tile + primary, optional
 *                   info banner.
 *
 * Each pattern shares the same header (icon tile · title · description),
 * an optional body slot (selected-item list, warn card, banner), and a
 * Cancel / primary footer. Replaces ad-hoc `AlertDialog` recipes at
 * bulk call sites so confirmation chrome is identical across surfaces.
 */

export type BulkConfirmTone = 'neutral' | 'destructive' | 'accent'

const TONE_ICON_CLASS: Record<BulkConfirmTone, string> = {
  neutral: 'bg-text-primary text-background-default',
  destructive: 'bg-state-destructive-hover text-text-destructive',
  accent: 'bg-state-accent-hover text-text-accent',
}

const TONE_ACTION_VARIANT: Record<BulkConfirmTone, 'default' | 'destructive-primary' | 'accent'> = {
  neutral: 'default',
  destructive: 'destructive-primary',
  accent: 'accent',
}

export interface BulkConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tone?: BulkConfirmTone
  icon: LucideIcon
  title: ReactNode
  description: ReactNode
  /** Optional middle slot — selected-item list, warn card, banner, etc. */
  children?: ReactNode
  cancelLabel?: ReactNode
  confirmLabel: ReactNode
  onConfirm: () => void
  /** Disables the primary button (e.g. while the mutation is pending). */
  confirmDisabled?: boolean
  /** Whether confirming closes the dialog automatically. Default true. */
  closeOnConfirm?: boolean
  /**
   * Type-to-confirm guard (destructive pattern). When set, the primary
   * stays disabled until the user types `phrase` exactly.
   */
  confirmPhrase?: string
  confirmPhrasePrompt?: ReactNode
}

export function BulkConfirmDialog({
  open,
  onOpenChange,
  tone = 'neutral',
  icon: Icon,
  title,
  description,
  children,
  cancelLabel,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  closeOnConfirm = true,
  confirmPhrase,
  confirmPhrasePrompt,
}: BulkConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const phraseFieldId = useId()
  const phraseSatisfied = !confirmPhrase || typed.trim() === confirmPhrase
  const primaryDisabled = confirmDisabled || !phraseSatisfied

  function handleOpenChange(next: boolean) {
    if (!next) setTyped('')
    onOpenChange(next)
  }

  function handleConfirm() {
    if (primaryDisabled) return
    onConfirm()
    if (closeOnConfirm) {
      setTyped('')
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[min(520px,calc(100vw-2rem))] gap-0 p-0">
        <AlertDialogHeader className="gap-4 p-7 pb-5">
          <span
            className={cn('grid size-12 place-items-center rounded-full', TONE_ICON_CLASS[tone])}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="grid gap-2">
            <AlertDialogTitle className="text-xl leading-snug font-semibold">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-normal text-text-secondary">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {children || confirmPhrase ? (
          <div className="grid gap-3 px-7 pb-2">
            {children}
            {confirmPhrase ? (
              <div className="grid gap-1.5 pt-1">
                <Label htmlFor={phraseFieldId} className="text-xs text-text-secondary">
                  {confirmPhrasePrompt ?? (
                    <Trans>
                      Type <span className="font-semibold text-text-primary">{confirmPhrase}</span>{' '}
                      to confirm
                    </Trans>
                  )}
                </Label>
                <Input
                  id={phraseFieldId}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <AlertDialogFooter className="gap-2 p-7 pt-6">
          <AlertDialogCancel variant="outline">
            {cancelLabel ?? <Trans>Cancel</Trans>}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={TONE_ACTION_VARIANT[tone]}
            disabled={primaryDisabled}
            // Do not auto-close via the primitive — handleConfirm owns
            // the close so the type-to-confirm guard can't be bypassed.
            nativeButton
            onClick={(event) => {
              event.preventDefault()
              handleConfirm()
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * BulkConfirmList — selected-item preview used inside the neutral /
 * accent patterns. Renders up to `max` rows, then a quiet "+ N more"
 * tail. Each row is a label (+ optional secondary detail).
 */
export function BulkConfirmList({
  label,
  items,
  max = 5,
}: {
  label: ReactNode
  items: Array<{ id: string; primary: ReactNode; secondary?: ReactNode }>
  max?: number
}) {
  const visible = items.slice(0, max)
  const remaining = items.length - visible.length
  return (
    <div className="grid gap-2">
      <FieldLabel as="span" variant="group">
        {label}
      </FieldLabel>
      <ul className="grid divide-y divide-divider-subtle overflow-hidden rounded-lg border border-divider-subtle bg-background-subtle">
        {visible.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-text-primary">{item.primary}</span>
            {item.secondary ? (
              <span className="shrink-0 text-xs text-text-tertiary">{item.secondary}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <span className="text-xs text-text-tertiary">
          <Trans>+ {remaining} more</Trans>
        </span>
      ) : null}
    </div>
  )
}

/**
 * BulkConfirmWarnCard — red-tinted warning panel for the destructive
 * pattern. Lists the irreversible consequences.
 */
export function BulkConfirmWarnCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-state-destructive-border bg-state-destructive-hover p-3 text-sm text-text-destructive">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="grid gap-1 leading-snug">{children}</div>
    </div>
  )
}

/**
 * BulkConfirmOption — follow-on checkbox under the neutral pattern
 * (e.g. "Also notify clients"). Controlled by the caller.
 */
export function BulkConfirmOption({
  checked,
  onCheckedChange,
  label,
  description,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-divider-subtle p-3"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        className="mt-px"
      />
      <span className="grid gap-0.5">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {description ? <span className="text-xs text-text-tertiary">{description}</span> : null}
      </span>
    </label>
  )
}

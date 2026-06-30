import { type ReactNode } from 'react'
import { Loader2Icon, type LucideIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { ApplyingPill } from './ApplyingPill'

export type DecisionAction = {
  label: ReactNode
  icon?: LucideIcon
  onClick?: () => void
  disabled?: boolean
}

/**
 * `DecisionActions` — the polymorphic decision footer (Pencil `fJtAo`): a
 * primary filled action and an optional secondary outline action grouped on
 * the left, plus an optional tertiary text action (e.g. "Dismiss alert")
 * pushed to the right edge.
 *
 * The buttons reuse the shared `Button` primitive, so they inherit the
 * canonical hover / focus / active / disabled / loading states documented on
 * `b7fa5Y` (States · Interactive) rather than re-implementing them. `loading`
 * spins the primary action and disables the cluster (the "Posting…" /
 * "Applying…" state).
 *
 * Polymorphic by design (amendments §1.1 Option C): the same footer serves
 * every alert/rule decision — callers map their action onto the primary slot.
 */
export function DecisionActions({
  primary,
  secondary,
  tertiary,
  loading = false,
  applyingPill = false,
  className,
}: {
  primary: DecisionAction
  secondary?: DecisionAction
  tertiary?: DecisionAction
  /** Spins the primary action's icon + disables the whole cluster. */
  loading?: boolean
  /**
   * When the loading state IS the one-click apply (the product's core moment),
   * swap the whole cluster for the <ApplyingPill> sweep — a richer "applying
   * across your clients" indicator than a button spinner. Apply caller only;
   * other decisions (post / dismiss) keep the spinner so the label stays honest.
   */
  applyingPill?: boolean
  className?: string
}) {
  const PrimaryIcon = primary.icon
  const SecondaryIcon = secondary?.icon
  const TertiaryIcon = tertiary?.icon
  if (loading && applyingPill) {
    return (
      <div className={cn('flex w-full flex-wrap items-center gap-2.5', className)}>
        <ApplyingPill />
      </div>
    )
  }
  return (
    <div className={cn('flex w-full flex-wrap items-center gap-2.5', className)}>
      <Button onClick={primary.onClick} disabled={loading || primary.disabled}>
        {loading ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : PrimaryIcon ? (
          <PrimaryIcon data-icon="inline-start" />
        ) : null}
        {primary.label}
      </Button>

      {secondary ? (
        <Button
          variant="secondary"
          onClick={secondary.onClick}
          disabled={loading || secondary.disabled}
        >
          {SecondaryIcon ? <SecondaryIcon data-icon="inline-start" /> : null}
          {secondary.label}
        </Button>
      ) : null}

      {tertiary ? (
        <>
          <span className="flex-1" aria-hidden />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={tertiary.onClick}
            disabled={loading || tertiary.disabled}
            className="shrink-0 text-base text-text-tertiary hover:text-text-secondary"
          >
            {TertiaryIcon ? <TertiaryIcon aria-hidden className="size-3 shrink-0" /> : null}
            {tertiary.label}
          </Button>
        </>
      ) : null}
    </div>
  )
}

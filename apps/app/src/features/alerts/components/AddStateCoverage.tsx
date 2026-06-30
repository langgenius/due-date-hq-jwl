import { type ReactElement, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon, ClockIcon, Loader2Icon, PlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { RuleGenerationStateValues, type RuleGenerationState } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { jurisdictionLabel } from '@/features/rules/rules-console-model'
import {
  US_JURISDICTION_TILES,
  US_TILE_GRID_COLS,
  US_TILE_GRID_ROWS,
  US_TILE_CELL_SIZE,
  US_TILE_CELL_GAP,
} from '@/components/primitives/us-jurisdiction-tiles'

import { useAlertsInvalidation } from '../api'

// Only the 50 states + DC are activatable rule jurisdictions; FED is the
// always-on federal scope and never appears as an "add" target. We render
// the SAME tilegram geometry the StateTilegram filter uses (shared
// us-jurisdiction-tiles) so the "filter" and "add coverage" maps line up
// tile-for-tile — a state sits in the same place whether you're narrowing
// alerts or expanding coverage.
const ACTIVATABLE_STATES = new Set<string>(RuleGenerationStateValues)

function isActivatableState(code: string): code is RuleGenerationState {
  return ACTIVATABLE_STATES.has(code)
}

/**
 * AddStateCoverage — the "add a state to what I monitor" map.
 *
 * Lives inside the /alerts State popover's "add" mode. A CPA who skipped a
 * state at onboarding lands here to widen coverage WITHOUT detouring through
 * the Rule Library. The map is a full add/remove surface:
 *
 *   - live states (active rules) → green check; click to remove
 *   - in-review states (pending_review rules) → amber clock; click to remove
 *   - fresh states (no engaged rules) → `+`; click to activate
 *
 * Both writes are real: activation calls `rules.activateOnboardingJurisdictions`
 * (the same idempotent path onboarding uses); removal calls
 * `rules.deactivateJurisdiction`, which archives the state's engaged rules so
 * no new deadlines generate (existing ones stay). Source-defined-calendar
 * states still need approval in the Rule Library — the toast says so honestly,
 * so the map never implies "click = instant alerts" when rules are parked.
 */
export function AddStateCoverage({ enabled = true }: { enabled?: boolean }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const invalidateAlerts = useAlertsInvalidation()
  // Which tile's activation is in flight (null = none). A single-flight
  // guard keyed by code so re-clicking a pending tile can't double-fire.
  const [pendingCode, setPendingCode] = useState<RuleGenerationState | null>(null)

  // Coverage drives the covered-vs-addable split. Fetched only while the
  // add map is mounted (the popover's add mode), not on every alerts render.
  const coverageQuery = useQuery({
    ...orpc.rules.coverage.queryOptions({ input: undefined }),
    enabled,
  })
  // Per-jurisdiction coverage status drives a THREE-way tile read, not a
  // binary covered/addable. Honesty matters here: a state whose rules are all
  // parked in review hasn't generated a single deadline yet, so painting it
  // with the same "monitored" check as a live state would overstate coverage.
  //   • 'live'   — has active/verified rules → deadlines generate (green check)
  //   • 'review' — engaged but only pending_review rules → awaiting approval
  //                in the Rule Library (amber clock), still not an add target
  //   • (absent) — no engaged rules → a fresh "add" target
  // `candidateCount` is deliberately EXCLUDED: a candidate is an available
  // template the firm hasn't engaged (no practice_rule row), so a
  // candidate-only state is genuinely addable, not "in review". Practice rows
  // only ever hold active / pending_review / rejected / archived.
  const statusByCode = useMemo(() => {
    const map = new Map<string, 'live' | 'review'>()
    for (const row of coverageQuery.data ?? []) {
      const live = (row.activeRuleCount ?? 0) + (row.verifiedRuleCount ?? 0)
      if (live > 0) map.set(row.jurisdiction, 'live')
      else if ((row.pendingReviewCount ?? 0) > 0) map.set(row.jurisdiction, 'review')
    }
    return map
  }, [coverageQuery.data])

  // Remove (stop monitoring) flow — the inverse of activation. Clicking an
  // already-engaged tile opens a confirm; confirming archives that
  // jurisdiction's engaged rules via `deactivateJurisdiction`.
  const [removeState, setRemoveState] = useState<RuleGenerationState | null>(null)
  const deactivateMutation = useMutation(
    orpc.rules.deactivateJurisdiction.mutationOptions({
      onSuccess: (output, variables) => {
        const code = variables.states[0]
        const label = code ? jurisdictionLabel(code) : t`State`
        toast.success(t`Stopped monitoring ${label}`, {
          description:
            output.archivedCount > 0
              ? t`${output.archivedCount} rules archived. Existing deadlines stay.`
              : t`No active rules to archive.`,
        })
        setRemoveState(null)
        void queryClient.invalidateQueries({ queryKey: orpc.rules.coverage.key() })
        invalidateAlerts()
      },
      onError: (error) => {
        toast.error(t`Couldn't remove that state`, {
          description:
            rpcErrorMessage(error) ??
            t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  const activateMutation = useMutation(
    orpc.rules.activateOnboardingJurisdictions.mutationOptions({
      onSuccess: (output, variables) => {
        const code = variables.states[0]
        const label = code ? jurisdictionLabel(code) : t`State`
        // Honest, specific toast: name the state, say how many rules went
        // live, and — only when some are parked — point at the Rule Library
        // so "added" never overstates "fully monitoring".
        if (output.reviewRequiredCount > 0) {
          toast.success(t`Added ${label}`, {
            description:
              output.activatedCount > 0
                ? t`${output.activatedCount} rules now active · ${output.reviewRequiredCount} need review in the Rule Library.`
                : t`${output.reviewRequiredCount} rules need review in the Rule Library before deadlines generate.`,
          })
        } else if (output.activatedCount > 0) {
          toast.success(t`Now monitoring ${label}`, {
            description: t`${output.activatedCount} rules active — new alerts appear as they're detected.`,
          })
        } else {
          // Idempotent re-activation (already covered): nothing changed.
          toast.success(t`${label} is already monitored`)
        }
        // New jurisdiction → new obligations/alerts; refresh both the
        // coverage map (covered set) and the alerts board (catch-up rows).
        void queryClient.invalidateQueries({ queryKey: orpc.rules.coverage.key() })
        invalidateAlerts()
      },
      onError: (err) => {
        toast.error(t`Couldn't add that state`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
      onSettled: () => setPendingCode(null),
    }),
  )

  function activate(code: RuleGenerationState) {
    // Only fresh states (no rules yet) activate; live/in-review states are
    // already engaged and stay disabled.
    if (statusByCode.has(code) || pendingCode !== null) return
    setPendingCode(code)
    activateMutation.mutate({ states: [code] })
  }

  const cellSpan = US_TILE_CELL_SIZE + US_TILE_CELL_GAP
  const width = US_TILE_GRID_COLS * cellSpan
  const height = US_TILE_GRID_ROWS * cellSpan

  return (
    <TooltipProvider delay={400}>
      <div className="flex flex-col gap-2.5">
        <div
          role="group"
          aria-label={t`Add a state to your coverage`}
          className="relative overflow-visible"
          style={{ width, height }}
        >
          {Object.entries(US_JURISDICTION_TILES).map(([code, [col, row]]) => {
            // FED (and any non-activatable tile) renders as an inert marker —
            // it's always-on federal scope, not an add target. The type guard
            // narrows `code` to RuleGenerationState for the button branch below.
            const stateCode = isActivatableState(code) ? code : null
            const status = statusByCode.get(code) ?? null
            const pending = pendingCode === code
            const label = jurisdictionLabel(code)
            const left = col * cellSpan
            const top = row * cellSpan

            if (stateCode === null) {
              return (
                <div
                  key={code}
                  aria-hidden
                  className="absolute inline-flex flex-col items-center justify-center rounded-lg border border-divider-subtle bg-background-soft text-text-tertiary"
                  style={{ left, top, width: US_TILE_CELL_SIZE, height: US_TILE_CELL_SIZE }}
                >
                  <span className="text-xs font-medium leading-none">{code}</span>
                </div>
              )
            }

            const engaged = status !== null
            return (
              <Tooltip key={code}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      // Engaged tiles are now REMOVABLE (open the confirm);
                      // fresh tiles activate. The map is a full add/remove
                      // surface, not a one-way add.
                      onClick={() => (engaged ? setRemoveState(stateCode) : activate(stateCode))}
                      disabled={pending || pendingCode !== null}
                      aria-label={
                        status === 'live'
                          ? t`${label}, monitored — remove`
                          : status === 'review'
                            ? t`${label}, in review — remove`
                            : pending
                              ? t`Adding ${label}…`
                              : t`Add ${label} to your coverage`
                      }
                      className={cn(
                        'group/tile absolute inline-flex cursor-pointer flex-col items-center justify-center gap-0 rounded-lg border transition-[background-color,border-color,opacity] outline-none',
                        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1',
                        status === 'live'
                          ? // Live = soft accent tint + check. Deadlines generate.
                            // Hover shifts to destructive to preview removal.
                            'border-state-accent-solid/40 bg-state-accent-hover-alt text-text-accent hover:border-state-destructive-solid hover:bg-state-destructive-hover hover:text-text-destructive'
                          : status === 'review'
                            ? // In review = warning tint + clock. Engaged but no
                              // deadlines yet — honest "not done" signal.
                              'border-state-warning-hover-alt bg-state-warning-hover text-text-warning hover:border-state-destructive-solid hover:bg-state-destructive-hover hover:text-text-destructive'
                            : pending
                              ? 'border-state-accent-solid bg-state-accent-hover text-text-accent'
                              : // Addable = quiet neutral that reveals a `+` and an
                                // accent edge on hover, so the map reads as "ready
                                // to add" not "disabled".
                                'border-divider-subtle bg-background-subtle text-text-muted hover:border-state-accent-solid hover:bg-state-accent-hover/40 hover:text-text-accent disabled:cursor-not-allowed',
                      )}
                      style={{ left, top, width: US_TILE_CELL_SIZE, height: US_TILE_CELL_SIZE }}
                    >
                      <span className="text-xs font-semibold leading-none tabular-nums">
                        {code}
                      </span>
                      {pending ? (
                        <Loader2Icon className="mt-0.5 size-3 animate-spin" aria-hidden />
                      ) : engaged ? (
                        // Status icon at rest (check / clock); on hover it
                        // becomes an × so the removal affordance is legible.
                        <>
                          <span className="mt-0.5 group-hover/tile:hidden">
                            {status === 'live' ? (
                              <CheckIcon className="size-3" aria-hidden />
                            ) : (
                              <ClockIcon className="size-3" aria-hidden />
                            )}
                          </span>
                          <XIcon
                            className="mt-0.5 hidden size-3 group-hover/tile:block"
                            aria-hidden
                          />
                        </>
                      ) : (
                        <PlusIcon
                          className="mt-0.5 size-3 opacity-0 transition-opacity group-hover/tile:opacity-100"
                          aria-hidden
                        />
                      )}
                    </button>
                  }
                />
                <TooltipContent side="top">
                  {status === 'live' ? (
                    <Trans>{label} · monitored — click to remove</Trans>
                  ) : status === 'review' ? (
                    <Trans>{label} · in review — click to remove</Trans>
                  ) : (
                    <Trans>Add {label}</Trans>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Legend — the three tile reads are not self-evident from color
            alone, so name them. Mirrors the tile icons/tones exactly. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon className="size-3 text-text-accent" aria-hidden />
            <Trans>Monitored</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-3 text-text-warning" aria-hidden />
            <Trans>In review</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="size-3" aria-hidden />
            <Trans>Tap to add</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <XIcon className="size-3" aria-hidden />
            <Trans>Tap a covered state to remove</Trans>
          </span>
        </div>
      </div>

      {/* Remove (stop monitoring) confirm. Archiving a jurisdiction's rules is
          reversible (re-add re-activates) but it stops future deadlines, so a
          one-step confirm guards the write. */}
      <Dialog
        open={removeState !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveState(null)
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {removeState
                ? t`Stop monitoring ${jurisdictionLabel(removeState)}?`
                : t`Stop monitoring this state?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            <Trans>
              This archives the state's active rules so no new deadlines generate. Existing
              deadlines stay, and you can re-add the state any time.
            </Trans>
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRemoveState(null)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deactivateMutation.isPending}
              onClick={() => {
                if (!removeState) return
                deactivateMutation.mutate({
                  states: [removeState],
                  reason: `Stopped monitoring ${jurisdictionLabel(removeState)} from Alerts`,
                })
              }}
            >
              {deactivateMutation.isPending ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <XIcon data-icon="inline-start" />
              )}
              <Trans>Stop monitoring</Trans>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

/**
 * AddStateCoveragePopover — a self-contained "Add a state" trigger that opens
 * the coverage map in its own popover. The /alerts toolbar State control wires
 * the map inline (as a mode), but standalone entry points — the empty state's
 * "monitoring N states, add another" moment — use this so the affordance can
 * live anywhere without threading the toolbar's filter/add mode state.
 */
export function AddStateCoveragePopover({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="center" sideOffset={6} className="w-auto p-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-text-tertiary">
            <Trans>Add state coverage</Trans>
          </span>
          <AddStateCoverage enabled={open} />
          <p className="max-w-[480px] text-xs leading-relaxed text-text-tertiary">
            <Trans>
              Tap a state to start monitoring it. Some states' rules need a quick review in the Rule
              Library before deadlines generate.
            </Trans>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Default trigger label reused across entry points. */
export function AddStateCoverageButton() {
  return (
    <AddStateCoveragePopover
      trigger={
        <Button variant="secondary" size="sm">
          <PlusIcon data-icon="inline-start" />
          <Trans>Add a state</Trans>
        </Button>
      }
    />
  )
}

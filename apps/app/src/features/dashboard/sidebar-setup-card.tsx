import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, CircleCheckIcon, LoaderIcon, RocketIcon, XIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { DuotoneIcon } from '@/components/primitives/duotone-icon'
import { TickProgress } from '@/components/primitives/tick-progress'
import { orpc } from '@/lib/rpc'

// Dismiss-for-session lives in localStorage rather than React state so the
// nudge stays hidden across route changes within a browser session — but it is
// NOT a permanent dismissal: a firm that hasn't finished setup will see it
// again next session (and the card self-deletes for good the moment both
// signals go true, see the all-done guard below).
const DISMISS_STORAGE_KEY = 'ddhq:sidebar:setup-dismissed'

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * SidebarSetupCard — a compact setup-progress nudge for the sidebar footer.
 *
 * Two REAL signals, no fiction:
 *  - "Add your clients"      — done when the firm has ≥1 client
 *    (orpc.clients.listByFirm, limit:1 probe — shares /today's cache key).
 *  - "Activate filing rules" — done when active rule count > 0
 *    (orpc.rules.coverage, summing activeRuleCount — shares the dashboard's
 *    same coverage query).
 *
 * Renders NOTHING when both steps are done (self-dismiss — a set-up firm sees
 * nothing), NOTHING while the probes load (no flash of an empty bar), NOTHING
 * in the collapsed icon rail, and NOTHING once dismissed-for-session. Keeps the
 * decluttered footer aesthetic: a tiny title, the brand TickProgress bar, two
 * checklist rows, and one quiet text-link CTA to the first incomplete step.
 */
export function SidebarSetupCard() {
  const { t } = useLingui()
  const [dismissed, setDismissed] = useState(readDismissed)

  // SAME queries the dashboard route uses for these two onboarding signals —
  // identical query keys, so this reuses the warmed cache (no extra fetch when
  // /today is the current page) and stays in lockstep with the dashboard's own
  // first-run gating.
  const clientsProbeQuery = useQuery(
    orpc.clients.listByFirm.queryOptions({ input: { limit: 1 } }),
  )
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, '1')
    } catch {
      // Private mode / disabled storage — the in-memory flag still hides it
      // for this mount; it simply reappears on a fresh load.
    }
  }, [])

  if (dismissed) return null

  // Wait for BOTH probes before deciding anything — rendering off a half-loaded
  // pair would flash a wrong tick count (e.g. "1 of 2" before rules resolve).
  if (clientsProbeQuery.isPending || coverageQuery.isPending) return null

  const hasClients = (clientsProbeQuery.data?.length ?? 0) > 0
  const activeRuleTotal = (coverageQuery.data ?? []).reduce(
    (sum, row) => sum + (row.activeRuleCount ?? 0),
    0,
  )
  const hasRules = activeRuleTotal > 0

  const steps = [
    { key: 'clients', label: <Trans>Add your clients</Trans>, done: hasClients, href: '/clients' },
    {
      key: 'rules',
      label: <Trans>Activate filing rules</Trans>,
      done: hasRules,
      href: '/rules/library',
    },
  ] as const

  const doneCount = steps.filter((s) => s.done).length
  // Self-dismiss: a finished setup earns no chrome.
  if (doneCount === steps.length) return null

  const pct = Math.round((doneCount / steps.length) * 100)
  const next = steps.find((s) => !s.done)

  return (
    // group-data-[collapsed=true] hides the whole card in the icon rail — the
    // 220px nudge has no compact form, so it simply steps aside when the rail
    // collapses (matching how SidebarSystemStatus drops its caption).
    <section
      aria-label={t`Setup progress`}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-divider-regular bg-background-section p-2.5',
        'animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none',
        'group-data-[collapsed=true]/sidebar:hidden',
      )}
    >
      <div className="flex items-center gap-2">
        <DuotoneIcon icon={RocketIcon} tone="brand" size="sm" />
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold text-text-secondary">
          <Trans>Finish setup</Trans>
        </h3>
        <span className="shrink-0 text-xs font-medium tabular-nums text-text-tertiary">{pct}%</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t`Dismiss setup nudge`}
          className="grid size-5 shrink-0 place-items-center rounded-full text-text-tertiary outline-none transition-colors hover:bg-background-sidebar-hover hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <XIcon className="size-3" aria-hidden />
        </button>
      </div>

      <TickProgress value={pct} tickCount={20} />

      <ul className="flex flex-col gap-1">
        {steps.map((step) => {
          const isNext = step === next
          return (
            <li key={step.key} className="flex items-center gap-2 text-xs">
              {step.done ? (
                <CircleCheckIcon className="size-3.5 shrink-0 text-text-success" aria-hidden />
              ) : (
                <LoaderIcon
                  className={cn(
                    'size-3.5 shrink-0 text-text-tertiary',
                    isNext && 'animate-spin text-text-accent motion-reduce:animate-none',
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'truncate',
                  step.done
                    ? 'text-text-tertiary'
                    : isNext
                      ? 'font-medium text-text-secondary'
                      : 'text-text-tertiary',
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ul>

      {next ? (
        <Button
          variant="link"
          size="xs"
          nativeButton={false}
          render={<Link to={next.href} />}
          className="h-auto justify-start self-start p-0 text-text-accent"
        >
          <Trans>Continue</Trans>
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      ) : null}
    </section>
  )
}

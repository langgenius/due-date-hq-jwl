import type { ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  CirclePlayIcon,
  DownloadIcon,
  LayersIcon,
  ShieldCheckIcon,
  TimerIcon,
  UserPlusIcon,
} from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import drakeLogoUrl from '@/features/migration/assets/source-logos/drake.png?url'
import karbonLogoUrl from '@/features/migration/assets/source-logos/karbon.png?url'
import lacerteLogoUrl from '@/features/migration/assets/source-logos/lacerte.png?url'
import quickbooksLogoUrl from '@/features/migration/assets/source-logos/quickbooks.svg?url'
import taxdomeLogoUrl from '@/features/migration/assets/source-logos/taxdome.png?url'
import ultrataxCsLogoUrl from '@/features/migration/assets/source-logos/ultratax-cs.png?url'

/**
 * ClientsEmptyState — the full-surface "no clients yet" hero for /clients.
 *
 * 2026-06-07 (design replication, Pencil nodes jQFBx + T4eNmw): the prior
 * empty state was the quiet inline shared `EmptyState`. The canvas designs
 * call for a prominent hero that OWNS the surface — an integration-logo
 * strip, a large headline, a CTA pair (Import / Add manually), an outcomes
 * strip (4 min · 11 tools · SOC 2) and a "try sample data" chip.
 *
 * The hero reuses the same prominent-card chrome as the shared EmptyState
 * (`rounded-xl border border-divider-regular bg-background-default`,
 * vertically-centered column) so it reads as the same family; the
 * integration strip replaces the icon-circle because the design leads with
 * "which tools we ingest" rather than a generic glyph.
 *
 * Canvas brand colors on the logo tiles are intentionally NOT recreated as
 * theme tokens — the real product logos (reused from the migration wizard's
 * source-logo assets) carry their own brand identity, and the tile chrome
 * (tint background, border) maps onto neutral tokens.
 */

const INTEGRATION_LOGOS: ReadonlyArray<{ src: string; label: string }> = [
  { src: taxdomeLogoUrl, label: 'TaxDome' },
  { src: karbonLogoUrl, label: 'Karbon' },
  { src: drakeLogoUrl, label: 'Drake' },
  { src: quickbooksLogoUrl, label: 'QuickBooks' },
  { src: ultrataxCsLogoUrl, label: 'UltraTax CS' },
  { src: lacerteLogoUrl, label: 'Lacerte' },
]

function IntegrationStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {INTEGRATION_LOGOS.map((logo) => (
        <div
          key={logo.label}
          title={logo.label}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-divider-regular bg-background-section"
        >
          <img src={logo.src} alt="" aria-hidden className="max-h-6 max-w-7 object-contain" />
        </div>
      ))}
      {/* DueDateHQ destination tile — the import endpoint. */}
      <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-text-primary shadow-md">
        <span className="text-base font-bold text-text-inverted">DD</span>
      </div>
    </div>
  )
}

function OutcomeStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof TimerIcon
  value: ReactNode
  label: ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-divider-regular bg-background-default">
        <Icon className="size-3.5 text-text-secondary" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[13px] font-bold text-text-primary">{value}</span>
        <span className="text-[11px] font-medium text-text-secondary">{label}</span>
      </span>
    </div>
  )
}

export function ClientsEmptyState({
  onImport,
  onCreate,
  onSampleData,
  canImport,
  canCreate,
}: {
  onImport: () => void
  onCreate?: (() => void) | undefined
  onSampleData?: (() => void) | undefined
  canImport: boolean
  canCreate?: boolean | undefined
}) {
  const { t } = useLingui()
  return (
    <div className="flex min-h-[560px] flex-1 items-center justify-center">
      <div
        className={cn(
          'flex w-full max-w-[920px] flex-col items-center gap-6 text-center',
          'rounded-xl border border-divider-regular bg-background-default px-6 py-12 md:px-14 md:py-14',
        )}
      >
        <IntegrationStrip />

        <div className="flex max-w-[640px] flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-[32px] md:leading-tight">
            <Trans>Plug in your tools. Walk away with a triage list.</Trans>
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary md:text-base">
            <Trans>
              Import a client list from TaxDome, Karbon, Drake, QuickBooks, UltraTax, Lacerte and 6
              more. Every deadline shows up on its own — no manual mapping, no setup wizard.
            </Trans>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button size="lg" onClick={onImport} disabled={!canImport}>
            <DownloadIcon data-icon="inline-start" />
            <Trans>Import clients</Trans>
          </Button>
          {onCreate ? (
            <Button variant="outline" size="lg" onClick={onCreate} disabled={canCreate === false}>
              <UserPlusIcon data-icon="inline-start" />
              <Trans>Add one manually</Trans>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-xl bg-background-section px-1 py-1.5">
          <OutcomeStat icon={TimerIcon} value={t`4 min`} label={<Trans>average import</Trans>} />
          <span className="hidden h-7 w-px bg-divider-regular sm:block" aria-hidden />
          <OutcomeStat icon={LayersIcon} value={t`11 tools`} label={<Trans>supported</Trans>} />
          <span className="hidden h-7 w-px bg-divider-regular sm:block" aria-hidden />
          <OutcomeStat icon={ShieldCheckIcon} value={t`SOC 2`} label={<Trans>compliant</Trans>} />
        </div>

        {onSampleData ? (
          <button
            type="button"
            onClick={onSampleData}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-state-accent-active-alt bg-state-accent-hover px-3.5 py-1.5 text-xs font-semibold text-text-accent outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <CirclePlayIcon className="size-3.5" aria-hidden />
            <Trans>Try a 30-second tour with sample data</Trans>
            <ArrowRightIcon className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  )
}

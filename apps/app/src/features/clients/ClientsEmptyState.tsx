import { Trans } from '@lingui/react/macro'
import { ArrowRightIcon, CirclePlayIcon, DownloadIcon, UserPlusIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'

import drakeLogoUrl from '@/features/migration/assets/source-logos/drake.png?url'
import karbonLogoUrl from '@/features/migration/assets/source-logos/karbon.png?url'
import lacerteLogoUrl from '@/features/migration/assets/source-logos/lacerte.png?url'
import quickbooksLogoUrl from '@/features/migration/assets/source-logos/quickbooks.svg?url'
import taxdomeLogoUrl from '@/features/migration/assets/source-logos/taxdome.png?url'
import ultrataxCsLogoUrl from '@/features/migration/assets/source-logos/ultratax-cs.png?url'

/**
 * ClientsEmptyState — the full-surface "no clients yet" hero for /clients.
 *
 * Replicates Pencil `jQFBx` (the canonical empty state): a centered hero
 * card with a "Get started" eyebrow, an integration-logo strip ending in
 * the DueDateHQ destination tile, a large headline + body, a CTA pair
 * (Import / Add manually), and a "try sample data" chip — over a subtle
 * brand wash. No stat band: the logos + copy carry the reassurance, and
 * unbacked metrics ("4 min", "SOC 2") would be fiction on an app surface.
 *
 * Reuses the prominent-card chrome (`rounded-xl border border-divider-
 * regular bg-background-default`) so it reads as the same family as the
 * shared EmptyState; the integration strip replaces the icon-circle because
 * the design leads with "which tools we ingest" rather than a generic glyph.
 * Real product logos (from the migration wizard's source-logo assets) carry
 * their own brand identity on neutral tiles.
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
      {/* DueDateHQ destination tile — the import endpoint, a touch larger
          than the source tiles to read as the "lands here" endpoint. */}
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-text-primary shadow-md">
        <span className="text-base font-semibold text-text-inverted">DD</span>
      </div>
    </div>
  )
}

export function ClientsEmptyState({
  onImport,
  onCreate,
  onSampleData,
  sampleDataPending = false,
  canImport,
  canCreate,
}: {
  onImport: () => void
  onCreate?: (() => void) | undefined
  onSampleData?: (() => void) | undefined
  /** Seed mutation in flight — disables the sample-data button so a
   *  double-click can't seed duplicate demo rows. */
  sampleDataPending?: boolean
  canImport: boolean
  canCreate?: boolean | undefined
}) {
  return (
    <div className="flex min-h-[560px] flex-1 items-center justify-center pb-[clamp(5rem,14vh,10rem)]">
      <div className="relative w-full max-w-[920px] overflow-hidden rounded-xl border border-divider-regular bg-background-default">
        {/* Subtle brand wash across the top of the card (Pencil jQFBx) — a
            quiet lift that fades into the card surface by the midline, not
            decoration. Sits behind the content (which is `relative`). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-state-accent-hover-alt/45 to-transparent"
        />
        <div className="relative flex flex-col items-center gap-6 px-6 py-12 text-center md:px-14 md:py-14">
          {/* Eyebrow — orients the first-time user before the tool strip. */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-3 py-1 text-column-label font-semibold tracking-wide text-text-secondary">
            <span className="size-1.5 rounded-full bg-accent-default" aria-hidden />
            <Trans>Get started</Trans>
          </span>

          <IntegrationStrip />

          <div className="flex max-w-[640px] flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-section-title md:leading-tight">
              <Trans>Plug in your tools. Walk away with a triage list.</Trans>
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary md:text-base">
              <Trans>
                Import a client list from TaxDome, Karbon, Drake, QuickBooks, UltraTax, Lacerte and
                6 more. Every deadline shows up on its own — no manual mapping, no setup wizard.
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

          {onSampleData ? (
            <button
              type="button"
              onClick={onSampleData}
              disabled={sampleDataPending}
              aria-busy={sampleDataPending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-state-accent-active-alt bg-state-accent-hover px-3.5 py-1.5 text-xs font-semibold text-text-accent outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 [&_svg:last-child]:transition-transform hover:[&_svg:last-child]:translate-x-0.5"
            >
              <CirclePlayIcon className="size-3.5" aria-hidden />
              <Trans>Explore with sample data</Trans>
              <ArrowRightIcon className="size-3" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import { Trans } from '@lingui/react/macro'
import { ArrowRightIcon, CirclePlayIcon, DownloadIcon, UserPlusIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'

import cchAxcessLogoUrl from '@/features/migration/assets/source-logos/cch-axcess.png?url'
import cchProsystemFxLogoUrl from '@/features/migration/assets/source-logos/cch-prosystem-fx.png?url'
import drakeLogoUrl from '@/features/migration/assets/source-logos/drake.png?url'
import fileInTimeLogoUrl from '@/features/migration/assets/source-logos/file-in-time.svg?url'
import karbonLogoUrl from '@/features/migration/assets/source-logos/karbon.png?url'
import lacerteLogoUrl from '@/features/migration/assets/source-logos/lacerte.png?url'
import proconnectTaxLogoUrl from '@/features/migration/assets/source-logos/proconnect-tax.png?url'
import proseriesLogoUrl from '@/features/migration/assets/source-logos/proseries.png?url'
import quickbooksLogoUrl from '@/features/migration/assets/source-logos/quickbooks.svg?url'
import taxdomeLogoUrl from '@/features/migration/assets/source-logos/taxdome.png?url'
import ultrataxCsLogoUrl from '@/features/migration/assets/source-logos/ultratax-cs.png?url'

/**
 * ClientsEmptyState — the full-surface "no clients yet" hero for /clients.
 *
 * A centered, section-tinted hero card: an integration-logo strip (every
 * source we auto-detect), a balanced headline + accurate body, a CTA pair
 * (Import / Add manually), and a "try sample data" chip. No stat band: the
 * logos + copy carry the reassurance, and
 * unbacked metrics ("4 min", "SOC 2") would be fiction on an app surface.
 *
 * The integration strip replaces the shared EmptyState's icon-circle because
 * the design leads with "which tools we ingest" rather than a generic glyph.
 * Real product logos (from the migration wizard's source-logo assets) sit on
 * white tiles so they pop against the card's section fill.
 */

// The full set we can ingest (every source the migration wizard auto-detects),
// so the strip shows the real breadth instead of a token six (Yuqi 2026-06-29).
const INTEGRATION_LOGOS: ReadonlyArray<{ src: string; label: string }> = [
  { src: taxdomeLogoUrl, label: 'TaxDome' },
  { src: karbonLogoUrl, label: 'Karbon' },
  { src: drakeLogoUrl, label: 'Drake' },
  { src: quickbooksLogoUrl, label: 'QuickBooks' },
  { src: ultrataxCsLogoUrl, label: 'UltraTax CS' },
  { src: lacerteLogoUrl, label: 'Lacerte' },
  { src: proseriesLogoUrl, label: 'ProSeries' },
  { src: proconnectTaxLogoUrl, label: 'ProConnect Tax' },
  { src: cchAxcessLogoUrl, label: 'CCH Axcess' },
  { src: cchProsystemFxLogoUrl, label: 'CCH ProSystem fx' },
  { src: fileInTimeLogoUrl, label: 'File In Time' },
]

function IntegrationStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {INTEGRATION_LOGOS.map((logo) => (
        <div
          key={logo.label}
          title={logo.label}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-divider-regular bg-background-default"
        >
          <img src={logo.src} alt="" aria-hidden className="max-h-6 max-w-7 object-contain" />
        </div>
      ))}
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
      <div className="w-full max-w-[920px] overflow-hidden rounded-xl border border-divider-regular bg-background-section">
        {/* Section-tinted card surface (Yuqi 2026-06-29: "give this frame a
            background") — a flat neutral fill so the frame reads as a distinct
            surface against the white page, replacing the removed gradient
            brand-wash. The logo tiles flip to white so they still pop on it.
            The one-off "Get started" eyebrow was dropped (it appeared nowhere
            else); the logo strip + headline carry the orientation. */}
        <div className="flex flex-col items-center gap-6 px-6 py-12 text-center md:px-14 md:py-14">
          <IntegrationStrip />

          <div className="flex max-w-[640px] flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-text-primary md:text-section-title md:leading-tight">
              <Trans>Drop in your client list. Walk away with a triage list.</Trans>
            </h2>
            {/* Accurate copy (Yuqi 2026-06-29): the import is an EXPORT-FILE
                upload — you export from these tools and drop the file; the app
                auto-detects the format. Dropped the false "plug in your tools"
                (no live integration) and "no setup wizard" (there IS a migration
                wizard); the count was wrong too (6 shown + 5 more = 11). */}
            <p className="text-sm leading-relaxed text-text-secondary md:text-base">
              <Trans>
                Export a client list from TaxDome, Karbon, Drake, QuickBooks, UltraTax, Lacerte and
                more, then drop the file here — we auto-detect the format, no column mapping.
              </Trans>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button size="lg" onClick={onImport} disabled={!canImport}>
              <DownloadIcon data-icon="inline-start" />
              <Trans>Import clients</Trans>
            </Button>
            {onCreate ? (
              <Button variant="secondary" size="lg" onClick={onCreate} disabled={canCreate === false}>
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

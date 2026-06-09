import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react/macro'
import { LayersIcon } from 'lucide-react'

import { expectedCatalogReleaseDate } from '@duedatehq/core/rules'

import { InfoBanner } from '@/components/patterns/info-banner'
import { orpc } from '@/lib/rpc'

/**
 * CatalogReleaseBanner — the explicit "new rule catalog" signal on the rule
 * library, plus a predictable-cadence pre-announce.
 *
 * Two states, both driven by `rules.listCatalogRelease`:
 *   - A cohort shipped recently → "YYYY rule catalog: N new · M changed" with a
 *     CTA that filters the library to that cohort's rules. Dismissible per year.
 *   - Otherwise → "YYYY rule catalog expected around <month>", a deterministic
 *     forecast of when the next cohort arrives (NOT a review deadline).
 *
 * Quiet by design: nothing while loading, and a release older than the recency
 * window is treated as historical (the back-dated first-run baselines never
 * surface a banner).
 */
const RECENT_RELEASE_DAYS = 120
const DAY_MS = 24 * 60 * 60 * 1000

export function CatalogReleaseBanner({
  onReviewCohort,
}: {
  onReviewCohort: (filingYear: number) => void
}) {
  const { t } = useLingui()
  const releaseQuery = useQuery(orpc.rules.listCatalogRelease.queryOptions({ input: undefined }))

  if (releaseQuery.isLoading) return null

  const release = releaseQuery.data ?? null
  const now = Date.now()

  if (release && now - new Date(release.releasedAt).getTime() < RECENT_RELEASE_DAYS * DAY_MS) {
    return (
      <InfoBanner
        icon={LayersIcon}
        message={t`${release.filingYear} rule catalog: ${release.newRuleCount} new · ${release.changedRuleCount} changed`}
        cta={{ label: t`Review cohort`, onClick: () => onReviewCohort(release.filingYear) }}
        dismissKey={`catalog-release-${release.filingYear}`}
      />
    )
  }

  // Pre-announce the next cohort on a predictable cadence.
  const baseYear = release?.filingYear ?? new Date(now).getUTCFullYear()
  const nextYear = baseYear + 1
  const expected = expectedCatalogReleaseDate(nextYear)
  if (expected.getTime() > now) {
    const expectedLabel = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(expected)
    return (
      <InfoBanner
        icon={LayersIcon}
        message={t`${nextYear} rule catalog expected around ${expectedLabel}`}
        dismissKey={`catalog-release-expected-${nextYear}`}
      />
    )
  }

  return null
}

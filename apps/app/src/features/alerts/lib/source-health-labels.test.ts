import { describe, expect, it } from 'vitest'

import {
  enabledAlertSourceCount,
  passiveSourcesNeedingAttention,
  reviewableSourcesNeedingAttention,
  sourcesNeedingAttention,
  summarizeAlertSources,
} from './source-health-labels'

function source(
  sourceId: string,
  options: {
    enabled?: boolean
    healthStatus?: 'healthy' | 'degraded' | 'failing' | 'paused'
    label?: string
    lastCheckedAt?: string | null
    tier?: 'T1' | 'T2' | 'T3'
  } = {},
) {
  return {
    sourceId,
    label: options.label ?? sourceId,
    enabled: options.enabled ?? true,
    healthStatus: options.healthStatus ?? 'healthy',
    lastCheckedAt: 'lastCheckedAt' in options ? options.lastCheckedAt : '2026-05-04T00:00:00.000Z',
    tier: options.tier ?? 'T1',
  }
}

describe('pulse source health labels', () => {
  it('deduplicates known source families and caps long source lists', () => {
    expect(
      summarizeAlertSources([
        source('ca.ftb.newsroom'),
        source('ca.ftb.tax_news'),
        source('tx.cpa.rss'),
        source('wa.dor.news'),
        source('ma.dor.press'),
        source('fema.declarations'),
        source('ca.income_tax'),
        source('co.income_tax'),
      ]),
    ).toBe('CA FTB + TX Comptroller + WA DOR + MA DOR + FEMA + 2 more')
  })

  it('excludes disabled and paused sources from summaries and counts', () => {
    const sources = [
      source('ca.ftb.newsroom'),
      source('tx.cpa.rss', { enabled: false }),
      source('fema.declarations', { healthStatus: 'paused' }),
    ]

    expect(summarizeAlertSources(sources)).toBe('CA FTB')
    expect(enabledAlertSourceCount(sources)).toBe(1)
  })

  it('does not expose degraded or failing source health as CPA attention', () => {
    expect(
      sourcesNeedingAttention([
        source('ca.ftb.newsroom', { healthStatus: 'degraded' }),
        source('tx.cpa.rss', { healthStatus: 'failing' }),
        source('fema.declarations', { healthStatus: 'degraded', lastCheckedAt: null }),
        source('irs.disaster', { healthStatus: 'healthy' }),
      ]).map((item) => item.sourceId),
    ).toEqual([])
  })

  it('keeps legacy degraded and failing statuses out of reviewable source attention', () => {
    const sources = [
      source('irs.disaster', { healthStatus: 'degraded', tier: 'T1' }),
      source('fema.declarations', { healthStatus: 'degraded', tier: 'T2' }),
      source('aicpa.newsletter', { healthStatus: 'failing', tier: 'T3' }),
    ]

    expect(reviewableSourcesNeedingAttention(sources).map((item) => item.sourceId)).toEqual([])
    expect(passiveSourcesNeedingAttention(sources).map((item) => item.sourceId)).toEqual([])
  })
})

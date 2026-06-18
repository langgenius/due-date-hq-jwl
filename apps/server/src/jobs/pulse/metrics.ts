export type PulseMetricFields = Record<string, string | number | boolean | null>

export interface PulseSourceStateForMetrics {
  sourceId: string
  tier: string
  jurisdiction: string
  enabled: boolean
  cadenceMs: number
  healthStatus: string
  lastSuccessAt: Date | null
}

export function recordPulseMetric(name: string, fields: PulseMetricFields): void {
  console.info(
    JSON.stringify({
      type: 'pulse.metric',
      name,
      at: new Date().toISOString(),
      ...fields,
    }),
  )
}

export function recordPulseAlert(name: string, fields: PulseMetricFields): void {
  console.warn(
    JSON.stringify({
      type: 'pulse.alert',
      name,
      at: new Date().toISOString(),
      ...fields,
    }),
  )
}

// A single missed-refresh floor, and how many of a source's own cadences may
// elapse before we treat it as idle.
//
// Staleness MUST be judged against each source's own cadence, not a flat clock.
// Most regulatory sources poll slowly (daily/weekly/biweekly), so the old fixed
// 4h/12h threshold flagged hundreds of perfectly on-schedule sources as stale —
// a 14-day-cadence source is "more than 12h since last success" ~99% of the
// time. (The 4h branch was also dead: it keyed on `jurisdiction === 'US'`, but
// federal sources carry `jurisdiction === 'FED'`, so nothing ever hit it.)
//
// We now alarm only once a source has missed ~2 of its own cycles, with a floor
// so a single transient miss on a high-frequency source still trips fast — those
// short-cadence sources are the tripwire for a global fetch stall.
const STALE_FLOOR_MS = 4 * 60 * 60 * 1000
const STALE_CADENCE_MULTIPLIER = 2

// Returns the stale sources so the caller can fan a single aggregated
// operator alert out of the per-source log lines.
export function emitSourceIdleAlerts(
  sources: readonly PulseSourceStateForMetrics[],
  now: Date = new Date(),
): PulseSourceStateForMetrics[] {
  const stale: PulseSourceStateForMetrics[] = []
  for (const source of sources) {
    if (!source.enabled || source.healthStatus === 'paused') continue
    const thresholdMs = Math.max(STALE_FLOOR_MS, source.cadenceMs * STALE_CADENCE_MULTIPLIER)
    const lastSuccessAt = source.lastSuccessAt?.getTime() ?? 0
    if (now.getTime() - lastSuccessAt <= thresholdMs) continue
    stale.push(source)
    recordPulseAlert('pulse.ingest.last_success_stale', {
      sourceId: source.sourceId,
      tier: source.tier,
      jurisdiction: source.jurisdiction,
      cadenceHours: source.cadenceMs / 60 / 60 / 1000,
      thresholdHours: thresholdMs / 60 / 60 / 1000,
      lastSuccessAt: source.lastSuccessAt?.toISOString() ?? null,
    })
  }
  return stale
}

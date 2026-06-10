export type PulseMetricFields = Record<string, string | number | boolean | null>

export interface PulseSourceStateForMetrics {
  sourceId: string
  tier: string
  jurisdiction: string
  enabled: boolean
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

// Returns the stale sources so the caller can fan a single aggregated
// operator alert out of the per-source log lines.
export function emitSourceIdleAlerts(
  sources: readonly PulseSourceStateForMetrics[],
  now: Date = new Date(),
): PulseSourceStateForMetrics[] {
  const stale: PulseSourceStateForMetrics[] = []
  for (const source of sources) {
    if (!source.enabled || source.healthStatus === 'paused') continue
    const thresholdMs =
      source.tier === 'T1' && source.jurisdiction === 'US'
        ? 4 * 60 * 60 * 1000
        : 12 * 60 * 60 * 1000
    const lastSuccessAt = source.lastSuccessAt?.getTime() ?? 0
    if (now.getTime() - lastSuccessAt <= thresholdMs) continue
    stale.push(source)
    recordPulseAlert('pulse.ingest.last_success_stale', {
      sourceId: source.sourceId,
      tier: source.tier,
      jurisdiction: source.jurisdiction,
      thresholdHours: thresholdMs / 60 / 60 / 1000,
      lastSuccessAt: source.lastSuccessAt?.toISOString() ?? null,
    })
  }
  return stale
}

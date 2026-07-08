/**
 * Amplitude product analytics — public surface for the app.
 *
 * Contract:
 *  - **Gated**: only initializes in a PRODUCTION build that also has
 *    `VITE_AMPLITUDE_API_KEY` set. The dev server, tests, and local previews
 *    are always a silent no-op (and the SDK is never even downloaded), so
 *    non-prod environments never pollute the analytics project. Safe to call
 *    anywhere.
 *  - **Lazy**: the Browser SDK is `import()`-ed only after a key is present, so
 *    it stays out of the main bundle. Calls made before it finishes loading are
 *    queued and flushed in order.
 *  - **PII-safe**: all properties pass through the PII guard before send.
 *  - **B2B**: firms are modeled as the Amplitude group type `firm` so funnels
 *    and retention roll up to the account, not the individual user.
 *
 * Usage:
 *   import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
 *   track(ANALYTICS_EVENTS.practiceCreated, { path: 'created', includes_fed: true })
 */
import { sanitizeProperties } from './pii-guard'
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type SignInMethod,
} from './events'

export { ANALYTICS_EVENTS }
export type { AnalyticsEventName, AnalyticsProperties, SignInMethod }

type AmplitudeModule = typeof import('@amplitude/analytics-browser')

let amplitude: AmplitudeModule | null = null
let enabled = false
let ready = false
const pending: Array<(amp: AmplitudeModule) => void> = []
let superProps: Record<string, string | number | boolean | string[] | number[]> = {}
const CAMPAIGN_STORAGE_KEY = 'ddhq.analytics.campaign'
const CAMPAIGN_PARAM_NAMES = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const
const TRACKING_PARAM_NAMES = [...CAMPAIGN_PARAM_NAMES, 'gclid', 'fbclid', 'msclkid'] as const
const CAMPAIGN_VALUE_MAX_LENGTH = 120
const EMAIL_LIKE_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/

function readApiKey(): string {
  const raw = import.meta.env.VITE_AMPLITUDE_API_KEY
  return typeof raw === 'string' ? raw.trim() : ''
}

function readAppVersion(): string | undefined {
  const raw = import.meta.env.VITE_APP_VERSION
  return typeof raw === 'string' && raw ? raw : undefined
}

function safeCampaignValue(raw: string | null): string | null {
  const value = raw?.trim() ?? ''
  if (!value || EMAIL_LIKE_RE.test(value)) return null
  return value.slice(0, CAMPAIGN_VALUE_MAX_LENGTH)
}

function hasTrackingParams(url: URL): boolean {
  return TRACKING_PARAM_NAMES.some((key) => url.searchParams.has(key))
}

function buildCampaignProps(url: URL): AnalyticsProperties | null {
  const props: AnalyticsProperties = {}
  for (const key of CAMPAIGN_PARAM_NAMES) {
    const value = safeCampaignValue(url.searchParams.get(key))
    if (value) props[key] = value
  }
  if (Object.keys(props).length === 0) return null

  props.landing_path = url.pathname
  props.is_outreach =
    props.utm_source === 'cold_outreach' ||
    (typeof props.utm_campaign === 'string' && props.utm_campaign.includes('cpa_outreach'))
  return props
}

function stripTrackingParamsFromUrl(url: URL): void {
  if (!hasTrackingParams(url)) return
  for (const key of TRACKING_PARAM_NAMES) url.searchParams.delete(key)
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, document.title, next)
}

function writeStoredCampaignProps(props: AnalyticsProperties): void {
  try {
    sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(props))
  } catch {
    // Storage can be unavailable in private browsing; event super-props still work.
  }
}

function readStoredCampaignProps(): AnalyticsProperties {
  try {
    const raw = sessionStorage.getItem(CAMPAIGN_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) =>
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
      ),
    )
  } catch {
    return {}
  }
}

/**
 * Capture campaign parameters before Amplitude lazy-loads, then clean the
 * address bar. The stored props are stamped on subsequent app events so signup
 * and activation remain segmentable after UTM removal.
 */
export function captureCampaignAttribution(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const fromUrl = buildCampaignProps(url)
  if (fromUrl) {
    writeStoredCampaignProps(fromUrl)
    setSuperProperties(fromUrl)
  } else {
    const stored = readStoredCampaignProps()
    if (Object.keys(stored).length > 0) setSuperProperties(stored)
  }
  stripTrackingParamsFromUrl(url)
}

/**
 * Initialize analytics once, at app boot. No-op without an API key. Failures
 * (network, blocked CDN, import error) are swallowed — analytics must never
 * break the app.
 */
export function initAnalytics(): void {
  if (enabled) return
  // Production builds only — never the dev server, tests, or local previews.
  // Vite sets PROD=false under `vp dev` (and in test), so analytics stays a
  // silent no-op locally even if a key is present in .env.local.
  if (!import.meta.env.PROD) return
  const apiKey = readApiKey()
  if (!apiKey) return

  enabled = true
  const version = readAppVersion()
  if (version) superProps.app_version = version

  void import('@amplitude/analytics-browser')
    .then((mod) => {
      amplitude = mod
      mod.init(apiKey, {
        serverZone: 'US',
        // Store the device_id cookie on the registrable top-level domain
        // (.duedatehq.com) so the marketing site (duedatehq.com) and this app
        // (app.duedatehq.com) share one device_id — the landing → signup →
        // activation funnel stitches across the subdomain hop automatically.
        identityStorage: 'cookie',
        // Capture sessions + page views + marketing attribution for the
        // funnel, but NOT element/form interactions — those can hoover up
        // values typed into inputs, which on this product would be PII.
        autocapture: {
          attribution: true,
          pageViews: true,
          sessions: true,
          formInteractions: false,
          fileDownloads: false,
          elementInteractions: false,
        },
      })
      ready = true
      flushPending(mod)
    })
    .catch(() => {
      enabled = false
    })
}

function flushPending(mod: AmplitudeModule): void {
  while (pending.length > 0) {
    const run = pending.shift()
    run?.(mod)
  }
}

function withClient(run: (amp: AmplitudeModule) => void): void {
  if (!enabled) return
  if (ready && amplitude) {
    run(amplitude)
    return
  }
  pending.push(run)
}

/**
 * Merge global properties stamped onto every subsequent event (e.g. locale,
 * nav_variant). Sanitized like any other payload.
 */
export function setSuperProperties(props: AnalyticsProperties): void {
  superProps = { ...superProps, ...sanitizeProperties(props) }
}

/** Track an event. Properties are PII-guarded and merged with super properties. */
export function track(name: AnalyticsEventName, properties?: AnalyticsProperties): void {
  if (!enabled) return
  const payload = { ...superProps, ...sanitizeProperties(properties) }
  withClient((amp) => amp.track(name, payload))
}

function applyProps(
  identify: InstanceType<AmplitudeModule['Identify']>,
  props?: AnalyticsProperties,
) {
  for (const [key, value] of Object.entries(sanitizeProperties(props))) {
    identify.set(key, value)
  }
  return identify
}

/** Identify the signed-in user and set user-level properties. */
export function identifyUser(userId: string, properties?: AnalyticsProperties): void {
  withClient((amp) => {
    amp.setUserId(userId)
    amp.identify(applyProps(new amp.Identify(), properties))
  })
}

/**
 * Associate the user with their firm (Amplitude group type `firm`) and set
 * account-level group properties for B2B funnels/retention.
 */
export function setFirmGroup(firmId: string, properties?: AnalyticsProperties): void {
  withClient((amp) => {
    amp.setGroup('firm', firmId)
    amp.groupIdentify('firm', firmId, applyProps(new amp.Identify(), properties))
  })
}

/** Clear identity + device on sign-out so the next user starts clean. */
export function resetAnalytics(): void {
  withClient((amp) => amp.reset())
}

// ── Redirect-safe sign-in markers ───────────────────────────────────────────
// OAuth sign-in navigates away before we can fire a "Signed In/Up" event, so we
// drop a marker in sessionStorage just before leaving and consume it on the
// next authenticated load. Whoever lands first wins: brand-new users hit
// /onboarding (→ "Signed Up"); returning users hit the app shell (→ "Signed
// In"). Consuming deletes the marker, so exactly one fires.
const SIGN_IN_MARKER_KEY = 'ddhq.analytics.signin'

export function markSignInPending(method: SignInMethod): void {
  try {
    sessionStorage.setItem(SIGN_IN_MARKER_KEY, JSON.stringify({ method }))
  } catch {
    // Private mode / disabled storage — drop the marker silently.
  }
}

function isSignInMethod(value: unknown): value is SignInMethod {
  return value === 'google' || value === 'microsoft' || value === 'email_otp'
}

export function consumeSignInMarker(): { method: SignInMethod } | null {
  try {
    const raw = sessionStorage.getItem(SIGN_IN_MARKER_KEY)
    if (!raw) return null
    sessionStorage.removeItem(SIGN_IN_MARKER_KEY)
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      'method' in parsed &&
      isSignInMethod(parsed.method)
    ) {
      return { method: parsed.method }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Amplitude product analytics — public surface for the app.
 *
 * Contract:
 *  - **Gated**: with no `VITE_AMPLITUDE_API_KEY`, every export here is a silent
 *    no-op and the SDK is never even downloaded. Safe to call anywhere.
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

function readApiKey(): string {
  const raw = import.meta.env.VITE_AMPLITUDE_API_KEY
  return typeof raw === 'string' ? raw.trim() : ''
}

function readAppVersion(): string | undefined {
  const raw = import.meta.env.VITE_APP_VERSION
  return typeof raw === 'string' && raw ? raw : undefined
}

/**
 * Initialize analytics once, at app boot. No-op without an API key. Failures
 * (network, blocked CDN, import error) are swallowed — analytics must never
 * break the app.
 */
export function initAnalytics(): void {
  if (enabled) return
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

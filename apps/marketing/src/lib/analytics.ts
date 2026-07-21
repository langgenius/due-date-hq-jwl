// Marketing-site product analytics (Amplitude) — DEFERRED + PRODUCTION-only.
//
// Shares the Amplitude project (827681) with apps/app so the whole funnel —
// landing → signup → activation — lives in ONE tool. Cross-subdomain stitching
// is automatic: `identityStorage: 'cookie'` stores the device_id cookie on the
// registrable top-level domain (.duedatehq.com), so app.duedatehq.com reads the
// same device_id without any URL passing.
//
// JS budget: the SDK is `import()`-ed on idle, so it lands in its own deferred
// chunk and never competes with LCP/CWV on this SEO-critical site. With no key
// (or in dev/preview) every export is a silent no-op.

type AmpModule = typeof import('@amplitude/analytics-browser')
type AnalyticsProps = Record<string, string | number | boolean>

const EVENTS = {
  pageViewed: 'Marketing Page Viewed',
  pricingViewed: 'Pricing Viewed',
  signupCtaClicked: 'Signup CTA Clicked',
  foundingBannerApplyClicked: 'Founding User Banner Apply Clicked',
} as const

const ACTION_EVENTS = {
  'marketing.founding-banner.apply': {
    name: EVENTS.foundingBannerApplyClicked,
    location: 'founding_banner',
  },
} as const

export function resolveMarketingAction(marker: string | undefined) {
  if (!marker || !(marker in ACTION_EVENTS)) return undefined
  return ACTION_EVENTS[marker as keyof typeof ACTION_EVENTS]
}

const KEY = import.meta.env.PUBLIC_AMPLITUDE_API_KEY ?? ''
const ENABLED = import.meta.env.PROD && KEY.length > 0
const APP_HOST = resolveAppHost()
const CAMPAIGN_STORAGE_KEY = 'ddhq.marketing.campaign'
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

let amp: AmpModule | null = null
let ready = false
const pending: Array<() => void> = []

function resolveAppHost(): string {
  try {
    return new URL(import.meta.env.PUBLIC_APP_URL ?? 'https://app.duedatehq.com').host
  } catch {
    return 'app.duedatehq.com'
  }
}

function track(name: string, props?: AnalyticsProps): void {
  if (!ENABLED) return
  if (ready && amp) {
    amp.track(name, props)
    return
  }
  pending.push(() => amp?.track(name, props))
}

function loadSdk(): void {
  void import('@amplitude/analytics-browser')
    .then((mod) => {
      amp = mod
      mod.init(KEY, {
        serverZone: 'US',
        // Shared device_id cookie across *.duedatehq.com → unified funnel.
        identityStorage: 'cookie',
        autocapture: {
          attribution: true, // capture UTM / referrer for channel attribution
          sessions: true,
          pageViews: false, // we send `Marketing Page Viewed` explicitly
          formInteractions: false,
          fileDownloads: false,
          elementInteractions: false,
        },
      })
      ready = true
      for (const fn of pending.splice(0)) fn()
    })
    .catch(() => {
      // analytics must never break the page
    })
}

function safeCampaignValue(raw: string | null): string | null {
  const value = raw?.trim() ?? ''
  if (!value || EMAIL_LIKE_RE.test(value)) return null
  return value.slice(0, CAMPAIGN_VALUE_MAX_LENGTH)
}

function hasTrackingParams(url: URL): boolean {
  return TRACKING_PARAM_NAMES.some((key) => url.searchParams.has(key))
}

function buildCampaignProps(url: URL): AnalyticsProps | null {
  const props: AnalyticsProps = {}
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

function writeStoredCampaignProps(props: AnalyticsProps): void {
  try {
    sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(props))
  } catch {
    // Storage can be unavailable in private browsing; page-level events still fire.
  }
}

function readStoredCampaignProps(): AnalyticsProps {
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

function captureCampaignProps(): AnalyticsProps {
  const url = new URL(window.location.href)
  const fromUrl = buildCampaignProps(url)
  if (fromUrl) writeStoredCampaignProps(fromUrl)
  stripTrackingParamsFromUrl(url)
  return fromUrl ?? readStoredCampaignProps()
}

function appendCampaignParams(href: string, campaignProps: AnalyticsProps): string {
  const url = new URL(href, window.location.href)
  for (const key of CAMPAIGN_PARAM_NAMES) {
    const value = campaignProps[key]
    if (typeof value === 'string' && value) url.searchParams.set(key, value)
  }
  return url.toString()
}

let booted = false

/** One-time setup: defer-load the SDK and bind the delegated CTA click listener.
 *  Self-guards, so it's safe to call on every `astro:page-load` — the SDK loads
 *  once and the document listener binds once (it survives view-transition swaps).
 */
export function initMarketingAnalytics(): void {
  if (!ENABLED || booted) return
  booted = true

  // Defer the SDK download past first paint (~1.2s, after the page is
  // interactive) so it never blocks LCP/CWV on this SEO-critical site.
  window.setTimeout(loadSdk, 1200)

  // Delegated action tracking: named non-navigation actions use an explicit
  // marker contract, while any link to the app domain is signup intent. Capture
  // phase runs before navigation and before feature click handlers.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const marker = target.closest<HTMLElement>('[data-event]')
      const action = resolveMarketingAction(marker?.dataset.event)
      if (action) {
        track(action.name, {
          location: action.location,
          page: location.pathname,
          locale: document.documentElement.lang || 'en',
          ...readStoredCampaignProps(),
        })
        return
      }

      const anchor = target.closest('a')
      if (!anchor || anchor.host !== APP_HOST) return
      const campaignProps = readStoredCampaignProps()
      const surface =
        marker instanceof HTMLElement
          ? (marker.dataset.event?.split('.')[1] ?? 'unknown')
          : 'unknown'
      if (Object.keys(campaignProps).length > 0) {
        anchor.href = appendCampaignParams(anchor.href, campaignProps)
      }
      track(EVENTS.signupCtaClicked, {
        location: surface,
        locale: document.documentElement.lang || 'en',
        ...campaignProps,
      })
    },
    { capture: true },
  )
}

/** Fire a page-view for the current URL. Call on every `astro:page-load` so views
 *  keep firing across client-side (view-transition) navigations — not just the
 *  session's first page. */
export function trackPageView(): void {
  const campaignProps = captureCampaignProps()
  if (!ENABLED) return
  const locale = document.documentElement.lang || 'en'
  const page = location.pathname
  track(EVENTS.pageViewed, { page, locale, ...campaignProps })
  if (page.endsWith('/pricing')) track(EVENTS.pricingViewed, { locale, ...campaignProps })
}

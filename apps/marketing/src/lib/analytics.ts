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

const EVENTS = {
  pageViewed: 'Marketing Page Viewed',
  pricingViewed: 'Pricing Viewed',
  signupCtaClicked: 'Signup CTA Clicked',
} as const

const KEY = import.meta.env.PUBLIC_AMPLITUDE_API_KEY ?? ''
const ENABLED = import.meta.env.PROD && KEY.length > 0
const APP_HOST = resolveAppHost()

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

function track(name: string, props?: Record<string, string | number | boolean>): void {
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

/** Boot marketing analytics. Call once per page load from the base layout. */
export function initMarketingAnalytics(): void {
  if (!ENABLED) return

  // Defer the SDK download past first paint (~1.2s, after the page is
  // interactive) so it never blocks LCP/CWV on this SEO-critical site.
  window.setTimeout(loadSdk, 1200)

  const locale = document.documentElement.lang || 'en'
  const page = location.pathname
  track(EVENTS.pageViewed, { page, locale })
  if (page.endsWith('/pricing')) track(EVENTS.pricingViewed, { locale })

  // Delegated CTA tracking: a click on any link to the app domain is signup
  // intent. The `data-event` marker (e.g. "marketing.hero_cta.clicked") names
  // the surface; mailto + locale-switch links have a different host and are
  // ignored. Capture phase so it runs before the browser follows the link.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a')
      if (!anchor || anchor.host !== APP_HOST) return
      const marker = target.closest('[data-event]')
      const surface =
        marker instanceof HTMLElement
          ? (marker.dataset.event?.split('.')[1] ?? 'unknown')
          : 'unknown'
      track(EVENTS.signupCtaClicked, { location: surface, locale })
    },
    { capture: true },
  )
}

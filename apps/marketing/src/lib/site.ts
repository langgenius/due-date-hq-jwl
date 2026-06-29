export const MARKETING_SITE_URL = 'https://duedatehq.com'
export const APP_SITE_URL = 'https://app.duedatehq.com'

// Concierge onboarding inbox — the "we'll set it up with your client list"
// path. Must be a monitored mailbox; swap here to repoint every concierge CTA.
export const CONCIERGE_EMAIL = 'hello@duedatehq.com'

export function getMarketingUrl(pathname: string): string {
  return `${MARKETING_SITE_URL}${pathname === '/' ? '' : pathname}`
}

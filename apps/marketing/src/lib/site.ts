export const MARKETING_SITE_URL = 'https://duedatehq.com'
export const APP_SITE_URL = 'https://app.duedatehq.com'

export function getMarketingUrl(pathname: string): string {
  return `${MARKETING_SITE_URL}${pathname === '/' ? '' : pathname}`
}

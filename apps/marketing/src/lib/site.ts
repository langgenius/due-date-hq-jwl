export const MARKETING_SITE_URL = 'https://due.langgenius.app'
export const APP_SITE_URL = 'https://app.due.langgenius.app'

export function getMarketingUrl(pathname: string): string {
  return `${MARKETING_SITE_URL}${pathname === '/' ? '' : pathname}`
}

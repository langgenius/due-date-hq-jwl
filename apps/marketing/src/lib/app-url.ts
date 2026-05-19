// Resolve the apps/app entry URL for marketing CTAs.
// Preference order:
//   1. `PUBLIC_APP_URL` env (wrangler.toml in production)
//   2. apps/app vite dev server (http://localhost:5173) when running `astro dev`
//   3. internal deployment URL as a safe last-resort fallback

import { APP_SITE_URL } from './site'

const PROD_APP_URL = APP_SITE_URL
const DEV_APP_URL = 'http://localhost:5173'

function resolveBase(): string {
  if (import.meta.env.PUBLIC_APP_URL) return import.meta.env.PUBLIC_APP_URL
  return import.meta.env.DEV ? DEV_APP_URL : PROD_APP_URL
}

export function getCtaHref(locale?: string): string {
  const base = resolveBase()
  return locale ? `${base}/?lng=${locale}` : base
}

export function getAppHref(path = '/', locale?: string): string {
  const url = new URL(path, resolveBase())
  if (locale) url.searchParams.set('lng', locale)
  return url.toString()
}

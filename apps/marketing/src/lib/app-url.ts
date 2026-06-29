// Resolve the apps/app entry URL for marketing CTAs.
// Preference order:
//   1. `PUBLIC_APP_URL` env (wrangler.toml in production)
//   2. apps/app vite dev server (http://localhost:5173) when running `astro dev`
//   3. internal deployment URL as a safe last-resort fallback

import { APP_SITE_URL, CONCIERGE_EMAIL } from './site'

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

// The "Get started" CTA target. Goes STRAIGHT to the app's passwordless sign-in
// (enter work email → open the emailed link → onboarding) — no marketing
// interstitial. The launch offer + questionnaire now live in the app's onboarding.
export function getStartedHref(locale?: string): string {
  return getAppHref('/login', locale)
}

// The concierge CTA target — "we'll set it up with your client list". A mailto
// to a monitored inbox with a prefilled subject + body, so a warm-email reader
// can hand over their list in one click instead of self-serve onboarding.
export function getConciergeHref(locale?: string): string {
  const zh = locale === 'zh-CN'
  const subject = zh ? '帮我用客户名单完成设置' : 'Set up DueDateHQ with my client list'
  const body = zh
    ? '你好，我想用 DueDateHQ。我的客户名单在附件里（或贴在下方），请帮我把它设置好。'
    : "Hi — I'd like to use DueDateHQ. My client list is attached (or pasted below). Please set it up for me."
  return `mailto:${CONCIERGE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

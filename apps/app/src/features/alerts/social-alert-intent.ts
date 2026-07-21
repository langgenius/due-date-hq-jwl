import {
  SocialAlertRefSchema,
  SocialAlertTeaserSchema,
  type SocialAlertTeaser,
} from '@duedatehq/contracts'

const INTENT_ORIGIN = 'https://app.duedatehq.invalid'

/**
 * Read an opaque social ref only from the canonical protected Alerts route.
 * This is both an open-redirect guard and the narrow exception that lets a new
 * social visitor bypass CSV migration after creating a practice.
 */
export function socialAlertRefFromPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null

  try {
    const url = new URL(path, INTENT_ORIGIN)
    if (url.origin !== INTENT_ORIGIN || url.pathname !== '/alerts') return null
    const parsed = SocialAlertRefSchema.safeParse(url.searchParams.get('ref'))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function canonicalSocialAlertIntent(path: string | null | undefined): string | null {
  const ref = socialAlertRefFromPath(path)
  return ref ? `/alerts?ref=${encodeURIComponent(ref)}` : null
}

export async function fetchSocialAlertTeaser(
  ref: string,
  signal?: AbortSignal,
): Promise<SocialAlertTeaser | null> {
  const parsedRef = SocialAlertRefSchema.safeParse(ref)
  if (!parsedRef.success) return null

  const response = await fetch(`/api/social-alerts/${encodeURIComponent(parsedRef.data)}/teaser`, {
    ...(signal ? { signal } : {}),
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Unable to load social alert teaser (${response.status})`)
  return SocialAlertTeaserSchema.parse(await response.json())
}

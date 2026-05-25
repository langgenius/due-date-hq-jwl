import { ObligationQueueDetailTabSchema, type ObligationQueueDetailTab } from '@duedatehq/contracts'

const DEADLINE_DETAIL_REF_RE = /^[0-9a-f]{12}$/i
const DETAIL_SEARCH_PARAM_KEYS = ['drawer', 'id', 'row', 'tab'] as const

export const DEADLINE_DETAIL_TABS = [
  'summary',
  'readiness',
  'extension',
  'risk',
  'evidence',
  'audit',
] as const satisfies readonly ObligationQueueDetailTab[]

export function deadlineRefFromObligationId(obligationId: string): string {
  return obligationId.replace(/-/g, '').toLowerCase().slice(-12)
}

export function normalizeDeadlineRef(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return DEADLINE_DETAIL_REF_RE.test(normalized) ? normalized : null
}

export function obligationIdMatchesDeadlineRef(obligationId: string, ref: string): boolean {
  const normalizedRef = normalizeDeadlineRef(ref)
  return normalizedRef !== null && deadlineRefFromObligationId(obligationId) === normalizedRef
}

export function findObligationIdByDeadlineRef(
  obligations: readonly { id: string }[],
  ref: string | null | undefined,
): string | null {
  const normalizedRef = normalizeDeadlineRef(ref)
  if (!normalizedRef) return null

  const matches = obligations.filter((obligation) =>
    obligationIdMatchesDeadlineRef(obligation.id, normalizedRef),
  )
  return matches.length === 1 ? matches[0]!.id : null
}

export function normalizeDeadlineDetailTab(
  value: string | null | undefined,
): ObligationQueueDetailTab | null {
  if (!value) return null
  const parsed = ObligationQueueDetailTabSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function deadlineDetailPath(
  obligationId: string,
  tab: ObligationQueueDetailTab = 'readiness',
): string {
  const ref = deadlineRefFromObligationId(obligationId)
  return tab === 'readiness' ? `/deadlines/${ref}` : `/deadlines/${ref}/${tab}`
}

export function cleanDeadlineDetailSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  for (const key of DETAIL_SEARCH_PARAM_KEYS) {
    params.delete(key)
  }
  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ''
}

export function deadlineDetailHref({
  obligationId,
  tab = 'readiness',
  search = '',
}: {
  obligationId: string
  tab?: ObligationQueueDetailTab
  search?: string
}): string {
  return `${deadlineDetailPath(obligationId, tab)}${cleanDeadlineDetailSearch(search)}`
}

export function isDeadlineQueuePath(pathname: string): boolean {
  if (pathname === '/deadlines/calendar' || pathname.startsWith('/deadlines/calendar/')) {
    return false
  }
  return pathname === '/deadlines' || pathname.startsWith('/deadlines/')
}

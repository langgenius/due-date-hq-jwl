import {
  addLocalCalendarDays,
  EASTERN_TIME_ZONE,
  nextXDailySlotLocalDate,
  xDailySlotInstant,
} from './time'

export const X_QUEUE_DAILY_SLOT = '09:00' as const

export interface XQueuePreviewPost {
  id: string
  pulseId: string
  status: 'draft' | 'ready'
  priority: 'normal' | 'urgent'
  readyAt: Date | null
  createdAt: Date
  pulseCreatedAt: Date
}

export interface XQueueProjectedPost<TPost extends XQueuePreviewPost = XQueuePreviewPost> {
  position: number
  projectedLocalDate: string
  projectedAt: Date
  post: TPost
}

export interface XQueueDraftPost<TPost extends XQueuePreviewPost = XQueuePreviewPost> {
  projectedLocalDate: null
  reason: 'approval_required'
  post: TPost
}

export interface XQueuePreview<TPost extends XQueuePreviewPost = XQueuePreviewPost> {
  asOf: Date
  tentative: true
  timeZone: typeof EASTERN_TIME_ZONE
  dailySlot: typeof X_QUEUE_DAILY_SLOT
  days: number
  fromLocalDate: string
  throughLocalDate: string
  occupiedLocalDates: string[]
  ready: XQueueProjectedPost<TPost>[]
  drafts: XQueueDraftPost<TPost>[]
  visibleReadyBeyondWindowCount: number
}

export interface BuildXQueuePreviewInput<TPost extends XQueuePreviewPost = XQueuePreviewPost> {
  now: Date
  days: number
  posts: readonly TPost[]
  occupiedLocalDates?: readonly string[]
}

/**
 * Produce a read-only snapshot of the normal daily X queue.
 *
 * No future run rows are reserved here. Ready and draft rows use the same
 * newest-Pulse-first order as the D1 claim, so the projection matches the
 * order that the normal Cron will use if no newer Alert arrives.
 */
export function buildXQueuePreview<TPost extends XQueuePreviewPost>(
  input: BuildXQueuePreviewInput<TPost>,
): XQueuePreview<TPost> {
  if (!Number.isInteger(input.days) || input.days < 1) {
    throw new Error('Queue preview days must be a positive integer.')
  }
  if (Number.isNaN(input.now.getTime())) throw new Error('Queue preview requires a valid time.')

  const fromLocalDate = nextXDailySlotLocalDate(input.now)
  const throughLocalDate = addLocalCalendarDays(fromLocalDate, input.days - 1)
  const occupied = new Set(input.occupiedLocalDates ?? [])
  const occupiedInWindow: string[] = []
  const drafts: XQueueDraftPost<TPost>[] = []
  let remaining = input.posts.filter((post) => {
    validatePostDates(post)
    if (post.status === 'draft') {
      drafts.push({ projectedLocalDate: null, reason: 'approval_required', post })
      return false
    }
    return true
  })
  const ready: XQueueProjectedPost<TPost>[] = []

  for (let offset = 0; offset < input.days; offset += 1) {
    const localDate = addLocalCalendarDays(fromLocalDate, offset)
    if (occupied.has(localDate)) {
      occupiedInWindow.push(localDate)
      continue
    }
    if (remaining.length === 0) continue

    const projectedAt = xDailySlotInstant(localDate)
    const post = remaining.toSorted(compareNewestPulseFirst)[0]
    if (!post) continue
    ready.push({
      position: ready.length + 1,
      projectedLocalDate: localDate,
      projectedAt,
      post,
    })
    remaining = remaining.filter((candidate) => candidate.id !== post.id)
  }

  return {
    asOf: input.now,
    tentative: true,
    timeZone: EASTERN_TIME_ZONE,
    dailySlot: X_QUEUE_DAILY_SLOT,
    days: input.days,
    fromLocalDate,
    throughLocalDate,
    occupiedLocalDates: occupiedInWindow,
    ready,
    drafts: drafts.toSorted((left, right) => compareNewestPulseFirst(left.post, right.post)),
    visibleReadyBeyondWindowCount: remaining.length,
  }
}

function compareNewestPulseFirst(left: XQueuePreviewPost, right: XQueuePreviewPost): number {
  return (
    right.pulseCreatedAt.getTime() - left.pulseCreatedAt.getTime() ||
    compareIds(right.pulseId, left.pulseId) ||
    compareIds(right.id, left.id)
  )
}

function requiredReadyAt(post: XQueuePreviewPost): Date {
  if (!post.readyAt || Number.isNaN(post.readyAt.getTime())) {
    throw new Error(`Ready social Post ${post.id} requires a valid readyAt.`)
  }
  return post.readyAt
}

function validatePostDates(post: XQueuePreviewPost): void {
  if (Number.isNaN(post.createdAt.getTime())) {
    throw new Error(`Social Post ${post.id} requires a valid createdAt.`)
  }
  if (Number.isNaN(post.pulseCreatedAt.getTime())) {
    throw new Error(`Social Post ${post.id} requires a valid pulseCreatedAt.`)
  }
  if (post.status === 'ready') requiredReadyAt(post)
}

function compareIds(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

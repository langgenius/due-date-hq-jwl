import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

import { ErrorCodes, type ErrorCode } from '@duedatehq/contracts'
import { rpcErrorMessage } from '@/lib/rpc-error'

// Stable Lingui message descriptors keyed by Pulse-specific ORPCError codes.
// Resolve at render time with `i18n._(...)` so callers don't have to repeat
// the catalog wiring.
const MESSAGE_BY_CODE: Partial<Record<ErrorCode, MessageDescriptor>> = {
  [ErrorCodes.PULSE_NOT_FOUND]: msg`This alert is no longer available.`,
  [ErrorCodes.PULSE_APPLY_CONFLICT]: msg`Some obligations have changed since you opened this alert. Refresh to load the latest list.`,
  [ErrorCodes.PULSE_REVERT_EXPIRED]: msg`The 24h undo window has expired for this alert.`,
  [ErrorCodes.PULSE_NO_ELIGIBLE_OBLIGATIONS]: msg`No eligible obligations are selected.`,
  [ErrorCodes.PULSE_REVIEW_UNAVAILABLE]: msg`This Pulse alert is closed and cannot be sent for review.`,
  [ErrorCodes.PULSE_REVIEW_ONLY]: msg`This Pulse is review-only and does not apply due-date overlays.`,
  [ErrorCodes.FIRM_FORBIDDEN]: msg`Only owners and managers can apply Pulse changes.`,
  [ErrorCodes.MEMBER_FORBIDDEN]: msg`Only owners and managers can apply Pulse changes.`,
}

const MESSAGE_BY_RAW: Record<string, MessageDescriptor> = {
  'Production Pulse actions require Pro or above.': msg`Production Pulse actions require Pro or above.`,
  'Priority Pulse matching and review confirmation require Team or above.': msg`Priority Pulse matching and review confirmation require Team or above.`,
}

const FALLBACK = msg`Something went wrong. Please try again.`

function isErrorCode(value: string): value is ErrorCode {
  return (Object.values(ErrorCodes) as string[]).includes(value)
}

export function pulseErrorDescriptor(error: unknown): MessageDescriptor {
  const raw = rpcErrorMessage(error)
  if (raw && isErrorCode(raw)) {
    return MESSAGE_BY_CODE[raw] ?? FALLBACK
  }
  if (raw && MESSAGE_BY_RAW[raw]) return MESSAGE_BY_RAW[raw]
  return FALLBACK
}

// Some flows want a "is this conflict-class" branch to render a Refresh CTA.
export function isPulseConflict(error: unknown): boolean {
  const raw = rpcErrorMessage(error)
  return raw === ErrorCodes.PULSE_APPLY_CONFLICT
}

export function isPulseNotFound(error: unknown): boolean {
  const raw = rpcErrorMessage(error)
  return raw === ErrorCodes.PULSE_NOT_FOUND
}

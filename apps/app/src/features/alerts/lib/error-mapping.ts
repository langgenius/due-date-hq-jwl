import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

import { ErrorCodes, type ErrorCode } from '@duedatehq/contracts'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { requiredRolesLabel } from '@/lib/required-roles-label'

// Stable Lingui message descriptors keyed by alert-specific ORPCError codes.
// Resolve at render time with `i18n._(...)` so callers don't have to repeat
// the catalog wiring.
//
// ROH-D11 — the FORBIDDEN descriptors used to hard-code "owners and
// managers". pulse.apply allows owner / partner / manager, so the
// literal copy was silently dropping `partner`. The descriptor now
// interpolates `requiredRolesLabel('pulse.apply')` at descriptor-
// construction time. We resolve once per call to `alertErrorDescriptor`
// (cheap — just a map lookup + join) so the role list reflects the
// current locale's translation of the FIRM_PERMISSION_ROLES set.
function forbiddenDescriptor(): MessageDescriptor {
  // Match the `<Trans>Only {requiredRolesLabel(...)} can apply alert
  // changes.</Trans>` msgid in AlertDetailDrawer — both surfaces share
  // the same translation entry.
  return msg`Only ${requiredRolesLabel('pulse.apply')} can apply alert changes.`
}

const MESSAGE_BY_CODE: Partial<Record<ErrorCode, () => MessageDescriptor>> = {
  [ErrorCodes.PULSE_NOT_FOUND]: () => msg`This alert is no longer available.`,
  [ErrorCodes.PULSE_APPLY_CONFLICT]: () =>
    msg`Some deadlines have changed since you opened this alert. Refresh to load the latest list.`,
  [ErrorCodes.PULSE_REVERT_EXPIRED]: () => msg`The 24h undo window has expired for this alert.`,
  [ErrorCodes.PULSE_NO_ELIGIBLE_OBLIGATIONS]: () => msg`No eligible deadlines are selected.`,
  [ErrorCodes.PULSE_NEEDS_DETAILS]: () =>
    msg`Complete the deadline details before applying this alert.`,
  [ErrorCodes.PULSE_REVIEW_UNAVAILABLE]: () =>
    msg`This Alert is closed and cannot be sent for review.`,
  [ErrorCodes.PULSE_REVIEW_ONLY]: () =>
    msg`This alert is review-only and does not apply due-date overlays.`,
  [ErrorCodes.FIRM_FORBIDDEN]: forbiddenDescriptor,
  [ErrorCodes.MEMBER_FORBIDDEN]: forbiddenDescriptor,
}

// Keys match the raw server-emitted error text (engine still says "Pulse");
// the displayed descriptors use the user-facing "alert" wording.
const MESSAGE_BY_RAW: Record<string, MessageDescriptor> = {
  'Production Pulse actions require Pro or above.': msg`Production alert actions require Pro or above.`,
  'Priority Pulse matching and review confirmation require Team or above.': msg`Priority alert matching and review confirmation require Team or above.`,
}

const FALLBACK = msg`Something went wrong. Please try again.`

function isErrorCode(value: string): value is ErrorCode {
  return (Object.values(ErrorCodes) as string[]).includes(value)
}

export function alertErrorDescriptor(error: unknown): MessageDescriptor {
  const raw = rpcErrorMessage(error)
  if (raw && isErrorCode(raw)) {
    const factory = MESSAGE_BY_CODE[raw]
    return factory ? factory() : FALLBACK
  }
  if (raw && MESSAGE_BY_RAW[raw]) return MESSAGE_BY_RAW[raw]
  return FALLBACK
}

// Some flows want a "is this conflict-class" branch to render a Refresh CTA.
export function isAlertConflict(error: unknown): boolean {
  const raw = rpcErrorMessage(error)
  return raw === ErrorCodes.PULSE_APPLY_CONFLICT
}

export function isAlertNotFound(error: unknown): boolean {
  const raw = rpcErrorMessage(error)
  return raw === ErrorCodes.PULSE_NOT_FOUND
}

import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

import {
  type FirmPermission,
  type FirmRole,
  requiredRolesForFirmPermission,
} from '@duedatehq/core/permissions'
import { i18n as defaultI18n } from '@/i18n/i18n'

// ROH-D11 — single source of truth for "Only owners and X can…" copy.
//
// Hard-coded role-list strings in feature pages drift the moment a role is
// added or a permission is rebalanced in `FIRM_PERMISSION_ROLES`. The most
// common drift is silently dropping `partner` from the list (5 of the 9 fixes
// ρ shipped were this pattern). Route every role-list copy through this
// helper so the label tracks the source of truth automatically.
//
// We expose two flavours:
//   - `requiredRolesLabel(permission)` — pluralized list ("owners, partners,
//     and managers"), suitable for "Only X can …" sentences.
//   - `requiredRolesLabelSingular(permission)` — capitalized singular list
//     ("Owner, Partner, Manager"), for badges / labels (matches the
//     pre-existing `requiredRolesLabel` in `permission-gate.tsx`).
//
// Both versions go through Lingui so zh-CN translations stay localized.

// Pluralized lowercase role label, e.g. "owners".
// Used in human-readable sentences ("Only owners and managers can apply.").
const PLURAL_ROLE_LABELS: Record<FirmRole, MessageDescriptor> = {
  owner: msg`owners`,
  partner: msg`partners`,
  manager: msg`managers`,
  preparer: msg`preparers`,
  coordinator: msg`coordinators`,
}

// Capitalized singular role label, e.g. "Owner".
// Used in badges and tabular contexts where the row is one role.
const SINGULAR_ROLE_LABELS: Record<FirmRole, MessageDescriptor> = {
  owner: msg`Owner`,
  partner: msg`Partner`,
  manager: msg`Manager`,
  preparer: msg`Preparer`,
  coordinator: msg`Coordinator`,
}

function listFormat(parts: string[], locale: string): string {
  // `Intl.ListFormat` handles "a, b, and c" vs "a 和 b" cleanly for both
  // supported locales and avoids hand-rolling commas/conjunctions per locale.
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts)
  } catch {
    // Old browsers / unknown locales: fall back to ", " join.
    return parts.join(', ')
  }
}

interface LabelOptions {
  // Optional i18n instance for tests / non-React modules. Defaults to the
  // app-global instance so callers don't need to thread it through.
  i18n?: { _: (descriptor: MessageDescriptor) => string; locale?: string }
}

// Resolve a Lingui MessageDescriptor without throwing when no locale is
// active. Tests + non-React modules can call us before `activateLocale()`
// fires; rather than surface an opaque crash we fall back to the message's
// English source text (`descriptor.message` is the raw template literal).
function safeResolve(
  inst: { _: (descriptor: MessageDescriptor) => string },
  descriptor: MessageDescriptor,
): string {
  try {
    return inst._(descriptor)
  } catch {
    return descriptor.message ?? descriptor.id ?? ''
  }
}

// Pluralized lowercase list ("owners, partners, and managers"), driven by
// `FIRM_PERMISSION_ROLES`. Use this in "Only X can …" sentences.
export function requiredRolesLabel(permission: FirmPermission, options?: LabelOptions): string {
  const inst = options?.i18n ?? defaultI18n
  const locale = inst.locale ?? 'en'
  const parts = requiredRolesForFirmPermission(permission).map((role) =>
    safeResolve(inst, PLURAL_ROLE_LABELS[role]),
  )
  return listFormat(parts, locale)
}

// Capitalized singular list ("Owner, Partner, Manager"), comma-separated.
// Used by badges / matrix cells where each role is a chip-like noun.
export function requiredRolesLabelSingular(
  permission: FirmPermission,
  options?: LabelOptions,
): string {
  const inst = options?.i18n ?? defaultI18n
  return requiredRolesForFirmPermission(permission)
    .map((role) => safeResolve(inst, SINGULAR_ROLE_LABELS[role]))
    .join(', ')
}

// Useful for callers that want the localized pluralized noun for ONE role
// (e.g. "current role: partner"). Mirrors `roleLabel` in permission-gate but
// returns the plural form.
export function roleLabelPlural(role: FirmRole | null | undefined, options?: LabelOptions): string {
  const inst = options?.i18n ?? defaultI18n
  if (!role) return ''
  return safeResolve(inst, PLURAL_ROLE_LABELS[role])
}

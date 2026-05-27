import { afterEach, describe, expect, it } from 'vitest'

import { activateLocale } from '@/i18n/i18n'
import {
  requiredRolesLabel,
  requiredRolesLabelSingular,
  roleLabelPlural,
} from './required-roles-label'

describe('requiredRolesLabel', () => {
  afterEach(() => {
    activateLocale('en')
  })

  it('returns the localized plural role list for a multi-role permission', () => {
    activateLocale('en')
    // pulse.apply → ['owner', 'partner', 'manager']
    expect(requiredRolesLabel('pulse.apply')).toBe('owners, partners, and managers')
  })

  it('includes partner whenever the source permission map includes partner', () => {
    activateLocale('en')
    // audit.read → ['owner', 'partner', 'manager', 'preparer']
    // ROH-D11 — the most-missed role is partner. The helper must surface
    // it automatically. If `FIRM_PERMISSION_ROLES['audit.read']` is ever
    // changed to drop or add partner, this test will catch the drift.
    expect(requiredRolesLabel('audit.read')).toBe(
      'owners, partners, managers, and preparers',
    )
  })

  it('returns a single role for owner-only permissions', () => {
    activateLocale('en')
    // billing.update → ['owner']
    expect(requiredRolesLabel('billing.update')).toBe('owners')
  })

  it('returns the zh-CN translation when that locale is active', () => {
    activateLocale('zh-CN')
    // Intl.ListFormat for zh-CN uses "、" + "和". Exact format depends on
    // the runtime; we assert the role labels themselves are translated and
    // that all three appear in the output.
    const label = requiredRolesLabel('pulse.apply')
    expect(label).toContain('所有者')
    expect(label).toContain('合伙人')
    expect(label).toContain('管理员')
  })
})

describe('requiredRolesLabelSingular', () => {
  afterEach(() => {
    activateLocale('en')
  })

  it('returns capitalized singular role names joined by commas', () => {
    activateLocale('en')
    expect(requiredRolesLabelSingular('pulse.apply')).toBe('Owner, Partner, Manager')
  })

  it('returns the localized singular role names in zh-CN', () => {
    activateLocale('zh-CN')
    const label = requiredRolesLabelSingular('pulse.apply')
    // Singular role labels reuse the existing zh-CN translations from
    // /practice ("负责人" = Owner, "合伙人" = Partner, "管理员" = Manager).
    // The plural helper uses dedicated plural msgids — see the test
    // above for "所有者" plural translation.
    expect(label).toContain('负责人')
    expect(label).toContain('合伙人')
    expect(label).toContain('管理员')
  })
})

describe('roleLabelPlural', () => {
  afterEach(() => {
    activateLocale('en')
  })

  it('returns the pluralized role label for a single role', () => {
    activateLocale('en')
    expect(roleLabelPlural('owner')).toBe('owners')
    expect(roleLabelPlural('partner')).toBe('partners')
    expect(roleLabelPlural('manager')).toBe('managers')
    expect(roleLabelPlural('preparer')).toBe('preparers')
    expect(roleLabelPlural('coordinator')).toBe('coordinators')
  })

  it('returns an empty string for null/undefined input', () => {
    expect(roleLabelPlural(null)).toBe('')
    expect(roleLabelPlural(undefined)).toBe('')
  })
})

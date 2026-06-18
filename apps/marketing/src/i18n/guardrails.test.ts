import { describe, expect, it } from 'vitest'

import en from './en'
import zhCN from './zh-CN'
import {
  DEEP_COVERAGE_STATE_ABBRS,
  getComparisonPages,
  getGuidePages,
  getRuleReferencePages,
  getStateCoveragePage,
  getStatePages,
} from '../lib/seo-content'

// Phase 0 marketing copy guardrails — docs/dev-file/13-Marketing-SEO-GEO-Rebuild.md §5.
// These lock in the truth/positioning fixes so they can't silently regress:
//  1) English-rendered copy must not leak CJK (catches the `指南`-on-an-EN-page class).
//  2) zh `audience` must be translated, not literal English.
//  3) A state card may only show a deep-coverage badge if the state is in the
//     deep-coverage set — never hard-code "Live"/"已上线" on a news-watch-only state.

const CJK = /[一-鿿]/
// Intentionally-Chinese values in the EN tree (the language-switcher labels).
const ALLOWED_CJK_KEYS = new Set(['zhShort', 'zhLong'])
// Public state coverage is presented uniformly (comprehensive 50 states + DC),
// never by depth tier — every state card shows this one badge per locale.
const UNIFORM_BADGE = { en: 'Monitored', 'zh-CN': '监控中' } as const

interface FoundString {
  key: string
  value: string
}

function collectStrings(node: unknown, key = ''): FoundString[] {
  if (typeof node === 'string') return [{ key, value: node }]
  if (Array.isArray(node)) return node.flatMap((child) => collectStrings(child, key))
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([childKey, child]) => collectStrings(child, childKey))
  }
  return []
}

describe('marketing copy guardrails', () => {
  it('EN landing copy contains no stray CJK (except language-switcher labels)', () => {
    const offenders = collectStrings(en)
      .filter(({ key, value }) => !ALLOWED_CJK_KEYS.has(key) && CJK.test(value))
      .map(({ key, value }) => `${key}: ${value}`)
    expect(offenders).toEqual([])
  })

  it('EN programmatic pages (guides/compare/rules/states/coverage) contain no CJK', () => {
    const pages = [
      ...getGuidePages(en, 'en'),
      ...getComparisonPages('en'),
      ...getRuleReferencePages('en'),
      ...getStatePages(en, 'en'),
      getStateCoveragePage(en, 'en'),
    ]
    const offenders = collectStrings(pages)
      .filter(({ value }) => CJK.test(value))
      .map(({ key, value }) => `${key}: ${value}`)
    expect(offenders).toEqual([])
  })

  it('zh `audience` strings are translated, not literal English', () => {
    const offenders = collectStrings(zhCN)
      .filter(({ key, value }) => key === 'audience' && value.includes('For US CPA practices'))
      .map(({ value }) => value)
    expect(offenders).toEqual([])
  })

  it('every state coverage card shows one uniform badge (no depth tiers surfaced)', () => {
    for (const [locale, copy] of [
      ['en', en],
      ['zh-CN', zhCN],
    ] as const) {
      const { states } = getStateCoveragePage(copy, locale)
      const offenders = states
        .filter((state) => state.status !== UNIFORM_BADGE[locale])
        .map((state) => `${locale}:${state.abbreviation}:${state.status}`)
      expect(offenders).toEqual([])
    }
  })

  it('the internal deep-coverage set stays the known six (retained, not surfaced)', () => {
    expect([...DEEP_COVERAGE_STATE_ABBRS].toSorted()).toEqual(['CA', 'FL', 'MA', 'NY', 'TX', 'WA'])
  })
})

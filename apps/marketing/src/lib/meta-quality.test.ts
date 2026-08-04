import { describe, expect, it } from 'vitest'

import en from '../i18n/en'
import zhCN from '../i18n/zh-CN'
import { DISASTER_NOTICES, getNoticeMeta } from './disaster-notices'
import {
  getComparisonPages,
  getGuidePages,
  getRuleReferencePages,
  getStatePages,
} from './seo-content'
import { STATE_CONFORMITY } from './state-conformity'

/**
 * SERP quality contract — locked in after the 2026-08-03 Search Console review.
 *
 * The GSC export for 2026-07-26..08-01 showed 264 impressions already sitting on
 * page one of Google and exactly ONE click. The cause was not ranking: it was the
 * snippet itself. 79% of English pages shipped a title or description that Google
 * truncates or that reads machine-generated — descriptions with a median length of
 * 170 characters (Google renders ~155), machine-joined double colons, our own "…"
 * inserted mid-sentence, and form names lower-cased by a `.toLowerCase()` in the
 * generator ("When is the fbar (fincen form 114) deadline?").
 *
 * These limits are deliberately mechanical so a generator change can never
 * silently re-introduce the same class of defect. Prose quality is still a human
 * judgement; length, casing, and punctuation are not.
 */

// Google renders roughly 155-160 characters of a description and ~600px (~60
// characters) of a title before truncating. Staying under keeps the whole
// sentence — and the differentiator at the end of it — visible in the SERP.
const TITLE_MAX = 60
const DESC_MAX = 158
const DESC_MIN = 70

/** Acronyms and form names that must never appear lower-cased in a snippet. */
const LOWERCASE_DEFECT =
  /(?<![A-Za-z])(fbar|fincen|futa|hsa|ira|ein|irs)(?![A-Za-z])|\bform \d|\bform w-/

interface MetaLike {
  id: string
  title: string
  description: string
}

function collectEnglishMeta(): MetaLike[] {
  const out: MetaLike[] = []
  const push = (id: string, meta: { title: string; description: string }) =>
    out.push({ id, title: meta.title, description: meta.description })

  for (const page of getStatePages(en, 'en')) push(`/states/${page.slug}`, page.meta)
  for (const page of getRuleReferencePages('en')) push(`/rules/${page.slug}`, page.meta)
  for (const page of getGuidePages(en, 'en')) push(`/guides/${page.slug}`, page.meta)
  for (const page of getComparisonPages('en')) push(`/compare/${page.slug}`, page.meta)
  for (const notice of DISASTER_NOTICES)
    push(`/irs-disaster-relief/${notice.slug}`, getNoticeMeta(notice))
  for (const entry of STATE_CONFORMITY)
    push(`/irs-disaster-relief/state-conformity/${entry.slug}`, {
      title: entry.metaTitle,
      description: entry.metaDescription,
    })
  return out
}

function collectChineseMeta(): MetaLike[] {
  const out: MetaLike[] = []
  const push = (id: string, meta: { title: string; description: string }) =>
    out.push({ id, title: meta.title, description: meta.description })
  for (const page of getStatePages(zhCN, 'zh-CN')) push(`zh/states/${page.slug}`, page.meta)
  for (const page of getRuleReferencePages('zh-CN')) push(`zh/rules/${page.slug}`, page.meta)
  for (const page of getGuidePages(zhCN, 'zh-CN')) push(`zh/guides/${page.slug}`, page.meta)
  for (const page of getComparisonPages('zh-CN')) push(`zh/compare/${page.slug}`, page.meta)
  return out
}

describe('SERP meta quality contract', () => {
  const pages = collectEnglishMeta()

  it('covers every generated English page family', () => {
    expect(pages.length).toBeGreaterThan(100)
  })

  it('keeps every title inside the rendered-title budget', () => {
    const offenders = pages
      .filter((p) => p.title.length > TITLE_MAX)
      .map((p) => `${p.id} (${p.title.length}): ${p.title}`)
    expect(offenders).toEqual([])
  })

  it('keeps every description inside the rendered-snippet budget', () => {
    const offenders = pages
      .filter((p) => p.description.length > DESC_MAX)
      .map((p) => `${p.id} (${p.description.length}): ${p.description}`)
    expect(offenders).toEqual([])
  })

  it('never ships a description too short to earn the click', () => {
    const offenders = pages
      .filter((p) => p.description.length < DESC_MIN)
      .map((p) => `${p.id} (${p.description.length}): ${p.description}`)
    expect(offenders).toEqual([])
  })

  it('never lower-cases a form name or acronym in a snippet', () => {
    const offenders = pages
      .filter((p) => LOWERCASE_DEFECT.test(p.description) || LOWERCASE_DEFECT.test(p.title))
      .map((p) => `${p.id}: ${p.description}`)
    expect(offenders).toEqual([])
  })

  it('never machine-joins a description into a double-colon sentence', () => {
    const offenders = pages
      .filter((p) => (p.description.match(/:/g) ?? []).length >= 2)
      .map((p) => `${p.id}: ${p.description}`)
    expect(offenders).toEqual([])
  })

  it('never truncates its own description mid-sentence', () => {
    const offenders = pages
      .filter((p) => p.description.includes('…') || p.title.includes('…'))
      .map((p) => `${p.id}: ${p.description}`)
    expect(offenders).toEqual([])
  })

  it('gives every page a distinct title and description', () => {
    for (const key of ['title', 'description'] as const) {
      const seen = new Map<string, string[]>()
      for (const p of pages) {
        const ids = seen.get(p[key]) ?? []
        ids.push(p.id)
        seen.set(p[key], ids)
      }
      const dupes = [...seen.entries()]
        .filter(([, ids]) => ids.length > 1)
        .map(([value, ids]) => `${ids.join(' + ')} share ${key}: ${value}`)
      expect(dupes).toEqual([])
    }
  })
})

describe('SERP meta quality contract (zh-CN)', () => {
  const pages = collectChineseMeta()

  // CJK renders wider per character, so Google truncates a zh title/description
  // sooner. Budget in characters accordingly rather than reusing the EN limits.
  it('keeps zh titles and descriptions inside their narrower budget', () => {
    const offenders = pages
      .filter((p) => p.title.length > 40 || p.description.length > 90)
      .map((p) => `${p.id} (t${p.title.length}/d${p.description.length}): ${p.title}`)
    expect(offenders).toEqual([])
  })
})

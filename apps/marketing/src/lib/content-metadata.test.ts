import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getContentDates } from './content-metadata'

describe('marketing indexing metadata', () => {
  it.each([
    'delaware',
    'mississippi',
    'oregon',
    'rhode-island',
    'wyoming',
    '941-payroll-tax-deadline',
  ])('uses the actual June 25 publication date for %s', (slug) => {
    expect(getContentDates(slug)).toEqual({
      publishedOn: '2026-06-25',
      reviewedOn: '2026-06-25',
    })
  })

  it('permanently redirects historical HTML file URLs to canonical paths', () => {
    const redirects = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')

    expect(redirects).toContain('/index.html / 301')
    expect(redirects).toContain('/:page.html /:page 301')
    expect(redirects).toContain('/:section/:page.html /:section/:page 301')
    expect(redirects).toContain('/:locale/:section/:page.html /:locale/:section/:page 301')
  })
})

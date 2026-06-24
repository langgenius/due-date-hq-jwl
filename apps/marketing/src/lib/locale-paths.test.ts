import { describe, expect, it } from 'vitest'

import { buildLocaleHrefPair } from './locale-paths'

describe('buildLocaleHrefPair', () => {
  it.each([
    ['/', { enHref: '/', zhHref: '/zh-CN' }],
    ['/index.html', { enHref: '/', zhHref: '/zh-CN' }],
    ['/zh-CN', { enHref: '/', zhHref: '/zh-CN' }],
    ['/zh-CN.html', { enHref: '/', zhHref: '/zh-CN' }],
    ['/zh-CN/index.html', { enHref: '/', zhHref: '/zh-CN' }],
    ['/how-it-works', { enHref: '/how-it-works', zhHref: '/zh-CN/how-it-works' }],
    ['/how-it-works.html', { enHref: '/how-it-works', zhHref: '/zh-CN/how-it-works' }],
    ['/zh-CN/how-it-works', { enHref: '/how-it-works', zhHref: '/zh-CN/how-it-works' }],
    ['/zh-CN/how-it-works.html', { enHref: '/how-it-works', zhHref: '/zh-CN/how-it-works' }],
    ['/zh-CN/states/ohio.html', { enHref: '/states/ohio', zhHref: '/zh-CN/states/ohio' }],
  ])('maps %s to canonical locale hrefs', (pathname, expected) => {
    expect(buildLocaleHrefPair(pathname)).toEqual(expected)
  })
})

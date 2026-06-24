import { describe, expect, it } from 'vitest'

import { buildLocaleHrefPair } from './locale-paths'

describe('buildLocaleHrefPair', () => {
  it.each([
    ['/', { enHref: '/', zhHref: '/zh-CN' }],
    ['/index.html', { enHref: '/', zhHref: '/zh-CN' }],
    ['/zh-CN', { enHref: '/', zhHref: '/zh-CN' }],
    ['/zh-CN.html', { enHref: '/', zhHref: '/zh-CN' }],
    ['/zh-CN/index.html', { enHref: '/', zhHref: '/zh-CN' }],
    ['/get-started', { enHref: '/get-started', zhHref: '/zh-CN/get-started' }],
    ['/get-started.html', { enHref: '/get-started', zhHref: '/zh-CN/get-started' }],
    ['/zh-CN/get-started', { enHref: '/get-started', zhHref: '/zh-CN/get-started' }],
    ['/zh-CN/get-started.html', { enHref: '/get-started', zhHref: '/zh-CN/get-started' }],
    ['/zh-CN/states/ohio.html', { enHref: '/states/ohio', zhHref: '/zh-CN/states/ohio' }],
  ])('maps %s to canonical locale hrefs', (pathname, expected) => {
    expect(buildLocaleHrefPair(pathname)).toEqual(expected)
  })
})

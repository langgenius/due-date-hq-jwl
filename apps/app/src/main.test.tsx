import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bootstrapI18n: vi.fn(() => ({ locale: 'zh-CN' as const, source: 'query' as const })),
  captureCampaignAttribution: vi.fn(),
  createAppRouter: vi.fn(() => ({})),
  initAnalytics: vi.fn(),
  render: vi.fn(),
  setSuperProperties: vi.fn(),
}))

vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: mocks.render }),
}))

vi.mock('@/i18n/bootstrap', () => ({
  bootstrapI18n: mocks.bootstrapI18n,
}))

vi.mock('@/lib/analytics', () => ({
  captureCampaignAttribution: mocks.captureCampaignAttribution,
  initAnalytics: mocks.initAnalytics,
  setSuperProperties: mocks.setSuperProperties,
}))

vi.mock('./router', () => ({
  createAppRouter: mocks.createAppRouter,
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  document.body.innerHTML = '<div id="root"></div>'
})

afterEach(() => {
  document.body.replaceChildren()
})

it('sets app locale analytics context before analytics initialization', async () => {
  await import('./main')

  expect(mocks.setSuperProperties).toHaveBeenCalledWith({
    app_locale: 'zh-CN',
    locale_source: 'query',
  })
  expect(mocks.setSuperProperties.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.initAnalytics.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
  )
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMocks = vi.hoisted(() => ({
  getPublishedTeaserByRef: vi.fn(),
  createDb: vi.fn(() => ({ kind: 'db' })),
  makeSocialOpsRepo: vi.fn(),
}))

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makeSocialOpsRepo: dbMocks.makeSocialOpsRepo,
}))

import { socialAlertsRoute } from './social-alerts'

const REF = 'social_ref_1234567890abcdef'

beforeEach(() => {
  dbMocks.getPublishedTeaserByRef.mockReset()
  dbMocks.createDb.mockClear()
  dbMocks.makeSocialOpsRepo.mockReset()
  dbMocks.makeSocialOpsRepo.mockReturnValue({
    getPublishedTeaserByRef: dbMocks.getPublishedTeaserByRef,
  })
})

describe('GET /:ref/teaser', () => {
  it('returns only the published teaser fields', async () => {
    dbMocks.getPublishedTeaserByRef.mockResolvedValue({
      teaser: 'IRS · CA alert: selected filing deadlines moved.',
      agency: 'IRS',
      jurisdiction: 'CA',
    })

    const response = await socialAlertsRoute.request(`/${REF}/teaser`, {}, { DB: {} })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      teaser: 'IRS · CA alert: selected filing deadlines moved.',
      agency: 'IRS',
      jurisdiction: 'CA',
    })
    expect(response.headers.get('cache-control')).toContain('max-age=300')
    expect(dbMocks.getPublishedTeaserByRef).toHaveBeenCalledWith(REF)
  })

  it('returns the same 404 for malformed and unpublished refs', async () => {
    dbMocks.getPublishedTeaserByRef.mockResolvedValue(null)

    const malformed = await socialAlertsRoute.request('/bad/teaser', {}, { DB: {} })
    const unpublished = await socialAlertsRoute.request(`/${REF}/teaser`, {}, { DB: {} })

    expect(malformed.status).toBe(404)
    expect(unpublished.status).toBe(404)
    expect(dbMocks.getPublishedTeaserByRef).toHaveBeenCalledTimes(1)
  })
})

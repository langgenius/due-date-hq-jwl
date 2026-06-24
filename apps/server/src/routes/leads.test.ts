import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMocks = vi.hoisted(() => {
  const db = {}
  const createDb = vi.fn(() => db)
  const createMarketingLead = vi.fn(async () => 'lead-1')
  return { createDb, createMarketingLead, db }
})

vi.mock('@duedatehq/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duedatehq/db')>()
  return {
    ...actual,
    createDb: dbMocks.createDb,
    createMarketingLead: dbMocks.createMarketingLead,
  }
})

const { leadsRoute } = await import('./leads')

function post(body: unknown) {
  return leadsRoute.request(
    '/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { DB: {} },
  )
}

describe('leads route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a row and returns ok for a valid submission', async () => {
    const response = await post({
      name: 'Dana Cohen',
      email: 'dana@example.com',
      firm: 'Cohen CPA',
      tools: ['Drake', 'QuickBooks'],
      pain: 'I miss extension deadlines.',
      source: 'get-started',
      locale: 'en',
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(dbMocks.createDb).toHaveBeenCalledTimes(1)
    expect(dbMocks.createMarketingLead).toHaveBeenCalledTimes(1)
    expect(dbMocks.createMarketingLead).toHaveBeenCalledWith(
      dbMocks.db,
      expect.objectContaining({
        name: 'Dana Cohen',
        email: 'dana@example.com',
        firm: 'Cohen CPA',
        tools: ['Drake', 'QuickBooks'],
      }),
    )
  })

  it('silently drops honeypot submissions without inserting', async () => {
    const response = await post({
      name: 'Bot',
      email: 'bot@example.com',
      _gotcha: 'http://spam.example',
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(dbMocks.createDb).not.toHaveBeenCalled()
    expect(dbMocks.createMarketingLead).not.toHaveBeenCalled()
  })

  it('rejects an invalid email with 400', async () => {
    const response = await post({ name: 'Dana', email: 'not-an-email' })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, error: 'invalid' })
    expect(dbMocks.createMarketingLead).not.toHaveBeenCalled()
  })
})

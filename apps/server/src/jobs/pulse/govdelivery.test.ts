/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the DB/R2/queue surface used by email ingest.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import { ingestGovDeliveryEmail } from './govdelivery'

const { dbMocks, metricsMocks, repoMocks } = vi.hoisted(() => {
  const repo = {
    createSourceSnapshot: vi.fn(),
  }
  return {
    repoMocks: repo,
    dbMocks: {
      createDb: vi.fn(() => ({})),
      makePulseOpsRepo: vi.fn(() => repo),
    },
    metricsMocks: {
      recordPulseMetric: vi.fn(),
    },
  }
})

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makePulseOpsRepo: dbMocks.makePulseOpsRepo,
}))

vi.mock('./metrics', () => ({
  recordPulseMetric: metricsMocks.recordPulseMetric,
}))

function env(queueSend = vi.fn()): Pick<Env, 'DB' | 'R2_PULSE' | 'PULSE_QUEUE'> {
  return {
    DB: {} as D1Database,
    R2_PULSE: {
      put: vi.fn(async () => undefined),
    } as unknown as R2Bucket,
    PULSE_QUEUE: {
      send: queueSend,
    } as unknown as Queue,
  }
}

function inboundMessage(input: {
  from?: string
  to?: string
  headers?: Record<string, string>
  raw?: string
}) {
  const raw = input.raw ?? 'New York update: https://www.tax.ny.gov/news/2026/relief.htm'
  return {
    from: input.from ?? 'NY Tax Updates <updates@public.govdelivery.com>',
    to: input.to ?? 'pulse-ingest+ny-email-services@duedatehq.com',
    headers: new Headers({
      subject: 'NY Tax Department update',
      ...input.headers,
    }),
    raw: new Response(raw).body!,
  }
}

describe('ingestGovDeliveryEmail', () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((mock) => mock.mockClear())
    Object.values(metricsMocks).forEach((mock) => mock.mockClear())
    Object.values(repoMocks).forEach((mock) => mock.mockReset())
    repoMocks.createSourceSnapshot.mockImplementation(async (input: { sourceId: string }) => ({
      inserted: true,
      snapshot: { id: `snapshot-${input.sourceId}`, sourceId: input.sourceId },
    }))
  })

  it('routes plus-addressed NY GovDelivery mail to the NY email source', async () => {
    const queueSend = vi.fn()
    const result = await ingestGovDeliveryEmail(env(queueSend), inboundMessage({}))

    expect(result).toMatchObject({
      inserted: true,
      matched: true,
      queued: true,
      snapshotId: 'snapshot-ny.email_services',
    })
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'ny.email_services',
        title: 'NY Tax Department update',
        officialSourceUrl: 'https://www.tax.ny.gov/news/2026/relief.htm',
      }),
    )
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.extract',
      snapshotId: 'snapshot-ny.email_services',
    })
  })

  it('routes fallback inbox mail by official list id or canonical NY URL', async () => {
    const queueSend = vi.fn()
    await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
        from: 'Updates <updates@example.test>',
        to: 'pulse-ingest@duedatehq.com',
        headers: {
          'list-id': '<tax.ny.gov.public.govdelivery.com>',
        },
      }),
    )

    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'ny.email_services',
        officialSourceUrl: 'https://www.tax.ny.gov/news/2026/relief.htm',
      }),
    )
    expect(queueSend).toHaveBeenCalledTimes(1)
  })

  it('routes plus-addressed Ohio Tax Alert mail to the Ohio temporary announcement source', async () => {
    const queueSend = vi.fn()
    const result = await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
        from: 'Ohio Department of Taxation <updates@content.govdelivery.com>',
        to: 'pulse-ingest+oh-tax-alerts@duedatehq.com',
        headers: {
          subject: 'Current Ohio Withholding Tables',
          'list-id': '<OHTAX.public.govdelivery.com>',
        },
        raw: [
          'Ohio Department of Taxation sent this bulletin.',
          'https://content.govdelivery.com/accounts/OHTAX/bulletins/4093e65',
          'For more information, visit https://tax.ohio.gov/employer',
        ].join('\n'),
      }),
    )

    expect(result).toMatchObject({
      inserted: true,
      matched: true,
      queued: true,
      snapshotId: 'snapshot-oh.temporary_announcements',
    })
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'oh.temporary_announcements',
        title: 'Current Ohio Withholding Tables',
        officialSourceUrl: 'https://content.govdelivery.com/accounts/OHTAX/bulletins/4093e65',
      }),
    )
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.extract',
      snapshotId: 'snapshot-oh.temporary_announcements',
    })
  })

  it('archives unmatched inbound mail without queueing CPA-facing extraction', async () => {
    const queueSend = vi.fn()
    const result = await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
        from: 'Unknown <updates@example.test>',
        to: 'pulse-ingest@duedatehq.com',
        raw: 'Generic newsletter with no official source link.',
      }),
    )

    expect(result).toMatchObject({
      inserted: true,
      matched: false,
      queued: false,
      snapshotId: 'snapshot-govdelivery.inbound.unmatched',
    })
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'govdelivery.inbound.unmatched',
        officialSourceUrl: 'https://public.govdelivery.com/',
      }),
    )
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('does not queue duplicate matched emails', async () => {
    const queueSend = vi.fn()
    repoMocks.createSourceSnapshot.mockResolvedValue({
      inserted: false,
      snapshot: { id: 'snapshot-existing', sourceId: 'ny.email_services' },
    })

    const result = await ingestGovDeliveryEmail(env(queueSend), inboundMessage({}))

    expect(result).toMatchObject({
      inserted: false,
      matched: true,
      queued: false,
      snapshotId: 'snapshot-existing',
    })
    expect(queueSend).not.toHaveBeenCalled()
  })
})

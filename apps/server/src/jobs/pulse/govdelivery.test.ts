/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Worker doubles only implement the DB/R2/queue surface used by email ingest.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import { ingestGovDeliveryEmail } from './govdelivery'

const { dbMocks, metricsMocks, repoMocks } = vi.hoisted(() => {
  const repo = {
    ensureSourceState: vi.fn(),
    establishSourceBaseline: vi.fn(),
    createSourceSnapshot: vi.fn(),
    updateSourceSnapshotStatus: vi.fn(),
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

type TestEnv = Pick<Env, 'DB' | 'R2_PULSE' | 'PULSE_QUEUE'> & {
  R2_PULSE: R2Bucket & { putMock: ReturnType<typeof vi.fn> }
}

function env(queueSend = vi.fn()): TestEnv {
  const putMock = vi.fn(async () => undefined)
  return {
    DB: {} as D1Database,
    R2_PULSE: {
      put: putMock,
      putMock,
      head: vi.fn(async () => null),
    } as unknown as R2Bucket & { putMock: typeof putMock },
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
      // Cloudflare Email Routing prepends this on every delivered message —
      // the default fixture models authenticated official mail. Spoof tests
      // override it.
      'authentication-results': 'mx.cloudflare.net; dkim=pass; spf=pass; dmarc=pass',
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
    repoMocks.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: null,
      monitoringBaselineAt: new Date('2026-05-01T00:00:00.000Z'),
      baselineMode: 'active',
    })
    repoMocks.establishSourceBaseline.mockResolvedValue(undefined)
    repoMocks.updateSourceSnapshotStatus.mockResolvedValue(undefined)
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

  it('routes USIRS GovDelivery mail to the IRS Newswire source even through a NY plus address', async () => {
    const queueSend = vi.fn()
    const testEnv = env(queueSend)
    const result = await ingestGovDeliveryEmail(
      testEnv,
      inboundMessage({
        from: 'IRS Newswire <irs@service.govdelivery.com>',
        to: 'pulse-ingest+ny-email-services@duedatehq.com',
        headers: {
          subject: 'IR-2026-69: Treasury, IRS issue Section 892 proposed regulations',
        },
        raw: [
          'From: IRS Newswire <irs@service.govdelivery.com>',
          'To: pulse-ingest+ny-email-services@duedatehq.com',
          'Subject: IR-2026-69: Treasury, IRS issue Section 892 proposed regulations',
          'X-Accountcode: USIRS',
          'Content-Type: text/plain; charset="utf-8"',
          'Content-Transfer-Encoding: quoted-printable',
          '',
          'Treasury, IRS issue Section 892 proposed regulations to provide grandfather=',
          'ing protection and transitional relief to sovereign investors.',
          'https://content.govdelivery.com/accounts/USIRS/bulletins/4197e47',
          'https://www.federalregister.gov/public-inspection/2026-10841',
        ].join('\r\n'),
      }),
    )

    expect(result).toMatchObject({
      inserted: true,
      matched: true,
      queued: true,
      snapshotId: 'snapshot-fed.irs_newswire',
    })
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fed.irs_newswire',
        officialSourceUrl: 'https://www.federalregister.gov/public-inspection/2026-10841',
      }),
    )
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.extract',
      snapshotId: 'snapshot-fed.irs_newswire',
    })

    const archivedBody = testEnv.R2_PULSE.putMock.mock.calls[0]?.[1]
    expect(typeof archivedBody).toBe('string')
    expect(archivedBody).toContain('---BEGIN DUEDATEHQ CANONICAL EMAIL TEXT---')
    expect(archivedBody).toContain('grandfathering protection and transitional relief')
    expect(archivedBody).toContain('---BEGIN DUEDATEHQ RAW RFC822 EMAIL---')
    expect(archivedBody).toContain('grandfather=\r\ning protection')
  })

  it('routes fallback inbox mail by official list id when the sender domain is official', async () => {
    const queueSend = vi.fn()
    await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
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
        ingestMethod: 'inbound_email',
      }),
    )
    expect(queueSend).toHaveBeenCalledTimes(1)
  })

  it('demotes list-id-matched mail whose sender domain is not official (spoof)', async () => {
    // Body signals (list-id, canonical URL, account code) are attacker-
    // controlled — without an official From domain the mail must not be
    // attributed to the official source, no matter what else matches.
    const queueSend = vi.fn()
    const result = await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
        from: 'Updates <updates@example.test>',
        to: 'pulse-ingest@duedatehq.com',
        headers: {
          'list-id': '<tax.ny.gov.public.govdelivery.com>',
        },
      }),
    )

    expect(result).toMatchObject({ matched: false, queued: false })
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'govdelivery.inbound.unmatched' }),
    )
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith('pulse.govdelivery.auth_reject', {
      sourceId: 'ny.email_services',
      reason: 'sender_domain_mismatch',
    })
  })

  it('demotes matched mail without passing auth verdicts when auth is required', async () => {
    const queueSend = vi.fn()
    const result = await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
        headers: { 'authentication-results': 'mx.cloudflare.net; dkim=fail; spf=softfail' },
      }),
    )

    expect(result).toMatchObject({ matched: false, queued: false })
    expect(metricsMocks.recordPulseMetric).toHaveBeenCalledWith('pulse.govdelivery.auth_reject', {
      sourceId: 'ny.email_services',
      reason: 'no_passing_auth_verdict',
    })
  })

  it('demotes matched mail with a DMARC failure even when auth is not required', async () => {
    const queueSend = vi.fn()
    const result = await ingestGovDeliveryEmail(
      { ...env(queueSend), PULSE_EMAIL_REQUIRE_AUTH: 'false' },
      inboundMessage({
        headers: {
          'authentication-results': 'mx.cloudflare.net; dkim=pass; spf=pass; dmarc=fail',
        },
      }),
    )

    expect(result).toMatchObject({ matched: false, queued: false })
  })

  it('keeps domain-matched mail without auth headers when auth requirement is off', async () => {
    const queueSend = vi.fn()
    const message = inboundMessage({})
    message.headers.delete('authentication-results')

    const result = await ingestGovDeliveryEmail(
      { ...env(queueSend), PULSE_EMAIL_REQUIRE_AUTH: 'false' },
      message,
    )

    expect(result).toMatchObject({ matched: true, queued: true })
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

  it.each([
    {
      label: 'Florida TIP subscriptions',
      from: 'Florida Department of Revenue <taxpublications@floridarevenue.com>',
      to: 'pulse-ingest+fl-tax-publications@duedatehq.com',
      subject: 'Florida Tax Information Publication',
      listId: '<Florida Department of Revenue Tax Information Publications>',
      raw: [
        'Florida Department of Revenue posted a new Tax Information Publication.',
        'https://floridarevenue.com/taxes/tips/Documents/TIP_26A01-01.pdf',
      ].join('\n'),
      sourceId: 'fl.tips',
      officialSourceUrl: 'https://floridarevenue.com/taxes/tips/Documents/TIP_26A01-01.pdf',
    },
    {
      label: 'Washington DOR GovDelivery news',
      from: 'Washington Department of Revenue <updates@content.govdelivery.com>',
      to: 'pulse-ingest+wa-dor-news@duedatehq.com',
      subject: 'Update from WA State Department of Revenue',
      listId: '<WADOR.public.govdelivery.com>',
      raw: [
        'Washington Department of Revenue sent this bulletin.',
        'https://content.govdelivery.com/accounts/WADOR/bulletins/3e6ae24',
        'https://dor.wa.gov/about/news-releases',
      ].join('\n'),
      sourceId: 'wa.news',
      officialSourceUrl: 'https://content.govdelivery.com/accounts/WADOR/bulletins/3e6ae24',
    },
    {
      label: 'Massachusetts DOR GovDelivery updates',
      from: 'Massachusetts Department of Revenue <updates@content.govdelivery.com>',
      to: 'pulse-ingest+ma-dor-press@duedatehq.com',
      subject: 'Massachusetts DOR update',
      listId: '<MADOR.public.govdelivery.com>',
      raw: [
        'Massachusetts Department of Revenue sent this bulletin.',
        'https://content.govdelivery.com/accounts/MADOR/bulletins/39c79e6',
        'https://www.mass.gov/lists/massachusetts-dor-press-releases',
      ].join('\n'),
      sourceId: 'ma.temporary_announcements',
      officialSourceUrl: 'https://content.govdelivery.com/accounts/MADOR/bulletins/39c79e6',
    },
    {
      label: 'Texas Comptroller GovDelivery updates',
      from: 'Texas Comptroller <updates@content.govdelivery.com>',
      to: 'pulse-ingest+tx-comptroller-news@duedatehq.com',
      subject: 'Texas Comptroller news release',
      listId: '<TXCOMPT.public.govdelivery.com>',
      raw: [
        'Texas Comptroller of Public Accounts sent this bulletin.',
        'https://content.govdelivery.com/accounts/TXCOMPT/bulletins/3fa54a0',
        'https://comptroller.texas.gov/about/media-center/news/',
      ].join('\n'),
      sourceId: 'tx.temporary_announcements',
      officialSourceUrl: 'https://content.govdelivery.com/accounts/TXCOMPT/bulletins/3fa54a0',
    },
  ])('routes plus-addressed $label to its configured source', async (input) => {
    const queueSend = vi.fn()
    const result = await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
        from: input.from,
        to: input.to,
        headers: {
          subject: input.subject,
          'list-id': input.listId,
        },
        raw: input.raw,
      }),
    )

    expect(result).toMatchObject({
      inserted: true,
      matched: true,
      queued: true,
      snapshotId: `snapshot-${input.sourceId}`,
    })
    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: input.sourceId,
        title: input.subject,
        officialSourceUrl: input.officialSourceUrl,
      }),
    )
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.extract',
      snapshotId: `snapshot-${input.sourceId}`,
    })
  })

  it('routes fallback GovDelivery sender mail by List-ID before generic sender domain', async () => {
    const queueSend = vi.fn()
    await ingestGovDeliveryEmail(
      env(queueSend),
      inboundMessage({
        from: 'Updates <updates@content.govdelivery.com>',
        to: 'pulse-ingest@duedatehq.com',
        headers: {
          subject: 'Update from WA State Department of Revenue',
          'list-id': '<WADOR.public.govdelivery.com>',
        },
        raw: [
          'Washington Department of Revenue sent this bulletin.',
          'https://content.govdelivery.com/accounts/WADOR/bulletins/3e6ae24',
        ].join('\n'),
      }),
    )

    expect(repoMocks.createSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'wa.news',
        officialSourceUrl: 'https://content.govdelivery.com/accounts/WADOR/bulletins/3e6ae24',
      }),
    )
    expect(queueSend).toHaveBeenCalledWith({
      type: 'pulse.extract',
      snapshotId: 'snapshot-wa.news',
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
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith(
      'snapshot-govdelivery.inbound.unmatched',
      {
        parseStatus: 'ignored',
        failureReason: 'unmatched_inbound_email',
      },
    )
    expect(queueSend).not.toHaveBeenCalled()
  })

  it('establishes the first matched email as baseline without queueing extraction', async () => {
    const queueSend = vi.fn()
    repoMocks.ensureSourceState.mockResolvedValue({
      enabled: true,
      nextCheckAt: null,
      monitoringBaselineAt: null,
      baselineMode: 'establish_on_first_seen',
    })

    const result = await ingestGovDeliveryEmail(env(queueSend), inboundMessage({}))

    expect(result).toMatchObject({
      inserted: true,
      matched: true,
      queued: false,
      snapshotId: 'snapshot-ny.email_services',
    })
    expect(repoMocks.updateSourceSnapshotStatus).toHaveBeenCalledWith(
      'snapshot-ny.email_services',
      {
        parseStatus: 'ignored',
        failureReason: 'monitoring_baseline_established',
      },
    )
    expect(repoMocks.establishSourceBaseline).toHaveBeenCalledWith({
      sourceId: 'ny.email_services',
      baselineAt: expect.any(Date),
    })
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

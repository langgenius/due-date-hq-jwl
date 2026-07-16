/**
 * /data/disaster-notices.json — the free "IRS deadline changes" data feed.
 *
 * Emitted at build time from the ONE verified dataset (lib/disaster-notices.ts),
 * so it can never drift from the hub pages or the embeddable widget. Every fact
 * is transcribed from the cited irs.gov release — see the dataset's header.
 *
 * Consumers: the /widget embed docs point here; server-side integrators can pull
 * it directly. (Browser cross-origin use may need CORS headers at the host.)
 */
import type { APIRoute } from 'astro'
import { DISASTER_NOTICES, FILING_TYPE_META } from '../../lib/disaster-notices'

export const GET: APIRoute = () => {
  const notices = [...DISASTER_NOTICES]
    .toSorted((a, b) => (a.deadline < b.deadline ? -1 : 1))
    .map((n) => ({
      code: n.code,
      state: n.state,
      abbreviation: n.abbreviation,
      event: n.event,
      issuedOn: n.issuedOn,
      deadline: n.deadline,
      deadlineLabel: n.deadlineLabel,
      incidentStart: n.incidentStart,
      affectedArea: n.affectedArea,
      affectedReturns: n.affectedReturns.map((t) => FILING_TYPE_META[t].form),
      femaDeclaration: n.femaDeclaration,
      sourceHref: n.sourceHref,
      detailsUrl: `https://duedatehq.com/irs-disaster-relief/${n.slug}`,
    }))

  return new Response(
    JSON.stringify(
      {
        source: 'DueDateHQ — every fact transcribed from the cited irs.gov release',
        docs: 'https://duedatehq.com/widget',
        license: 'Free to use with attribution/link to duedatehq.com',
        generatedAt: new Date().toISOString(),
        notices,
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  )
}

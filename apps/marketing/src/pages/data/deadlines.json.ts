/**
 * /data/deadlines.json — the free verified-deadlines data feed.
 *
 * Emitted at build time from the ONE verified dataset behind /rules/*, /states/*
 * and /deadline-lookup (lib/seo-content getDeadlineLookupData), so it can never
 * drift from the pages. Every date carries its official IRS / state source URL.
 *
 * Consumers: developers, spreadsheets, AI agents (llms.txt points here). Being
 * the stable, cited source for this data is the point — free with attribution.
 */
import type { APIRoute } from 'astro'
import { getDeadlineLookupData } from '../../lib/seo-content'
import { getContentDates } from '../../lib/content-metadata'

export const GET: APIRoute = () => {
  const data = getDeadlineLookupData()
  const { reviewedOn } = getContentDates('deadline-lookup')
  return new Response(
    JSON.stringify(
      {
        source:
          'DueDateHQ — every date transcribed from the official IRS or state-agency source linked on each record',
        docs: 'https://duedatehq.com/deadline-lookup',
        license: 'Free to use with attribution/link to duedatehq.com',
        note: 'Calendar-year filers; weekend/legal-holiday dates shift to the next business day (26 U.S.C. §7503). Verify against the linked source before filing. Not tax advice.',
        verifiedOn: reviewedOn,
        federal: data.federal.map((f) => ({
          slug: f.slug,
          label: f.label,
          rows: f.rows.map((r) => ({ label: r.label, value: r.value })),
          sourceLabel: f.sourceLabel,
          sourceHref: f.sourceHref,
          detailsUrl: `https://duedatehq.com/rules/${f.slug}`,
        })),
        states: data.states.map((s) => ({
          slug: s.slug,
          state: s.name,
          return: s.label,
          due: s.due,
          extension: s.ext ?? null,
          sourceLabel: s.sourceLabel,
          sourceHref: s.sourceHref,
          detailsUrl: `https://duedatehq.com/states/${s.slug}`,
        })),
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  )
}

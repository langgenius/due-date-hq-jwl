/**
 * /data/disaster-notices.csv — the free downloadable disaster-relief dataset,
 * 2020–present. One row per archive entry (one per IRS relief code, plus the
 * three uncoded nationwide/special notices), enriched with the richer fields of
 * the current hand-verified notices. Same joined source as the JSON feed and
 * the hub's Dataset structured data (lib/disaster-dataset.ts) — never drifts.
 *
 * Free to use with attribution/link to duedatehq.com (terms on /widget).
 */
import type { APIRoute } from 'astro'
import { getDisasterDatasetRows } from '../../lib/disaster-dataset'

const COLUMNS = [
  'relief_code',
  'state',
  'state_abbr',
  'year',
  'event',
  'issued_on',
  'incident_start',
  'postponed_deadline_iso',
  'postponed_deadline_label',
  'affected_area',
  'affected_forms',
  'fema_declaration',
  'status',
  'irs_source_url',
  'details_url',
] as const

function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export const GET: APIRoute = () => {
  const lines = [COLUMNS.join(',')]
  for (const r of getDisasterDatasetRows()) {
    lines.push(
      [
        csvCell(r.code),
        csvCell(r.state),
        csvCell(r.abbreviation),
        csvCell(r.year),
        csvCell(r.event),
        csvCell(r.issuedOn),
        csvCell(r.incidentStart),
        csvCell(r.deadline),
        csvCell(r.deadlineLabel),
        csvCell(r.affectedArea),
        // Semicolon-joined so the form list never fights the cell delimiter.
        csvCell(r.affectedForms ? r.affectedForms.join('; ') : null),
        csvCell(r.femaDeclaration),
        csvCell(r.status),
        csvCell(r.sourceHref),
        csvCell(r.detailsUrl),
      ].join(','),
    )
  }
  return new Response(`${lines.join('\r\n')}\r\n`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  })
}

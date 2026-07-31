/**
 * disaster-dataset.ts — the JOINED disaster-relief dataset behind the free
 * downloads (/data/disaster-notices.json and /data/disaster-notices.csv) and
 * the Dataset structured data on the hub + archive pages.
 *
 * Two verified sources, one row set:
 * - lib/disaster-archive.json — every postponement 2020–2026, one entry per
 *   IRS relief code (206 rows, agent-verified from irs.gov). The superset.
 * - lib/disaster-notices.ts — the current, hand-verified notices. A strict
 *   subset of the archive by relief code, but carrying richer fields
 *   (incidentStart, affectedReturns, femaDeclaration, a details page).
 *
 * Rows are archive entries enriched by code-match against the current notices,
 * so a relief code never appears twice. Status is derived from the postponed
 * deadline exactly like isLive() does — never stored.
 */
import archive from './disaster-archive.json'
import {
  DISASTER_NOTICES,
  FILING_TYPE_META,
  getNoticeStatus,
  type DisasterNotice,
} from './disaster-notices'
import { getMarketingUrl } from './site'

export interface ArchiveNotice {
  code: string | null
  state: string | null
  abbreviation: string | null
  event: string | null
  year: number
  issuedOn: string | null
  deadline: string | null
  deadlineLabel: string | null
  affectedArea: string | null
  sourceHref: string | null
}

/** One row of the public dataset. Nullable fields stay null (never guessed):
 *  incidentStart / affectedForms / femaDeclaration / detailsUrl exist only for
 *  rows that match a current hand-verified notice. */
export interface DisasterDatasetRow {
  code: string | null
  state: string | null
  abbreviation: string | null
  year: number
  event: string | null
  issuedOn: string | null
  incidentStart: string | null
  deadline: string | null
  deadlineLabel: string | null
  affectedArea: string | null
  affectedForms: string[] | null
  femaDeclaration: string | null
  status: 'live' | 'expired' | 'unknown'
  sourceHref: string | null
  detailsUrl: string | null
}

const ARCHIVE = archive as ArchiveNotice[]

// Current notices by relief code. Codes are unique within DISASTER_NOTICES;
// the archive's one duplicated code (TN-2021-01, two distinct events) is fine
// because rows come FROM the archive — the join only enriches.
const CURRENT_BY_CODE = new Map<string, DisasterNotice>(DISASTER_NOTICES.map((n) => [n.code, n]))

function rowStatus(deadline: string | null, today: Date): DisasterDatasetRow['status'] {
  if (!deadline) return 'unknown'
  return new Date(`${deadline}T23:59:59Z`).getTime() >= today.getTime() ? 'live' : 'expired'
}

/** Every archive row, enriched from the matching current notice, newest
 *  postponed deadline first (rows without a deadline sort last). */
export function getDisasterDatasetRows(today: Date = new Date()): DisasterDatasetRow[] {
  const rows = ARCHIVE.map((a): DisasterDatasetRow => {
    const cur = a.code ? CURRENT_BY_CODE.get(a.code) : undefined
    return {
      code: a.code,
      state: cur?.state ?? a.state,
      abbreviation: cur?.abbreviation ?? a.abbreviation,
      year: a.year,
      event: cur ? cur.event : a.event,
      issuedOn: cur?.issuedOn ?? a.issuedOn,
      incidentStart: cur?.incidentStart ?? null,
      deadline: cur?.deadline ?? a.deadline,
      deadlineLabel: cur?.deadlineLabel ?? a.deadlineLabel,
      affectedArea: cur?.affectedArea ?? a.affectedArea,
      affectedForms: cur ? cur.affectedReturns.map((t) => FILING_TYPE_META[t].form) : null,
      femaDeclaration: cur?.femaDeclaration ?? null,
      status: cur ? getNoticeStatus(cur, today) : rowStatus(a.deadline, today),
      sourceHref: cur?.sourceHref ?? a.sourceHref,
      detailsUrl: cur ? getMarketingUrl(`/irs-disaster-relief/${cur.slug}`) : null,
    }
  })
  return rows.toSorted((a, b) => {
    if (a.deadline === b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return a.deadline < b.deadline ? 1 : -1
  })
}

/** Summary numbers for the Dataset structured data + page copy — computed from
 *  the rows so they can never drift from the downloads. */
export function getDisasterDatasetStats(rows: DisasterDatasetRow[] = getDisasterDatasetRows()) {
  const years = rows.map((r) => r.year)
  const states = new Set(rows.map((r) => r.state).filter((s): s is string => s !== null))
  return {
    total: rows.length,
    live: rows.filter((r) => r.status === 'live').length,
    fromYear: Math.min(...years),
    toYear: Math.max(...years),
    statesAffected: states.size,
  }
}

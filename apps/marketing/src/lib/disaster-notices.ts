/**
 * disaster-notices.ts — the ONE source of truth for the IRS disaster-relief
 * landing pages (/irs-disaster-relief/[slug]) and the "pick your state" lookup
 * on /irs-disaster-relief.
 *
 * DATA INTEGRITY — hard red line. Every fact below (relief code, postponed
 * deadline, affected area, affected filing types) is transcribed from the
 * official irs.gov news release cited in `sourceHref` on each notice. Nothing is
 * invented or inferred: where the IRS release did not state a detail, it is
 * omitted rather than guessed. `deadline` is stored as an ISO date so the app can
 * compute live-vs-expired deterministically; `deadlineLabel` is the IRS's own
 * verbatim phrasing for display. Re-verify against the cited URL before editing.
 *
 * Live vs expired is derived, not stored: a notice is "live" while its postponed
 * deadline is on/after `today` (see `isLive` / `getNoticeStatus`). As of the
 * 2026-07-06 build: AZ/GA/HI/WA/NMI are live; MO-2025-03 has expired.
 */

/** The IRS return/payment categories a relief notice can postpone. Each maps to
 *  a plain-English "which of your clients this hits" line on the page. Only the
 *  categories the cited release actually names are listed on a given notice. */
export type FilingType =
  | 'individual' // Form 1040 — individual income tax returns & payments
  | 'corporate' // Form 1120 — corporate income tax returns
  | 's-corp' // Form 1120-S — S corporation returns
  | 'partnership' // Form 1065 — partnership returns
  | 'estate-trust' // Form 1041 — estate & trust income tax returns
  | 'estate-gift' // Form 706 / 709 — estate, gift & GST transfer tax returns
  | 'tax-exempt' // Form 990 series — annual returns of tax-exempt orgs
  | 'payroll-excise' // Employment (941/940) & excise tax returns/deposits
  | 'estimated' // Quarterly estimated income tax payments
  | 'retirement-hsa' // IRA / HSA contribution deadlines
  | 'form-5500' // Form 5500 series — employee benefit plan returns

/** Human labels + a one-line "who this hits" for each filing type, reused by the
 *  landing page and the lookup so the plain-English copy never drifts. */
export const FILING_TYPE_META: Record<
  FilingType,
  { form: string; label: string; whoItHits: string }
> = {
  individual: {
    form: '1040',
    label: 'Individual income tax',
    whoItHits: 'Any 1040 client in the area — returns and payments both move.',
  },
  corporate: {
    form: '1120',
    label: 'C corporation',
    whoItHits: 'C-corp clients (Form 1120) filing or paying in the window.',
  },
  's-corp': {
    form: '1120-S',
    label: 'S corporation',
    whoItHits: 'S-corp clients (Form 1120-S) with a return due in the window.',
  },
  partnership: {
    form: '1065',
    label: 'Partnership',
    whoItHits: 'Partnership clients (Form 1065) with a return due in the window.',
  },
  'estate-trust': {
    form: '1041',
    label: 'Estate & trust income',
    whoItHits: 'Fiduciary clients filing Form 1041 for an estate or trust.',
  },
  'estate-gift': {
    form: '706 / 709',
    label: 'Estate, gift & GST',
    whoItHits: 'Estate, gift, and generation-skipping transfer tax filers.',
  },
  'tax-exempt': {
    form: '990',
    label: 'Tax-exempt',
    whoItHits: 'Nonprofit clients filing the annual Form 990-series return.',
  },
  'payroll-excise': {
    form: '941 / 940',
    label: 'Payroll & excise',
    whoItHits: 'Any client running payroll — quarterly 941/940 and excise returns move.',
  },
  estimated: {
    form: 'Estimated',
    label: 'Estimated payments',
    whoItHits: 'Clients making quarterly estimated income tax payments.',
  },
  'retirement-hsa': {
    form: 'IRA / HSA',
    label: 'IRA & HSA contributions',
    whoItHits: 'Clients making prior-year IRA or HSA contributions.',
  },
  'form-5500': {
    form: '5500',
    label: 'Benefit plan (5500)',
    whoItHits: 'Clients filing a Form 5500-series employee benefit plan return.',
  },
}

export interface DisasterNotice {
  /** URL slug: /irs-disaster-relief/[slug]. */
  slug: string
  /** IRS relief code, verbatim (e.g. "AZ-2026-01"). */
  code: string
  state: string
  /** USPS-style abbreviation for the state/territory (e.g. "AZ", "MP" for NMI). */
  abbreviation: string
  /** Short disaster label for headings (e.g. "Severe storms & flooding"). */
  event: string
  /** IRS date the release was issued, verbatim. */
  issuedOn: string
  /** ISO date of the postponed filing/payment deadline (for live/expired math). */
  deadline: string
  /** IRS's verbatim deadline phrasing for display (e.g. "Sept. 28, 2026"). */
  deadlineLabel: string
  /** IRS-stated incident start (verbatim, e.g. "Oct. 10, 2025"). */
  incidentStart: string
  /** Verbatim affected-area sentence from the release (counties / tribe / islands). */
  affectedArea: string
  /** Filing categories the release names as postponed. */
  affectedReturns: FilingType[]
  /** FEMA declaration number if the release states one; omit otherwise. */
  femaDeclaration?: string
  /** The official irs.gov news release this notice is transcribed from. */
  sourceHref: string
}

/**
 * Verified 2026 IRS disaster-relief notices. Each entry cites its irs.gov source.
 * Kept small on purpose (validation stage). Add a notice only after fetching its
 * own irs.gov release and transcribing the facts — never from the index alone.
 */
export const DISASTER_NOTICES: DisasterNotice[] = [
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-and-flooding-in-the-san-carlos-apache-tribe-various-deadlines-postponed-to-sept-28-2026
    // Verified 2026-07-06: code AZ-2026-01 (issued June 16, 2026); deadline Sept. 28, 2026;
    // area = San Carlos Apache Tribe; incident Oct. 10–13, 2025; FEMA 4911-DR.
    slug: 'arizona-san-carlos-apache-tribe-severe-storms-flooding',
    code: 'AZ-2026-01',
    state: 'Arizona',
    abbreviation: 'AZ',
    event: 'Severe storms & flooding',
    issuedOn: 'June 16, 2026',
    deadline: '2026-09-28',
    deadlineLabel: 'Sept. 28, 2026',
    incidentStart: 'Oct. 10, 2025',
    affectedArea: 'The San Carlos Apache Tribe',
    affectedReturns: [
      'individual',
      'corporate',
      's-corp',
      'partnership',
      'estate-trust',
      'estate-gift',
      'tax-exempt',
      'payroll-excise',
      'estimated',
    ],
    femaDeclaration: '4911-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-and-flooding-in-the-san-carlos-apache-tribe-various-deadlines-postponed-to-sept-28-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-wildfires-in-southeast-georgia-various-deadlines-postponed-to-aug-20
    // Verified 2026-07-06: code GA-2026-03 (issued May 6, 2026); deadline Aug. 20, 2026;
    // counties Clinch, Echols, Brantley; incident (wildfires & straight-line winds) April 18, 2026.
    slug: 'georgia-southeast-wildfires',
    code: 'GA-2026-03',
    state: 'Georgia',
    abbreviation: 'GA',
    event: 'Wildfires & straight-line winds',
    issuedOn: 'May 6, 2026',
    deadline: '2026-08-20',
    deadlineLabel: 'Aug. 20, 2026',
    incidentStart: 'April 18, 2026',
    affectedArea: 'Clinch, Echols, and Brantley counties',
    affectedReturns: [
      'individual',
      'corporate',
      's-corp',
      'partnership',
      'estate-trust',
      'estate-gift',
      'tax-exempt',
      'payroll-excise',
      'estimated',
    ],
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-wildfires-in-southeast-georgia-various-deadlines-postponed-to-aug-20',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-in-the-state-of-hawaii-various-deadlines-postponed-to-july-8-2026
    // Verified 2026-07-06: code HI-2026-01 (issued April 10, 2026). Release UPDATED 5/12/26
    // to move the deadline from July 8, 2026 to Aug. 20, 2026 (current). Counties: Hawaii,
    // Honolulu, Kauai, Maui; incident (flooding & mudslides from severe storms) March 10, 2026.
    slug: 'hawaii-severe-storms-flooding',
    code: 'HI-2026-01',
    state: 'Hawaii',
    abbreviation: 'HI',
    event: 'Severe storms, flooding & mudslides',
    issuedOn: 'April 10, 2026',
    deadline: '2026-08-20',
    deadlineLabel: 'Aug. 20, 2026',
    incidentStart: 'March 10, 2026',
    affectedArea: 'Hawaii, Honolulu, Kauai and Maui counties',
    affectedReturns: [
      'individual',
      'corporate',
      's-corp',
      'partnership',
      'estate-trust',
      'estate-gift',
      'tax-exempt',
      'payroll-excise',
      'estimated',
    ],
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-in-the-state-of-hawaii-various-deadlines-postponed-to-july-8-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-flooding-landslides-and-mudslides-in-the-state-of-washington-various-deadlines-postponed-to-may-1-2026
    // Verified 2026-07-06: code WA-2025-03. Release UPDATED 5/1/26 to move the deadline from
    // May 1, 2026 to Aug. 5, 2026 (current). Current qualifying counties: Asotin, Clark, Cowlitz,
    // Garfield, Klickitat, Pacific, Pend Oreille, Skamania, Wahkiakum (plus listed tribal nations);
    // incident began Dec. 9, 2025; FEMA 3629-EM.
    slug: 'washington-severe-storms-flooding-landslides',
    code: 'WA-2025-03',
    state: 'Washington',
    abbreviation: 'WA',
    event: 'Severe storms, flooding & landslides',
    issuedOn: 'Dec. 9, 2025',
    deadline: '2026-08-05',
    deadlineLabel: 'Aug. 5, 2026',
    incidentStart: 'Dec. 9, 2025',
    affectedArea:
      'Asotin, Clark, Cowlitz, Garfield, Klickitat, Pacific, Pend Oreille, Skamania and Wahkiakum counties (plus listed Washington tribal nations)',
    affectedReturns: [
      'individual',
      'payroll-excise',
      'estimated',
      'retirement-hsa',
    ],
    femaDeclaration: '3629-EM',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-flooding-landslides-and-mudslides-in-the-state-of-washington-various-deadlines-postponed-to-may-1-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-super-typhoon-sinlaku-in-the-commonwealth-of-the-northern-mariana-islands-various-deadlines-postponed-to-nov-2-2026
    // Verified 2026-07-06: code NMI-2026-01 (issued May 4, 2026); deadline Nov. 2, 2026;
    // area = Northern Islands, Rota, Saipan and Tinian; incident (Super Typhoon Sinlaku) April 11, 2026; FEMA 4910-DR.
    slug: 'northern-mariana-islands-super-typhoon-sinlaku',
    code: 'NMI-2026-01',
    state: 'Northern Mariana Islands',
    abbreviation: 'MP',
    event: 'Super Typhoon Sinlaku',
    issuedOn: 'May 4, 2026',
    deadline: '2026-11-02',
    deadlineLabel: 'Nov. 2, 2026',
    incidentStart: 'April 11, 2026',
    affectedArea: 'Northern Islands, Rota, Saipan and Tinian',
    affectedReturns: [
      'individual',
      'corporate',
      's-corp',
      'partnership',
      'estate-trust',
      'estate-gift',
      'payroll-excise',
      'estimated',
    ],
    femaDeclaration: '4910-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-super-typhoon-sinlaku-in-the-commonwealth-of-the-northern-mariana-islands-various-deadlines-postponed-to-nov-2-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-provides-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-tornadoes-and-flooding-in-multiple-counties-missouri-various-deadlines-postponed-to-march-30-2026
    // Verified 2026-07-06: code MO-2025-03 (issued Nov. 17, 2025); deadline March 30, 2026 (EXPIRED
    // as of the 2026-07-06 build); 27 counties (see affectedArea); incident began March 30, 2025; FEMA 4872-DR.
    slug: 'missouri-severe-storms-tornadoes-flooding',
    code: 'MO-2025-03',
    state: 'Missouri',
    abbreviation: 'MO',
    event: 'Severe storms, tornadoes & flooding',
    issuedOn: 'Nov. 17, 2025',
    deadline: '2026-03-30',
    deadlineLabel: 'March 30, 2026',
    incidentStart: 'March 30, 2025',
    affectedArea:
      'Bollinger, Butler, Cape Girardeau, Carter, Cooper, Douglas, Dunklin, Howell, Iron, Madison, Maries, Mississippi, New Madrid, Oregon, Ozark, Pemiscot, Reynolds, Ripley, Scott, Shannon, Ste. Genevieve, Stoddard, Texas, Vernon, Washington, Wayne, and Webster counties',
    affectedReturns: [
      'individual',
      'corporate',
      's-corp',
      'partnership',
      'estate-trust',
      'payroll-excise',
      'estimated',
      'form-5500',
    ],
    femaDeclaration: '4872-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-provides-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-tornadoes-and-flooding-in-multiple-counties-missouri-various-deadlines-postponed-to-march-30-2026',
  },
]

/** True while the notice's postponed deadline is on/after `today` (default now). */
export function isLive(notice: DisasterNotice, today: Date = new Date()): boolean {
  // Compare on calendar dates in UTC so a deadline is "live" through its own day.
  const cutoff = new Date(`${notice.deadline}T23:59:59Z`)
  return cutoff.getTime() >= today.getTime()
}

export function getNoticeStatus(
  notice: DisasterNotice,
  today: Date = new Date(),
): 'live' | 'expired' {
  return isLive(notice, today) ? 'live' : 'expired'
}

export function getNoticeBySlug(slug: string): DisasterNotice | undefined {
  return DISASTER_NOTICES.find((n) => n.slug === slug)
}

/** All notices for a given state name (case-insensitive), newest deadline first. */
export function getNoticesForState(state: string): DisasterNotice[] {
  const key = state.trim().toLowerCase()
  return DISASTER_NOTICES.filter((n) => n.state.toLowerCase() === key).sort((a, b) =>
    a.deadline < b.deadline ? 1 : -1,
  )
}

/** Distinct state names that have at least one notice, alphabetical. */
export function getNoticeStates(): { state: string; abbreviation: string }[] {
  const seen = new Map<string, string>()
  for (const n of DISASTER_NOTICES) if (!seen.has(n.state)) seen.set(n.state, n.abbreviation)
  return [...seen.entries()]
    .map(([state, abbreviation]) => ({ state, abbreviation }))
    .sort((a, b) => a.state.localeCompare(b.state))
}

// ---- SEO metadata + FAQ, derived from the same verified facts ---------------
// One builder so the visible page copy, the <title>/description, and the FAQPage
// JSON-LD all read from the same source (no drift, no fabricated facts).

export interface DisasterNoticeMeta {
  title: string
  description: string
}

export function getNoticeMeta(notice: DisasterNotice): DisasterNoticeMeta {
  const yr = notice.deadline.slice(0, 4)
  return {
    title: `IRS ${notice.state} ${notice.event} Tax Relief ${yr} — Deadline ${notice.deadlineLabel} (${notice.code}) | DueDateHQ`,
    description: `The IRS postponed tax deadlines to ${notice.deadlineLabel} for taxpayers in ${notice.affectedArea.replace(/^The /, '')} after ${notice.event.toLowerCase()} (relief ${notice.code}). See the affected returns and which of your clients this hits.`,
  }
}

/** Plain-English list of the affected returns, for FAQ answers. */
function affectedReturnsSentence(notice: DisasterNotice): string {
  const labels = notice.affectedReturns.map((t) => FILING_TYPE_META[t].label.toLowerCase())
  if (labels.length <= 1) return labels[0] ?? 'various'
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

export function getNoticeFaq(
  notice: DisasterNotice,
): { question: string; answer: string }[] {
  const status = getNoticeStatus(notice)
  const faq: { question: string; answer: string }[] = [
    {
      question: `What is the new IRS deadline for the ${notice.state} ${notice.event.toLowerCase()} (${notice.code})?`,
      answer: `The IRS postponed affected filing and payment deadlines to <b>${notice.deadlineLabel}</b> for taxpayers in ${notice.affectedArea.replace(/^The /, '')}. This follows ${notice.event.toLowerCase()} that began ${notice.incidentStart}.`,
    },
    {
      question: `Who qualifies for this ${notice.state} disaster relief?`,
      answer: `Taxpayers who reside or have a business in ${notice.affectedArea.replace(/^The /, '')} qualify. The IRS applies the relief automatically based on the address of record, so most eligible taxpayers do not need to contact the IRS.`,
    },
    {
      question: `Which returns and payments are postponed?`,
      answer: `The relief covers ${affectedReturnsSentence(notice)} returns and payments with an original or extended due date in the postponement window. All of them move to ${notice.deadlineLabel}.`,
    },
    {
      question: status === 'live'
        ? `Is this relief still in effect?`
        : `Has this relief window closed?`,
      answer: status === 'live'
        ? `Yes — as of the last review, the ${notice.deadlineLabel} deadline had not yet passed. Always confirm against the official IRS release before relying on it.`
        : `The ${notice.deadlineLabel} deadline has passed, so the postponement window for ${notice.code} has closed. This page is kept for reference; check the IRS disaster-relief index for current notices.`,
    },
  ]
  return faq
}

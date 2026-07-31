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
 * deadline is on/after `today` (see `isLive` / `getNoticeStatus`). As of 2026-07-27 all
 * eleven notices are live, WA-2025-03 (Aug. 5, 2026) being the nearest.
 *
 * TRANSCRIBING GOTCHA — the IRS revises releases in place, and the revision lives in an
 * "Updated M/D/YY:" banner ABOVE the body while the body prose keeps the ORIGINAL date.
 * The page title and URL slug keep the original date too. So a release whose slug and
 * body both say "May 1, 2026" may actually be Aug. 5, 2026 (WA-2025-03, updated 5/1/26),
 * and the /newsroom/tax-relief-in-disaster-situations index titles lag the same way.
 * Always read the banner first; an update can also ADD counties (WA's 5/1/26 update added
 * nine counties and 25 tribal nations to the 17 the body names). Two entries here were
 * briefly "corrected" to their stale body dates on 2026-07-27 before this was understood.
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
    whoItHits: 'Any client who files a personal return.',
  },
  corporate: {
    form: '1120',
    label: 'C corporation',
    whoItHits: 'C-corporation clients.',
  },
  's-corp': {
    form: '1120-S',
    label: 'S corporation',
    whoItHits: 'S-corporation clients.',
  },
  partnership: {
    form: '1065',
    label: 'Partnership',
    whoItHits: 'Partnership clients.',
  },
  'estate-trust': {
    form: '1041',
    label: 'Estate & trust income',
    whoItHits: 'Estates and trusts you file 1041s for.',
  },
  'estate-gift': {
    form: '706 / 709',
    label: 'Estate, gift & GST',
    whoItHits: 'Estate, gift, and GST transfer-tax filers.',
  },
  'tax-exempt': {
    form: '990',
    label: 'Tax-exempt',
    whoItHits: 'Nonprofit clients filing a 990.',
  },
  'payroll-excise': {
    form: '941 / 940',
    label: 'Payroll & excise',
    whoItHits: 'Any client you run payroll for.',
  },
  estimated: {
    form: 'Estimated',
    label: 'Estimated payments',
    whoItHits: 'Clients who make quarterly estimates.',
  },
  'retirement-hsa': {
    form: 'IRA / HSA',
    label: 'IRA & HSA contributions',
    whoItHits: 'Prior-year IRA and HSA contributions.',
  },
  'form-5500': {
    form: '5500',
    label: 'Benefit plan (5500)',
    whoItHits: 'Employee benefit-plan filers.',
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
  /** Short stand-in for `affectedArea` in the meta description only, for notices whose
   *  verbatim area is a long county list (WA-2025-03 names 25 counties). The page body,
   *  H1, and structured data always use the full `affectedArea`; this exists purely so
   *  the SERP description stays inside ~155 chars. Omit unless the full area is long. */
  affectedAreaShort?: string
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
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-flooding-landslides-and-mudslides-in-the-state-of-washington-various-deadlines-postponed-to-may-1-2026
    // Re-verified 2026-07-27: code WA-2025-03; issued Dec. 23, 2025; deadline Aug. 5, 2026;
    // incident December 9, 2025; FEMA 3629-EM.
    //
    // READ THE UPDATE BANNER. This release carries "Updated 5/1/26: ... updated to change
    // the filing and payment deadlines from May 1, 2026, to Aug. 5, 2026", and the 5/1/26
    // update ALSO added counties and 25 tribal nations. The body prose below the banner
    // still says May 1, 2026 in 23 places and still lists only the original 17 counties —
    // transcribing the body alone yields a deadline three months stale. Aug. 5, 2026 is
    // correct. (The slug likewise still says "postponed-to-may-1-2026"; the URL is not the
    // fact.) Verified 2026-07-27 that no separate WA notice exists for DR-4906.
    //
    // 2026-07-27: `affectedArea` previously listed ONLY the nine counties the 5/1/26 update
    // added, omitting the original set — so a CPA in King or Pierce County read our page as
    // not covered. Now carries the full covered area.
    // 2026-07-28: authoritative count per the cited IRS release = 24 Washington COUNTIES plus
    // 25 tribal nations. "Samish" was wrongly listed among the counties (it is the Samish
    // Indian Nation, one of the 25 tribes, and WA has no Samish County) — removed. Do not
    // re-add it as a county; affectedAreaShort now reads "24 … counties and 25 tribal nations".
    slug: 'washington-severe-storms-flooding-landslides',
    code: 'WA-2025-03',
    state: 'Washington',
    abbreviation: 'WA',
    event: 'Severe storms, straight-line winds, flooding, landslides and mudslides',
    issuedOn: 'Dec. 23, 2025',
    deadline: '2026-08-05',
    deadlineLabel: 'Aug. 5, 2026',
    incidentStart: 'December 9, 2025',
    affectedArea:
      'Asotin, Benton, Chelan, Clallam, Clark, Cowlitz, Garfield, Grays Harbor, Jefferson, King, Kittitas, Klickitat, Lewis, Mason, Pacific, Pend Oreille, Pierce, Skagit, Skamania, Snohomish, Thurston, Wahkiakum, Whatcom and Yakima counties, plus 25 tribal nations',
    affectedAreaShort: '24 Washington counties and 25 tribal nations',
    affectedReturns: [
      'individual',
      'corporate',
      'partnership',
      's-corp',
      'estate-trust',
      'estate-gift',
      'tax-exempt',
      'payroll-excise',
      'estimated',
      'retirement-hsa',
    ],
    femaDeclaration: '3629-EM',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-flooding-landslides-and-mudslides-in-the-state-of-washington-various-deadlines-postponed-to-may-1-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-wildfires-in-southeast-georgia-various-deadlines-postponed-to-aug-20
    // Verified 2026-07-14: code GA-2026-03 (issued May 6, 2026); deadline Aug. 20, 2026;
    // incident April 18, 2026. Area: Clinch, Echols and Brantley counties
    slug: 'georgia-southeast-wildfires',
    code: 'GA-2026-03',
    state: 'Georgia',
    abbreviation: 'GA',
    event: 'Southeast Georgia wildfires',
    issuedOn: 'May 6, 2026',
    deadline: '2026-08-20',
    deadlineLabel: 'Aug. 20, 2026',
    incidentStart: 'April 18, 2026',
    affectedArea: 'Clinch, Echols and Brantley counties',
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
    // Re-verified 2026-07-27: code HI-2026-01 (issued April 10, 2026); deadline Aug. 20,
    // 2026; incident March 10, 2026. Area: Hawaii, Honolulu, Kauai, and Maui counties.
    // The release states no FEMA declaration number, so none is stored.
    //
    // READ THE UPDATE BANNER. Same trap as WA-2025-03: "Updated 5/12/26: ... updated to
    // change the filing and payment deadlines from July 8, 2026, to Aug. 20, 2026." The
    // body prose still says July 8, 2026 in 24 places and the slug still says
    // "postponed-to-july-8-2026". Aug. 20, 2026 is correct; the 5/12/26 update changed
    // no counties.
    //
    // 2026-07-27: `affectedReturns` was under-inclusive (individual / payroll-excise /
    // estate-gift / tax-exempt only). The release's section 7508A paragraph also names
    // corporate, S corporation, partnership, and estate & trust returns, and postpones
    // estimated payments — all now listed. It does not mention IRA/HSA contributions, so
    // `retirement-hsa` stays off.
    slug: 'hawaii-severe-storms-flooding-mudslides',
    code: 'HI-2026-01',
    state: 'Hawaii',
    abbreviation: 'HI',
    event: 'Severe storms, flooding and mudslides',
    issuedOn: 'April 10, 2026',
    deadline: '2026-08-20',
    deadlineLabel: 'Aug. 20, 2026',
    incidentStart: 'March 10, 2026',
    affectedArea: 'Hawaii, Honolulu, Kauai, and Maui counties',
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
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-and-flooding-in-the-san-carlos-apache-tribe-various-deadlines-postponed-to-sept-28-2026
    // Verified 2026-07-14: code AZ-2026-01 (issued June 16, 2026); deadline Sept. 28, 2026;
    // incident October 10, 2025; FEMA 4911-DR. Area: San Carlos Apache Tribe
    slug: 'arizona-san-carlos-apache-severe-storms-flooding',
    code: 'AZ-2026-01',
    state: 'Arizona',
    abbreviation: 'AZ',
    event: 'Severe storms and flooding (San Carlos Apache Tribe)',
    issuedOn: 'June 16, 2026',
    deadline: '2026-09-28',
    deadlineLabel: 'Sept. 28, 2026',
    incidentStart: 'October 10, 2025',
    affectedArea: 'San Carlos Apache Tribe',
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
      'retirement-hsa',
    ],
    femaDeclaration: '4911-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-and-flooding-in-the-san-carlos-apache-tribe-various-deadlines-postponed-to-sept-28-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-winter-storm-and-straight-line-winds-in-the-fort-peck-assiniboine-and-sioux-tribes-various-deadlines-postponed-to-sept-28-2026
    // Verified 2026-07-14: code MT-2026-03 (issued June 16, 2026); deadline Sept. 28, 2026;
    // incident December 17, 2025; FEMA 4914-DR. Area: Fort Peck Assiniboine and Sioux Tribes
    // in northeastern Montana
    slug: 'montana-fort-peck-tribes-winter-storm',
    code: 'MT-2026-03',
    state: 'Montana',
    abbreviation: 'MT',
    event: 'Severe Winter Storm and Straight-line Winds (Fort Peck Assiniboine and Sioux Tribes)',
    issuedOn: 'June 16, 2026',
    deadline: '2026-09-28',
    deadlineLabel: 'Sept. 28, 2026',
    incidentStart: 'December 17, 2025',
    affectedArea: 'Fort Peck Assiniboine and Sioux Tribes in northeastern Montana',
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
    femaDeclaration: '4914-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-winter-storm-and-straight-line-winds-in-the-fort-peck-assiniboine-and-sioux-tribes-various-deadlines-postponed-to-sept-28-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-in-the-crow-tribe-of-montana-impacted-by-severe-winter-storm-and-straight-line-winds-various-deadlines-postponed-to-sept-28-2026
    // Verified 2026-07-14: code MT-2026-04 (issued June 16, 2026); deadline Sept. 28, 2026;
    // incident December 17, 2025; FEMA 4915-DR. Area: Individuals and households that reside
    // or have a business in the Crow Reservation in southcentral Montana
    slug: 'montana-crow-tribe-winter-storm',
    code: 'MT-2026-04',
    state: 'Montana',
    abbreviation: 'MT',
    event: 'Severe Winter Storm and Straight-line Winds (Crow Tribe)',
    issuedOn: 'June 16, 2026',
    deadline: '2026-09-28',
    deadlineLabel: 'Sept. 28, 2026',
    incidentStart: 'December 17, 2025',
    affectedArea:
      'Individuals and households that reside or have a business in the Crow Reservation in southcentral Montana',
    affectedReturns: [
      'individual',
      'corporate',
      's-corp',
      'partnership',
      'estate-trust',
      'payroll-excise',
      'estimated',
    ],
    femaDeclaration: '4915-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-in-the-crow-tribe-of-montana-impacted-by-severe-winter-storm-and-straight-line-winds-various-deadlines-postponed-to-sept-28-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-and-businesses-in-louisiana-affected-by-tropical-storm-arthur-that-began-on-june-17-2026
    // Verified 2026-07-14: code LA-2026-02 (issued July 13, 2026); deadline Nov. 2, 2026;
    // incident June 17, 2026; FEMA 4927-DR. Area: Avoyelles, St. Landry, St. Tammany and
    // Terrebonne parishes
    slug: 'louisiana-tropical-storm-arthur',
    code: 'LA-2026-02',
    state: 'Louisiana',
    abbreviation: 'LA',
    event: 'Tropical Storm Arthur',
    issuedOn: 'July 13, 2026',
    deadline: '2026-11-02',
    deadlineLabel: 'Nov. 2, 2026',
    incidentStart: 'June 17, 2026',
    affectedArea: 'Avoyelles, St. Landry, St. Tammany and Terrebonne parishes',
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
    femaDeclaration: '4927-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-and-businesses-in-louisiana-affected-by-tropical-storm-arthur-that-began-on-june-17-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-tornadoes-and-flooding-in-the-state-of-michigan-various-deadlines-postponed-to-nov-2-2026
    // Verified 2026-07-14: code MI-2026-02 (issued July 13, 2026); deadline Nov. 2, 2026;
    // incident April 10, 2026; FEMA 4925-DR. Area: Alcona, Allegan, Alpena, Antrim, Barry,
    // Benzie, Charlevoix, Cheboygan, Crawford, Eaton, Emmet, Grand Traverse, Gratiot, Iosco,
    // Iron, Kalamazoo, Kalkaska, Lake, Manistee, Marquette, Mecosta, Menominee, Missaukee,
    // Montcalm, Montmorency, Muskegon, Newaygo, Oceana, Ogemaw, Osceola, Oscoda, Presque
    // Isle, Roscommon, Saginaw, Tuscola, Washtenaw, and Wexford counties
    slug: 'michigan-severe-storms-tornadoes-flooding',
    code: 'MI-2026-02',
    state: 'Michigan',
    abbreviation: 'MI',
    event: 'Severe Storms, Tornadoes and Flooding',
    issuedOn: 'July 13, 2026',
    deadline: '2026-11-02',
    deadlineLabel: 'Nov. 2, 2026',
    incidentStart: 'April 10, 2026',
    affectedArea:
      'Alcona, Allegan, Alpena, Antrim, Barry, Benzie, Charlevoix, Cheboygan, Crawford, Eaton, Emmet, Grand Traverse, Gratiot, Iosco, Iron, Kalamazoo, Kalkaska, Lake, Manistee, Marquette, Mecosta, Menominee, Missaukee, Montcalm, Montmorency, Muskegon, Newaygo, Oceana, Ogemaw, Osceola, Oscoda, Presque Isle, Roscommon, Saginaw, Tuscola, Washtenaw, and Wexford counties',
    // 37 counties enumerated above (Alcona … Wexford).
    affectedAreaShort: '37 Michigan counties',
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
    femaDeclaration: '4925-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-tornadoes-and-flooding-in-the-state-of-michigan-various-deadlines-postponed-to-nov-2-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-tornadoes-and-flooding-in-the-state-of-mississippi-various-deadlines-postponed-to-nov-2-2026
    // Verified 2026-07-14: code MS-2026-02 (issued July 13, 2026); deadline Nov. 2, 2026;
    // incident May 6, 2026; FEMA 4922-DR. Area: Franklin, Lamar, Lawrence, Lincoln, and
    // Wilkinson counties
    slug: 'mississippi-severe-storms-tornadoes-flooding',
    code: 'MS-2026-02',
    state: 'Mississippi',
    abbreviation: 'MS',
    event: 'Severe storms, straight-line winds, tornadoes and flooding',
    issuedOn: 'July 13, 2026',
    deadline: '2026-11-02',
    deadlineLabel: 'Nov. 2, 2026',
    incidentStart: 'May 6, 2026',
    affectedArea: 'Franklin, Lamar, Lawrence, Lincoln, and Wilkinson counties',
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
    femaDeclaration: '4922-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-tornadoes-and-flooding-in-the-state-of-mississippi-various-deadlines-postponed-to-nov-2-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-super-typhoon-sinlaku-in-the-commonwealth-of-the-northern-mariana-islands-various-deadlines-postponed-to-nov-2-2026
    // Verified 2026-07-14: code NMI-2026-01 (issued May 4, 2026); deadline Nov. 2, 2026;
    // incident April 11, 2026; FEMA 4910-DR. Area: Northern Islands, Rota, Saipan, and Tinian
    slug: 'northern-mariana-islands-super-typhoon-sinlaku',
    code: 'NMI-2026-01',
    state: 'Northern Mariana Islands',
    abbreviation: 'MP',
    event: 'Super Typhoon Sinlaku',
    issuedOn: 'May 4, 2026',
    deadline: '2026-11-02',
    deadlineLabel: 'Nov. 2, 2026',
    incidentStart: 'April 11, 2026',
    affectedArea: 'Northern Islands, Rota, Saipan, and Tinian',
    affectedReturns: [
      'individual',
      'corporate',
      'partnership',
      's-corp',
      'estate-trust',
      'estate-gift',
      'tax-exempt',
      'payroll-excise',
      'estimated',
    ],
    femaDeclaration: '4910-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-super-typhoon-sinlaku-in-the-commonwealth-of-the-northern-mariana-islands-various-deadlines-postponed-to-nov-2-2026',
  },
  {
    // Source: https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-tornadoes-and-flooding-in-the-state-of-wisconsin-various-deadlines-postponed-to-nov-2-2026
    // Verified 2026-07-14: code WI-2026-02 (issued July 13, 2026); deadline Nov. 2, 2026;
    // incident April 13, 2026; FEMA 4923-DR. Area: Bayfield, Brown, Buffalo, Iowa, Jackson,
    // Jefferson, Juneau, Kenosha, Kewaunee, Manitowoc, Marathon, Milwaukee, Outagamie,
    // Racine, Rock, Sauk, Vernon, Washington, Waukesha, Waupaca, and Winnebago counties, and
    // the Oneida Indian Reservation
    slug: 'wisconsin-severe-storms-tornadoes-flooding',
    code: 'WI-2026-02',
    state: 'Wisconsin',
    abbreviation: 'WI',
    event: 'Severe Storms, Tornadoes and Flooding',
    issuedOn: 'July 13, 2026',
    deadline: '2026-11-02',
    deadlineLabel: 'Nov. 2, 2026',
    incidentStart: 'April 13, 2026',
    affectedArea:
      'Bayfield, Brown, Buffalo, Iowa, Jackson, Jefferson, Juneau, Kenosha, Kewaunee, Manitowoc, Marathon, Milwaukee, Outagamie, Racine, Rock, Sauk, Vernon, Washington, Waukesha, Waupaca, and Winnebago counties, and the Oneida Indian Reservation',
    // 21 counties enumerated above (Bayfield … Winnebago); the Oneida Indian
    // Reservation is a tribal clause, not a county, so it is not in the count.
    affectedAreaShort: '21 Wisconsin counties and the Oneida Indian Reservation',
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
    femaDeclaration: '4923-DR',
    sourceHref:
      'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-tornadoes-and-flooding-in-the-state-of-wisconsin-various-deadlines-postponed-to-nov-2-2026',
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
  return DISASTER_NOTICES.filter((n) => n.state.toLowerCase() === key).toSorted((a, b) =>
    a.deadline < b.deadline ? 1 : -1,
  )
}

/** Distinct state names that have at least one notice, alphabetical. */
export function getNoticeStates(): { state: string; abbreviation: string }[] {
  const seen = new Map<string, string>()
  for (const n of DISASTER_NOTICES) if (!seen.has(n.state)) seen.set(n.state, n.abbreviation)
  return [...seen.entries()]
    .map(([state, abbreviation]) => ({ state, abbreviation }))
    .toSorted((a, b) => a.state.localeCompare(b.state))
}

// ---- SEO metadata + FAQ, derived from the same verified facts ---------------
// One builder so the visible page copy, the <title>/description, and the FAQPage
// JSON-LD all read from the same source (no drift, no fabricated facts).

export interface DisasterNoticeMeta {
  title: string
  description: string
}

// State+deadline combos shared by more than one notice (e.g. the two Montana
// winter-storm notices) — their titles would otherwise be identical, and
// duplicate titles are a negative signal. Those get the notice code appended.
const DUPLICATE_TITLE_KEYS = (() => {
  const counts = new Map<string, number>()
  for (const n of DISASTER_NOTICES) {
    const k = `${n.state}|${n.deadline}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return new Set([...counts].filter(([, c]) => c > 1).map(([k]) => k))
})()

export function getNoticeMeta(notice: DisasterNotice): DisasterNoticeMeta {
  const yr = notice.deadline.slice(0, 4)
  const disambig = DUPLICATE_TITLE_KEYS.has(`${notice.state}|${notice.deadline}`)
    ? ` (${notice.code})`
    : ''
  return {
    // Keep ~60 chars so Google doesn't truncate: front-load state + "disaster tax
    // relief" + the postponed deadline (what a searching CPA actually needs to see
    // in the SERP). The full event name + notice code stay in the H1, body, and
    // structured data.
    title: `IRS ${notice.state} Disaster Tax Relief ${yr}: Deadline ${notice.deadlineLabel}${disambig}`,
    // `affectedAreaShort` keeps this inside ~155 chars for notices whose verbatim area is
    // a long county list; the full area still renders on the page and in the JSON-LD.
    description: `The IRS postponed tax deadlines to ${notice.deadlineLabel} for taxpayers in ${(notice.affectedAreaShort ?? notice.affectedArea).replace(/^The /, '')} after ${notice.event} (relief ${notice.code}). See the affected returns and which of your clients this hits.`,
  }
}

/** Plain-English list of the affected returns, for FAQ answers. */
function affectedReturnsSentence(notice: DisasterNotice): string {
  const labels = notice.affectedReturns.map((t) => FILING_TYPE_META[t].label.toLowerCase())
  if (labels.length <= 1) return labels[0] ?? 'various'
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

export function getNoticeFaq(notice: DisasterNotice): { question: string; answer: string }[] {
  const status = getNoticeStatus(notice)
  const faq: { question: string; answer: string }[] = [
    {
      question: `What is the new IRS deadline for the ${notice.state} ${notice.event} (${notice.code})?`,
      answer: `The IRS postponed affected filing and payment deadlines to <b>${notice.deadlineLabel}</b> for taxpayers in ${notice.affectedArea.replace(/^The /, '')}. This follows ${notice.event} that began ${notice.incidentStart}.`,
    },
    {
      question: `Who qualifies for this ${notice.state} disaster relief?`,
      answer: `Taxpayers who reside or have a business in ${notice.affectedArea.replace(/^The /, '')} qualify. The IRS applies the relief automatically based on the address of record, so most eligible taxpayers do not need to contact the IRS.`,
    },
    {
      // The records-in-the-area nuance is stated in every IRS disaster release's
      // "Filing and payment relief" section (the paragraph that also gives the
      // 866-562-5227 hotline); the regulation cite is the release's own basis.
      question: `Can a client outside the listed area still qualify?`,
      answer: `Yes. Under Treas. Reg. §301.7508A-1(d)(1), "affected taxpayers" also include those whose records necessary to meet a deadline are located in the covered disaster area — including when those records sit with a preparer inside it. The IRS applies relief automatically only by address of record, so these taxpayers must call the IRS disaster hotline (866-562-5227) to request it.`,
    },
    {
      question: `What legal authority does the IRS use to postpone these deadlines?`,
      answer: `Section 7508A of the Internal Revenue Code, applied here by relief ${notice.code}. The covered disaster area is defined at Treas. Reg. §301.7508A-1(d)(2). Separately, since the Filing Relief for Natural Disasters Act (P.L. 119-29, enacted July 24, 2025), the IRS can also postpone federal deadlines for a state-declared disaster at a governor's written request, without waiting for a FEMA declaration.`,
    },
    {
      question: `Which returns and payments are postponed?`,
      answer: `The relief covers ${affectedReturnsSentence(notice)} returns and payments with an original or extended due date in the postponement window. All of them move to ${notice.deadlineLabel}.`,
    },
    {
      question:
        status === 'live' ? `Is this relief still in effect?` : `Has this relief window closed?`,
      answer:
        status === 'live'
          ? `Yes — as of the last review, the ${notice.deadlineLabel} deadline had not yet passed. Always confirm against the official IRS release before relying on it.`
          : `The ${notice.deadlineLabel} deadline has passed, so the postponement window for ${notice.code} has closed. This page is kept for reference; check the IRS disaster-relief index for current notices.`,
    },
  ]
  return faq
}

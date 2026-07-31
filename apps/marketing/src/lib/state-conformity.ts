/**
 * state-conformity.ts — the ONE source of truth for the state disaster-relief
 * conformity pages (/irs-disaster-relief/state-conformity/[state]).
 *
 * DATA INTEGRITY — same hard red line as disaster-notices.ts. Every fact below
 * was verified against the official state or federal source cited next to it
 * (agent-researched 2026-07-31, each source fetched and quoted). Where a state
 * has NOT matched a federal extension, that negative is itself a verified
 * finding ("checked the agency's news index as of the verified date") — never
 * an assumption. Nothing is inferred; where a source did not state a detail, it
 * is omitted. Re-verify against the cited URLs before editing.
 *
 * Why this page family exists: the IRS postpones a federal deadline and the
 * state may not follow — different taxes, different mechanics, sometimes a
 * request form the CPA must file. No central source tracks this. Each entry is
 * the answer for one state, tied to the active federal notices for that state.
 */

export interface SourceRef {
  label: string
  href: string
}

export interface ConformitySection {
  id: string
  heading: string
  /** Plain-text paragraphs (rendered as <p>). */
  body: string[]
  sources: SourceRef[]
}

export interface StateConformityEntry {
  /** URL slug: /irs-disaster-relief/state-conformity/[slug]. */
  slug: string
  state: string
  abbreviation: string
  /** Date every fact on this page was verified against the cited sources. */
  verifiedOn: string
  /** Short status chip, e.g. "Separate request required". */
  statusLabel: string
  /** Chip tone: ok = state matches federal; info = partial/different system;
   *  warn = trap — state does NOT follow the federal postponement. */
  statusTone: 'ok' | 'info' | 'warn'
  /** The ~40-word direct answer rendered under the H1. */
  directAnswer: string
  /** Relief codes of current federal notices this page speaks to (links to L2). */
  activeNoticeCodes: string[]
  sections: ConformitySection[]
  faq: { question: string; answer: string }[]
  /** Where the state tax agency publishes disaster announcements. */
  announcementsIndex: SourceRef
  metaTitle: string
  metaDescription: string
}

export const STATE_CONFORMITY: StateConformityEntry[] = [
  {
    // All facts verified 2026-07-31 against the cited WA DOR / ESD / IRS pages.
    slug: 'washington',
    state: 'Washington',
    abbreviation: 'WA',
    verifiedOn: '2026-07-31',
    statusLabel: 'No income tax — state relief is request-based',
    statusTone: 'info',
    directAnswer:
      'Washington has no state income tax, so the IRS postponement (to Aug. 5, 2026 under WA-2025-03) has no direct state income-tax counterpart. Relief on the taxes Washington does levy — B&O, sales/use, capital gains excise — is granted by request, not automatically. One deadline did move: the TY2025 capital gains due date, to May 1, 2026.',
    activeNoticeCodes: ['WA-2025-03'],
    sections: [
      {
        id: 'how-wa-relief-works',
        heading: 'Does Washington automatically follow IRS postponements?',
        body: [
          'No — and for income tax the question does not arise, because Washington levies none. For the taxes the Department of Revenue does administer (the combined excise return covering B&O and retail sales/use tax, the capital gains excise tax, timber taxes, and business licensing), DOR’s standing disaster policy is request-based: when a state of emergency has been declared, affected businesses can ask for a filing extension or a penalty waiver through a secure My DOR message or by calling 360-705-6705.',
          'Penalty waivers rest on WAC 458-20-228 (circumstances beyond the taxpayer’s control), plus a separate 24-month good-filing-history waiver that does not require a disaster at all.',
        ],
        sources: [
          {
            label: 'WA DOR — Disaster relief for taxpayers (standing policy)',
            href: 'https://dor.wa.gov/forms-publications/publications-subject/tax-topics/disaster-relief-taxpayers',
          },
          {
            label: 'WA DOR — Penalty waivers',
            href: 'https://dor.wa.gov/file-pay-taxes/late-filing/penalty-waivers',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Washington stands on the December 2025 storms (WA-2025-03)',
        body: [
          'DOR acknowledged the event on December 19, 2025: businesses that cannot file their excise returns on time should request an extension before the filing deadline — no blanket state deadline change was announced.',
          'On March 25, 2026, DOR did move one deadline outright: tax year 2025 capital gains excise returns and payments became due May 1, 2026 instead of April 15, explicitly citing the IRS extension for storm-affected Washington taxpayers. DOR noted that a filing extension does not extend the date the capital gains payment is due.',
          'The IRS later moved its own deadline again — from May 1 to Aug. 5, 2026 (the update banner on WA-2025-03). As of July 31, 2026, DOR’s news index shows no matching second move: no Washington tax deadline was extended to Aug. 5. A CPA relying on the federal Aug. 5 date for any Washington state obligation would be late.',
        ],
        sources: [
          {
            label:
              'WA DOR news — Disaster relief resources for flood-impacted businesses (Dec 19, 2025)',
            href: 'https://dor.wa.gov/about/news-releases/2025/disaster-relief-resources-available-flood-impacted-businesses-and-individuals',
          },
          {
            label: 'WA DOR news — Capital gains due date moved to May 1, 2026 (Mar 25, 2026)',
            href: 'https://dor.wa.gov/about/news-releases/2026/capital-gains-excise-tax-returns-due-date-moved-may-1-2026',
          },
          {
            label: 'IRS — WA-2025-03 (deadline updated to Aug. 5, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-flooding-landslides-and-mudslides-in-the-state-of-washington-various-deadlines-postponed-to-may-1-2026',
          },
        ],
      },
      {
        id: 'which-taxes',
        heading: 'Which Washington taxes can disaster relief touch?',
        body: [
          'DOR’s relief menu covers the combined excise return (B&O, retail sales, use tax), audit rescheduling, business license and reseller-permit timing, a reduction of assessed value for destroyed property (through the county assessor), and a credit for damaged timber. The capital gains excise tax got its own blanket due-date move for TY2025.',
          'Employer payroll filings are separate: unemployment-insurance taxes are administered by the Employment Security Department, which grants penalty/interest waivers on request when a disaster destroyed the business or its records. No event-specific ESD relief for employer filings was published for this declaration as of July 31, 2026.',
        ],
        sources: [
          {
            label: 'WA DOR — Disaster relief for taxpayers (standing policy)',
            href: 'https://dor.wa.gov/forms-publications/publications-subject/tax-topics/disaster-relief-taxpayers',
          },
          {
            label: 'WA ESD — Penalties for late tax payments and reports',
            href: 'https://esd.wa.gov/employer-requirements/unemployment-taxes/penalties-late-or-incomplete-tax-payments-and-reports',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'Is a separate request required?',
        body: [
          'Yes, for everything except the capital gains date move. The federal side is automatic — the IRS applies WA-2025-03 relief by address of record. The Washington side is not: an excise-tax extension must be requested before the return’s due date via My DOR or by phone (360-705-6705); after the date has passed, the path is a penalty-waiver request. ESD payroll waivers are likewise request-only.',
        ],
        sources: [
          {
            label: 'WA DOR — Disaster relief for taxpayers (request mechanics)',
            href: 'https://dor.wa.gov/forms-publications/publications-subject/tax-topics/disaster-relief-taxpayers',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Washington extend its tax deadlines to Aug. 5, 2026 like the IRS?',
        answer:
          'No. As of July 31, 2026, the only Washington deadline that moved is the TY2025 capital gains excise due date — to May 1, 2026, matching the IRS’s original relief date. When the IRS later moved to Aug. 5, 2026, no Washington deadline followed. Other state relief (B&O, sales/use) is request-based, not a date change.',
      },
      {
        question: 'Is Washington disaster relief automatic like the IRS relief?',
        answer:
          'No. The IRS applies relief automatically by address of record. Washington DOR requires a request — a secure My DOR message or a call to 360-705-6705 — and an extension request must come before the filing deadline. ESD payroll-tax waivers must also be requested.',
      },
      {
        question: 'My client has no income-tax filing in Washington — what is even affected?',
        answer:
          'The state obligations that can move or be forgiven are the combined excise return (B&O, retail sales, use tax), the capital gains excise tax, unemployment-insurance filings through ESD, property tax on destroyed property, and business licensing dates. Each has its own relief path — none of them inherits the federal Aug. 5 date.',
      },
    ],
    announcementsIndex: {
      label: 'WA DOR news releases',
      href: 'https://dor.wa.gov/about/news-releases',
    },
    metaTitle: 'Does Washington Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'The IRS moved WA deadlines to Aug. 5, 2026 — Washington state did not follow. Capital gains stayed due May 1; B&O and sales-tax relief is request-only. What CPAs must file, verified against WA DOR sources.',
  },
  {
    // All facts verified 2026-07-31 against the cited DOTAX / IRS / FEMA pages
    // (both Tax Announcement PDFs read in full).
    slug: 'hawaii',
    state: 'Hawaii',
    abbreviation: 'HI',
    verifiedOn: '2026-07-31',
    statusLabel: 'Waiver only — deadline NOT extended; Form L-115 required',
    statusTone: 'warn',
    directAnswer:
      'No. Hawaii did not extend its filing deadlines to match the IRS’s Aug. 20, 2026 date. DOTAX instead waives penalties and interest on state income tax through Aug. 20 — the deadline itself never moved, the relief is income-tax-only, and it must be requested on Form L-115.',
    activeNoticeCodes: ['HI-2026-01'],
    sections: [
      {
        id: 'how-hi-relief-works',
        heading: 'Does Hawaii automatically follow IRS postponements?',
        body: [
          'No. Hawaii has no automatic conformity to IRC §7508A postponements. Relief runs event-by-event through Department of Taxation announcements, and the legal trigger is the governor’s emergency proclamation under HRS §127A-14 — not the federal declaration.',
          'The structure is also different from the federal relief: DOTAX grants a waiver of penalties and interest, not a deadline postponement. Announcement 2026-03 states it plainly — the relief "is not an extension of the deadline to file returns or pay taxes," and the deadline is not extended for any purpose, including the refund-claim lookback under HRS §235-111. The federal relief moves the date; the Hawaii relief only forgives the cost of missing it.',
        ],
        sources: [
          {
            label: 'DOTAX Tax Announcement 2026-03 (Amended), Apr 8, 2026 (PDF)',
            href: 'https://files.hawaii.gov/tax/news/announce/ann26-03.pdf',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Hawaii stands on the March 2026 Kona Low storms (HI-2026-01)',
        body: [
          'Announcement 2026-03 (April 8, 2026) opened a penalty-and-interest waiver window for state income tax originally running to July 20, 2026, covering the whole state — broader than the IRS’s county list.',
          'Announcement 2026-04 (June 26, 2026) then extended the waiver period to Aug. 20, 2026, expressly "in line with the federal extension." So the end dates now match the IRS — but what happens on that date does not: federal returns are timely if filed by Aug. 20; Hawaii returns filed by then are late-but-forgiven, which still matters for anything keyed to the original due date.',
        ],
        sources: [
          {
            label: 'DOTAX Tax Announcement 2026-03 (Amended) (PDF)',
            href: 'https://files.hawaii.gov/tax/news/announce/ann26-03.pdf',
          },
          {
            label: 'DOTAX Tax Announcement 2026-04, Jun 26, 2026 (PDF)',
            href: 'https://files.hawaii.gov/tax/news/announce/ann26-04.pdf',
          },
          {
            label: 'IRS — HI-2026-01 (deadline updated to Aug. 20, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-in-the-state-of-hawaii-various-deadlines-postponed-to-july-8-2026',
          },
        ],
      },
      {
        id: 'which-taxes',
        heading: 'Which Hawaii taxes are covered?',
        body: [
          'State income tax only, for tax year 2025 returns: Forms N-11 and N-15 (individual), N-20 (partnership), N-30 (corporate), N-35 (S corporation), N-40 (fiduciary), and N-70NP (exempt-organization business income). General excise tax and transient accommodations tax are not covered — DOTAX’s own event FAQ limits the relief to income tax.',
          'That is a narrower net than the federal relief, which also postpones payroll and excise filings, estimated payments, and more. A client’s GET filings stay on their normal schedule.',
        ],
        sources: [
          {
            label: 'DOTAX Tax Announcement 2026-03 (Amended) (PDF)',
            href: 'https://files.hawaii.gov/tax/news/announce/ann26-03.pdf',
          },
          {
            label: 'DOTAX — March 2026 Kona Low Event FAQs',
            href: 'https://tax.hawaii.gov/2026konalow/',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'Is a separate request required? Yes — Form L-115',
        body: [
          'Unlike the automatic federal relief, Hawaii’s waiver must be requested on Form L-115 (Tax Relief Request for State Declared Disasters), filed through Hawaii Tax Online or by mail, stating how the disaster affected the taxpayer, signed under penalty of perjury. Waivers are decided case-by-case and are not pre-approved.',
          'Requests are being accepted through Aug. 20, 2026. Taxpayers who already filed an L-115 under the original July 20 window do not need to refile — DOTAX carries the request into the extended period automatically.',
        ],
        sources: [
          {
            label: 'DOTAX Tax Announcement 2026-03 (Amended) (PDF)',
            href: 'https://files.hawaii.gov/tax/news/announce/ann26-03.pdf',
          },
          {
            label: 'DOTAX Tax Announcement 2026-04 (PDF)',
            href: 'https://files.hawaii.gov/tax/news/announce/ann26-04.pdf',
          },
        ],
      },
      {
        id: 'precedent',
        heading: 'How Hawaii handled it last time (2023 Maui wildfires)',
        body: [
          'The mechanism was the same — a case-by-case announcement (2023-03) under an HRS §127A-14 proclamation — but the terms differed in both directions. The 2023 relief covered all taxes DOTAX administers (general excise, transient accommodations, income, tobacco, liquor), not just income tax; and it named no fixed end date and no L-115 — taxpayers wrote "2023 Wildfire Relief" on the return or messaged through Hawaii Tax Online.',
          'Notably, DOTAX never published a state deadline matching the IRS’s wildfire dates. Pinning the state waiver window to the federal date, as Announcement 2026-04 does, is new practice — evidence that Hawaii’s response is set per event and cannot be predicted from the federal notice.',
        ],
        sources: [
          {
            label: 'DOTAX Tax Announcement 2023-03 (Amended) (PDF)',
            href: 'https://files.hawaii.gov/tax/news/announce/ann23-03_amended.pdf',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Hawaii extend the state filing deadline to Aug. 20, 2026 like the IRS?',
        answer:
          'No. Hawaii’s deadline never moved. DOTAX waives penalties and interest on covered income-tax filings through Aug. 20, 2026 — the same end date as the IRS relief, but legally a waiver, not an extension. Announcement 2026-03 states the relief "is not an extension of the deadline to file returns or pay taxes."',
      },
      {
        question: 'Does my client need to file anything to get the Hawaii relief?',
        answer:
          'Yes — Form L-115 (Tax Relief Request for State Declared Disasters), through Hawaii Tax Online or by mail, by Aug. 20, 2026. The waiver is case-by-case and not pre-approved. The federal relief, by contrast, is automatic by address of record.',
      },
      {
        question: 'Are general excise tax (GET) filings covered?',
        answer:
          'No. The 2026 Kona Low relief covers state income tax only (Forms N-11, N-15, N-20, N-30, N-35, N-40, N-70NP). GET and transient accommodations tax stay on schedule — unlike the 2023 Maui wildfire relief, which covered all DOTAX-administered taxes.',
      },
      {
        question: 'Which parts of Hawaii qualify for the state relief?',
        answer:
          'The whole state — Announcement 2026-03 covers the Kona Low event "throughout the State," which is broader than the IRS notice’s list of Hawaii, Honolulu, Kauai, and Maui counties.',
      },
    ],
    announcementsIndex: {
      label: 'DOTAX Tax Announcements index',
      href: 'https://tax.hawaii.gov/news/announce/',
    },
    metaTitle: 'Does Hawaii Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'The IRS moved Hawaii deadlines to Aug. 20, 2026 — the state did not. DOTAX only waives penalties and interest, income tax only, and requires Form L-115 by Aug. 20. Verified against DOTAX announcements.',
  },
  {
    // All facts verified 2026-07-31 against the cited LDR / IRS pages (RIB PDFs
    // read in full). "No Arthur relief" is a verified negative: the 2026 news
    // archive, RIB series, and per-event resource pages were all checked.
    slug: 'louisiana',
    state: 'Louisiana',
    abbreviation: 'LA',
    verifiedOn: '2026-07-31',
    statusLabel: 'No state relief issued yet for Tropical Storm Arthur',
    statusTone: 'warn',
    directAnswer:
      'Not automatically — and for Tropical Storm Arthur, not yet at all. As of July 31, 2026, the Louisiana Department of Revenue has issued no extension matching the IRS’s Nov. 2, 2026 postponement (LA-2026-02). When LDR does grant disaster relief, it comes as an event-specific bulletin with its own dates, applied automatically by the address on file.',
    activeNoticeCodes: ['LA-2026-02'],
    sections: [
      {
        id: 'how-la-relief-works',
        heading: 'Does Louisiana automatically follow IRS postponements?',
        body: [
          'No. Louisiana relief is discretionary and event-specific: the LDR Secretary grants filing and payment extensions under La. R.S. 47:1514(B) and (C) — authority the statute makes permissive ("may grant"), not self-executing — announced through Revenue Information Bulletins for each declared disaster.',
          'The standing interpretive rule is RIB 23-029 (December 1, 2023): disaster extensions are granted under R.S. 47:1514(C) for presidentially declared disasters, and the extended due date is the later of the disaster-extension date or the return’s automatic extended due date.',
        ],
        sources: [
          {
            label:
              'LDR RIB 23-029 — Income tax filing extensions, federally declared disasters (PDF)',
            href: 'https://dam.ldr.la.gov/lawspolicies/RIB%2023-029%20Filing%20Extensions%20for%20Taxpayers%20Affected%20by%20Declared%20Disaster.pdf',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Louisiana stands on Tropical Storm Arthur (LA-2026-02)',
        body: [
          'The IRS postponed federal deadlines to Nov. 2, 2026 for six parishes — Avoyelles, Lafourche, Pointe Coupee, St. Landry, St. Tammany, and Terrebonne (Lafourche and Pointe Coupee were added by the release’s July 28 update). That relief is federal only.',
          'As of July 31, 2026, LDR has published no matching state relief: the 2026 news archive shows no Arthur release, no Arthur RIB appears in the 2026 bulletin series, and no per-event resource page exists for Arthur (the Hurricane Francine equivalent does). Louisiana state returns and payments therefore remain on their normal schedule.',
          'A bulletin may still come — LDR issued its Hurricane Francine relief two days after the IRS notice, but its Winter Storm Fern bulletin took about four weeks. Until one appears, do not assume any Louisiana date moved.',
        ],
        sources: [
          {
            label: 'IRS — LA-2026-02 (Tropical Storm Arthur, updated 7/28/26)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-and-businesses-in-louisiana-affected-by-tropical-storm-arthur-that-began-on-june-17-2026',
          },
          {
            label: 'LDR — 2026 news and announcements',
            href: 'https://revenue.louisiana.gov/news-and-announcements/2026',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'When LDR does act, is a request required?',
        body: [
          'No — Louisiana’s disaster extensions, once announced, are automatic based on the taxpayer’s location address on file with LDR. The Winter Storm Fern bulletin (RIB 26-008) also covers taxpayers whose critical tax records or paid preparer sit in the disaster area. The catch: the address must be current — individuals update it online, businesses via LaTAP or Form R-6450 — and a taxpayer whose LDR address is outside Louisiana gets no automatic extension, only case-by-case penalty and interest relief.',
        ],
        sources: [
          {
            label: 'LDR RIB 26-008 — Winter Storm Fern automatic extensions (PDF)',
            href: 'https://dam.ldr.la.gov/lawspolicies/RIB 26-008 Auto Extensions Winter Storm Fern.final rev 3.6.26.pdf',
          },
        ],
      },
      {
        id: 'precedent',
        heading: 'How Louisiana handled it last time (Hurricane Francine, 2024)',
        body: [
          'RIB 24-019 (September 13, 2024) is the template — and a warning against assuming state dates mirror federal ones. For income and franchise taxes, LDR matched the IRS end date (Feb. 3, 2025) but as an extension to file only: for calendar-year filers the tax had been due May 15, 2024, and the bulletin states interest and penalties continued to accrue from that date. The federal relief, by contrast, postponed payments too.',
          'Other taxes got different, earlier state dates that did not match the IRS at all: sales tax to Oct. 20, 2024; withholding, severance, and excise to Oct. 31, 2024. Six months of federal runway, five to seven weeks of state runway — per tax type.',
        ],
        sources: [
          {
            label:
              'LDR RIB 24-019 — Hurricane Francine automatic extensions (PDF via LDR policy documents)',
            href: 'https://revenue.louisiana.gov/laws-and-policies/policy-documents/policies/',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Louisiana extend state deadlines to Nov. 2, 2026 like the IRS?',
        answer:
          'No. As of July 31, 2026, LDR has issued no state relief for Tropical Storm Arthur — no RIB, no news release, no event page. The Nov. 2 date is federal only. Check LDR’s bulletin index before relying on any state date; a bulletin may still be issued.',
      },
      {
        question: 'Will my client need to request Louisiana relief if a bulletin is issued?',
        answer:
          'Usually not — LDR disaster extensions are automatic based on the location address on file with LDR (keep it current via LaTAP or Form R-6450). Taxpayers with an out-of-state address on file are the exception: they must ask for penalty and interest relief case-by-case.',
      },
      {
        question: 'If Louisiana follows past practice, will state dates match the IRS dates?',
        answer:
          'Only partially, if Hurricane Francine (RIB 24-019) is the guide: income and franchise filing matched the federal end date but as file-only relief — payment interest kept accruing from the original due date — while sales, withholding, severance, and excise got earlier state-specific dates that did not match the IRS.',
      },
    ],
    announcementsIndex: {
      label: 'LDR policy documents (RIB index)',
      href: 'https://revenue.louisiana.gov/laws-and-policies/policy-documents/policies/',
    },
    metaTitle: 'Does Louisiana Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'The IRS moved six Louisiana parishes to Nov. 2, 2026 for Tropical Storm Arthur — LDR has issued no matching state relief as of Jul 31. What LDR bulletins do when they come, verified against official sources.',
  },
  {
    // All facts verified 2026-07-31 against the cited Michigan Treasury pages
    // (read in a live browser session; michigan.gov blocks plain fetches).
    // MCL subsection numbers are cited via Treasury's own RABs, not the
    // legislature site (unreachable during research) — do not add bare MCL
    // cites here without verifying against legislature.mi.gov.
    slug: 'michigan',
    state: 'Michigan',
    abbreviation: 'MI',
    verifiedOn: '2026-07-31',
    statusLabel: 'State relief ended May 26 — does NOT follow the federal Nov. 2 date',
    statusTone: 'warn',
    directAnswer:
      'No. Michigan’s relief for the April 2026 storms was a request-based penalty-and-interest waiver for state deadlines falling on or before May 26, 2026 — and Treasury’s notice states outright that it does not apply to later deadlines or to federal dates. Nothing matches the IRS’s Nov. 2, 2026 postponement (MI-2026-02).',
    activeNoticeCodes: ['MI-2026-02'],
    sections: [
      {
        id: 'how-mi-relief-works',
        heading: 'Does Michigan automatically follow IRS postponements?',
        body: [
          'No. Michigan has no automatic conformity to federal disaster postponements. Treasury responds to the governor’s state-of-emergency declarations — not the FEMA declaration — with event notices whose relief is a penalty-and-interest waiver, granted only on request, under the Revenue Act’s reasonable-cause waiver framework (RAB 2022-24).',
          'One standing rule does track federal dates, but it is about filed extensions, not disasters: under RAB 2020-24, a federal extension of time to file (a Form 4868, for instance) automatically extends the Michigan filing date to the new federal due date if the estimated tax is paid. A §7508A disaster postponement is not a filed extension — the two should not be conflated.',
        ],
        sources: [
          {
            label: 'Michigan Treasury RAB 2022-24 — Penalty provisions',
            href: 'https://www.michigan.gov/taxes/rep-legal/rab/2022-revenue-administrative-bulletins/revenue-administrative-bulletin-2022-24',
          },
          {
            label: 'Michigan Treasury RAB 2020-24 — Federal extensions and Michigan due dates',
            href: 'https://www.michigan.gov/taxes/rep-legal/rab/rabhtml/2020/revenue-administrative-bulletin-2020-24',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Michigan stands on the April 2026 storms (MI-2026-02)',
        body: [
          'Treasury’s April 2026 Severe Weather Notice (issued April 13, updated through April 30) granted filing and payment extensions, with penalties and interest waived, for state tax deadlines due on or before May 26, 2026 — and states explicitly that the relief "does not apply to state tax deadlines due after May 26, 2026, or to any federal or city income tax deadlines."',
          'The IRS postponement runs to Nov. 2, 2026 for 37 counties. As of July 31, 2026, no Treasury notice or press release matches that date or cites FEMA declaration 4925-DR. So between May 27 and Nov. 2, an affected client’s federal filings are postponed while their Michigan filings are on normal deadlines.',
          'The covered geographies also differ. Treasury’s list (built from successive governor declarations) includes counties the IRS list does not — Arenac, Clare, Leelanau, Shiawassee, Jackson — while the IRS list includes Washtenaw County, where the state notice covers only the City of Ann Arbor. Check the client’s county against each list separately.',
        ],
        sources: [
          {
            label: 'Michigan Treasury — April 2026 Severe Weather Notice (updated Apr 30, 2026)',
            href: 'https://www.michigan.gov/treasury/reference/taxpayer-notices/2026/04/30/april-2026-severe-weather-notice',
          },
          {
            label: 'Michigan Treasury — Emergency area relief, April 15, 2026 (covered taxes)',
            href: 'https://www.michigan.gov/taxes/state-tax-relief/emergency-area-relief-april-15-2026',
          },
          {
            label: 'IRS — MI-2026-02 (deadlines postponed to Nov. 2, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-tornadoes-and-flooding-in-the-state-of-michigan-various-deadlines-postponed-to-nov-2-2026',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'Is a separate request required? Yes — per taxpayer',
        body: [
          'Treasury’s notice is explicit: "This relief is not automatic." Each request — by phone (individual income tax 517-636-4486, business taxes 517-636-6925), e-Services, or mail to Treasury’s Disaster Tax Relief address in Lansing — must give the taxpayer’s name, account number, an address inside the emergency area (the preparer’s address inside the area also qualifies), and a description of how the storm affected them.',
          'Individuals claiming the relief on a Michigan return must also complete lines 35b through 35d of Form MI-1040. Preparers can request relief client-by-client with a Form 151 power of attorney on file — Treasury does not accept bulk relief requests, unlike the IRS’s 10-client bulk procedure.',
        ],
        sources: [
          {
            label: 'Michigan Treasury — April 2026 Severe Weather Notice (request mechanics)',
            href: 'https://www.michigan.gov/treasury/reference/taxpayer-notices/2026/04/30/april-2026-severe-weather-notice',
          },
        ],
      },
      {
        id: 'precedent',
        heading: 'Has Treasury ever followed a federal declaration?',
        body: [
          'Once, partially. After the IRS granted relief for the August 2023 storms (February 15, 2024), Treasury announced that taxpayers in the nine federally declared counties could request additional time with penalties and interest waived — the only recent case where a federal declaration, not just a governor’s declaration, triggered a state notice. Even then, Treasury named no end date matching the federal June 17, 2024 deadline; duration stayed case-by-case.',
          'Every other recent event — March 2025 ice storms through the July 2026 flooding — follows the same template: governor declaration, request-based waiver, and a short fixed window of roughly four to six weeks. A follow-up notice for this event is possible; re-check Treasury’s taxpayer-notices index before advising a date.',
        ],
        sources: [
          {
            label:
              'Michigan Treasury press release, Feb 26, 2024 — relief after federal declaration',
            href: 'https://www.michigan.gov/treasury/news/2024/02/26/treasury-department-providingtax-relief-due-to-federal-disaster-declaration',
          },
          {
            label: 'Michigan Treasury — State tax relief event hub',
            href: 'https://www.michigan.gov/taxes/state-tax-relief',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Michigan extend its deadlines to Nov. 2, 2026 like the IRS?',
        answer:
          'No. The state notice for the April 2026 storms covered only state deadlines due on or before May 26, 2026, and says it does not apply to later state deadlines or to federal dates. As of July 31, 2026, no Michigan notice matches the federal Nov. 2 postponement.',
      },
      {
        question: 'Is Michigan disaster relief automatic like the IRS relief?',
        answer:
          'No — "This relief is not automatic." It must be requested per taxpayer by phone, e-Services, or mail, with the affected address and an explanation of the impact; individuals also complete lines 35b–35d of the MI-1040. Treasury does not accept bulk requests, so a preparer files per client with a Form 151 POA.',
      },
      {
        question: 'My client is in Washtenaw County — are they covered?',
        answer:
          'Federally, yes: Washtenaw County is on the IRS MI-2026-02 list, so federal deadlines moved to Nov. 2, 2026. At the state level, Treasury’s emergency-area list covered only the City of Ann Arbor, not Washtenaw County as a whole — the two lists must be checked independently.',
      },
      {
        question: 'Does a federal disaster postponement extend my client’s Michigan filing date?',
        answer:
          'Not by itself. Michigan’s automatic federal-date conformity (RAB 2020-24) applies to filed federal extensions with estimated tax paid — not to §7508A disaster postponements, which Treasury handles separately through event notices and request-based waivers.',
      },
    ],
    announcementsIndex: {
      label: 'Michigan Treasury taxpayer notices',
      href: 'https://www.michigan.gov/treasury/reference/taxpayer-notices',
    },
    metaTitle: 'Does Michigan Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'The IRS moved 37 Michigan counties to Nov. 2, 2026 — the state waiver ended May 26 and Treasury says it does not apply to federal dates. Request mechanics, county-list mismatches, verified against Treasury notices.',
  },
  {
    // All facts verified 2026-07-31 against the cited WI DOR pages (Pub 401
    // rev. 01/26 and both 2026 Wisconsin Tax Bulletins read in full; the
    // "no event notice" negative covers the news index, TaxPro news, and WTB
    // #232/#233). docs.legis.wisconsin.gov refused fetches, so statutes are
    // cited only as DOR's own publications list them — do not add pinpoint
    // statute cites here without reading the statute on the official site.
    slug: 'wisconsin',
    state: 'Wisconsin',
    abbreviation: 'WI',
    verifiedOn: '2026-07-31',
    statusLabel: 'Conforms automatically for income & franchise — mark the return',
    statusTone: 'ok',
    directAnswer:
      'Yes — for income and franchise returns and estimated payments. Standing DOR policy automatically extends the Wisconsin date to the federal disaster date, so deadlines in the WI-2026-02 window move to Nov. 2, 2026 with no application and no interest. Mark the return’s Special Conditions section; withholding and sales/use have no such rule.',
    activeNoticeCodes: ['WI-2026-02'],
    sections: [
      {
        id: 'how-wi-relief-works',
        heading: 'Does Wisconsin automatically follow IRS postponements?',
        body: [
          'Yes — by standing published policy, not per-event announcements. DOR’s disaster page states that any federal filing extension granted by the IRS for a federally declared disaster "automatically extends the date for filing the corresponding Wisconsin income or franchise tax return," and that estimated-payment deadlines falling in the federal extension period move with it.',
          'Publication 401 (rev. 01/26) carries the same automatic-extension language for individual, fiduciary, corporation, and partnership returns, and adds the part CPAs miss: Wisconsin normally charges interest during an extension period, but not when the extension stems from a presidentially declared disaster. DOR lists its authorities as chs. 71 and 77 of the Wisconsin Statutes and IRC §§6081, 7508, and 7508A.',
        ],
        sources: [
          {
            label: 'WI DOR — Disaster Tax Assistance (standing policy)',
            href: 'https://www.revenue.wi.gov/Pages/Businesses/Disaster-Tax-Assistance.aspx',
          },
          {
            label: 'WI DOR — Publication 401, Extensions of Time to File (rev. 01/26, PDF)',
            href: 'https://www.revenue.wi.gov/DOR%20Publications/pb401.pdf',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Wisconsin stands on the April 2026 storms (WI-2026-02)',
        body: [
          'The IRS postponed federal deadlines to Nov. 2, 2026 for 21 counties and the Oneida Indian Reservation. DOR has published no event-specific item — the news index, the Tax Professionals feed, and Wisconsin Tax Bulletins #232 and #233 carry nothing on this storm as of July 31, 2026 — and none is needed: the standing policy does the work, so covered clients’ Wisconsin income and franchise deadlines in the window move to Nov. 2 automatically.',
          'That silence is Wisconsin’s normal pattern, not neglect (see the precedent below). The date to rely on is the federal one, applied to Wisconsin by the standing rule.',
        ],
        sources: [
          {
            label: 'IRS — WI-2026-02 (deadlines postponed to Nov. 2, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-tornadoes-and-flooding-in-the-state-of-wisconsin-various-deadlines-postponed-to-nov-2-2026',
          },
          {
            label: 'WI DOR — news index (no event item as of 2026-07-31)',
            href: 'https://www.revenue.wi.gov/Pages/News/home.aspx',
          },
        ],
      },
      {
        id: 'which-taxes',
        heading: 'Which Wisconsin taxes follow the federal date — and which don’t',
        body: [
          'Covered by the automatic language: income and franchise returns across the form families Publication 401 addresses — individual, fiduciary and estate, corporation, partnership — plus estimated tax payments falling inside the federal extension period.',
          'Not covered by any statement found: withholding filings and deposits, and sales/use returns. Publication 401’s withholding section is silent on disasters, and no DOR source says those deadlines follow the IRS date — treat them as unmoved unless DOR publishes otherwise.',
        ],
        sources: [
          {
            label: 'WI DOR — Publication 401 (PDF)',
            href: 'https://www.revenue.wi.gov/DOR%20Publications/pb401.pdf',
          },
          {
            label: 'WI DOR — Disaster Tax Assistance',
            href: 'https://www.revenue.wi.gov/Pages/Businesses/Disaster-Tax-Assistance.aspx',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'Is a separate request required? No — but mark the return',
        body: [
          'No application, no penalty-waiver letter. Publication 401’s instruction for a federally-declared-disaster extension: write the assigned disaster designation at the top of the federal return, and complete the Special Conditions section on page 1 of the Wisconsin return (with the disaster name). DOR’s extensions FAQ confirms no interest is charged during an extension that stems from a federally declared disaster.',
        ],
        sources: [
          {
            label: 'WI DOR — Publication 401 (marking instructions, PDF)',
            href: 'https://www.revenue.wi.gov/DOR%20Publications/pb401.pdf',
          },
          {
            label: 'WI DOR — Tax filing extensions FAQ',
            href: 'https://www.revenue.wi.gov/Pages/FAQS/pcs-extensn.aspx',
          },
        ],
      },
      {
        id: 'precedent',
        heading: 'How Wisconsin handled it last time (August 2025 storms)',
        body: [
          'For WI-2025-04 (Milwaukee, Washington, and Waukesha counties; federal deadlines postponed to Feb. 2, 2026), DOR likewise published no event announcement — the full 2025 news archive and the October 2025 / January 2026 Tax Bulletins contain nothing on the storm. Instead, DOR refreshed its standing documents mid-window (Publication 401 revised 01/26; the disaster page dated Jan 16, 2026), restating automatic conformity and the interest waiver.',
          'So Wisconsin’s pattern is the opposite of Michigan’s or Hawaii’s: no per-event paper, but the state date genuinely tracks the federal one by operation of standing policy.',
        ],
        sources: [
          {
            label: 'IRS — WI-2025-04 (deadlines postponed to Feb. 2, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-flooding-and-mudslides-in-wisconsin-various-deadlines-postponed-to-feb-2-2026',
          },
          {
            label: 'Wisconsin Tax Bulletin index',
            href: 'https://www.revenue.wi.gov/Pages/ISE/wtb-Home.aspx',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Wisconsin extend its deadlines to Nov. 2, 2026 like the IRS?',
        answer:
          'Yes, for income and franchise returns and estimated payments — automatically, under DOR’s standing policy that a federal disaster extension "automatically extends the date for filing the corresponding Wisconsin income or franchise tax return." No DOR event announcement exists or is needed.',
      },
      {
        question: 'Will my client owe interest on Wisconsin tax paid by the extended date?',
        answer:
          'No. Wisconsin normally charges interest during an extension period, but Publication 401 makes an exception when the taxpayer qualifies for a federal extension due to a presidentially declared disaster.',
      },
      {
        question: 'Does my client need to file anything with Wisconsin to claim the extension?',
        answer:
          'No request or form — but mark the filings: per Publication 401, write the assigned disaster designation at the top of the federal return and complete the Special Conditions section on page 1 of the Wisconsin return.',
      },
      {
        question: 'Do Wisconsin withholding or sales tax deadlines also move to Nov. 2?',
        answer:
          'No official statement says so. The automatic-conformity language covers income and franchise returns and estimated payments; Publication 401 is silent on disasters for withholding, and nothing covers sales/use. Treat those deadlines as unchanged unless DOR publishes otherwise.',
      },
    ],
    announcementsIndex: {
      label: 'WI DOR news index',
      href: 'https://www.revenue.wi.gov/Pages/News/home.aspx',
    },
    metaTitle: 'Does Wisconsin Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'Yes — Wisconsin automatically extends income and franchise deadlines to the IRS disaster date (Nov. 2, 2026) with interest waived, no application needed. What to mark on the return, and which taxes are not covered. Verified against WI DOR.',
  },
]

export function getConformityEntry(slug: string): StateConformityEntry | undefined {
  return STATE_CONFORMITY.find((e) => e.slug === slug)
}

/** Conformity entry for a state name (for linking from notice pages). */
export function getConformityForState(state: string): StateConformityEntry | undefined {
  const key = state.trim().toLowerCase()
  return STATE_CONFORMITY.find((e) => e.state.toLowerCase() === key)
}

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
    verifiedOn: '2026-08-03',
    statusLabel: 'No state relief issued for Tropical Storm Arthur',
    statusTone: 'warn',
    directAnswer:
      'Not automatically — and for Tropical Storm Arthur, not at all. As of August 3, 2026, the Louisiana Department of Revenue has issued no extension matching the IRS’s Nov. 2, 2026 postponement (LA-2026-02); its bulletin series has run past the event and skipped it. When LDR does grant disaster relief, it comes as an event-specific bulletin with its own dates, applied automatically by the address on file.',
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
          'As of August 3, 2026, LDR has published no matching state relief: the 2026 news archive shows no Arthur release, no Arthur bulletin appears in the 2026 Revenue Information Bulletin series, and no per-event resource page exists for Arthur (the Hurricane Francine equivalent does). Louisiana state returns and payments therefore remain on their normal schedule.',
          'This is a deliberate silence, not a publication lag. The 2026 bulletin sequence runs unbroken through RIB 26-015, and the two most recent — 26-015 on August 1 and 26-014 on August 3 — cover a sales-tax holiday and oil-and-gas prices. Both were issued weeks after the IRS notice, and neither mentions Arthur; the only 2026 disaster bulletin remains 26-008 for the January winter storm.',
          'A bulletin could still come — LDR issued its Hurricane Francine relief two days after the IRS notice, though its Winter Storm Fern bulletin took about four weeks, and Arthur is now past seven. Until one appears, do not assume any Louisiana date moved.',
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
  {
    // All facts verified 2026-07-31 against the cited Governor's office / GA DOR
    // / IRS releases (full body text read). O.C.G.A. §48-2-36 text was only
    // partially verifiable (official code behind LexisNexis; releases cite no
    // statute) — so no statute pinpoint is asserted here.
    slug: 'georgia',
    state: 'Georgia',
    abbreviation: 'GA',
    verifiedOn: '2026-07-31',
    statusLabel: 'Own 120-day scheme — state dates ≠ the federal Aug. 20 date',
    statusTone: 'warn',
    directAnswer:
      'No — Georgia granted relief for the same wildfires but on its own schedule. State income-tax dates run "up to 120 days" from each original due date (Q2 estimates to Oct. 13, 2026 — not the federal Aug. 20), April sales tax only to June 22, and payments that were due April 15 are expressly not relieved.',
    activeNoticeCodes: ['GA-2026-03'],
    sections: [
      {
        id: 'how-ga-relief-works',
        heading: 'Does Georgia automatically follow IRS postponements?',
        body: [
          'No. Georgia announces disaster relief event-by-event through Governor/Department of Revenue press releases, each with its own state-specific dates. There is no standing conformity policy, and the releases describe the IRS action as parallel — "the IRS extended similar tax relief" — not as something Georgia adopts.',
          'The relief is granted to the named counties without an application: paper filers write the designated annotation across the top of the return (for the wildfires: "Georgia Wildfires – Clinch, Echols, Brantley"), and anyone assessed a penalty despite qualifying calls DOR at 1-877-423-6711. Like the federal relief, it also reaches taxpayers whose records sit in the disaster area and qualifying relief workers.',
        ],
        sources: [
          {
            label: 'Governor Kemp — wildfire tax relief release (May 8, 2026)',
            href: 'https://gov.georgia.gov/press-releases/2026-05-08/governor-kemp-announces-relief-taxpayers-impacted-wildfires',
          },
          {
            label: 'GA DOR — Hurricane Helene relief (Oct 3, 2024, the "similar relief" phrasing)',
            href: 'https://dor.georgia.gov/press-releases/2024-10-03/dor-extends-tax-relief-victims-hurricane-helene',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Georgia stands on the Southeast Georgia wildfires (GA-2026-03)',
        body: [
          'The IRS postponed federal deadlines to Aug. 20, 2026 for Clinch, Echols, and Brantley counties, based on the state disaster declaration. Georgia issued its own relief for the same three counties — the April 22 state of emergency covered 91 counties, but the tax relief expressly applies only to these three.',
          'The state schedule does not use Aug. 20 anywhere. Income-tax deadlines move "up to 120 days" from each original date: Q2 estimated payments due June 15, 2026 move to Oct. 13, 2026; extended 2025 individual and business returns due Oct. 15, 2026 move to Feb. 12, 2027; corporate and tax-exempt returns due Nov. 16, 2026 move to Mar. 16, 2027; quarterly payroll returns due June 30, 2026 move to Oct. 28, 2026. April sales and use tax returns (and monthly excise returns) due May 20 moved only to June 22, 2026.',
          'Two carve-outs matter: payments tied to 2025 returns that were due April 15, 2026 are expressly not eligible ("those overdue payments are not eligible for this relief"), and W-2/1099-series filings, employment and excise tax deposits, and installment-agreement payments are excluded. So a client can be inside the federal Aug. 20 window and simultaneously late at the state level on an April payment — or safe at the state level until 2027 on a return the federal relief stops covering Aug. 20.',
        ],
        sources: [
          {
            label: 'Governor Kemp — wildfire tax relief release (May 8, 2026)',
            href: 'https://gov.georgia.gov/press-releases/2026-05-08/governor-kemp-announces-relief-taxpayers-impacted-wildfires',
          },
          {
            label: 'GA DOR mirror of the release (May 11, 2026)',
            href: 'https://dor.georgia.gov/press-releases/2026-05-11/governor-kemp-announces-relief-taxpayers-impacted-wildfires',
          },
          {
            label: 'IRS — GA-2026-03 (deadlines postponed to Aug. 20, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-wildfires-in-southeast-georgia-various-deadlines-postponed-to-aug-20',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'Is a separate request required?',
        body: [
          'No request procedure is described — relief applies to taxpayers in the named counties, with one mechanical step for paper filers: write "Georgia Wildfires – Clinch, Echols, Brantley" across the top of any form submitted. The safety valve is reactive: a qualifying taxpayer who still gets a penalty assessment contacts DOR headquarters (1-877-423-6711) for due consideration. Unlike the IRS releases, Georgia’s never use the word "automatic" — but no application exists to file.',
        ],
        sources: [
          {
            label: 'Governor Kemp — wildfire tax relief release (mechanics)',
            href: 'https://gov.georgia.gov/press-releases/2026-05-08/governor-kemp-announces-relief-taxpayers-impacted-wildfires',
          },
        ],
      },
      {
        id: 'precedent',
        heading: 'How Georgia handled it last time (Hurricane Helene, 2024)',
        body: [
          'With a FEMA declaration behind the event, Georgia matched the IRS income-tax date: DOR’s Oct. 3, 2024 release adopted May 1, 2025 for individual and business returns, estimates, and quarterly payroll returns — the same date as the IRS relief. Sales and use tax again got its own shorter state date (Nov. 20, 2024).',
          'Set beside the 2026 wildfires, the pattern is: federal-declaration events → Georgia income-tax dates mirror the IRS; state-declaration-only events → Georgia builds its own schedule. Either way, sales tax runs on state-specific dates, and each event needs its own reading.',
        ],
        sources: [
          {
            label: 'GA DOR — Hurricane Helene relief (Oct 3, 2024)',
            href: 'https://dor.georgia.gov/press-releases/2024-10-03/dor-extends-tax-relief-victims-hurricane-helene',
          },
          {
            label: 'IRS — Around the nation: Georgia (Helene, May 1, 2025 date)',
            href: 'https://www.irs.gov/newsroom/around-the-nation-georgia',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Georgia extend its deadlines to Aug. 20, 2026 like the IRS?',
        answer:
          'No. Georgia granted its own relief for Clinch, Echols, and Brantley counties on a different schedule: income-tax deadlines move up to 120 days from each original date (June 15 estimates → Oct. 13, 2026; extended returns due Oct. 15 → Feb. 12, 2027), and April sales tax moved only to June 22. The Aug. 20 date is federal only.',
      },
      {
        question: 'Are tax payments covered by the Georgia wildfire relief?',
        answer:
          'Mostly not the ones that were already due: the release states that payments related to 2025 returns, due April 15, 2026, "are not eligible for this relief." Employment and excise tax deposits and W-2/1099-series filings are also excluded. The state relief is chiefly about return filing dates and post-April obligations.',
      },
      {
        question: 'Does my client need to apply for the Georgia relief?',
        answer:
          'No application exists. Paper filers write "Georgia Wildfires – Clinch, Echols, Brantley" across the top of the return; any qualifying taxpayer who is nonetheless assessed a penalty contacts DOR at 1-877-423-6711.',
      },
      {
        question: 'My client is in one of the other 88 emergency-declaration counties — covered?',
        answer:
          'No. The April 22, 2026 state of emergency covered 91 counties, but the tax relief expressly applies only to taxpayers in Clinch, Echols, and Brantley counties (plus those whose records are kept there and qualifying relief workers).',
      },
    ],
    announcementsIndex: {
      label: 'GA DOR press releases',
      href: 'https://dor.georgia.gov/press-releases',
    },
    metaTitle: 'Does Georgia Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'The IRS moved three Georgia counties to Aug. 20, 2026 — Georgia built its own 120-day scheme instead: estimates to Oct. 13, extended returns to Feb. 2027, April payments not relieved. Verified against official releases.',
  },
  {
    // All facts verified 2026-07-31 against the cited Montana DOR pages (fetched
    // directly) and MCA 15-30-2604 on the official legislature site. The "no
    // event-specific announcement" negative is medium-confidence: DOR's news
    // feeds are JS-rendered, so it rests on multiple search paths, not a raw
    // index read. DOR's relief page carries no date — re-fetch before editing.
    slug: 'montana',
    state: 'Montana',
    abbreviation: 'MT',
    verifiedOn: '2026-07-31',
    statusLabel: 'Same dates as the IRS by policy — but claim it when you file',
    statusTone: 'ok',
    directAnswer:
      'Yes, by standing policy: "In federally declared disaster areas, Montana provides the same filing, reporting, and payment extensions as the IRS" — so deadlines under MT-2026-03/04 track Sept. 28, 2026. But unlike the automatic federal relief, Montana’s must be claimed at filing (red-letter annotation on paper, a letter if e-filing). No per-event state announcement exists or should be expected.',
    activeNoticeCodes: ['MT-2026-03', 'MT-2026-04'],
    sections: [
      {
        id: 'how-mt-relief-works',
        heading: 'Does Montana automatically follow IRS postponements?',
        body: [
          'On the dates, yes: the Department of Revenue’s standing "Natural Disaster Income Tax Extension" page says Montana "provides the same filing, reporting, and payment extensions as the IRS" in federally declared disaster areas — payment included, per DOR’s own wording. Eligibility mirrors the federal shape: you lived or operated a business in the disaster area, or your records were with a third party who did.',
          'The statutory backing is MCA 15-30-2604(1)(b)(ii): the department may extend filing dates and defer or waive interest and penalties for up to one year for taxpayers affected by a federally declared disaster under IRC §7508A. The statute is discretionary ("may"); the DOR page is what turns it into a blanket same-as-IRS policy.',
        ],
        sources: [
          {
            label: 'MT DOR — Natural Disaster Income Tax Extension (standing policy)',
            href: 'https://revenue.mt.gov/taxes/tax-relief/natural-disaster-income-tax-extension',
          },
          {
            label: 'MCA 15-30-2604 — Time for filing; extensions (official legislature site)',
            href: 'https://mca.legmt.gov/bills/mca/title_0150/chapter_0300/part_0260/section_0040/0150-0300-0260-0040.html',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Montana stands on the two winter-storm notices (MT-2026-03 / MT-2026-04)',
        body: [
          'The IRS postponed federal deadlines to Sept. 28, 2026 for the Fort Peck Assiniboine and Sioux Tribes (FEMA 4914-DR) and the Crow Reservation (FEMA 4915-DR), for the December 2025 winter storm. Montana has published no event-specific announcement — and that is its normal pattern: recent Montana disasters (the Blackfeet/Lincoln/Sanders storms, the earlier Crow Tribe event) likewise produced no DOR release. The state side runs entirely on the standing same-as-IRS policy plus the at-filing claim procedure.',
          'Applied here, the standing policy makes the Montana date Sept. 28, 2026 for affected taxpayers — but no DOR document names that date for these events specifically, so the claim procedure below is what secures it.',
        ],
        sources: [
          {
            label: 'IRS — MT-2026-03 (Fort Peck; postponed to Sept. 28, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-winter-storm-and-straight-line-winds-in-the-fort-peck-assiniboine-and-sioux-tribes-various-deadlines-postponed-to-sept-28-2026',
          },
          {
            label: 'IRS — MT-2026-04 (Crow Reservation; postponed to Sept. 28, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-in-the-crow-tribe-of-montana-impacted-by-severe-winter-storm-and-straight-line-winds-various-deadlines-postponed-to-sept-28-2026',
          },
          {
            label: 'MT DOR — Natural Disaster Income Tax Extension',
            href: 'https://revenue.mt.gov/taxes/tax-relief/natural-disaster-income-tax-extension',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'Is a separate request required? Yes — claimed with the return',
        body: [
          'The federal relief is automatic by address of record. Montana’s is claimed at filing: on a paper return, "write the date and type of disaster in bold, red letters at the top of your submitted tax documents"; when e-filing, send the department a letter stating the basis for eligibility — the qualification, the disaster date and type, the impacted period, the account number, and the tax type. A taxpayer already billed returns the notice with the same red-letter annotation on top.',
        ],
        sources: [
          {
            label: 'MT DOR — Natural Disaster Income Tax Extension (claim mechanics)',
            href: 'https://revenue.mt.gov/taxes/tax-relief/natural-disaster-income-tax-extension',
          },
        ],
      },
      {
        id: 'tribal-members',
        heading: 'The tribal-member nuance: who even has a Montana return to extend',
        body: [
          'Both covered areas are tribal nations, and Montana income tax may not reach the affected taxpayer at all: an enrolled member who lives on the reservation governed by their own tribe subtracts reservation-sourced income — wages earned within the reservation’s exterior boundaries, business income from activities there, and related categories — reporting the exempt income on Form ETM (which serves as the return when all income is exempt).',
          'So the Montana extension question chiefly matters for non-member residents and businesses in the covered areas, enrolled members with off-reservation income, and taxpayers whose preparers or records sat in the disaster area.',
        ],
        sources: [
          {
            label: 'MT DOR — Montana Income Taxes for Enrolled Tribal Members',
            href: 'https://revenue.mt.gov/taxes/individual-income-tax/enrolled-tribal-members',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Montana extend its deadlines to Sept. 28, 2026 like the IRS?',
        answer:
          'Yes, by standing policy — DOR’s natural-disaster page provides "the same filing, reporting, and payment extensions as the IRS" for federally declared disaster areas. No event-specific state announcement exists for these notices, and Montana’s pattern is not to issue one.',
      },
      {
        question: 'Is the Montana relief automatic like the federal relief?',
        answer:
          'No. It is claimed at filing: bold red-letter disaster annotation on top of a paper return, or a letter to the department stating eligibility when e-filing. A client who was already billed returns the notice with the same annotation.',
      },
      {
        question: 'My client is an enrolled tribal member on their own reservation — what applies?',
        answer:
          'Possibly no Montana income tax at all: enrolled members living on their own tribe’s reservation subtract reservation-sourced income (wages and business income earned within the reservation boundaries, among other categories), reported on Form ETM. The extension question then only touches any non-exempt income or other filings.',
      },
    ],
    announcementsIndex: {
      label: 'MT DOR — Natural Disaster Income Tax Extension',
      href: 'https://revenue.mt.gov/taxes/tax-relief/natural-disaster-income-tax-extension',
    },
    metaTitle: 'Does Montana Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'Yes by standing policy — Montana gives the same extensions as the IRS (Sept. 28, 2026 for the Fort Peck and Crow notices), but relief must be claimed at filing with a red-letter annotation or letter. Verified against MT DOR and MCA 15-30-2604.',
  },
  {
    // All facts verified 2026-07-31 against dor.ms.gov (news index pages
    // crawled, notices database queried, both notice PDFs read) and irs.gov.
    // dor.ms.gov serves a broken TLS chain and deletes old notice pages —
    // re-verify links before editing. No Miss. Code section is cited by DOR's
    // own FAQ, so no statute pinpoint is asserted here.
    slug: 'mississippi',
    state: 'Mississippi',
    abbreviation: 'MS',
    verifiedOn: '2026-08-03',
    statusLabel: 'No state notice yet for the May storms — relief waits on DOR',
    statusTone: 'warn',
    directAnswer:
      'Not yet. Mississippi grants disaster relief by event-specific DOR notice, and as of August 3, 2026 none exists for the May 2026 storms (MS-2026-02) — the federal Nov. 2, 2026 date is federal only. When DOR has issued notices, the state deadline has matched the IRS date; but for the March 2025 storms it never issued one at all.',
    activeNoticeCodes: ['MS-2026-02'],
    sections: [
      {
        id: 'how-ms-relief-works',
        heading: 'Does Mississippi automatically follow IRS postponements?',
        body: [
          'No — relief arrives, when it arrives, as an event-specific notice. DOR’s own FAQ describes the mechanism: the Commissioner may extend filing for good cause such as a natural disaster, and "the Department will issue a notice on the extended filing and/or payment due dates." The notices themselves open with "Mississippi will follow federal extensions granted to victims of…" — so the state has a published habit of matching the federal date once it acts, but nothing happens until a notice issues.',
          'Every recent notice also carries the same scope caveat: the extension covers the income-tax family (individual, corporate income and franchise, pass-through entity, quarterly estimates) and "does not automatically apply to any other tax types or payments due on prior liabilities" — those are case-by-case by phone.',
        ],
        sources: [
          {
            label: 'MS DOR — General FAQs (extension-by-notice mechanism)',
            href: 'https://www.dor.ms.gov/forms-resources/general-frequently-asked-questions',
          },
          {
            label: 'MS DOR — Winter Storm Fern relief notice (80-26-001)',
            href: 'https://www.dor.ms.gov/news/relief-victims-winter-storm-fern-mississippi',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Mississippi stands on the May 2026 storms (MS-2026-02)',
        body: [
          'The IRS postponed federal deadlines to Nov. 2, 2026 for Franklin, Lamar, Lawrence, Lincoln, and Wilkinson counties (FEMA 4922-DR). As of August 3, 2026, DOR has published nothing for this event: the most recent disaster item in both the news index and the notices database is still Winter Storm Fern from April 2026, and the notices published since — through July 8, 2026 — are unrelated. Mississippi state deadlines therefore remain unmoved.',
          'History cuts both ways on whether a notice will come. DOR’s Fern notice arrived roughly two and a half months after that January storm — but for the March 2025 storms (federal deadline Nov. 3, 2025), no DOR notice appears on the site at all. Do not assume state relief until a notice exists.',
        ],
        sources: [
          {
            label: 'IRS — MS-2026-02 (deadlines postponed to Nov. 2, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-straight-line-winds-tornadoes-and-flooding-in-the-state-of-mississippi-various-deadlines-postponed-to-nov-2-2026',
          },
          {
            label: 'MS DOR — news index (no May-storms item as of 2026-08-03)',
            href: 'https://www.dor.ms.gov/news',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'When a notice does issue, what does it take?',
        body: [
          'The headline income-tax extension applies to taxpayers in the notice’s scope with no application described. The edges are phone-based: a covered taxpayer who still receives a penalty notice calls DOR at (601) 923-7700 for abatement; taxpayers outside the area whose books, records, or tax professionals sit inside it are handled case-by-case; and other tax types or prior liabilities likewise require a call. Mississippi notices contain no write-the-disaster-on-the-return procedure.',
          'Scope can also differ from the federal list in either direction: the Fern notice covered the whole state while federal relief has been county-scoped in other events, and the 2023 notice stayed at four counties after the IRS expanded its list to seven.',
        ],
        sources: [
          {
            label: 'MS DOR — Winter Storm Fern notice (mechanics and caveats)',
            href: 'https://www.dor.ms.gov/news/relief-victims-winter-storm-fern-mississippi',
          },
        ],
      },
      {
        id: 'precedent',
        heading: 'The track record: matched dates when issued, silence when not',
        body: [
          'Winter Storm Fern (2026): DOR notice 80-26-001 gave the whole state until June 8, 2026 for the income-tax family — exactly the IRS date. March 2023 tornadoes: notice 80-23-001 matched the federal July 31, 2023 date for four counties. March 2025 storms: the IRS moved 19 counties to Nov. 3, 2025, and no DOR notice is findable on the site.',
          'So the honest summary for planning: when Mississippi speaks, it has matched the IRS date for income taxes; whether it speaks at all is not guaranteed, and the wait has run months. One housekeeping note: DOR removes old notice pages from its site, so preserve a copy of any notice you rely on.',
        ],
        sources: [
          {
            label: 'MS DOR — Winter Storm Fern notice (June 8, 2026 date)',
            href: 'https://www.dor.ms.gov/news/relief-victims-winter-storm-fern-mississippi',
          },
          {
            label: 'IRS — Mississippi winter storm relief (matching June 8, 2026 date)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-mississippi-taxpayers-impacted-by-severe-winter-storm-various-deadlines-postponed-to-june-8-2026',
          },
          {
            label: 'MS DOR — Notices & Technical Bulletins database',
            href: 'https://www.dor.ms.gov/forms-resources/notices-technical-bulletins',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Mississippi extend its deadlines to Nov. 2, 2026 like the IRS?',
        answer:
          'Not as of July 31, 2026. Mississippi grants disaster relief only by event-specific DOR notice, and none has been issued for the May 2026 storms. Until one appears, state deadlines are unmoved — check DOR’s news index and notices database before relying on any state date.',
      },
      {
        question: 'If Mississippi issues a notice, will it match the federal Nov. 2 date?',
        answer:
          'Its track record says the income-tax date would match: the Winter Storm Fern notice matched the IRS June 8, 2026 date and the 2023 tornado notice matched July 31, 2023. But the March 2025 storms got no state notice at all, so a match is only likely — not guaranteed — and other tax types stay case-by-case regardless.',
      },
      {
        question: 'What is covered when Mississippi does grant disaster relief?',
        answer:
          'The income-tax family: individual income tax, corporate income and franchise tax, pass-through entity returns, and quarterly estimated payments. Every notice states the extension "does not automatically apply to any other tax types or payments due on prior liabilities" — sales, withholding, and prior balances need a case-by-case call to (601) 923-7700.',
      },
    ],
    announcementsIndex: {
      label: 'MS DOR news index',
      href: 'https://www.dor.ms.gov/news',
    },
    metaTitle: 'Does Mississippi Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'The IRS moved five Mississippi counties to Nov. 2, 2026 — DOR has issued no state notice as of Jul 31. Past notices matched federal dates, but the 2025 storms got none. Verified against dor.ms.gov.',
  },
  {
    // All facts verified 2026-07-31: azdor.gov indexes read live in a browser
    // (site blocks plain fetches), ITR 96-4 and Pub 700 PDFs read in full,
    // statutes on azleg.gov. A.R.S. §42-2079's wording came via a summarizing
    // fetch — re-verify subsection lettering before quoting the statute more
    // precisely than this entry does.
    slug: 'arizona',
    state: 'Arizona',
    abbreviation: 'AZ',
    verifiedOn: '2026-07-31',
    statusLabel: 'No state relief announced — abatement request is the only path',
    statusTone: 'warn',
    directAnswer:
      'No. ADOR has announced nothing for the San Carlos Apache flooding (AZ-2026-01) — and published nothing for any recent Arizona disaster, including the 2024 Watch Fire on the same tribal lands. Absent director action under A.R.S. §42-2079, state deadlines stand; the practical route is a Form 290 penalty-abatement request, and interest is not abatable that way.',
    activeNoticeCodes: ['AZ-2026-01'],
    sections: [
      {
        id: 'how-az-relief-works',
        heading: 'Does Arizona automatically follow IRS postponements?',
        body: [
          'Not for disasters. Arizona’s automatic federal conformity — A.R.S. §42-1107(B) — is about ordinary filed extensions: a taxpayer granted a federal income-tax extension is deemed to have the same Arizona filing extension, if at least 90% of the Arizona liability is paid, and it extends filing only. Whether ADOR treats a §7508A disaster postponement (which is not a filed extension) as qualifying is stated nowhere official — worth confirming with ADOR directly before relying on it.',
          'The disaster-specific authority is A.R.S. §42-2079: the director may specify a period of up to one year extending due dates and suspending penalties and interest for taxpayers affected by a §7508A-recognized disaster. That statute works through an event-specific act of the director — it does not mirror IRS notices automatically, and no public exercise of it was found for this event.',
        ],
        sources: [
          {
            label: 'A.R.S. §42-1107 — extensions (azleg.gov)',
            href: 'https://www.azleg.gov/ars/42/01107.htm',
          },
          {
            label: 'A.R.S. §42-2079 — suspension of liabilities by reason of disasters (azleg.gov)',
            href: 'https://www.azleg.gov/ars/42/02079.htm',
          },
          {
            label: 'ADOR — late payments and filing extensions (90% rule, box 82F)',
            href: 'https://azdor.gov/making-payments-late-payments-and-filing-extensions',
          },
        ],
      },
      {
        id: 'current-position',
        heading: 'Where Arizona stands on the San Carlos Apache flooding (AZ-2026-01)',
        body: [
          'The IRS postponed federal deadlines to Sept. 28, 2026 for the San Carlos Apache Tribe (FEMA 4911-DR, October 2025 storms). ADOR has published nothing: the press-release index (read in full through July 20, 2026) contains no disaster item, the site search returns no result for "San Carlos Apache," and azdor.gov has no disaster-relief page at all.',
          'Nor is this event an outlier — the same silence covers the 2024 Watch Fire relief on the same tribal lands and the 2023 Navajo Nation flooding. The observable Arizona pattern is: the IRS issues tribal-lands relief; the state says nothing. Whether ADOR grants matching relief internally, case by case, is unverifiable from public sources — treat Arizona deadlines as unmoved.',
        ],
        sources: [
          {
            label: 'IRS — AZ-2026-01 (deadlines postponed to Sept. 28, 2026)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-severe-storms-and-flooding-in-the-san-carlos-apache-tribe-various-deadlines-postponed-to-sept-28-2026',
          },
          {
            label: 'ADOR — latest press releases (no disaster item as of 2026-07-31)',
            href: 'https://azdor.gov/news-center/latest-press-releases',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'The practical route: Form 290 penalty abatement',
        body: [
          'With no announced relief, an affected client who files or pays late is in ordinary penalty territory, and the remedy is a reasonable-cause abatement request: Arizona Form 290 to ADOR’s Penalty Review Unit, with documentation, the account otherwise in compliance. Publication 700’s reasonable-cause list includes records destroyed by fire or casualty but has no federally-declared-disaster category and no §7508A reference.',
          'The hard limit to plan around: "There is no statutory provision for abatement of interest based on reasonable cause." Interest relief exists only through §42-2079 director action — which is exactly what has not been announced. A late payment can end up penalty-forgiven but still interest-bearing.',
        ],
        sources: [
          {
            label: 'ADOR — penalty abatement (Form 290 process)',
            href: 'https://azdor.gov/collections-individuals/penalty-abatement',
          },
          {
            label: 'ADOR — Publication 700, penalty abatement (PDF)',
            href: 'https://azdor.gov/sites/default/files/2023-06/PUBLICATION_700.pdf',
          },
        ],
      },
      {
        id: 'tribal-members',
        heading: 'The tribal-member nuance: who even has an Arizona return to extend',
        body: [
          'Under ADOR ruling ITR 96-4, an affiliated tribal member who lives on their own tribe’s reservation and derives income solely from reservation sources is not subject to Arizona income tax on that income; income from off-reservation sources is taxable, and a non-affiliated spouse’s income is taxable with community-property allocation rules.',
          'So for many enrolled San Carlos Apache members living and earning entirely on-reservation, there is no Arizona income-tax deadline in play. The state-conformity gap bites mainly on members and businesses with off-reservation income, non-member residents of the area, and employers carrying Arizona withholding or TPT obligations.',
        ],
        sources: [
          {
            label: 'ADOR — ITR 96-4, income taxation of Indians and spouses (PDF)',
            href: 'https://azdor.gov/sites/default/files/2023-03/RULINGS_INDV_1996_itr96-4.pdf',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Did Arizona extend its deadlines to Sept. 28, 2026 like the IRS?',
        answer:
          'No. ADOR has announced no relief for this event — or for any recent Arizona disaster — and its disaster statute (A.R.S. §42-2079) operates only through an announced act of the director. Treat Arizona deadlines as unmoved unless and until ADOR says otherwise.',
      },
      {
        question:
          'My client has a federal disaster postponement — does Arizona’s automatic extension conformity cover them?',
        answer:
          'Unclear, and worth confirming with ADOR before relying on it. A.R.S. §42-1107(B) deems a federal extension to extend the Arizona filing date only when 90% of the Arizona tax is paid — and it speaks to filed extensions, not §7508A postponements. No official source says a disaster postponement qualifies.',
      },
      {
        question: 'What can an affected Arizona client actually get?',
        answer:
          'A reasonable-cause penalty abatement via Form 290 to the Penalty Review Unit, with documentation. Interest cannot be abated for reasonable cause — only a §42-2079 director action suspends interest, and none has been announced for this event.',
      },
      {
        question: 'Does an enrolled San Carlos Apache member owe Arizona income tax at all?',
        answer:
          'Under ITR 96-4, not on reservation-sourced income if they live on their own tribe’s reservation and are an affiliated member — many affected taxpayers therefore have no Arizona income-tax deadline in play. Off-reservation income, non-member spouses’ income, and employer withholding/TPT obligations remain taxable and on normal schedules.',
      },
    ],
    announcementsIndex: {
      label: 'ADOR latest press releases',
      href: 'https://azdor.gov/news-center/latest-press-releases',
    },
    metaTitle: 'Does Arizona Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'The IRS moved San Carlos Apache Tribe deadlines to Sept. 28, 2026 — Arizona has announced nothing, for this or any recent disaster. Form 290 abatement is the only path, and interest is not abatable. Verified against ADOR and azleg.gov.',
  },
  {
    // All facts verified 2026-07-31 against TN DOR notice PDFs (26-10, 24-01,
    // 24-09, 25-02 read in full) and tn.gov/revenue pages. §67-1-114 is
    // characterized only as DOR's own notices paraphrase it. Tennessee has no
    // active federal notice as of the verified date — this is a standing-pattern
    // page (most disaster-postponed state in the 2020-2026 archive: 12 notices).
    slug: 'tennessee',
    state: 'Tennessee',
    abbreviation: 'TN',
    verifiedOn: '2026-07-31',
    statusLabel: 'F&E matches the IRS date automatically — other taxes by request',
    statusTone: 'ok',
    directAnswer:
      'For franchise & excise tax, yes: Tennessee law lets the Commissioner extend state due dates whenever the IRS extends federal ones, and every recent event notice has matched the IRS date exactly, applied automatically by address. Sales, business, and other taxes are never automatic — they take a case-by-case email request. No relief is active right now (the last window closed June 8, 2026).',
    activeNoticeCodes: [],
    sections: [
      {
        id: 'how-tn-relief-works',
        heading: 'Does Tennessee automatically follow IRS postponements?',
        body: [
          'Structurally, yes — for one tax. Every disaster notice recites the same authority: Tennessee law authorizes the Commissioner of Revenue to extend a state filing due date whenever the IRS extends a federal one for disaster-affected taxpayers (Tenn. Code Ann. §67-1-114, as the notices cite it), with a ceiling — the state extension cannot exceed the federal extension.',
          'Tennessee is the most disaster-postponed state in the 2020–2026 federal record (12 IRS relief notices), and the Department of Revenue has issued a matching franchise & excise notice for essentially every one: the April 2020 tornadoes through Winter Storm Fern (Notice #26-10). The dates have matched the IRS exactly in every checked event — Fern to June 8, 2026; the December 2023 tornadoes to June 17, 2024; Hurricane Helene to May 1, 2025.',
        ],
        sources: [
          {
            label: 'TN DOR Notice #26-10 — Winter Storm Fern (PDF)',
            href: 'https://www.tn.gov/content/dam/tn/revenue/documents/notices/general/26-10.pdf',
          },
          {
            label: 'TN DOR — Franchise & excise important-notices index',
            href: 'https://www.tn.gov/revenue/tax-resources/legal-resources/important-notices/franchise---excise-tax.html',
          },
        ],
      },
      {
        id: 'which-taxes',
        heading: 'What is covered automatically — and what never is',
        body: [
          'Automatic relief covers franchise & excise tax only, including quarterly estimated payments (and, after Helene, the Schedule G property-measure refund deadline). The Department applies it to accounts whose primary location address on record sits in the designated disaster area; a covered taxpayer who still receives a penalty notice contacts the Department.',
          'Everything else is expressly not automatic. Each notice repeats: the Department cannot automatically extend due dates for other taxes, but will approve extension requests case-by-case — by email to Revenue.DisasterExtension@tn.gov with the business name, account number, location, and a description of the impact. The same channel covers taxpayers whose returns are prepared by a practitioner in the disaster area.',
          'Sales tax has a separate standing program that is a refund, not an extension: individuals who receive FEMA assistance for repairing or rebuilding their primary home can claim back sales tax on appliances, furniture, and building supplies — capped at $2,500 per residence, claimed within one year of the FEMA decision letter.',
        ],
        sources: [
          {
            label: 'TN DOR Notice #26-10 — coverage and request mechanics (PDF)',
            href: 'https://www.tn.gov/content/dam/tn/revenue/documents/notices/general/26-10.pdf',
          },
          {
            label: 'TN DOR — Natural disaster sales tax relief (refund program)',
            href: 'https://www.tn.gov/revenue/taxes/sales-and-use-tax/natural-disaster-sales-tax-relief.html',
          },
        ],
      },
      {
        id: 'scope-caution',
        heading: 'The scope caution: state county lists can lag the IRS',
        body: [
          'Tennessee relief carries a dual condition — the taxpayer must sit in the disaster area designated by the State of Tennessee and hold an IRS extension. Those two maps are not always the same. For Winter Storm Fern, the IRS expanded its relief to all 95 counties (and moved the date to June 8, 2026), while DOR’s Notice #26-10 lists 23 named counties; no statewide state expansion was found. A client in an unlisted county falls back on the case-by-case email channel, not the automatic relief.',
          'The notices also expire with the federal date — each states it does not alter due dates falling after the extended deadline. As of July 31, 2026 no Tennessee relief window is open.',
        ],
        sources: [
          {
            label: 'TN DOR Notice #26-10 — dual condition and county list (PDF)',
            href: 'https://www.tn.gov/content/dam/tn/revenue/documents/notices/general/26-10.pdf',
          },
          {
            label: 'IRS — TN-2026-01 (Winter Storm Fern, expanded statewide)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-taxpayers-impacted-by-winter-storm-fern-in-tennessee-various-deadlines-postponed-to-may-22-2026',
          },
        ],
      },
      {
        id: 'where-published',
        heading: 'Where Tennessee publishes disaster relief',
        body: [
          'Event notices appear in the Department’s Important Notices index (published guidance under Tenn. Code Ann. §67-1-108, as the index states) and surface first under Hot Topics, each accompanied by a news release. The franchise & excise index carries the full disaster series back to 2020.',
        ],
        sources: [
          {
            label: 'TN DOR — Important notices master index',
            href: 'https://www.tn.gov/revenue/revenue-news/news-publications/important-notices.html',
          },
          {
            label: 'TN DOR — Hot topics',
            href: 'https://www.tn.gov/revenue/revenue-news/news-publications/hot-topics.html',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Does Tennessee match IRS disaster deadlines?',
        answer:
          'For franchise & excise tax, yes — by statute the Commissioner may extend state dates when the IRS extends federal ones (never beyond them), and every recent event notice matched the IRS date exactly: June 8, 2026 for Winter Storm Fern, June 17, 2024 for the December 2023 tornadoes, May 1, 2025 for Helene.',
      },
      {
        question: 'Is the Tennessee relief automatic?',
        answer:
          'Franchise & excise relief is automatic for accounts whose primary address on record is in the state-designated disaster area. Everything else — sales tax, business tax, other taxes, out-of-area taxpayers, practitioner-in-area cases — runs through a case-by-case email request to Revenue.DisasterExtension@tn.gov.',
      },
      {
        question: 'Does Tennessee extend sales tax deadlines after a disaster?',
        answer:
          'Not automatically — sales tax extensions are case-by-case requests. What does exist is a refund program: people who receive FEMA assistance for their primary home can reclaim sales tax on appliances, furniture, and building supplies, up to $2,500 per residence, within one year of the FEMA decision letter.',
      },
      {
        question: 'Is any Tennessee disaster relief active right now?',
        answer:
          'No. The most recent window — Winter Storm Fern, Notice #26-10 — closed June 8, 2026, and each notice expires with its federal date. When the IRS next postpones deadlines for a Tennessee disaster, expect a matching F&E notice in the Department’s Important Notices index.',
      },
    ],
    announcementsIndex: {
      label: 'TN DOR important notices index',
      href: 'https://www.tn.gov/revenue/revenue-news/news-publications/important-notices.html',
    },
    metaTitle: 'Does Tennessee Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'Yes for franchise & excise tax — Tennessee matches the IRS disaster date automatically by address, every event since 2020. Sales and business taxes are request-only. The statute, the pattern, and the county-list caution, verified against TN DOR notices.',
  },
  {
    // All facts verified 2026-07-31 against floridarevenue.com (EO 24-003 PDF
    // read in full, Milton event page quoted), leg.state.fl.us statute text,
    // and irs.gov. The +15-day corporate offset is verified for Milton ONLY —
    // do not generalize it into a formula. No active notice as of the verified
    // date — standing-pattern page.
    slug: 'florida',
    state: 'Florida',
    abbreviation: 'FL',
    verifiedOn: '2026-07-31',
    statusLabel: 'Corporate follows the IRS — sales tax gets only weeks',
    statusTone: 'info',
    directAnswer:
      'Split answer. Florida’s relief is discretionary per event (Fla. Stat. §213.055(2)): for corporate income/franchise tax the Department has followed the IRS postponement — for Hurricane Milton, to May 16, 2025, fifteen days after the federal May 1 date — while sales & use, reemployment, and documentary-stamp taxes got only a weeks-long extension by emergency order. No relief is active right now.',
    activeNoticeCodes: [],
    sections: [
      {
        id: 'how-fl-relief-works',
        heading: 'Does Florida automatically follow IRS postponements?',
        body: [
          'No — the mechanism is discretionary and event-specific. Under Fla. Stat. §213.055(2), during a governor-declared state of emergency the Department of Revenue’s executive director may "extend the stipulated due date for tax returns and accompanying tax payments" and waive interest accruing during the emergency. The chain each time: Governor’s executive order → the executive director issues an Order of Emergency Waiver, supplemented by an event page on floridarevenue.com.',
          'Florida has no personal income tax, so the taxes in play are corporate income/franchise, sales & use, reemployment, and documentary stamp — and the relief differs sharply by tax type (below).',
        ],
        sources: [
          {
            label: 'Fla. Stat. §213.055 — declared emergency powers (official statutes)',
            href: 'http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0213/Sections/0213.055.html',
          },
          {
            label: 'FL DOR — Order of Emergency Waiver #24-003 (Milton, PDF)',
            href: 'https://floridarevenue.com/emdisaster/ExecutiveOrdersEmergencyWaivers/EO24-003.pdf',
          },
        ],
      },
      {
        id: 'corporate-pattern',
        heading: 'Corporate income/franchise: follows the IRS — on Florida’s own date',
        body: [
          'For the 2024 hurricanes, the Department stated it "will follow the tax relief granted by the Internal Revenue Service (IRS) … regarding the postponement of Florida corporate income/franchise tax return due dates." But the Florida date was its own: corporate due dates in the relief windows moved to May 16, 2025, where the federal Milton deadline was May 1, 2025 — fifteen days later, for that event. The relief came in three county groups keyed to each federal disaster’s start date (the May 2024 storms, Debby, Milton).',
          'One planning note: that fifteen-day offset is a verified fact for the Milton event, not a published formula — each event’s announcement sets its own date, so read the event page, not the pattern.',
        ],
        sources: [
          {
            label: 'FL DOR — Hurricane Milton relief page (corporate dates)',
            href: 'https://floridarevenue.com/Pages/Hurricane_Milton.aspx',
          },
          {
            label: 'IRS — FL-2024-10 (Milton; federal deadline May 1, 2025)',
            href: 'https://www.irs.gov/newsroom/irs-announces-tax-relief-for-victims-of-milton-various-deadlines-postponed-to-may-1-2025-in-all-of-florida',
          },
        ],
      },
      {
        id: 'sales-pattern',
        heading: 'Sales & use and the rest: weeks, not months',
        body: [
          'The federal months-long postponement does not flow through to Florida’s transaction taxes. Order #24-003 (Milton) extended sales & use tax for the September and October 2024 reporting periods — including third-quarter returns — only to November 22, 2024, with electronic payments due a day earlier by 5:00 p.m. ET. Reemployment tax and documentary-stamp (unrecorded documents) got the same November 22 date, as did more than a dozen other taxes and fees. The order expired with that date.',
          'So in the same disaster, a corporate return gained roughly seven months while a sales-tax return gained two to six weeks. Calendar the two separately.',
        ],
        sources: [
          {
            label: 'FL DOR — Order of Emergency Waiver #24-003 (PDF, full terms)',
            href: 'https://floridarevenue.com/emdisaster/ExecutiveOrdersEmergencyWaivers/EO24-003.pdf',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'Automatic in listed counties; case-by-case outside them',
        body: [
          'The orders take effect immediately and apply to the counties they list — no application for businesses inside them. Outside the listed counties, the Department works "with all affected taxpayers on a case-by-case basis" (1-850-488-6800 or GTAHurricaneHelp@floridarevenue.com).',
          'Announcements live on the Department’s emergency hub — which, as of July 31, 2026, reads "None at this time" in every section: no Florida relief is currently active. Past order PDFs remain reachable at stable URLs; event pages (Milton, Helene) stay up.',
        ],
        sources: [
          {
            label: 'FL DOR — emergency information hub',
            href: 'https://floridarevenue.com/emdisaster/Pages/EmergencyDisaster.aspx',
          },
          {
            label: 'FL DOR — Hurricane Milton relief page (case-by-case contact)',
            href: 'https://floridarevenue.com/Pages/Hurricane_Milton.aspx',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Does Florida match IRS disaster deadlines?',
        answer:
          'Partly. For corporate income/franchise tax the Department has followed the IRS postponement — though on its own date (May 16, 2025 for Milton, versus the federal May 1). Sales & use, reemployment, and documentary-stamp taxes get only short weeks-long extensions by emergency order. There is no automatic conformity statute; each event gets its own order.',
      },
      {
        question: 'Is Florida disaster relief automatic?',
        answer:
          'Within the counties an order lists, yes — it takes effect immediately with no application. Outside the listed counties, relief is case-by-case: call 1-850-488-6800 or email GTAHurricaneHelp@floridarevenue.com.',
      },
      {
        question:
          'My client’s federal sales… wait — does the federal postponement cover Florida sales tax?',
        answer:
          'No — IRS relief covers federal obligations only, and Florida’s own orders have extended sales & use tax by weeks, not months (Milton: September/October 2024 periods to November 22, 2024, e-payments a day earlier). A client relying on the federal spring date for Florida sales tax would be months late.',
      },
      {
        question: 'Is any Florida disaster relief active right now?',
        answer:
          'No. The Department’s emergency hub lists no active orders or waivers as of July 31, 2026. When the next governor-declared emergency plus federal relief arrives, expect an Order of Emergency Waiver for transaction taxes and an event page stating the corporate income/franchise dates.',
      },
    ],
    announcementsIndex: {
      label: 'FL DOR emergency information hub',
      href: 'https://floridarevenue.com/emdisaster/Pages/EmergencyDisaster.aspx',
    },
    metaTitle: 'Does Florida Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'Split answer: Florida corporate tax has followed the IRS disaster date (plus 15 days for Milton), but sales tax gets only weeks by emergency order. The §213.055 mechanism, the Milton numbers, and where orders publish — verified against FL DOR.',
  },
  {
    // All facts verified 2026-07-31: leginfo statute texts (R&TC 18572, 6459.5,
    // CUIC 1111.5 read in full — note 1111.5 has NO 60-day cap; EDD's "two
    // months" is administrative practice), FTB pages read live in a browser
    // (ftb.ca.gov 403s plain fetches), CDTFA/EDD pages via fetch. No active IRS
    // notice for CA as of the verified date — standing-pattern page. CA also
    // runs STATE-ONLY relief off governor proclamations with no federal notice.
    slug: 'california',
    state: 'California',
    abbreviation: 'CA',
    verifiedOn: '2026-07-31',
    statusLabel: 'FTB follows the IRS — CDTFA/EDD run on the Governor’s clock',
    statusTone: 'ok',
    directAnswer:
      'For income and franchise tax, yes in practice: R&TC §18572 applies IRC §7508A, and for the 2025 LA fires FTB matched the federal Oct. 15 date within three days, automatically by county. Two caveats: since June 2024 the Director of Finance sets the state period (file FTB 3872 if it ends before the federal one), and CDTFA sales-tax and EDD payroll relief follow the Governor’s proclamation, not the IRS — for up to three and two months respectively.',
    activeNoticeCodes: [],
    sections: [
      {
        id: 'how-ca-relief-works',
        heading: 'Does California automatically follow IRS postponements?',
        body: [
          'For FTB-administered taxes, California conforms by statute: R&TC §18572 provides that IRC §7508A "shall apply," reaching taxpayers affected by federally declared disasters and governor-declared emergencies. In practice the match has been fast and exact — when the IRS gave Los Angeles County until Oct. 15, 2025 after the January 2025 fires, FTB announced the identical postponement three days later.',
          'The June 2024 wrinkle CPAs should know: conformity is no longer purely self-executing. The Director of Finance now determines the state postponement period, which can in principle end before the federal one — and taxpayers in that gap request an additional relief period on Form FTB 3872. No instance of a shorter state period has been found so far; the LA-fires window matched exactly.',
        ],
        sources: [
          {
            label: 'R&TC §18572 — postponement conformity (leginfo)',
            href: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=18572',
          },
          {
            label: 'FTB — Form 3872 instructions (Director-of-Finance regime)',
            href: 'https://www.ftb.ca.gov/forms/2024/2024-3872-instructions.html',
          },
          {
            label: 'FTB — Tax News Flash, Jan 13, 2025 (LA fires postponement)',
            href: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/flash/2025/01.html',
          },
        ],
      },
      {
        id: 'separate-action',
        heading: 'How FTB relief is claimed: automatic by county, annotate the return',
        body: [
          'FTB applies the postponement to taxpayers whose principal residence or principal place of business sits in the covered county — for the LA fires, FTB’s FAQ said it plainly: an affected taxpayer is "entitled to the postponement" with "no supporting documentation … required." The mechanical step is an annotation: write the disaster name in black or blue ink at the top of the return (or follow the software’s disaster-information entry when e-filing).',
          'FTB also publishes a payment-by-payment table per event — for the LA fires, personal, business-entity, PTE elective, LLC annual tax, and Q1–Q3 estimates all moved to Oct. 15, 2025.',
        ],
        sources: [
          {
            label: 'FTB — LA County fire relief FAQ (automatic, no documentation)',
            href: 'https://www.ftb.ca.gov/file/when-to-file/help-los-angeles-county-fire-relief.html',
          },
          {
            label: 'FTB — disaster declarations payment table',
            href: 'https://www.ftb.ca.gov/file/when-to-file/disaster-declarations-tax-payments.html',
          },
        ],
      },
      {
        id: 'other-agencies',
        heading: 'CDTFA and EDD: a different trigger and much shorter clocks',
        body: [
          'California’s other two tax agencies key off the Governor’s emergency proclamation, not the IRS notice. CDTFA (sales & use plus some twenty-five special tax programs): an extension of up to three months — R&TC §6459.5 makes it automatic for persons in the proclaimed area, no request required, while interest and penalty relief is requested through online services or form CDTFA-735.',
          'EDD (payroll taxes): up to two months to file reports and deposit payroll taxes without penalty or interest — request-based only, citing CUIC §1111.5, via e-Services, a no-login extension portal, or 1-888-745-3886. (The statute itself sets no fixed cap; the two-month figure is EDD’s stated practice.) Net effect: a client with an eight-month FTB postponement can simultaneously owe sales tax in three months and payroll returns in two.',
          'The flip side of the Governor-trigger: California grants state-only relief for emergencies that never get a federal notice — both CDTFA and EDD currently list 2026 proclamation events with no IRS counterpart. Check the agency pages even when the IRS is silent.',
        ],
        sources: [
          {
            label: 'CDTFA — state of emergency tax relief',
            href: 'https://www.cdtfa.ca.gov/services/state-of-emergency-tax-relief.htm',
          },
          {
            label: 'R&TC §6459.5 — emergency extensions (leginfo)',
            href: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=6459.5',
          },
          {
            label: 'EDD — emergency and disaster assistance for employers',
            href: 'https://edd.ca.gov/en/payroll_taxes/emergency_and_disaster_assistance_for_employers/',
          },
          {
            label: 'CUIC §1111.5 — emergency extensions (leginfo)',
            href: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=UIC&sectionNum=1111.5.',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Does California match IRS disaster deadlines?',
        answer:
          'For FTB income and franchise tax, yes in practice — R&TC §18572 applies IRC §7508A, and the January 2025 LA fires postponement matched the federal Oct. 15, 2025 date exactly, announced within three days. Since June 2024 the Director of Finance formally sets the state period; if it ever ends before the federal one, Form FTB 3872 requests the difference.',
      },
      {
        question: 'Is California disaster relief automatic?',
        answer:
          'FTB relief is automatic for taxpayers whose principal residence or business is in the covered county — no documentation required; just write the disaster name atop the return. CDTFA’s up-to-three-month extension is automatic in proclaimed areas by statute, while its interest/penalty relief and all EDD payroll extensions must be requested.',
      },
      {
        question: 'Does the federal postponement cover my client’s sales tax and payroll filings?',
        answer:
          'No. CDTFA and EDD relief runs on the Governor’s proclamation, not the IRS notice, with much shorter clocks: up to three months for CDTFA programs and up to two months for EDD payroll obligations (request required). Calendar those separately from the FTB date.',
      },
      {
        question: 'Can California relief exist when the IRS has issued nothing?',
        answer:
          'Yes — governor-proclaimed emergencies trigger CDTFA and EDD relief (and can trigger FTB relief under §18572) without any federal notice. Both agencies currently list 2026 proclamation events with no IRS counterpart, so check the state pages even when the IRS index is quiet.',
      },
    ],
    announcementsIndex: {
      label: 'FTB emergency tax relief page',
      href: 'https://www.ftb.ca.gov/file/when-to-file/Emergency-tax-relief.html',
    },
    metaTitle: 'Does California Conform to IRS Disaster Extensions? (2026)',
    metaDescription:
      'FTB follows the IRS date (LA fires: exact Oct. 15 match, automatic by county) — but the Director of Finance now sets the state period, and CDTFA/EDD run on the Governor’s proclamation with 3- and 2-month clocks. Verified against leginfo, FTB, CDTFA, EDD.',
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

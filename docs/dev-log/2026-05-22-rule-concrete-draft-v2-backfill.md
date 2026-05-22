---
title: 'Rule concrete draft v2 backfill'
date: 2026-05-22
author: 'Codex'
area: rules
---

# Rule concrete draft v2 backfill

## Context

Initial global prewarm moved AI concrete draft generation out of the customer
open-rule path, but the local backfill still exposed many failed targets:
source text unavailable, schema-invalid AI shapes, guard rejections, and slow
AI gateway calls.

## Change

- Bumped the concrete draft prompt target to `rule-concrete-draft@v2`.
- Added JSON source extraction, browser-like source fetch headers, source fetch
  timeout, and focused source-text selection before sending to AI.
- Expanded normalization for common model aliases such as installment schedules,
  fixed-date aliases, `dueDates`, `due_date`, and tax-year-relative prose.
- Added source excerpt fallback for relative due-date and operational source
  lines while keeping final contract validation and guard checks.
- Added AI gateway timeout for concrete drafts and a fast-json fallback when the
  primary quality-json request fails at the gateway layer.
- Added internal ops commands:
  - `pnpm rules:concrete-drafts:report -- --failures`
  - `pnpm rules:concrete-drafts:report -- --group-by=refusal,acquisition`
  - `pnpm rules:concrete-drafts:inspect -- --category=SCHEMA_INVALID --limit=10`
  - `pnpm rules:concrete-drafts:backfill -- --retry-failed`
  - `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=4`
- Added Browserless fallback support to concrete draft live source fetches when
  `PULSE_BROWSERLESS_URL` is configured, with `PULSE_BROWSERLESS_SOURCE_IDS`
  still available to prefer Browserless for known difficult sources.
- Added a second normalization pass for common wrapped AI payloads, missing
  due-date kind aliases, fixed-date outputs with date-only evidence in the
  source excerpt, and worded tax-year-relative due dates.

## Backfill Result

Local initial v2 backfill inspected 431 source-defined targets and recorded at
least one v2 attempt for every target. Final local report:

- successful global cached drafts: 131
- missing successful drafts: 300
- `SOURCE_TEXT_UNAVAILABLE`: 173
- `AI_GATEWAY_ERROR`: 89
- `SCHEMA_INVALID`: 24
- `GUARD_REJECTED`: 14

The remaining failures are now operational data for source/schema cleanup rather
than customer-facing render latency.

Follow-up diagnostics showed the remaining local failures are dominated by
manual-review sources without source-backed due-date text:

- `SOURCE_TEXT_UNAVAILABLE | manual_review`: 146
- `SOURCE_TEXT_UNAVAILABLE | pdf_watch`: 17
- `SOURCE_TEXT_UNAVAILABLE | html_watch`: 10
- `AI_GATEWAY_ERROR | manual_review`: 54
- `AI_GATEWAY_ERROR | html_watch`: 35

The report command now supports grouping by refusal, source, source type,
acquisition method, domain, jurisdiction, and error message. The inspect command
prints bounded per-rule/source diagnostics, including latest attempt metadata,
latest source snapshot key, source-text availability, and error messages.

## Follow-up Backfill Pass

A later local backfill pass added operational source snapshot support for
curl-fetched HTML/PDF source text, including local PDF text extraction through
the Codex runtime `pypdf` dependency. Source snapshot text shorter than the
minimum usable threshold, access-denied pages, and official 404/error pages are
ignored on read so a bad snapshot cannot poison concrete draft generation.

Concrete draft generation now also falls back to deterministic source-text
extraction when the AI output is missing, schema-invalid, or guard-rejected.
The deterministic parser covers month/day installment schedules and relative
installment prose such as the 15th day of the fourth, sixth, ninth, and twelfth
months.

This pass raised the local successful global cache count from 131 to 294 of 431
source-defined targets. The remaining 137 missing targets are dominated by
source acquisition gaps:

- `SOURCE_TEXT_UNAVAILABLE`: 103
- `GUARD_REJECTED`: 14
- `SCHEMA_INVALID`: 10
- `AI_GATEWAY_ERROR`: 10

Known source cleanup found and fixed current URLs for Louisiana individual
income tax and the Louisiana 2026 filing calendar; the individual income source
then backfilled both Louisiana individual drafts. The Louisiana calendar index
still lacks concrete day-level dates and needs deeper event-page extraction or
more specific rule-source mappings.

## Arizona Source Fetch Repair

Arizona DOR and DES pages were visible in a normal browser, but local
server-side fetches returned `403` JavaScript/cookie challenge pages. The
concrete draft source builder therefore saw only source registry metadata and
recorded `SOURCE_TEXT_UNAVAILABLE` for all Arizona source-defined candidate
rules.

Added Arizona-specific source-backed excerpts for individual income, estimated
tax, fiduciary, corporate, pass-through entity, TPT, withholding, and UI wage
report candidate rules. The TPT excerpt uses an explicit 2026 monthly electronic
return/payment date table so the AI draft can normalize it into a period table
without relying on the blocked live page.

Targeted local backfill reran the Arizona sources with `--retry-failed`; all 9
Arizona candidate rules now have successful global cached drafts. Follow-up
report:

- successful global cached drafts: 305
- missing successful drafts: 126
- Arizona failures: 0

## Rule Library Display Repair

The `/rules/library` page had a separate selected-rule detail path from the
coverage tab. It loaded candidate rules but did not call `listConcreteDrafts`,
so source-defined candidate rules rendered `AI concrete draft is not ready`
even when the global concrete draft cache already contained successful drafts.

The library route now fetches concrete drafts for source-defined rules and
threads the cached draft into both the selected rule dialog and batch-review
dialog. `RuleDetailInline` also accepts the same `concreteDraft` prop as the
compact detail surface so cached AI drafts are displayed consistently across
Rule Library entry points.

## DC Source Fetch Repair

DC had two different source-text issues. The individual income tax forms page
now has a usable snapshot with the 2026 D-40 and D-40ES filing-date rows, but
the failed AI output attempts were created before the retry. The broader
`dc.tax_filing_deadlines` source pointed at a sparse OTR page that produced only
title/URL/review metadata, so fiduciary, business, sales/use, and withholding
candidate rules had no source-backed text. The UI wage source also pointed at a
general DOES page instead of the reporting FAQ page that states the UC-30
quarterly due dates.

Added DC-specific source-backed excerpts for individual income, estimated
individual income, fiduciary income, business income/franchise, business
estimated tax, partnership, sales/use, withholding, and UI wage report candidate
rules. Updated the DC UI wage source URL to the DOES reporting questions page.

Targeted local backfill reran the DC sources with `--retry-failed`; all 9 DC
candidate rules now have successful global cached drafts. Follow-up report:

- successful global cached drafts: 314
- missing successful drafts: 117
- DC failures: 0

## Georgia PDF Source Repair

Georgia fiduciary income tax was a direct PDF source, not an HTML page. The
source was correctly marked `pdf_watch`, but it still pointed at the 2024
fiduciary instruction booklet and had no source snapshot, so the concrete draft
builder saw only source metadata and returned `SOURCE_TEXT_UNAVAILABLE`.

Updated `ga.fiduciary_income_tax_booklet` to the 2025 Georgia 501 and 501X
fiduciary instruction booklet PDF. The PDF snapshot command downloaded the
official PDF, extracted 49,077 characters of text, and archived the text as a
source snapshot. Targeted local backfill then generated the Georgia fiduciary
global cached draft successfully. Follow-up report:

- successful global cached drafts: 315
- missing successful drafts: 116
- Georgia failures: 0

## Hawaii and Idaho URL Repair

Hawaii and Idaho exposed two different stale-source failures. Hawaii's
individual income source pointed at the retired
`/forms/a1_b1_1indinc/` URL, which now returns 404. The current Hawaii
individual return source is the Tax Year 2025 information page, while individual
estimated tax is better sourced from the revised February 2026 Tax Facts PDF for
estimated income tax. The Hawaii estimated-tax candidate now has its own
`pdf_watch` source so it no longer depends on a generic income-tax page.

Idaho's unemployment wage-report source pointed at the old DNN employer portal
path. The source now tracks the Department of Labor unemployment insurance tax
handbook PDF. During snapshotting, the PDF was initially rejected because the
source-text guard treated the text `403(a)` inside an IRS Code citation as an
HTTP 403 error page. The guard now keeps real error-page checks while allowing
ordinary tax-code section references.

Targeted snapshots and backfills now succeed for both repaired sources:

- `hi.individual_estimated_tax`: PDF snapshot extracted 21,996 characters and
  generated a successful global cached draft.
- `id.ui_wage_report`: PDF snapshot extracted 68,494 characters and generated a
  successful global cached draft.
- follow-up report: 317 successful global cached drafts, 114 missing successful
  drafts, and no HI or ID rows in the latest failure groups.

## Maine URL Repair

Maine had two stale source URLs. `me.income_tax` pointed at
`/revenue/taxes/individual-income-tax`, which now returns 404, and
`me.ui_wage_report` pointed at `/unemployment/tax/`, which also returns 404.
The current Maine Revenue Services due-date page is
`https://www.maine.gov/revenue/tax-return-forms/due-dates` and includes the
1040ME, 1040ES-ME, and ME UC-1 due-date rows needed by the affected candidate
rules.

Updated the Maine income and UI wage sources to the current MRS due-date page,
added focused source-backed excerpts for 1040ME, 1040ES-ME, and ME UC-1, and
changed concrete-draft source text construction so source-backed excerpts are
used as the focused source text instead of appending a long index page ahead of
the excerpt. This prevents the model from selecting adjacent form rows on broad
due-date index pages.

The local ME concrete draft cache was refreshed for:

- `me.individual_income_return.candidate.2026`: fixed date April 15, 2026.
- `me.individual_estimated_tax.candidate.2026`: April 15, June 15, September
  15, 2026, and January 15, 2027.
- `me.ui_wage_report.candidate.2026`: April 30, July 31, October 31, 2026, and
  January 31, 2027.

Follow-up report: 319 successful global cached drafts, 112 missing successful
drafts, and no ME rows in the latest failure groups.

## Mississippi FAQ Source Repair

Mississippi's two `SOURCE_TEXT_UNAVAILABLE` rows were not caused by the current
Business Tax FAQ page being unusable. The source registry still pointed
`ms.pass_through_entity_tax` at the retired
`https://www.dor.ms.gov/business/corporate-income-and-franchise-tax-faqs`
path, while the current page is
`https://www.dor.ms.gov/business/business-tax-frequently-asked-questions#corporate-income-and-franchise-tax`.

The two failing rules also needed separate source ownership:

- `ms.pass_through_entity_return.candidate.2026` now uses the current
  Mississippi DOR Business Tax FAQ page and a focused source-backed excerpt for
  the 15th day of the 3rd month due-date rule.
- `ms.fiduciary_income_return.candidate.2026` now uses the 2025 Mississippi
  Fiduciary Return Instructions PDF and a focused excerpt for calendar-year
  April 15 and fiscal-year 15th day of the 4th month filing rules.

Targeted local backfill succeeded for both rules. Follow-up report: 321
successful global cached drafts, 110 missing successful drafts, and no
Mississippi `SOURCE_TEXT_UNAVAILABLE` rows in the latest failure groups. The
remaining Mississippi rows are separate issues: `ms.sales_withholding_tax` is
`GUARD_REJECTED`, and `ms.ui_wage_report` is `SCHEMA_INVALID`.

## Montana URL Repair

Montana's retired `https://mtrevenue.gov/tax-due-dates/` page was the source of
the MT `SOURCE_TEXT_UNAVAILABLE` rows. The current Department of Revenue content
now lives on `revenue.mt.gov` tax-specific pages rather than the old aggregated
due-date URL.

The MT source pack was updated to use current official URLs:

- `mt.income_tax`: `https://revenue.mt.gov/taxes/individual-income-tax/`.
- `mt.tax_due_dates`: `https://revenue.mt.gov/taxes/corporate-income-tax` for
  corporate returns and corporate estimated payments.
- `mt.fiduciary_income_tax`:
  `https://revenue.mt.gov/taxes/fiduciaries/estate-and-trust-filing-requirements`.
- `mt.pass_through_entity_tax`:
  `https://revenue.mt.gov/taxes/pass-through-entities/`.
- `mt.withholding_due_dates`:
  `https://revenue.mt.gov/taxes/withholding-tax/wage-withholding-returns-and-payments`.

Focused source-backed excerpts were added for MT individual returns, individual
estimated tax, fiduciary returns, corporate returns, corporate estimated tax,
pass-through returns, and wage withholding. Targeted local backfill succeeded
for all seven MT rows. Follow-up report: 328 successful global cached drafts,
103 missing successful drafts, zero targets with no attempt, and no MT rows in
the latest missing/failure list.

## New Hampshire URL Repair

New Hampshire's old `https://www.revenue.nh.gov/businesses/business-tax` source
and the NHES employer tax-rate page were not usable for concrete-draft source
text. The business tax source now points at the official DRA BT-SUMMARY
instructions PDF, which includes BET/BPT due dates, estimated-payment
requirements, and extension language. The UI wage source now points at the NHES
WebTax quarterly tax and wage report filing PDF.

The updated NH sources are:

- `nh.business_tax`:
  `https://www.revenue.nh.gov/sites/g/files/ehbemt736/files/documents/bt-summary-instructions-2024.pdf`.
- `nh.ui_wage_report`:
  `https://www2.nhes.nh.gov/webtax/File_Employer_Quarterly_Tax_Wage_Report.pdf`.

Focused source-backed excerpts were added for NH business returns, business
estimated tax, pass-through return handling, BET/BPT entity-tax handling, and UI
wage reporting. Targeted local backfill succeeded for all five NH rows. Follow-up
report: 333 successful global cached drafts, 98 missing successful drafts, and
no NH rows in the latest missing/failure list.

## North Dakota, Minnesota, And Missouri Source Repair

North Dakota source pages were browser-visible, but the concrete draft source
builder still saw only registry metadata for several manual-review sources. The
ND source registry now points candidate rules at more specific official pages:

- `nd.income_tax`:
  `https://www.tax.nd.gov/news/resources/tax-deadlines/individual-income-tax-deadlines`.
- `nd.fiduciary_tax`:
  `https://www.tax.nd.gov/business/fiduciary-tax`.
- `nd.s_corp_partnership_tax_deadlines`:
  `https://www.tax.nd.gov/s-corp-and-partnership-tax-deadlines`.
- `nd.sales_use_tax`:
  `https://www.tax.nd.gov/sales-and-use-tax-deadlines`.
- `nd.withholding_tax`:
  `https://www.tax.nd.gov/news/resources/tax-deadlines/income-tax-withholding-deadlines`.

Focused source-backed excerpts were added for ND individual returns, individual
estimated tax, fiduciary returns, corporate returns, corporate estimated tax,
pass-through returns, sales/use tax, and withholding. Targeted local backfill
succeeded for all six current ND concrete-draft targets.

Minnesota and Missouri UI wage report source URLs were also repaired for the
source registry. Minnesota now uses the UI employer handbook due-date page,
`https://www.uimn.org/employers/publications/emp-hbook/due-date.jsp`. Missouri
now uses the current DES quarterly reports page,
`https://labor.mo.gov/des/employers/quarterly-reports`, replacing the stale
`/quarterly-contribution-and-wage-report` URL that returned Page Not Found.
Focused UI wage report excerpts were added for both sources so future
conditional UI concrete-draft targets do not depend on live page extraction.

Follow-up report on the current working tree: 292 source-defined targets, 250
successful global cached drafts, 42 missing successful drafts, zero targets with
no attempt, and no ND, MN, or MO rows in the latest missing/failure list.

## Michigan Source Repair

Michigan still had `SOURCE_TEXT_UNAVAILABLE` rows in the broader current target
scope. The broad CIT directory URL was replaced with a more precise official
filing requirements page:
`https://www.michigan.gov/taxes/business-taxes/cit/detail/michigan-corporate-income-tax-cit/filing-requirements`.
I checked the Michigan tax year 2025 CIT due dates PDF as an even more precise
candidate, but direct local fetch returned HTTP 403, so it is not suitable as
the registered source URL for automated backfill. The CIT source now uses the
fetchable detail page plus source-backed excerpts with the exact 2025
calendar-year dates.

The Michigan individual income source now points to the 2026 filing-season
announcement for the April 15, 2026 return/payment deadline. Individual
estimated tax was split into its own official quarterly estimated-tax FAQ
source. Flow-through entity tax now points to the main FTE page that contains
the due-date section instead of the FAQ page. Fiduciary remains on the existing
fiduciary filing guidance page, but is treated as a due-date source because the
page contains the "When to File" rule. Focused excerpts were also added for
Michigan sales/use, withholding, and UI wage report rules.

Targeted local backfill succeeded for all current Michigan source-defined
targets:

- `mi.income_tax`
- `mi.individual_estimated_tax`
- `mi.fiduciary_income_tax`
- `mi.corporate_income_tax`
- `mi.flow_through_entity_tax`
- `mi.sales_use_tax`
- `mi.withholding_due_dates`
- `mi.ui_wage_report`

Follow-up report on the broader current working tree: 431 source-defined
targets, 357 successful global cached drafts, 74 missing successful drafts, zero
targets with no attempt, and no MI rows in the latest missing/failure groups.

## Vermont, Rhode Island, Pennsylvania, and Ohio Source Repair

Vermont's previous concrete-draft failures were caused by stale or overly broad
source paths. I split the Vermont coverage across focused official sources:
individual estimated tax now uses the IN-114 instructions PDF, fiduciary income
uses the Vermont statute filing rule, corporate income uses the CO-411
instructions PDF, pass-through returns use the BI-471 instructions PDF,
sales/use uses the SUT filing source, and withholding uses the WHT-436
instructions. Source-backed excerpts were tightened with explicit calendar-year
or periodic due dates so the model no longer has to infer dates from "same as
federal" language.

Rhode Island's source pages were reachable, but several rules depended on PDF
lists or broad forms pages. I added focused excerpts for individual estimated,
fiduciary, corporate, pass-through, franchise/entity, sales/use, withholding,
and UI wage rules. The withholding excerpt now uses the Division of Taxation's
weekly, monthly, and quarterly due-date rules, and the franchise/entity excerpt
states the RI-1120C calendar-year and fiscal-year due-date rule directly.

Pennsylvania's old PIT source returned Page Not Found, so `pa.income_tax` now
points to the current PA Personal Income Tax Guide filing requirements page.
Ohio's individual filing source returned HTTP 403, so `oh.income_tax` now points
to the official Ohio IT 1040 and SD 100 instructions PDF. The Ohio UI wage rule
did not need a source replacement; it succeeded when retried with the default
model after a fast-model parse failure.

Targeted local backfill succeeded for all current VT, RI, PA, and OH rows after
the source/excerpt repairs. Follow-up report on the broader current working
tree: 431 source-defined targets, 380 successful global cached drafts, 51
missing successful drafts, zero targets with no attempt, and no VT, RI, PA, or
OH rows in the latest missing/failure groups. `SOURCE_TEXT_UNAVAILABLE` dropped
from 35 to 12 in this pass.

## Missouri UI Wage Retry

Missouri's current DES quarterly reports page is reachable and contains the
Due Dates section with the last-day-of-month quarterly rule. The remaining
`SOURCE_TEXT_UNAVAILABLE` row was an old failed concrete-draft attempt for
`mo.ui_wage_report.candidate.2026`, not a stale source URL. Targeted local
backfill with `--source=mo.ui_wage_report --retry-failed` generated a successful
global cached draft.

Follow-up report on the broader current working tree: 431 source-defined
targets, 381 successful global cached drafts, 50 missing successful drafts, zero
targets with no attempt, and no MO rows in the latest missing/failure groups.
`SOURCE_TEXT_UNAVAILABLE` dropped from 12 to 11 after this retry.

## Tennessee UI Wage Source Clarification

Tennessee's UI wage source pointed to a support article titled "What is
delinquent cycle?", which looked unrelated in the failure report. The article is
still the best official due-date-specific source found in the Tennessee Labor
support pages because it states that the employer's quarterly unemployment
report becomes due at the end of the next month, with the first quarter ending
March 31 and due April 30. I kept the URL, renamed the source to "Tennessee
Unemployment Quarterly Report Due Date and Delinquent Cycle", and added a
source-backed excerpt so concrete-draft generation is driven by the due-date
sentence rather than the article title.

Targeted local backfill with `--source=tn.ui_wage_report --retry-failed`
generated a successful global cached draft. Follow-up report on the broader
current working tree: 431 source-defined targets, 382 successful global cached
drafts, 49 missing successful drafts, zero targets with no attempt, and no TN
`SOURCE_TEXT_UNAVAILABLE` rows in the latest missing/failure groups. TN still
has one separate franchise/excise `AI_GATEWAY_ERROR` row to retry or tighten
separately. `SOURCE_TEXT_UNAVAILABLE` dropped from 11 to 10 after this repair.

## Minnesota UI Wage Retry

Minnesota's current employer handbook due-date page is reachable and already
has focused source-backed excerpts for UI wage detail report due dates. The
remaining `SOURCE_TEXT_UNAVAILABLE` row was an old failed attempt for
`mn.ui_wage_report.candidate.2026`, not a stale source URL. Targeted local
backfill with `--source=mn.ui_wage_report --retry-failed` generated a successful
global cached draft.

Follow-up report on the broader current working tree: 431 source-defined
targets, 383 successful global cached drafts, 48 missing successful drafts, zero
targets with no attempt, and no MN rows in the latest missing/failure groups.
`SOURCE_TEXT_UNAVAILABLE` dropped from 10 to 9 after this retry.

## Nebraska and Nevada UI Wage Source Repair

Nebraska's registered UI wage source pointed at an unemployment insurance tax
overview URL that was not reliable as a concrete-draft source. I replaced it
with the Nebraska Department of Labor Employer Tax Services User Guide PDF,
which states that quarterly Combined Tax Reports and wage reports are due by
the end of the month following each quarter end date. A source-backed excerpt
was added for `NE:ui_wage_report`.

Nevada's registered UI wage source pointed at the old ESS help page. I replaced
it with the current Nevada DETR Quarterly Reporting Information page, which
lists the quarterly contribution and wage report rule and the 2026 due-date
table. A source-backed excerpt was added for `NV:ui_wage_report`.

Targeted local backfill succeeded for `nv.ui_wage_report` with the fast model.
Nebraska first cleared the source-text error but hit a fast-model parse error;
retrying `ne.ui_wage_report` with the default model generated a successful
global cached draft. Follow-up report on the broader current working tree: 431
source-defined targets, 385 successful global cached drafts, 46 missing
successful drafts, zero targets with no attempt, and no NE or NV rows in the
latest missing/failure groups. `SOURCE_TEXT_UNAVAILABLE` dropped from 9 to 7
after this repair.

## Remaining Reachable Source Retry Sweep

The remaining `SOURCE_TEXT_UNAVAILABLE` rows for NM, ND, SC, TX, UT, and VA
were all on browser-reachable source pages. Targeted retries cleared the source
text failures without replacing those source URLs:

- `nd.sales_use_tax` and `nd.withholding_tax` succeeded with the fast model.
- `sc.ui_wage_report`, `tx.ui_wage_report_due_dates`, `ut.ui_wage_report`, and
  `va.ui_wage_report` succeeded with the fast model.
- `nm.ui_wage_report` first cleared the source-text error but hit a fast-model
  parse error; retrying with the default model generated a successful global
  cached draft.

Follow-up report on the broader current working tree: 431 source-defined
targets, 392 successful global cached drafts, 39 missing successful drafts, zero
targets with no attempt, and no `SOURCE_TEXT_UNAVAILABLE` rows remaining. The
remaining failures are now non-source categories: `GUARD_REJECTED`,
`AI_GATEWAY_ERROR`, and `SCHEMA_INVALID`.

## California EDD Guard Repair

California's remaining `GUARD_REJECTED` rows were not fetch failures. Both
`ca.withholding.candidate.2026` and `ca.ui_wage_report.candidate.2026` used the
broad EDD Required Filings page, and the AI selected introductory/navigation
text that contained no concrete due date. I repointed the existing
`ca.edd_required_filings_due_dates` source to the EDD Payroll Tax Calendar and
changed its source type to `calendar`.

Focused source-backed excerpts were added for:

- `CA:withholding`: DE 88 monthly and quarterly payroll tax deposit due dates.
- `CA:ui_wage_report`: DE 9 and DE 9C quarterly contribution return and wage
  report due dates.

Targeted local backfill with `--source=ca.edd_required_filings_due_dates
--retry-failed` generated successful global cached drafts for both CA rows.
Follow-up report on the broader current working tree: 431 source-defined
targets, 394 successful global cached drafts, 37 missing successful drafts, zero
targets with no attempt, no CA rows in the latest missing/failure groups, and
`GUARD_REJECTED` reduced from 17 to 15.

## Kentucky Tax Calendar Guard Repair

Kentucky's remaining tax-calendar failures were caused by the registered
`ky.tax_calendar_2026` source pointing at the DOR Tax Calendar landing page.
That page is a month index, while the concrete due dates are on monthly pages
such as January, April, and May 2026.

Kept the existing Kentucky calendar source and added focused source-backed
excerpts for:

- `KY:franchise_or_entity_tax`: April 15 and May 15 Corporation Income
  Tax/LLET and pass-through entity rows.
- `KY:sales_use_tax`: January 20, April 20, May 20, and accelerated filer
  sales tax rows.
- `KY:withholding`: twice-monthly, monthly, and quarterly income tax
  withholding rows from April and May.

Targeted local backfill with `--source=ky.tax_calendar_2026 --retry-failed`
generated successful global cached drafts for all three tax-calendar rows:
franchise/entity, sales/use, and withholding. Follow-up report on the broader
current working tree: 431 source-defined targets, 397 successful global cached
drafts, 34 missing successful drafts, zero targets with no attempt, KY only has
the separate UI wage AI gateway row remaining, and `GUARD_REJECTED` reduced
from 15 to 13.

## Louisiana Filing Dates Guard Repair

Louisiana's remaining tax-calendar failures had the same shape as Kentucky. The
registered `la.tax_calendar` source points at the 2026 filing-date year page,
which shows month cards and only a short subset of events. The concrete
source-backed dates are on monthly pages such as `/calendar/2026/04` and
`/calendar/2026/05`, plus event detail pages for specific filing types.

Kept the existing Louisiana calendar source and added focused source-backed
excerpts for:

- `LA:fiduciary_income_return`: May 15 fiduciary income tax return event.
- `LA:business_income_return` and `LA:franchise_or_entity_tax`: May 15 annual
  corporation and franchise return event.
- `LA:business_estimated_tax`: corporation estimated payment rows for April,
  June, September, and December.
- `LA:pass_through_entity_return`: Louisiana partnership tax due-date guidance.
- `LA:sales_use_tax`: monthly sales and use tax rows from January, April, June,
  and November.
- `LA:withholding`: L-1 return rows for semi-monthly, monthly, and quarterly
  payment frequencies.

Targeted local backfill with `--source=la.tax_calendar --retry-failed`
generated successful global cached drafts for all seven LA calendar rows.
Follow-up report on the broader current working tree: 431 source-defined
targets, 404 successful global cached drafts, 27 missing successful drafts, zero
targets with no attempt, LA only has the separate UI wage AI gateway row
remaining, and `GUARD_REJECTED` reduced from 13 to 9.

## Maryland, North Carolina, And Mississippi Guard Repair

The next `GUARD_REJECTED` set had three different source-shape problems:

- Maryland sales/use and withholding were valid rows on the Comptroller
  deadlines page, but needed focused source excerpts.
- Maryland pass-through entity return was incorrectly sourced to that general
  deadlines page; it now uses the 2025 Maryland Form 510 PTE instruction PDF.
- North Carolina sales/use had the right filing-frequency page, but the model
  needed concrete 2026 expansion examples for monthly and quarterly schedules.
- Mississippi withholding was sourced to the broad Business Tax landing page; it
  now uses the official Mississippi Withholding Tax page.

Targeted local backfill generated successful global cached drafts for:

- `md.pass_through_entity_return`, `md.sales_use_tax`, and `md.withholding`.
- `nc.sales_use_tax` after one fast-model parse failure and a focused excerpt
  expansion.
- `ms.withholding`.

Follow-up report on the broader current working tree: 431 source-defined
targets, 409 successful global cached drafts, 22 missing successful drafts, zero
targets with no attempt, no MD guard rows, no MS withholding guard row, no NC
sales/use guard row, and `GUARD_REJECTED` reduced from 9 to 4.

## Utah and Florida Guard Repair

Utah's remaining sales/use and withholding guard failures were both on the same
quarterly calendar source. The source page was valid, but the AI cited only the
repeated `April 30` date without the surrounding tax-type context. I added
focused excerpts for `UT:sales_use_tax` and `UT:withholding` that include the
April 30 quarterly due date plus the relevant Utah tax type labels: `Sales and
Use (STC)`, `Withholding Taxes`, and `Employer Withholding (WTH)`.

Florida's corporate return and estimated-tax failures were caused by the
source-defined rules preferring the broad Corporate Income Tax overview page.
The concrete dates are in the official Corporate Income Tax Due Dates PDF, so I
reordered both Florida corporate rules to use `fl.cit_due_dates_2026` as the
primary concrete-draft source and added focused PDF table excerpts. The F-1120
return row generated successfully. The estimated-tax row no longer appears as
`GUARD_REJECTED`; it now reaches the focused PDF source but still has a
remaining `AI_GATEWAY_ERROR` from model timeout/parse retries.

Follow-up report on the broader current working tree: 431 source-defined
targets, 412 successful global cached drafts, 19 missing successful drafts, zero
targets with no attempt, no UT rows, no FL `GUARD_REJECTED` rows, and
`GUARD_REJECTED` reduced from 4 to 1. The only remaining guard row is the
federal monthly payroll deposit rule.

## Federal Payroll Deposit Guard Repair

The last `GUARD_REJECTED` row was `fed.payroll_deposit.monthly.2026`. It was
not a fetch failure: the selected source text was only the Pub. 509 rollover
sentence, and Pub. 509 explicitly says the calendars do not cover employment tax
deposit rules and that Pub. 15 gives the deposit rules. The AI could not expand
any concrete monthly deposit dates from that source text, so the guard rejected
the generated draft.

I added the current IRS Publication 15 (2026) source, made it the primary source
for the monthly payroll deposit rule, and kept Pub. 509 as an auxiliary employer
calendar source. The new Pub. 15 evidence excerpt includes the monthly deposit
rule, the business-day rollover rule, and concrete 2026 month-by-month expansion
examples for monthly payroll deposits.

Targeted local backfill with `--source=fed.irs_pub_15_2026 --retry-failed`
generated a successful global cached draft for
`fed.payroll_deposit.monthly.2026`. Follow-up report on the broader current
working tree: 431 source-defined targets, 413 successful global cached drafts,
18 missing successful drafts, zero targets with no attempt, and zero
`GUARD_REJECTED` rows remaining.

## Verification

- `pnpm --filter @duedatehq/ai test -- src/ai.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts src/jobs/rules/concrete-draft.test.ts`
- `pnpm rules:concrete-drafts:report -- --failures --limit=60`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts src/procedures/rules/source-text.test.ts`
- `pnpm rules:concrete-drafts:report -- --group-by=refusal,acquisition --limit=20`
- `pnpm rules:concrete-drafts:inspect -- --category=SCHEMA_INVALID --limit=6`
- `pnpm check`
- `pnpm rules:concrete-drafts:snapshot-sources -- --concurrency=4`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1`
- `pnpm rules:concrete-drafts:report -- --group-by=refusal,acquisition,source --failures --limit=100`
- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=2 --source=dc.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=2 --source=dc.tax_filing_deadlines`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=dc.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --group-by=jurisdiction,source,refusal --failures --limit=40`
- `pnpm rules:concrete-drafts:snapshot-sources -- --source=ga.fiduciary_income_tax_booklet --concurrency=1`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ga.fiduciary_income_tax_booklet`
- `pnpm rules:concrete-drafts:inspect -- --source=ga.fiduciary_income_tax_booklet --limit=3 --show-source-excerpt`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts`
- `pnpm rules:concrete-drafts:snapshot-sources -- --source=hi.individual_estimated_tax --concurrency=1`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=hi.individual_estimated_tax`
- `pnpm rules:concrete-drafts:snapshot-sources -- --source=id.ui_wage_report --concurrency=1`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=id.ui_wage_report`
- `pnpm rules:concrete-drafts:inspect -- --source=hi.individual_estimated_tax --limit=2 --show-source-excerpt`
- `pnpm rules:concrete-drafts:inspect -- --source=id.ui_wage_report --limit=2 --show-source-excerpt`
- `pnpm rules:concrete-drafts:snapshot-sources -- --source=me.income_tax --concurrency=1`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=me.income_tax`
- `pnpm rules:concrete-drafts:snapshot-sources -- --source=me.ui_wage_report --concurrency=1`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=me.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ms.fiduciary_income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ms.pass_through_entity_tax`
- `pnpm rules:concrete-drafts:inspect -- --source=ms.fiduciary_income_tax --limit=2 --show-source-excerpt`
- `pnpm rules:concrete-drafts:inspect -- --source=ms.pass_through_entity_tax --limit=2 --show-source-excerpt`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mt.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mt.tax_due_dates`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mt.fiduciary_income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mt.pass_through_entity_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mt.withholding_due_dates`
- `pnpm rules:concrete-drafts:inspect -- --source=mt.tax_due_dates --limit=5`
- `pnpm rules:concrete-drafts:inspect -- --source=mt.income_tax --limit=5`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nh.business_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nh.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm check:deps`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nd.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nd.fiduciary_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nd.corporate_income_tax_deadlines`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nd.s_corp_partnership_tax_deadlines`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.individual_estimated_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.fiduciary_income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.corporate_income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.flow_through_entity_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.sales_use_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.withholding_due_dates`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mi.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=pa.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=oh.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=1 --source=oh.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ri.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ri.fiduciary_income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ri.corporate_tax_forms`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ri.sales_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ri.withholding_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ri.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=vt.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=vt.individual_estimated_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=vt.fiduciary_income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=vt.corporate_income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=vt.pass_through_entity_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=1 --source=vt.sales_use_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=vt.withholding_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=vt.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mo.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=tn.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=mn.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ne.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nv.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=1 --source=ne.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nd.sales_use_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nd.withholding_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nm.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=1 --source=nm.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=sc.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=tx.ui_wage_report_due_dates`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ut.ui_wage_report`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=va.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ca.edd_required_filings_due_dates`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ky.tax_calendar_2026`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=la.tax_calendar`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=md.tax_deadlines`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=md.pass_through_entity_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nc.sales_use_due_dates`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=1 --source=nc.sales_use_due_dates`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ms.withholding_tax`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=nc.sales_use_due_dates`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ut.sales_withholding_due_dates`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=fl.cit_due_dates_2026`
- `pnpm rules:concrete-drafts:inspect -- --rule=fl.cit.estimated_tax.2026 --show-source-excerpt`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=1 --source=fl.cit_due_dates_2026`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=fl.cit_due_dates_2026`
- `pnpm rules:concrete-drafts:inspect -- --rule=fl.cit.estimated_tax.2026 --show-source-excerpt`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --concurrency=1 --source=fl.cit_due_dates_2026`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=fed.irs_pub_15_2026`
- `pnpm rules:concrete-drafts:report -- --failures --limit=200 --group-by=jurisdiction,refusal --json`

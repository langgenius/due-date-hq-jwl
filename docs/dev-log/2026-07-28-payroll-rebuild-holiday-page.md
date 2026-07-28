# duedatehq: payroll cluster rebuild + weekend/holiday-rule page

2026-07-28 (second pass — closes the secondary queue)

## Payroll rebuild (344 imp cluster, /guides/payroll-tax-deadlines at pos 68)

Facts verified live on the IRS employment-tax due-dates page (fetched today; quotes in the
page source note): 941 quarterly Apr 30 / Jul 31 / Oct 31 / Jan 31 (+10 days if deposits
timely-in-full); monthly depositors deposit by the 15th of the following month; semiweekly
Wed–Fri paydays → following Wednesday, Sat–Tue → following Friday; $100k accumulated on any
day → next business day; FUTA $500 quarterly threshold with carryover. Title now matches the
query family ("Payroll tax due dates (2026)…" / "When are payroll taxes due?" leads the
description), deposit specifics injected into items + 2 new FAQs + 2 new keyDates rows —
all EN+zh. reviewedOn bumped (real content change).

## New guide: tax-deadline-weekend-holiday-rule (EN+zh)

The §7503 next-business-day rule, verified against the statute text (law.cornell.edu fetch):
Sat/Sun/legal-holiday → next business day; "legal holiday" = DC legal holiday (hence
Emancipation Day moving Tax Day); explicitly includes authorized extensions. State caveat
kept honest (states set their own rules). Targets the evergreen "does the tax deadline move
if it falls on a weekend/holiday" family. Registered via supplementalGuides; sitemap/llms
pick it up automatically; content-metadata entry added.

Verified: build OK, both routes EN+zh render, payroll deposit rules in page, 24/24 tests.

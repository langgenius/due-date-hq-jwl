# marketing: cpafieldguide cross-link — restored, then REVERTED (deletion was intentional)

2026-07-28

## What happened

While answering "besides sending the backlink pitches, what else?", found the 07-22 Tier-3
cross-link (works-with-your-stack → cpafieldguide.com/cpa-software-with-open-api) absent
from source and prod. Git forensics looked like collateral damage: shipped in `b4dad21b1`
(07-22 morning), dropped the same afternoon by `b13854045` ("deep audit — seo-content
vocabulary"), whose commit message and dev-logs never mention the removal.

Restored it verbatim (commit `e5e1e7e31`), verified EN+zh rendering in a dev server — then
found the session memory note from 07-22: the removal was **intentional** ("do not
re-add"). Asked Yuqi; she confirmed: keep it deleted. This commit reverts `e5e1e7e31`'s
component change. Nothing ever reached production (deploy is manual and was not run).

## Standing decision (Yuqi, confirmed 2026-07-28)

duedatehq.com does NOT link to cpafieldguide.com from works-with-your-stack. Presence flows
one way: cpafieldguide carries DueDateHQ (disclosure-box-first), not the reverse.
cpafieldguide's referring domains come from outreach (pitches, community answers), not from
the product site.

## Lesson

Git forensics ("no record of the removal") is not proof of accident — check session memory
and ask before re-shipping something a previous session removed. The absence of a dev-log
entry for the removal was the actual defect; this entry closes that gap.

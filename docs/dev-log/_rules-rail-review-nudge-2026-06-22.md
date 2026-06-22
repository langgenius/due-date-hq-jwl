# Rule library rail — review nudge over neutral filter (2026-06-22)

The rail header's needs-review control was a `FilterTrigger` **dropdown**
("Show │ Needs review ⌄") — a 2-click menu with a chevron for what is really a
binary on/off filter. Per Yuqi: the rail should *encourage* the CPA to review
pending rules, not offer a neutral filter.

`states-rail.tsx`: replaced the dropdown with an inviting **accent `Button`**
(canonical primitive) that only appears when jurisdictions have rules awaiting
review:
- queue dirty → `{N} to review` (accent, 1-click) — focuses the list on the
  jurisdictions needing review (`reviewOnly`).
- focused → `Show all` (ghost) to clear.
- queue clear → nothing renders (quiet = caught up).

Complements the overview's "N rules need your review · Start review" banner +
"Where to start" list — the rail nudge is the persistent one (visible while
drilled into a jurisdiction).

## Copy audit follow-up (same day)

Audited the whole surface's review copy. Every "to review" count speaks in
**rules** (banner "456", cards "19 to review") — except the rail pill, which
counted **jurisdictions** ("52"). Sitting above rows whose dots are rule counts,
"52 to review" misread as 52 rules.

Fix in `states-rail.tsx`:
- Pill count is now `reviewRuleCount` = `sum(it.reviewCount)` — the rule total,
  which equals the sum of the per-row dots the user sees **and** the banner's
  456 (= 479 total − 23 active). `hasReviewWork` (any jurisdiction with work)
  still gates the pill's existence + toggle predicate.
- Dot tooltip harmonized to one phrasing — `title`/`aria-label` both now
  `t\`${reviewCount} rules to review\`` (was "N need review" / "N rules need
  review", an unwrapped i18n gap with two phrasings in one element).
- Deliberate idiom split kept: possessive full sentence in the banner ("need
  your review"); **"to review"** for every count/CTA; "Pending/Awaiting review"
  as state nouns.

`tsgo` clean. Verified live: pill reads "456 to review", toggle → "Show all".

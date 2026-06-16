# Daily Brief — de-densify + remove recap; Alerts pill deep-links to Review

_2026-06-15_

Four pieces of /today feedback from Yuqi, three of which converged on the
`DailyBriefCard`:

1. The "Alerts N" brief pill pointed at the wrong alerts tab.
2. "Since your last visit: 2 completed" — _is this useful?_
3. The Daily Brief card _"can design better."_

## 1 — Alerts pill → Review queue (deterministic deep-link)

The `BriefActionPills` "Alerts" pill linked to bare `/alerts`, leaving the
landing queue (Review vs Active) up to the page's runtime state. The page's
work-queue toggle (`AlertsListPage`) was a plain `useState('review')` with no
URL backing, so the destination couldn't be pinned by the caller.

Fix — make the queue a deep-linkable param:

- `AlertsListPage.tsx`: `workQueue` now lazy-inits from a `?queue=active|review`
  search param (read once on mount via `useSearchParams`); anything but
  `active` falls back to Review (the existing default).
- `daily-brief-card.tsx`: the Alerts pill now targets `/alerts?queue=review` —
  the brief is a "what should I look at" jump, and Review (pending changes to
  read) is the right queue, not the Active apply-queue.

Verified live: `?queue=review` → Review selected, `?queue=active` → Active,
bare `/alerts` → Review (default unchanged). The open-alert → queue sync effect
is unaffected (it only fires when an alert id is in the URL).

## 2 + 3 — De-densify the card; remove the recap entirely

The populated card was doing ~5 jobs in one accent band: AI focus sentence ·
workload counts · "since your last visit" recap · catch-up line · action pills.
Two of those rows were pure duplication of the cards immediately above and
below:

- **Workload counts** (`2 overdue · 1 waiting · 2 due this week`) restated the
  Priorities buckets ~100px below (confirmed live: those buckets read "This
  week · This month · Overdue").
- **Recap** (`Since your last visit: 2 completed`) was backward-looking
  reassurance — completed work asks nothing of a CPA triaging their day, so it
  answers none of the triage questions the surface is built around.

Yuqi's calls: **remove the recap entirely** (not just the "completed" segment),
**de-densify for sure**, and lean **more playful**.

Changes in `daily-brief-card.tsx`:

- Cut `YesterdayLine` (the recap component), the `recap` prop, `recapHasActivity`,
  the lead/secondary recap render branches, and the `recap` term in the
  null-guard. `routes/dashboard.tsx` stops passing `recap={…}`. The
  `DashboardRecap` import is gone.
- Cut `TodayCountsLine` and the `showCounts` prop — the action pills already
  carry overdue/waiting with live counts + deep links, and "due this week" lives
  in the Priorities buckets.
- `nothingToSay` no longer considers the recap: it's now `aiEnabled && failed &&
!text && catchupCount === 0`. The collapsed-tab all-quiet line was reworded
  off the recap framing → "All quiet — nothing new needs your attention right
  now."

Resulting anatomy: **masthead → one lead sentence → catch-up (if any) → action
pills.** One purpose, two redundant rows gone.

Pill labels were also bare adjectives (Yuqi: "waiting deadline? overdue
deadline?") — renamed to name the noun: "Waiting" → **"Waiting on client"** (the
canonical /deadlines status label) and "Overdue" → **"Overdue deadlines"**.
"Alerts" stays (already a noun, mirrors the section above).

### Playful: masthead identity carries into the expanded state

Previously the morning-paper personality (newspaper glyph + hover-tilt) lived
ONLY on the collapsed tab; the expanded card was a plain title in a blue box.
Now the `NewspaperIcon` masthead glyph leads the expanded title too, in accent
(`text-text-accent` — the card's one chromatic mark), with a hover-tilt tied to
the section's `group` (`group-hover:-rotate-6`, `motion-reduce`-guarded). So
collapse↔expand reads as the same edition folding and unfolding.

## Verified live (preview, 1280)

- Alerts pill href = `/alerts?queue=review`; all three queue-param cases select
  the right tab.
- Expanded card renders masthead (accent glyph + "Daily Brief") + pills, with no
  counts line and no recap. No console errors from the touched files.
- New all-quiet copy renders on the collapsed tab.

## Follow-up

`lingui extract` is still pending — it scans all source files and a parallel
session's `AlertDetailDrawer.tsx` was mid-edit (unparseable) at the time, so
extraction has to wait until that file is valid. Runtime is unaffected (Trans
macro fallback). New string: the all-quiet copy; removed: the recap plurals +
the workload-count plurals (where not used elsewhere).

# /today — scope toggle, LIVE chip, single-screen frame

_2026-06-20 · page feedback on /today_

## 1. Scope toggle — elevated (feedback: "polish this toggle; it's more special than other toggles")

The page-level "My work / Everyone" scope switch governs the whole page (brief +
priorities + every count), so it earns a more deliberate treatment than the plain
text Segmenteds elsewhere and the local "This week/month/Overdue" bucket toggle
below it. Added person iconography via the Segmented `icon` prop — `UserIcon`
(one) ↔ `UsersIcon` (many) — so it reads as the "whose work" control at a glance.
Canon-clean: the supported `icon` prop, no `[&>button]` overrides (§4.11).

## 2. LIVE chip — stronger (feedback: "stronger live status design")

`MonitoringChip`'s "LIVE" pill used `<PulsingDot>`, which is deliberately a FLAT
static dot ("a calm status color, not a heartbeat" — it's reused in many passive
status contexts, so it shouldn't pulse globally). Gave the LIVE chip its OWN
heartbeat instead: a saturated core dot + an expanding/fading **ping ring**
(`animate-ping`, `bg-current` inheriting the chip's success green,
`motion-reduce:hidden` so the steady core carries it for reduced-motion). LIVE is
the 24/7-monitor signal — the product's core promise — so it earns the motion.
Dropped the now-unused `PulsingDot` import.

## 3. Dashboard fits one screen (feedback: "this is the dashboard, should not be scrollable")

Measured first: at 1512×861 the page already fit with light data (748px); it only
overflowed with a 5-row Priorities bucket (~900px). The page rhythm (`pt-8 pb-12`,
`gap-8`) is locked canon, so the fix is to bound the variable region, not trim
whitespace.

`/today` is now a **bounded-height frame at desktop (xl+)**: the container fills
`<main>`'s height (`xl:h-full xl:min-h-0`) and the Priorities section
(`MergedBriefCard`, given `xl:flex-1 xl:min-h-0`) absorbs the leftover height; its
table wrapper gets `xl:shrink xl:min-h-0 xl:overflow-y-auto` so the rows scroll
**internally** — the dashboard page itself never scrolls. Header / Alerts / Daily
Brief keep their natural height (no `min-h-0` → flex won't squeeze them). `shrink`
(not `flex-1`) on the table wrapper so a _short_ list stays its natural height
instead of stretching into an empty bordered box. Below xl the frame drops and the
page scrolls normally (correct for tablet/mobile). Alerts (3 + "View all") and
Priorities (5 + "See all deadlines") were already capped.

Verified live (1512×861): 5-row bucket → page overflow 0, table scrolls internally;
2-row bucket → page overflow 0, table natural height, room below. tsgo 0; build
green; no new i18n strings.

# Alert detail → Pencil MASYz · structure pass (hero + Change section)

_2026-06-15_

Rebuilding the `/alerts/[id]` detail body to match Pencil node **MASYz**
("DetailBody [agent]"). Scope this pass: the `review_only` variant's hero +
the Change section + the section-numbering shell. Other alert-type machinery
(date-diff card, affected-clients table, Apply gate) is untouched — Yuqi is
sending those variant designs separately.

## What changed

**`DetailSectionCard`** — new optional `index` (numbered 1·2·3 badge) and
`caption` (quiet purpose line after the title) for the flat variant.

**Hero (`AlertDetailDrawer`)**
- Added the **"Needs your decision"** eyebrow pill (flag icon, accent
  container) — shown only while the alert is awaiting a decision (`matched`).
- Sections renamed + numbered with captions: **1 Change** (what changed and
  what to verify) · **2 Source** (where this came from) · **3 Activity**
  (everything that has happened). Numbering derives from the scroll-spy order so
  it stays correct when the optional Clients section is present.
- Scroll-spy gains the **"Scroll to read all N sections"** hint.

**Key fact (`AlertStructuredFields`)**
- Hero do-by-when is now a single red **"Act by {date} · N days left"** chip
  (was the "Claim window closes" line).
- **Change** section: a **"Parsed fields"** sub-header (bold left + "AI parsed —
  verify before Apply" right), fact grid **2-col → 3-col**, **Evidence to
  gather** restyled as a quiet gray panel (clipboard + per-row doc icons), and
  **Legal uncertainty** restored to a left-rule caveat (bold label + prose).

## Verified live (1465px, isolated app-5177)

Protective-claim alert detail matches MASYz for the hero + Change section:
eyebrow, red Act-by chip, lifecycle strip, numbered sections, Parsed-fields
header, 3-col grid, gray Evidence box, left-rule Legal uncertainty. tsgo +
eslint clean. Screenshot in session.

## Stage 4–5 (commit 319c4c03)

- **Source** → structured source card (institution mark + feed name +
  jurisdiction + Open original; hairline meta row w/ published date + compact
  URL), gray quote box (hover-copy kept), provenance meta grid (Captured ·
  Parse confidence). **"Detected by {monitor}" omitted** — PulseDetail carries
  only opaque rule IDs, no monitor NAME, so rendering one would be fiction
  (eng gap: a monitor/rule-name field would let this cell return).
- **Activity** → MASYz vertical stepper in a bordered card: Monitored / AI
  parsed / Matched / Awaiting your decision / Applied, green-check / blue-target
  / hollow-ring markers, right-aligned timestamps, audit-ledger footer. Matched
  always renders (mirrors the hero lifecycle) with the real obligation count or
  "No current client impact". **Team notes kept** below the timeline (real
  feature; MASYz doesn't depict it).

## Review-queue emphasis (commit c0383af5)

Separate Yuqi feedback on the rail: the Review work-queue count now renders as a
notification-style accent badge when > 0 (rail toggle + main list toolbar) so
the human-judgment queue pulls the eye.

## Not done

- **Stage 6 — decision card terminus + docking footer.** Actions move into a
  closing decision card at the document end; the action bar becomes
  `position: sticky; bottom: 0` so it floats at the viewport bottom then docks
  into the card (Yuqi's chosen IA — "single card at bottom"). Architectural
  change to the scroll/footer structure + a design call on the terminus card's
  copy — do as a focused pass. Read-gate (Source-seen → stronger Apply
  confirmation) lands with the `due_date_overlay` variant.

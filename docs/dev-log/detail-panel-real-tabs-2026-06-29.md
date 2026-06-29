# Deadline + Alert detail panels — scroll-spy nav → real tab-switching (+ keyboard/ARIA, IA restructure)

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx` (deadline detail tabs + 5-tab restructure)
- `apps/app/src/features/alerts/AlertDetailDrawer.tsx` (alert detail tabs + Change/Source/Activity grouping)
- `apps/app/src/components/patterns/detail-section-card.tsx` (new optional `role`/`ariaLabelledby` props)

## Why

Yuqi on the deadline detail: _"i found it hard to navigate."_ Both detail panels used a **scroll-spy
nav disguised as tabs** — a bar that looked like tabs but only scroll-jumped within one long column
(deadline ~5 sections; alert ~4500px with two ~1700px sections). The bar promised tab semantics it
didn't deliver, and on the deadline the giant Materials section meant Record/Activity were a long
scroll away. Then: _"can you push it further?"_ and _"should this apply to the Alert panel too?"_

## What changed

### Deadline detail (panel/page surfaces; legacy `sheet` keeps scroll-spy)

- **Real tab-switching** — only the active `deadline-section-*` mounts (gate each `<section>` on
  `!panelLayout || activeTab === tab`). Restores the pre-2026-06-16 real-tabs behaviour the file was
  built for (`scrollbar-gutter:stable` + per-tab-height comments).
- **Proper ARIA tablist** — `role=tablist/tab/tabpanel`, roving `tabindex`, `aria-selected`,
  `aria-controls`; **arrow-key nav** (←/→/↑/↓/Home/End, automatic activation). Focus follows the
  selection via a **post-commit effect, NOT `requestAnimationFrame`** (rAF is throttled to ~0 in
  background tabs, which stranded focus on the old tab — caught in testing).
- **Directional slide motion** (`tabContentMotion`) — a later tab enters from the right, an earlier
  one from the left, so the strip reads as a left-to-right map. Honours reduced-motion.
- **Underline** drives off `activeTab` (not the old scroll-spy `activeSection`) in panelLayout.
- **IA: 4 → up to 5 specific tabs** (Yuqi: _"more tabs, each more specific > fewer long ones"_).
  Order **Status · Materials · Extension · Record · Activity**. **Extension** is its own *conditional*
  tab (only when the matched rule allows an extension or one's filed) — un-folded from Status; the
  full standalone `deadline-section-extension` panel serves it, and the panel-only embedded fold in
  Status was deleted. **Status is now pure workflow**: "What's left" (Materials owns the checklist)
  and "Recent activity" (Activity owns the timeline) are now sheet-only; Reference dates gated to the
  Status tab so it stops repeating on every tab. Reverses the "locked 4 tabs" decision (consciously).
- **Padding fix** — the flush "Recent activity" rows had no horizontal padding, hanging ~20px left of
  the header band; restored `px-5` (full-bleed dividers + inset content).

### Alert detail (panel mode only; off-route `sheet` keeps scroll-spy)

- Same real tab-switching + keyboard/ARIA, gated on `const useTabs = mode === 'panel'`.
- **3 tabs: Change · Source · Activity.** The decision-critical **Affected clients** group folds INTO
  the Change tab (`isFactsTab && showClientsGroup`) — not its own tab — so "what changed + who's
  affected" stay co-visible, honouring the original 2026-06-12 "facts + clients must be seen together"
  rationale; only the long reference (Source/Activity) splits off. The decision region (hero +
  lifecycle stepper) and the sticky decision footer stay OUTSIDE the tabs, always visible.

### Shared primitive

- `DetailSectionCard` gained optional `role` + `ariaLabelledby` (typed `string | undefined` for
  `exactOptionalPropertyTypes`) so a card can BE a tabpanel. Defaulted off — no effect elsewhere.

## Verification

Live-verified both panels: tab switching, only-active-mounts, URL deep-links (deadline), arrow-key
nav with focus-follow, conditional Extension tab (filing rows show 5 tabs; a payment row shows 3),
cross-links still navigate. `tsgo` clean. No console/runtime errors.

## Follow-ups

- Mobile `sheet` mode still scroll-spy on both panels (deliberate; revisit if wanted).
- Alert "Affected clients"-on-Change-tab couldn't be visually confirmed (demo seed has no alert with
  a populated affected-clients overlay) — logic verified + typechecks.

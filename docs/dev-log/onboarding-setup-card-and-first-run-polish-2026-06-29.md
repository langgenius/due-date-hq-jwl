# Onboarding — sidebar setup card cohesion + static step icons + grounded first-run chooser

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/dashboard/sidebar-setup-card.tsx`
- `apps/app/src/features/dashboard/setup-step-icon.tsx`
- `apps/app/src/routes/dashboard.tsx` (first-run block width cap)

## Why

Yuqi (login/onboarding QA), three points:

1. _"sidebar中的setup和剩下的内容和UI都格格不入。icon也用的不合适"_ — the sidebar
   setup card clashed with the rest of the (cool, flat) rail, and its icons were
   wrong.
2. _"the loading icon before add client does not make sense"_ — a spinning loader
   used as a "to-do" step marker read as _loading_.
3. _"empty感觉很乱。各种元素也都是乱飘"_ — the first-run `/today` empty state felt
   messy, elements floating unanchored.

## What changed

### 1) Sidebar setup card → speaks the cool utility-rail vocabulary

- **Surface:** warm stone well (`bg-background-well-warm` / `border-divider-warm`)
  → cool `bg-background-section` + `border-divider-regular`, so it sits _in_ the
  rail's cool `#f6f8fa` palette instead of reading as a warm foreign card. (The
  larger `/today` `SetupProgressCard` keeps the warm well — that's a delight
  surface; the rail is utility.)
- **Leading glyph:** duotone brand `RocketIcon` → a small inline **progress ring**
  (the app-wide `StatusRing` language — a navy arc that fills with progress).
  Removes a delight-only duotone glyph from a utility surface.
- Dropped the 20-tick cyan→navy `TickProgress` gradient bar (loudest clash on the
  calm rail); the ring now carries progress.

### 2) `SetupStepIcon` — static markers, no spinner (both variants)

A perpetually spinning `LoaderIcon` for the "next" step read as "loading…" and
its motion fought the otherwise-still cards. Now static:

- **done** → green `CircleCheck` (unchanged)
- **next** → accent `CircleDot` (default) / dashed circle in a stronger tone
  (sidebar) — "you are here", no spin
- **later** → quiet dashed `CircleDashed`

Only motion left is the existing scale-in pop when a step flips to done.

### 3) First-run chooser — one grounded column

`CreateChoiceCards` sprawled to the full `max-w-page-expanded` width while the
heading sat in a narrow `max-w-xl` column — the cards floated free of their own
title. Capped the first-run block to `max-w-5xl` so heading + cards share one
edge and the three cards settle at a comfortable ~330px each.

## Notes

- `cn()` font-size / token discipline unaffected; all semantic tokens.
- `tsgo --noEmit` clean for `apps/app`; HMR verified on the running dev server.

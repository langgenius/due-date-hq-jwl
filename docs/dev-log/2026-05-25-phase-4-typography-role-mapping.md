# 2026-05-25 — Phase 4: typography role mapping (3 items)

## Why

Phase 4 of Yuqi's 89-item review — typography rationalization. Many
of the original "bigger text / smaller text" complaints (#13, #14,
#22 inside the Pulse drawer) were already closed in Phase 2 when
that drawer was rebuilt. What remained were three specific scale
mismatches:

- **#25** — Dashboard `ActionRow` client name was wrapped in a
  badge-styled span (border + bg-subtle) that read like a status
  label, not the client. Yuqi: "客户名字可以更dominant一些… 你需要
  更加'传统'地显示客户名字."
- **#27** — Obligation drawer `ActiveStageDetailCard` stage label
  ("Filed", "In review", etc.) rendered at `text-sm font-semibold`
  (14px) — the h3 of the card was sized like inline chrome.
- **#28, #29** — Inside the same stage card, the "Steps" eyebrow
  was `text-caption-xs` (10px) and the step list items were
  `text-xs` (12px). Inconsistent with the rest of the card's
  rhythm; the eyebrow was sub-visible.

## What changed

### `apps/app/src/features/dashboard/actions-list.tsx`

`ActionRow` client name promoted from badge-styled
`text-sm text-text-secondary` (with chip background) to plain
`text-base font-semibold text-text-primary`. The prompt that
follows demotes to `text-base text-text-secondary` with a middot
separator between them. Reads like an email list-item: client name
is the subject, the action prompt is the body.

### `apps/app/src/routes/obligations.tsx`

**Stage card h3** — `text-sm leading-tight` → `text-base leading-tight`.
Sub-status follows on the same line at the same size so the whole
heading reads as one unit. The "Entered DATE" subline stays at
`text-xs` as quiet metadata.

**Steps section** — eyebrow promoted from `text-caption-xs` (10px)
→ `text-caption` (11px), matching the "Entered DATE" subline scale.
Step list items promoted from `text-xs` (12px) → `text-sm` (14px)
so they sit comfortably below the stage h3 but above the eyebrow.
List gap bumped `gap-1` → `gap-1.5` to breathe at the new size.

### `docs/Design/DueDateHQ-DESIGN.md`

Added a **role → token mapping** addendum to §3.2 that pins:

- h1 → `text-2xl`
- h2 → `text-xl`
- h3 (card title) → `text-base` / `text-lg`
- body / body-strong / body-secondary → `text-base` regular /
  `text-base` semibold / `text-sm` regular
- tile value → `text-xl`
- eyebrow → `text-caption`
- caption-xs → `text-caption-xs`

With an explicit rule: when you need to differentiate two adjacent
strings (heading vs supporting copy), **change the token AND the
weight** — not just the weight. If they share a token, the
hierarchy reads flat.

Per `feedback_design_docs_on_change` memory rule.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint` 0/0 (664 files)
- Pre-existing test config issue on `actions-list.test.tsx`
  (`@/i18n/bootstrap` import path) — unrelated to this change

## Closes Yuqi review items

- Today: **#25, #27, #28, #29** (4 items — promoted from Phase 4)

Combined with Phase 1 (7), Phase 2 (13), Phase 3 (8), and these 4
items, the review is at **32 / 89**.

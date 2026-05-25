---
title: 'IA copy batch — Inbox / Settings / Audit breadcrumb / Cmd+K placeholder'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: app-shell
---

# Four small IA truths (critique P2 — clarify)

## Why

The critique flagged four micro-IA inconsistencies — none catastrophic
alone, but each one was a small lie the surface was telling about
itself. Batched into one commit because they share a tone and a
review scope.

| #   | Lie                                                                                                                          | Surface          |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | `Inbox` headline + `Inbox` Card title duplicated on the same page                                                            | `/notifications` |
| 2   | Page subtitle pointed at a _second_ settings home before the user had explored the first one                                 | `/settings`      |
| 3   | Breadcrumb said `SETTINGS > AUDIT LOG`, but Audit log is a top-level sidebar destination — the parent crumb didn't exist     | `/audit`         |
| 4   | Cmd+K placeholder promised `Search, ask, or navigate` but the "ask" group was removed earlier when the assistant didn't ship | global           |

## What changed

### 1. `notifications-page.tsx` — drop duplicate "Inbox" CardTitle

The `PageHeader` already names the page; repeating it inside the only
Card on the page just says the same word twice. Dropped the
`<CardHeader>`/`<CardTitle>` block (and the now-unused imports) and
added `pt-6` to the surviving `<CardContent>` to keep the same top
spacing.

### 2. `settings.tsx` — drop the "two settings homes" hint

Page subtitle used to read:

> Workspace configuration for this practice — identity, team,
> billing, compliance, and automation. **Personal account settings
> live in the user menu in the sidebar footer.**

The trailing sentence pointed a first-timer at a _different_ settings
home before they'd explored the one they were already on. The
sidebar's user menu is its own discoverable surface; the subtitle
should describe what's on this page, not where to look elsewhere.
Trimmed to the first sentence only.

### 3. `audit-log-page.tsx` — drop the `Settings` breadcrumb

The breadcrumb claimed `Settings > Audit log`. Audit log is a
top-level sidebar destination (see `app-shell-nav.tsx`), not a child
of Settings. The crumb was inherited from when the page only lived
inside the Settings hub. The Settings landing page still links to
`/audit` under Compliance — that's an inbound link, not a parent-
child relationship. Removed the breadcrumbs prop.

### 4. `CommandPalette.tsx` + `KeyboardProvider.tsx` — drop "ask"

Placeholder and description used to read `Search, ask, or navigate.`
The "ask" group was removed earlier (see the in-source comment at
`CommandPalette.tsx:256` referencing the removed "Ask DueDateHQ"
placeholder). The copy never caught up. Typing "what's overdue?"
today returned **"No commands found."** — a quiet discoverability
lie that eroded trust in the rest of the palette.

Replaced with `Search or navigate.` everywhere (three sites: dialog
description, input placeholder, KeyboardProvider meta description).
Restore "ask" when an assistant actually lands.

## How to verify

- `/notifications` → page renders with one "Inbox" header, not two.
- `/settings` → subtitle stops mid-sentence after "automation."; no
  reference to a separate personal settings home.
- `/audit` → no breadcrumb above the "Audit log" title.
- `Cmd+K` palette → placeholder reads `Search or navigate...`.

## Out of scope

- The `messages.po` regeneration. The msgid in en should auto-update
  once `i18n:extract` runs in CI; the source string in the macro is
  the canonical reference and Lingui's fallback. zh-CN translation
  drift will be caught by `pnpm --filter @duedatehq/app i18n:compile
--strict`.
- The `Inbox` vs `Notifications` URL split — page is titled Inbox at
  `/notifications`. Either renames the route to `/inbox` or accepts
  the URL/title mismatch as deliberate (URL = system noun,
  title = user noun). Defer until route stability is more important.

## Files touched

- M `apps/app/src/features/notifications/notifications-page.tsx`
- M `apps/app/src/routes/settings.tsx`
- M `apps/app/src/features/audit/audit-log-page.tsx`
- M `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
- M `apps/app/src/components/patterns/keyboard-shell/KeyboardProvider.tsx`

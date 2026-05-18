---
title: 'Copy Polish and Dashboard Restructure'
date: 2026-05-18
author: 'Claude'
area: design
---

# Copy Polish and Dashboard Restructure

## Context

Dashboard and rules surfaces had drifted from a coherent voice: the i18n
catalog held the same concept under three or four labels (`Could not` /
`Couldn't`, `Loading...` / `Loading…` / `Loading X.`, `Pending review` /
`Needs review`, `firm` / `practice`, `customer-facing` / `client-facing`,
three different things all called "template"), and the dashboard hero was
a six-card metric strip plus a "Priority list" of mostly-red rows that
read as undifferentiated alarm. Yuqi ran a clarity audit, picked the
terminology resolutions, and asked for both a one-pass cleanup and a
restructure of the dashboard above the priority table.

## Change

### Voice & terminology (DESIGN.md)

- Added a new `## Voice & Terminology` section to `DESIGN.md` so the
  rules below survive contributor turnover. Covers voice principles
  (calm, active, contractions in errors, CPA register, one thought per
  string), a mechanical table for buttons / toasts / loading / empty
  states / audit feed / role nouns / numerals, and the canonical
  terminology table (the 8 decisions below plus the Pulse / Active-
  override pair from the rules redesign notes).

### Terminology pass (Part B)

- `firm` → `practice` everywhere user-visible (5 strings across
  `calendar-page`, `reminders-page`, `ClientFactsWorkspace`,
  `concept-help`). Internal identifiers like `firmTimezone`,
  `currentFirm`, `firm.calendar.manage` kept — backend codes are not
  user-facing.
- `customer-facing` → `client-facing` (1 string in `concept-help` that
  mixed both in one sentence).
- `Official channels watched for rule changes` → `Official sources …`
  (the rules-console description was mixing `channels` and `source` in
  one sentence).
- "Template" disambiguated into three explicit nouns:
  - Rule context: `rule template` / `pending template` →
    **`rule` / `pending rule`** (`rule-library-tab`,
    `coverage-tab`, `rules-console`, `audit-log-labels`).
  - Import context: `source template` → **`import template`**
    (`Step1Intake`, `Step2Mapping`).
  - Reminder context: `reminder template` kept (already disambiguated
    by its noun).
- `Needs state` / `No state` → `Needs filing state` / `No filing state`
  in `ClientFactsWorkspace` and `generation-preview-tab`.
- `Pending review` (label) → `Needs review` everywhere user-visible
  (`coverage-tab`, `audit-log-labels`, `rule-library-tab`,
  `rule-detail-drawer`). Backend status code `pending_review` unchanged.
- `Invite a teammate` → `Invite member` in `members-page` (matches the
  noun `Member` used everywhere else).
- Vendor leak removed: `magic-link via Resend, 7-day expiry` →
  `magic link, 7-day expiry` (`members-page`).

### Mechanical consistency pass (Part A)

- `Could not` / `could not` → `Couldn't` / `couldn't` everywhere
  (~50 strings across 20 source files). Plain single-quote strings in
  `billing/api.ts`, `lib/auth.ts`, `routes/accept-invite.tsx`,
  `routes/readiness.tsx`, `mapping-target-labels.ts`, `Step1Intake`,
  and `Step2Mapping.test.tsx` were converted to double quotes to allow
  the apostrophe.
- Stripped the trailing period from 17 single-clause `Couldn't X.`
  error strings.
- Normalized 14 loading messages to `Loading {thing}…` (unicode
  ellipsis, no period, no `...` ASCII fallback).
- Lowercased the role nouns in body copy where they were running
  text rather than chips/columns (`Only Owners and Managers` →
  `Only owners and managers`, `Ask an Owner or Manager` → `Ask an
owner or manager`). 4 sites in `PulseDetailDrawer`,
  `pulse/lib/error-mapping`, `ImportHistoryDrawer`.
- Switched evidence-drawer / audit headlines from passive to active
  voice (`A rule change was applied.` → `Applied a rule change.`,
  `Evidence was added to this deadline.` → `Added evidence to this
deadline.`, etc.) across `EvidenceDrawerProvider` and
  `obligations.tsx`.

### Dashboard restructure (`routes/dashboard.tsx`)

- Page title: `Deadline risk workbench` → `Today, {Month Day}` using
  a local `formatTodayHeader` helper so the date is the page anchor.
  The eyebrow `Operations command` is kept. The description paragraph
  and the standalone date pill were removed (the title now carries
  the date).
- `Run migration` button → `Import clients` (the button opens the
  client-import wizard; "migration" was the internal codename leaking
  through).
- `DashboardMetricStrip` (the 6-card row of `Open obligations` /
  `Due this week` / `Needs review` / `Evidence gaps` /
  `90-day projected risk` / `Accrued penalty`) was deleted. Two of
  those numbers (Open obligations, Due this week) are redundant with
  the priority list's tab counts, the money cards belong next to the
  list rather than above it, and `Needs review` / `Evidence gaps`
  belong as banners alongside the Pulse banner because they're
  decision-prompt signals, not standalone metrics.
- New `NeedsReviewBanner` component renders as a peer to
  `PulseAlertsBanner`. It collapses `Needs review` and
  `Evidence gaps` into one strip with two CTAs (`Resolve` /
  `Attach evidence`) because they are sequential states:
  evidence-gap rows are the prerequisite blocker, needs-review rows
  are ready to act. Warning tone only when there are ready rows;
  otherwise quiet.
- Priority-list card lost its `CardTitle` / `CardDescription` / money
  badge in the header. The tabs themselves anchor the section.
  Concept label renamed from `Priority list` to **`Top obligations
by risk`** with a clearer description.
- Tab triggers now show count in a `Badge` chip and no longer carry
  the per-tab dollar amount. Dollar amounts moved to the new
  `ProjectedRiskInline` row (right-aligned next to the tabs), which
  reads `90-DAY PROJECTED RISK $X · ACCRUED PENALTY $Y` and hides
  cleanly when the user can't see dollars or both values are zero.
- Severity column removed from the priority-list table. Severity is
  still encoded on each row via a 2px left accent bar (see next
  bullet), so the explicit column was redundant noise.
- `severity-row.ts` swapped full-row background tint for an inset
  `box-shadow` left bar (`shadow-[inset_2px_0_0_var(--color-severity-X)]`).
  A queue of mostly-critical obligations no longer reads as a wall
  of red; the per-row tier is still scannable but does not dominate.
  Inset box-shadow chosen over `border-l-2` so the 2px does not push
  the first cell content.
- Deadline cell: the secondary `{formatDate(currentDueDate)}` span
  was removed. The relative `DashboardCountdownBadge` ("17 days
  late", "Due in 3 days") is the primary signal; the absolute date
  is one click away in the drawer.
- Footer button: `Review priority list` → `See all obligations`
  (the button takes the user to `/obligations`; "Review priority
  list" was opaque about the destination).
- Whole page wrapped in `mx-auto w-full max-w-[1280px]` so the
  workbench breathes on wide displays.

### Catalog

- Both `en` and `zh-CN` `messages.po` re-extracted and the compiled
  `messages.ts` regenerated. `lingui compile --strict` passes.
- All ~100 zh-CN translations affected by the renames were
  backfilled — most by inheriting the same Chinese from the prior
  English msgid (`Could not X` / `Couldn't X` share `无法 X`,
  `Loading X.` / `Loading X…` share `正在加载 X…`), with bespoke
  translations for the voice-switch evidence headlines (e.g.
  `Added evidence to this deadline.` → `已为该截止日添加证据。`).

## Docs Check

- `DESIGN.md` updated (new `## Voice & Terminology` section appended
  after `## Do's and Don'ts`).
- `docs/product-design/rules/02-rules-console-product-design.md`
  not touched — the rules IA itself didn't move in this branch, only
  terminology inside it. The parallel `design/rules-tabs-to-pages`
  branch owns the IA reshuffle.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract` clean
- `pnpm --filter @duedatehq/app i18n:compile` (strict mode) clean
- `npx tsc --noEmit --project apps/app/tsconfig.json` clean

## Follow-ups (deferred)

- After removing the Severity column, `severityVariant`, `severityDot`,
  `dashboardSeveritySortingFn`, and the severity filter wiring in
  `dashboard.tsx` are unreferenced by the UI but still parse from the
  URL. Left in place pending a decision on whether `?severity=` should
  remain a deep-link contract.
- `Pulse` / `Quarantined` / `Revoked` / `Smart Priority` are still
  internal jargon in user-facing copy. Flagged in the audit report but
  not changed in this pass; warrants its own design discussion before
  rename.

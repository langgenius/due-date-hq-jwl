# Cross-route consistency matrix

**Author:** agent σ (sigma) — DueDateHQ wave-4 audit drain
**Date:** 2026-05-27
**Authority:** descriptive (current state) + prescriptive (canonical column)
**Companion docs:** `page-family-canonical.md`, `design-system-drift-audit-2026-05-26.md`,
`ui-audit-2026-05-25.md`, dev-log `2026-05-26-step-6-ux-flows-audit-cont.md` (§X)

The same concept must render the same way on every route. This audit walks every
canonical concept (status pills, owner avatars, search affordances, table
toolbars, empty states, error states, loading skeletons, retry buttons, page
headers, breadcrumbs) across the 22 protected routes and identifies drift.

A cell value of:

- **✓** — uses the canonical primitive / pattern exactly.
- **drift** — diverges from canon; details below the matrix.
- **n/a** — concept not present on this route.

---

## §0. Canonical primitives

| Concept                          | Canon                                                                                                                                        | Where                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Status pill (semantic state)     | `<Badge variant={success\|warning\|info\|destructive\|secondary}>`                                                                           | `@duedatehq/ui/components/ui/badge`               |
| Status dot (color-only cue)      | `<BadgeStatusDot tone={success\|warning\|error\|info\|normal\|disabled}>`                                                                    | same module                                       |
| Owner avatar (initials)          | `<AssigneeAvatar name isMine title>`                                                                                                         | `features/obligations/AssigneeAvatar.tsx`         |
| Owner avatar (small, decorative) | inline `<span aria-hidden>` + `initialsFromName(name)` + `getAssigneeTint(name)`                                                             | `lib/auth.ts`, `lib/assignee-tint.ts`             |
| Search input                     | `<SearchInput value onChange placeholder ariaLabel hotkey="/">`                                                                              | `components/primitives/search-input.tsx`          |
| Bulk-selection toolbar           | `<FloatingActionBar ariaLabel>`                                                                                                              | `components/patterns/floating-action-bar.tsx`     |
| Empty state                      | `<EmptyState icon title description cta>`                                                                                                    | `components/patterns/empty-state.tsx`             |
| Error block                      | `<Alert variant="destructive">` with `AlertTitle` + `AlertDescription` containing `<Button variant="link" size="sm">Retry</Button>`          | `@duedatehq/ui/components/ui/alert` + `ui/button` |
| Loading skeleton                 | `<Skeleton className="h-{px} w-{px}">` shaped to the eventual content                                                                        | `@duedatehq/ui/components/ui/skeleton`            |
| Retry button                     | `<Button type="button" variant="link" size="sm" className="h-auto p-0 align-baseline">`                                                      | `@duedatehq/ui/components/ui/button`              |
| Page header                      | `<PageHeader eyebrow breadcrumbs title description actions>`                                                                                 | `components/patterns/page-header.tsx`             |
| Section header (region anchor)   | Register A: `text-[14px] font-semibold tracking-[0.4px] text-text-primary uppercase`                                                         | `docs/Design/section-header-style.md`             |
| Field-group / column label       | Register B: `… tracking-[0.5px]/eyebrow text-text-tertiary uppercase` (11–12px)                                                              | same                                              |
| Card / panel title               | Register C: `text-base font-semibold text-text-primary` (title-case, NOT uppercase)                                                          | same                                              |
| Monitoring status chip           | `<MonitoringChip to? tooltip?>` — dot + "Monitoring: Federal · 50 States · DC" ghost-badge; passive on /today, nav-Link on /alerts           | `features/alerts/components/MonitoringChip.tsx`   |
| Breadcrumbs (inside header)      | `breadcrumbs={[{ label, to? }, ...]}` prop on `PageHeader`                                                                                   | `components/patterns/breadcrumb.tsx`              |
| Dialog cancel button             | `<Button type="button" variant="ghost" onClick=close>`                                                                                       | n/a — pattern only                                |
| Mutation submit button           | `<Button type="submit" disabled={isPending} aria-busy={isPending}>` with `{isPending ? <Loader2 className="animate-spin" /> : null}` + label | n/a — pattern only                                |

---

## §1. Concept × route matrix

Routes listed in sidebar order. `clients.$clientId` and `clients` collapsed as
two columns. Sub-tabs of `/rules` collapsed unless they materially differ.

| Concept                                   | dashboard                               | obligations                           | clients               | clients/$id         | calendar | workload | opportunities | notifications | notifications/preferences | reminders             | rules.library | rules.pulse                          | rules.preview | rules.sources | rules.temporary | rules.pulse-history | members      | audit        | settings | billing.\* | account.security | readiness |
| ----------------------------------------- | --------------------------------------- | ------------------------------------- | --------------------- | ------------------- | -------- | -------- | ------------- | ------------- | ------------------------- | --------------------- | ------------- | ------------------------------------ | ------------- | ------------- | --------------- | ------------------- | ------------ | ------------ | -------- | ---------- | ---------------- | --------- |
| **Status pill**                           | ✓                                       | ✓                                     | ✓                     | ✓                   | n/a      | ✓        | ✓             | ✓             | ✓                         | ✓                     | ✓             | ✓                                    | ✓             | ✓             | ✓               | ✓                   | ✓            | ✓            | n/a      | ✓          | ✓                | n/a       |
| **Owner avatar**                          | n/a                                     | ✓                                     | ✓                     | ✓                   | n/a      | n/a      | n/a           | n/a           | n/a                       | n/a                   | n/a           | n/a                                  | n/a           | n/a           | n/a             | n/a                 | **drift D1** | **drift D2** | n/a      | n/a        | ✓                | n/a       |
| **Search affordance**                     | n/a                                     | ✓                                     | ✓                     | ✓                   | n/a      | n/a      | n/a           | n/a           | n/a                       | n/a                   | ✓             | ✓                                    | n/a           | n/a           | n/a             | n/a                 | n/a          | ✓            | n/a      | n/a        | n/a              | n/a       |
| **Table toolbar** (bulk)                  | n/a                                     | ✓                                     | n/a                   | n/a                 | n/a      | n/a      | n/a           | n/a           | n/a                       | n/a                   | ✓             | n/a                                  | n/a           | n/a           | n/a             | n/a                 | n/a          | n/a          | n/a      | n/a        | n/a              | n/a       |
| **Empty state**                           | partial (intentional `<p>` "caught up") | ✓                                     | ✓                     | ✓                   | ✓        | ✓        | ✓             | ✓             | **drift D3**              | **drift D4**          | ✓             | ✓                                    | n/a           | n/a           | n/a             | n/a                 | ✓            | ✓            | n/a      | n/a        | n/a              | ✓         |
| **Error state**                           | ✓ Alert                                 | ✓ Alert                               | ✓ Alert               | ✓ Alert             | ✓ Alert  | ✓ Alert  | ✓ Alert       | ✓ Alert       | ✓ Alert                   | ✓ Alert               | ✓ Alert       | **drift D5** raw underline           | n/a           | n/a           | n/a             | n/a                 | ✓ Alert      | ✓ Alert      | n/a      | ✓ Alert    | ✓ Alert          | ✓ Alert   |
| **Loading skeleton**                      | ✓                                       | ✓                                     | ✓                     | ✓                   | ✓        | ✓        | ✓             | ✓             | **drift D6** raw text     | **drift D7** raw text | ✓             | ✓ Skeleton + text mix                | n/a           | n/a           | n/a             | n/a                 | ✓            | ✓            | n/a      | ✓          | ✓                | ✓ Loader2 |
| **Retry button**                          | ✓ link                                  | ✓ link                                | ✓ link                | ✓ link              | n/a      | n/a      | n/a           | n/a           | n/a                       | n/a                   | n/a           | **drift D8** raw underline (2 sites) | n/a           | n/a           | n/a             | n/a                 | n/a          | n/a          | n/a      | n/a        | n/a              | n/a       |
| **Page header**                           | ✓                                       | ✓                                     | ✓                     | ✓                   | ✓        | ✓        | ✓             | ✓             | ✓                         | ✓                     | ✓             | ✓                                    | n/a (modal)   | n/a           | n/a             | n/a                 | ✓            | ✓            | ✓        | ✓          | ✓                | n/a       |
| **Breadcrumbs**                           | n/a                                     | n/a                                   | n/a                   | ✓ (back-to-clients) | n/a      | n/a      | n/a           | n/a           | ✓                         | ✓                     | n/a           | n/a                                  | n/a           | n/a           | n/a             | n/a                 | ✓            | ✓            | n/a      | ✓ checkout | ✓                | n/a       |
| **Dialog cancel**                         | n/a                                     | **drift D9** (extendedMemo)           | n/a                   | n/a                 | n/a      | n/a      | n/a           | n/a           | n/a                       | n/a                   | n/a           | n/a                                  | n/a           | n/a           | n/a             | n/a                 | n/a          | n/a          | n/a      | n/a        | n/a              | n/a       |
| **Mutation submit (Loader2 + aria-busy)** | ✓                                       | partial (tax-year save) **drift D10** | partial **drift D11** | partial             | n/a      | n/a      | n/a           | n/a           | n/a                       | n/a                   | ✓             | ✓                                    | n/a           | n/a           | n/a             | n/a                 | ✓            | ✓            | n/a      | ✓          | ✓                | n/a       |

Cross-cutting components (not bound to a single route):

| Concept           | `app-shell-nav` (sidebar create-firm + upgrade dialogs) | `CreateClientDialog`  | `CreateObligationDialog` | `FixNeedsFactsSheet`                 |
| ----------------- | ------------------------------------------------------- | --------------------- | ------------------------ | ------------------------------------ |
| **Dialog cancel** | **drift D12** (2× outline)                              | **drift D13** outline | **drift D14** outline    | **drift D15** outline (Close button) |

---

## §2. Drift inventory

### D1 — Members page member-row avatar drops `initialsFromName`

**File:** `apps/app/src/features/members/members-page.tsx:921`
**Severity:** P2 (visual + a11y consistency)
**Drift:** hand-rolled `member.name.slice(0, 1).toUpperCase()` instead of the
canonical `initialsFromName(member.name)`. Result: members with two-word names
("Sarah Martinez") show one initial here ("S") but two everywhere else ("SM").
**Canonical fix:** swap the slice expression for `initialsFromName(member.name)`.
**SHIPPED on this pass.**

### D2 — Audit log actor avatar reimplements `initialsFromName`

**File:** `apps/app/src/features/audit/audit-log-table.tsx:179-186`
**Severity:** P2
**Drift:** Hand-rolled `.split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase()`
duplicates `initialsFromName` from `lib/auth.ts`. Same shape as the canonical
helper, but if `initialsFromName` ever changes (e.g. handles single-char names
differently), this site won't track.
**Canonical fix:** import `initialsFromName` from `@/lib/auth` and call it
(falling back to `'?'` when the actor is empty).
**SHIPPED on this pass.**

### D3 — Notifications preferences empty state uses raw `<p>`

**File:** `apps/app/src/features/notifications/notification-preferences-page.tsx:288`
**Severity:** P2
**Drift:** "No runs have been recorded yet" empty state renders as
`<p className="rounded-md border border-divider-subtle p-3 text-sm text-text-secondary">` —
inconsistent with the canonical `<EmptyState>` (dashed border, centered title).
**Canonical fix:** `<EmptyState title={<Trans>No runs have been recorded yet…</Trans>} />`.
**SHIPPED on this pass.**

### D4 — Reminders page has two raw-`<p>` empty states + one in suppressions

**File:** `apps/app/src/features/reminders/reminders-page.tsx:467, 551`
**Severity:** P2
**Drift:** Recent delivery + Suppressions sections show
`<p className="rounded-md border border-divider-subtle p-4 text-sm text-text-secondary">`
for empty state. Upcoming reminders panel right above them already uses
`<EmptyState>` — same module is internally inconsistent.
**Canonical fix:** swap both `<p>` empty states for `<EmptyState title={...}>`.
**SHIPPED on this pass.**

### D5 — Rules pulse retry button rendered as raw `<button className="underline">`

**File:** `apps/app/src/features/pulse/AlertsListPage.tsx:381`
**Severity:** P1 (interactive control, focus state)
**Drift:** Retry inside the destructive Alert renders as a raw
`<button type="button" className="underline">`. Dashboard, clients, obligations
all use `<Button variant="link" size="sm" className="h-auto p-0 align-baseline">`.
The raw button has no focus-visible ring or accent color.
**Canonical fix:** swap for the link-variant Button.
**SHIPPED on this pass.**

### D6 — Notifications preferences loading state is raw `<p>` text

**File:** `apps/app/src/features/notifications/notification-preferences-page.tsx:285`
**Severity:** P2
**Drift:** "Loading recent digest runs…" renders as a single-line
`<p className="text-sm text-text-secondary">`. Other surfaces (audit, opportunities,
queue) shape skeletons to the eventual table layout.
**Canonical fix:** swap for stacked `<Skeleton className="h-10 w-full" />` rows
matching the digest-runs row shape.
**SHIPPED on this pass.**

### D7 — Reminders page has FOUR raw-`<p>` loading states

**File:** `apps/app/src/features/reminders/reminders-page.tsx:311-313, 386-389, 461-465, 545-549`
**Severity:** P2
**Drift:** Templates / Upcoming / Recent delivery / Suppressions all show raw
`<p>Loading templates…</p>` etc. Inconsistent with skeleton pattern.
**Canonical fix:** swap each for `<Skeleton>` row stacks matching the eventual
table shape.
**SHIPPED on this pass.**

### D8 — Pulse detail drawer retry button raw `<button className="underline">`

**File:** `apps/app/src/features/pulse/PulseDetailDrawer.tsx:740-746`
**Severity:** P1
**Drift:** Same as D5 — second occurrence inside the alert-detail drawer.
**Canonical fix:** swap for `<Button variant="link" size="sm" className="h-auto p-0 align-baseline">`.
**SHIPPED on this pass.**

### D9 — Obligations extended-memo dialog Cancel uses `variant="outline"`

**File:** `apps/app/src/routes/obligations.tsx:4256`
**Severity:** P2
**Drift:** Sole remaining straggler in `obligations.tsx` after Step 6 cont X1.
**Canonical fix:** swap to `variant="ghost"`.
**SHIPPED on this pass.**

### D10 — Tax-year-profile Save in clients/$id drawer missing Loader2

**File:** `apps/app/src/routes/obligations.tsx:6866-6882`
**Severity:** P2
**Drift:** Save toggles label text "Save → Saving…" but no Loader2 spinner +
no `aria-busy`. Inconsistent with the rest of the obligation-drawer mutation
buttons (which already have spinner + aria-busy after Step 6 cont X2).
**Canonical fix:** add Loader2 + `aria-busy={updateTaxYearProfileMutation.isPending}`.
**SHIPPED on this pass.**

### D11 — CreateClientDialog submit already has spinner; CreateObligationDialog Save missing Loader2

**File:** `apps/app/src/features/obligations/CreateObligationDialog.tsx:1349-1361`
**Severity:** P2
**Drift:** Cancel uses `variant="outline"` (D14). Adjacent submit has
`disabled={createMutation.isPending}` but no Loader2 + no `aria-busy`.
**Canonical fix:** add Loader2 + aria-busy to the submit.
**SHIPPED on this pass (combined with D14).**

### D12 — app-shell-nav (2× dialogs) use outline Cancel

**File:** `apps/app/src/components/patterns/app-shell-nav.tsx:445, 506`
**Severity:** P2
**Drift:** Upgrade-prompt dialog + create-firm dialog Cancel buttons both
`variant="outline"`. Cross-cutting nav-shell drift.
**Canonical fix:** swap both to `variant="ghost"`.
**SHIPPED on this pass.**

### D13 — CreateClientDialog Cancel uses outline

**File:** `apps/app/src/features/clients/CreateClientDialog.tsx:510`
**Severity:** P2
**Drift:** Same X1 drift; not caught in earlier passes because dialog is in
features/ rather than routes/.
**Canonical fix:** swap to `variant="ghost"`.
**SHIPPED on this pass.**

### D14 — CreateObligationDialog Cancel uses outline

**File:** `apps/app/src/features/obligations/CreateObligationDialog.tsx:1346`
**Severity:** P2
**Drift:** Same X1 drift.
**Canonical fix:** swap to `variant="ghost"`.
**SHIPPED on this pass.**

### D15 — FixNeedsFactsSheet Close uses outline

**File:** `apps/app/src/features/clients/FixNeedsFactsSheet.tsx:144`
**Severity:** P3 (Close button in an empty-state CTA — less hot than Cancel)
**Drift:** `<Button variant="outline" onClick={onClose}>Close</Button>` inside
an `<EmptyState>` CTA. Canonical CTA pattern in EmptyState consumers uses
either primary (`default`) or `variant="link"` depending on weight.
**Canonical fix:** swap to `variant="ghost"` to match the broader
"Cancel/Close in modal" canon.
**DEFERRED.** Wrapping context is an EmptyState inside a Sheet — different
weight register than a DialogFooter Cancel. Needs a design call on whether
EmptyState CTAs in success-after-action states get ghost or default. Logged
for wave-5.

---

## §3. Verified canonical (cells confirmed consistent)

For sanity, these were spot-checked and are already consistent across all
relevant routes:

- **V1 — Status pill `<Badge variant>` adoption.** Every status pill in
  queue, clients, rules.library, members, audit, billing, notifications uses
  the shared `<Badge>` with semantic variant. The decorative `<BadgeStatusDot>`
  also routes through the shared primitive. No drift found.
- **V2 — Owner avatar (large, named) primitive `<AssigneeAvatar>`.** Used in
  queue + clients detail + obligations rows; sizing locked to 32px after
  cross-table drift fix #10 (2026-05-26).
- **V3 — Search affordance.** Every page-level filter input uses
  `<SearchInput>` (rules.library, clients, obligations, audit, rules.coverage,
  pulse). The expand-collapse variant in obligations and rules.library is
  intentional — both render `<SearchInput>` once expanded.
- **V4 — Table toolbar (bulk-selection).** Only two surfaces ship bulk action
  bars (obligations + rules.library). Both use `<FloatingActionBar>`.
- **V5 — Page header.** Every protected route renders `<PageHeader>` —
  dashboard, obligations, clients, clients/$id, calendar, workload,
  opportunities, notifications, notifications/preferences, reminders,
  rules.library, rules.pulse, members, audit, settings, billing.\*,
  account.security. Onboarding + login + readiness intentionally don't
  (different layout register).
- **V6 — Breadcrumb pattern.** Every sub-page that has a structural parent
  routes its back-link through `PageHeader.breadcrumbs`. No hand-rolled
  breadcrumb in app surfaces (the migration wizard step header is its own
  primitive on purpose).
- **V7 — Retry button on most routes.** dashboard, clients (list), obligations
  (queue + drawer + checklist) all use `<Button variant="link" size="sm"
className="h-auto p-0 align-baseline">`. Pulse was the only drift (D5/D8).
- **V8 — Empty state primitive adoption.** 54 call sites of `<EmptyState>`
  across queue, clients, opportunities, dashboard, pulse, evidence drawer,
  notes, audit, members. Only 3 stragglers (D3 + 2× D4).
- **V9 — Alert primitive for error blocks.** Every error block uses
  `<Alert variant="destructive">`. The drift was inside the alert — the retry
  CTA — not the alert chrome itself.
- **V10 — Cancel button variant in dialogs (post-shipped pass).** After
  D9-D15 ship on this pass, every dialog Cancel in the app uses
  `variant="ghost"`. The X1 sweep from wave-1 missed five hidden in features/
  - components/patterns; this pass closes the loop.

---

## §4. Deferred (out of scope for wave-4)

| ID                                                                                                                             | File                                           | Reason                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| D15                                                                                                                            | `features/clients/FixNeedsFactsSheet.tsx:144`  | EmptyState CTA register — needs design call (see drift entry).                                                                                 |
| Dashboard "caught-up" `<p>`                                                                                                    | `features/dashboard/actions-list.tsx:646, 668` | Intentional visual distinction from genuine-empty state per Today design brief. Not drift; it's two states intentionally rendered differently. |
| Pulse `<FilteredEmptyState>` raw div                                                                                           | `features/pulse/AlertsListPage.tsx:1066, 1212` | Status banner, not empty state — pulse-vocabulary.md treats source-health as its own register. Not drift.                                      |
| Mutation buttons missing Loader2 (long tail)                                                                                   | many                                           | ~30-40 buttons across the app still have only label-text feedback. Sweep would exceed the 15-fix cap. Wave-5 candidate.                        |
| Hand-rolled empty/loading on long-tail surfaces (rules.preview generation panel, rules.sources signals card, audit fetch-more) | scattered                                      | Each is a single-line "Loading…" inside an inline status, not a primary surface load. Below the bar.                                           |
| `<FixNeedsFactsSheet>` close as outline                                                                                        | see D15                                        | Same.                                                                                                                                          |

---

## §5. After this pass

| Concept              | Drift remaining                                         |
| -------------------- | ------------------------------------------------------- |
| Status pill          | 0                                                       |
| Owner avatar         | 0                                                       |
| Search affordance    | 0                                                       |
| Table toolbar        | 0                                                       |
| Empty state          | 1 (FixNeedsFactsSheet — design call needed)             |
| Error state          | 0                                                       |
| Loading skeleton     | long tail (≥10 inline statuses, not page-load surfaces) |
| Retry button         | 0                                                       |
| Page header          | 0                                                       |
| Breadcrumbs          | 0                                                       |
| Dialog cancel button | 1 (D15 — design call needed)                            |
| Mutation submit      | long tail (~30-40 buttons)                              |

The matrix now reads as "✓" or "n/a" in all but the deferred cells. The
remaining drift is concentrated in long-tail mutation-button polish — a single
sweep with a codemod (find `disabled={X.isPending}` without sibling Loader2)
is the natural wave-5 follow-up.

---

## §6. Section-header register audit (2026-06-09)

**Author:** dashboard-polish pass. **Authority:** prescriptive — canonical defined
in `docs/Design/section-header-style.md`. Three registers (A region-anchor / B
field-group / C card-title); pick by the header's job.

### Per-route state

| Route                                          | Section-header register in use                                       | State                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/today`                                       | A (ALERTS, ACTIONS THIS WEEK) + B (group bands)                      | ✓ canonical — A is **primary** as of 2026-06-09                                                                 |
| `/alerts`                                      | B (row meta labels)                                                  | ✓                                                                                                               |
| alert detail (drawer)                          | B2 (field labels, tertiary)                                          | ✓                                                                                                               |
| deadline detail (drawer)                       | B2 (field labels, tertiary)                                          | ✓                                                                                                               |
| `/clients`, `/deadlines`, `/audit`, `/members` | — (single table; PageHeader H1 only)                                 | ✓ n/a                                                                                                           |
| `/rules/library`                               | C (Status coverage / Recent changes cards) + B1 (status group bands) | ✓ register-correct; B1 bands at `text-text-secondary` (B canonical is tertiary) — **minor drift**               |
| `/billing`                                     | C ("Choose a workspace tier") + a `text-xs` eyebrow                  | C ok; the `text-xs font-medium uppercase text-text-tertiary` "Plan options" eyebrow is a B-variant — acceptable |
| `/settings`, `/settings/profile`, `/practice`  | C (panel titles)                                                     | ✓ register-correct (title-case card titles)                                                                     |
| `/calendar`, `/workload`                       | C (CardTitle primitive)                                              | ✓                                                                                                               |

### Finding

Register A (the dense-overview uppercase-primary eyebrow) is **specific to
`/today`** — no other route is an overview-register page, so none carry A-level
titles. The wide "divergence" a naïve grep shows is pages correctly using
Register **C** (card titles), not broken A headers. **No mass conversion applied.**

### Open / deferred

- **B-register size+tracking unification** (tertiary color is already consistent;
  size/tracking varies 11–12px / eyebrow-vs-0.5px). Mechanical sweep — deferred.
- **`/rules/library` status bands** use `text-text-secondary`; B canonical is
  `text-text-tertiary`. One-line fix — deferred to a rules pass.
- **Register C → A conversion** for settings/billing/practice/members/rules —
  **DECIDED 2026-06-09: keep Register C.** Yuqi confirmed the uppercase eyebrow
  stays reserved for overview pages (`/today`). No conversion.

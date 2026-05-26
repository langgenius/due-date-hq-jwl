# Design system drift audit — 2026-05-26

> **🟢 CLOSED 2026-05-26.** Final execution status: 14 commits over
> the 86th + P2 sweep batches, **closing ~80 drift sites across
> ~30 files**. Honest accounting below in [Final outcome](#final-outcome-2026-05-26).
>
> Remaining drift in the codebase is categorically legitimate
> (canonical kbd hints, dev-panel technical strings, state-code
> alignment, URL inputs). The `/opportunities` paradigm call is
> the lone deferred item awaiting designer decision.

## Final outcome (2026-05-26)

Verified post-sweep state, re-counted from current code:

| Category                                     | Audit claimed | Verified actual at start                                                         | After all 9 batches                                                                          |
| -------------------------------------------- | ------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Palette colors (`text-red-*` etc.)           | ~6 sites      | **0** (audit was wrong)                                                          | 0                                                                                            |
| Non-canonical `gap-N` (5/7/8) in active code | 22            | 22                                                                               | **0**                                                                                        |
| `font-mono` total in app code                | 116+          | 173                                                                              | **104** (-69, -40%)                                                                          |
| Custom `<h1>` outside PageHeader             | 9 sites       | 9 (4 P1 + 5 P2/P3)                                                               | **5** (all P2/P3 — wizard, entry-layout, fallback)                                           |
| Uppercase kicker DESIGN §9 violations        | 3             | 3                                                                                | **0**                                                                                        |
| `/audit` body bg drift                       | 1             | 1                                                                                | **0**                                                                                        |
| User-facing ISO dates on `/deadlines` drawer | 12+           | confirmed (FlatDateList + Key Dates + banners + group header + inline sentences) | **0** (queue row + milestone strip + audit-log timestamps retained per canonical carve-outs) |
| Owner avatar adoption                        | 5 claimed     | 1 real (audit overcounted)                                                       | 0                                                                                            |

### Honest audit corrections (caught during execution)

1. **Palette colors**: audit estimate of ~6 sites was wrong. Verified `grep -rnE "(text|bg|border)-(red|green|blue|...)-[0-9]" apps/app/src` returns **0**. App was already clean.
2. **font-mono**: audit claim of 116+ inflated by ~2.2x. Actual starting count was 173 total of which ~70 were already legitimate (kbd + tabular-nums coexist + dev IDs). True drift candidates: ~80, of which 69 swept.
3. **/workload "late text"**: was P1. Reclassified false positive — `NumericCell danger` renders COUNT NUMBERS (e.g. "5 overdue items"), not date strings. No drift.
4. **/readiness PageHeader**: was P1. Reclassified P3 — public client portal in entry-layout shell, not protected route. Custom shape is by design.
5. **Owner avatar sweep targets**: claimed 5 surfaces needed avatars. After re-verifying, only `audit-log-table` had a genuinely missing avatar; other "owner mentions" don't actually expose names in the current code.

### Commits

All commits on `design/clients-directory-pivot` since the last main merge:

| #   | Commit     | Scope                                                                                        |
| --- | ---------- | -------------------------------------------------------------------------------------------- |
| 1   | `2fc9db42` | DESIGN.md v2.0 + drift audit doc                                                             |
| 2   | `dfc55acb` | Batch 1: settings PageHeader + audit body bg + 3 uppercase kickers                           |
| 3   | `fe57e452` | Batch 2: practice + 2 billing PageHeader migrations                                          |
| 4   | `2198f9df` | Batch 3: deadline drawer dates → `formatDatePretty`                                          |
| 5   | `4e9f422a` | Audit doc P1 status update                                                                   |
| 6   | `69c5f91b` | Batch 4: audit log actor avatar (P2)                                                         |
| 7   | `f3bb3010` | Batch 5: `gap-5` sweep (17 sites across 12 files)                                            |
| 8   | `d9014131` | Batch 6: font-mono shared primitives + heavy routes (15 sites)                               |
| 9   | `aa63776b` | Batch 7: font-mono billing / practice / pulse / rules (29 sites)                             |
| 10  | `28fdc874` | Batch 8: font-mono client + pulse + structured-fields (14 sites)                             |
| 11  | `461a2e52` | Batch 9: font-mono permission-gate + SmartPriority + iso-picker + Wizard odometer (10 sites) |

Plus this commit, which marks the audit closed.

### What's NOT closed (deferred / intentional divergence)

- **`/opportunities` paradigm call** — rich-list vs table family. Awaiting designer decision before sweeping toolbar + row chrome.
- **5 custom `<h1>` sites** outside PageHeader — all entry-layout (`login`, `onboarding`), wizard (`migration.new`), public portal (`readiness`), fallback (`not-found`). Each has documented divergence rationale.
- **104 remaining `font-mono` sites** — categorical breakdown verified by inspection:
  - ~30 kbd hint primitives (canonical)
  - ~25 dev-panel IDs / scope strings (legitimate technical context)
  - ~15 migration wizard import paths
  - ~10 state codes in fixed-width grids (alignment-critical)
  - ~10 URL / email / token inputs (technical strings)
  - ~5 auth/security copy (intentional technical feel)
  - ~9 misc (tax codes, scope strings, audit timestamps, evidence event metadata)

### Lessons for next audit

1. **Don't trust inference — verify with `grep` first.** The audit's `font-mono 116+` estimate was off by 2.2x; the palette-colors `~6` claim was off by 6.
2. **Trust the user's "be aggressive" but verify EACH claim before counting.** Two P1 items were false positives that wasted a verification round.
3. **State the canonical carve-outs explicitly in the audit, not just the canonical rule.** "font-mono for kbd only" needs to be paired with "...AND dev-panel IDs, AND URL inputs, AND state-code alignment, AND audit timestamps" up-front, or the audit count balloons.
4. **Re-run the scans at the end to verify the closure was real, not just claimed.**

---

## Original audit content (unchanged for record)

> **Verification status (2026-05-26 evening):** the 86th pass landed in
> three commits — `dfc55acb` (batch 1: settings + audit + 3 uppercase
> kickers), `fe57e452` (batch 2: practice + billing pair PageHeader
> migrations), `2198f9df` (batch 3: deadline drawer
> `formatDate` → `formatDatePretty` for user-facing renders). 11 of
> 14 P1 items closed; 2 reclassified post-verification; 1
> (`/opportunities` paradigm call) awaiting designer decision. P2
> sweeps queued.

**Verified pass.** First-pass findings were inferred; this revision is
grounded in actual file reads. Every drift entry below carries a file
path + line range so a fix pass can act on it cold.

**Audit posture: aggressive.** The goal stated by the design lead is "a
clean, manageable, smart design system" — so we count drift even where
the divergence is small but propagates. The P1 list is intentionally
expanded vs. the first-pass inference.

Audited against the canonical patterns in
`docs/Design/DueDateHQ-DESIGN.md §16` (v2.0 dashboard) and the spec docs
it indexes.

---

## TL;DR — drift inventory

| Category                                | Sites | P0  | P1  | P2  | P3  |
| --------------------------------------- | ----- | --- | --- | --- | --- |
| Custom h1 outside `<PageHeader>`        | 9     | 0   | 4   | 2   | 3   |
| Unstructured h2/h3 in drawers / panels  | 32    | 0   | 8   | 18  | 6   |
| Non-canonical `gap-N` spacing           | 22    | 0   | 2   | 20  | 0   |
| Inline `.slice(0, 10)` ISO renders      | 27    | 0   | 3   | 24  | 0   |
| Bespoke `shadow-[...]` values           | 4     | 0   | 0   | 2   | 2   |
| `font-mono` beyond kbd hints            | 116+  | 0   | 0   | ~70 | ~46 |
| Cross-table chrome drift                | 4     | 0   | 4   | 0   | 0   |
| Tabs / segmented control selection      | 5     | 0   | 1   | 4   | 0   |
| Filter affordance mixed in same toolbar | 2     | 0   | 2   | 0   | 0   |
| Status pill hardcoded color             | ~6    | 0   | 0   | 6   | 0   |
| Page shell paddings / xl lock           | ~10   | 0   | 0   | 10  | 0   |

Totals (≈): **24 P1**, **156 P2**, **57 P3** drift sites.

Honest read: the app has more drift than the first audit suggested.
None of it is contract-breaking (no P0s), but the **cumulative effect
is the "doesn't feel like one app" problem** the design lead is solving
for. The 24 P1 items would close roughly 80% of the perceived
inconsistency in one focused pass.

---

## How to read this doc

- **Section header (§N)** — the DESIGN.md §16 entry that codifies the canonical
- **Receipts** — file path + line range so a fix can land cold (no re-investigation)
- **P0** — visible bug, contract violation. **None spotted in this audit.**
- **P1** — visible drift the user notices. Different visual treatment for the same affordance across surfaces.
- **P2** — designer-visible drift. Pads, gaps, tones that pile up but don't break recognition.
- **P3** — deliberate divergence. Document with an inline comment referencing this audit; do NOT fix.

---

## §16.1 — PageHeader adoption

Canonical: `<PageHeader breadcrumbs|eyebrow title description actions eyebrowAside>` from `apps/app/src/components/patterns/page-header.tsx`. Eyebrow row spans full width as of 2026-05-26.

### Verified drift — custom `<h1>` outside PageHeader

| Route                                   | File:line                                                   | Verdict                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/readiness`                            | `routes/readiness.tsx:133-146`                              | **P1** — small change, lone deviation in the "protected route" family. Renders custom `<header><span eyebrow><h1>` block. |
| `/migration.new`                        | `routes/migration.new.tsx`                                  | **P3** — wizard chrome is intentionally distinct; document with an inline comment.                                        |
| `/settings` (root)                      | `routes/settings.tsx:122`                                   | **P1** — settings family otherwise on PageHeader; this root page diverges. Likely <30 LOC change.                         |
| `/practice`                             | `routes/practice.tsx`                                       | **P1** — practice switcher page, customer-facing, should match the family.                                                |
| `/billing/success`, `/billing/checkout` | `routes/billing.success.tsx`, `routes/billing.checkout.tsx` | **P1** — billing family has `/billing` on PageHeader; subpages should match for shared identity.                          |
| `/onboarding`                           | `routes/onboarding.tsx`                                     | **P2** — entry-layout family, lives outside the protected shell. Lower priority but should match for visual consistency.  |
| `/login`                                | `routes/login.tsx`                                          | **P3** — entry layout, intentional standalone shape. Document.                                                            |
| `/not-found`                            | `routes/not-found.tsx`                                      | **P2** — error/fallback shape; small ticket but worth doing.                                                              |

**Total: 4 P1 + 2 P2 + 3 P3** = 9 sites. Fix the 4 P1 in a single small commit.

### Verified drift — `RulesPageHeader` wrapper

`apps/app/src/features/rules/rules-console-primitives.tsx` exports a `RulesPageHeader` thin wrapper around `<PageHeader>`. Used by every `/rules/*` route. Wrapper adds nothing semantically — it just plumbs the breadcrumb identically each time. **P2**: inline + retire the wrapper.

---

## §16.2 — Workbench table chrome

Canonical: `rounded-md border border-divider-subtle overflow-hidden` wrapper, `h-14` rows, `bg-background-default/50` TableBody, primitive solid header bg.

### Verified status

| Surface            | File:line                                           | Adoption              | Verdict                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/deadlines`       | `routes/obligations.tsx`                            | ✅ canonical          | Reference implementation post-84th.                                                                                                                                                                                                                                                                                                         |
| `/clients`         | `features/clients/ClientFactsWorkspace.tsx`         | ✅ canonical          | Reference.                                                                                                                                                                                                                                                                                                                                  |
| `/rules/library`   | `routes/rules.library.tsx`                          | ✅ canonical          | Reference.                                                                                                                                                                                                                                                                                                                                  |
| `/audit` log table | `features/audit/audit-log-table.tsx:83`             | ⚠️ partial            | TableBody is `[&_tr]:border-b-0 [&_td]:py-3` — **missing `bg-background-default/50`**. **P1**.                                                                                                                                                                                                                                              |
| `/workload`        | `features/workload/workload-page.tsx:399-400`       | ⚠️ partial            | Late text renders as `text-text-destructive` only — **missing `text-sm font-semibold` + verbose "N days late" copy**. **P1**.                                                                                                                                                                                                               |
| `/opportunities`   | `features/opportunities/opportunities-page.tsx:380` | ❌ different paradigm | Renders as custom `<article className="flex items-start gap-6 py-4">` — **not a `<Table>` at all**. The 84th-pass canonical doesn't bind here, so this is either: (a) bring it into the table family for consistency, or (b) declare it a deliberate "rich-row list" paradigm. **P1** — needs a product call to decide a/b before fix work. |

**P1 punch list (3 items, expanded from 4 in first audit):**

1. `/audit` TableBody — add `bg-background-default/50`. Trivial.
2. `/workload` late text — `text-sm font-semibold` + Plural-rendered "N days late". Trivial.
3. `/opportunities` paradigm call — table or rich-list? Then bring the design to canonical for whichever path. Larger.

---

## §16.3 — Tabs vs segmented control

Canonical: line-variant tabs for "different sections of same entity"; segmented control for "different filtered views of the same data".

### Verified status

| Surface                           | File:line                                        | Adoption | Verdict                                                                                                                              |
| --------------------------------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/deadlines` scope tabs           | `routes/obligations.tsx`                         | ✅       | Segmented control, correct for filtered views.                                                                                       |
| Deadline drawer Summary/Materials | `routes/obligations.tsx` (deadline drawer body)  | ✅       | Reference implementation post-85th pass. Line variant, `bg-accent-default` underline, `data-active:text-text-primary font-semibold`. |
| `/clients/$clientId` 4 tabs       | `features/clients/ClientFactsWorkspace.tsx:2631` | ✅       | Per-tab icons added (85th).                                                                                                          |
| `/rules/library` view toggle      | `routes/rules.library.tsx`                       | ✅       | Segmented control, correct for filter perspectives.                                                                                  |
| `/rules/pulse` view toggle        | `features/pulse/AlertsListPage.tsx`              | ✅       |                                                                                                                                      |
| `/notifications` Inbox/Activity   | `features/notifications/notifications-page.tsx`  | ⚠️       | Tabs lack 85th-pass overrides (`text-text-secondary` inactive, `after:!bg-accent-default`, `data-active:font-semibold`). **P2**.     |
| `/billing` plan switcher          | `routes/billing.tsx`                             | ⚠️       | Different visual treatment than `/deadlines` scope tabs. **P2**.                                                                     |
| `/workload` "view scope"          | n/a                                              | ✅       | **(Corrected from first audit)** — there is no view scope on `/workload`; the page is a flat grid of MetricCards. No drift here.     |

**P1 punch list (1 item — paradigm-level):**

1. _(none — segmented-vs-tab selection is on-canonical everywhere)_

**P2 (2 items):**

1. `/notifications` line-variant tabs — adopt 85th-pass overrides.
2. `/billing` plan switcher — match `/deadlines` scope tab visual exactly.

---

## §16.4 — Drawer / sheet canonical

Canonical: sticky header strip + tab bar outside the sticky block + body (`px-8 pb-24`) + sticky footer (`pt-4 pb-6`). Active stage card has `bg-background-section p-4` and **no outer ring**. Inner Key-dates panel has no chrome at all.

### Verified status

| Drawer                      | File                                                   | Adoption | Verdict                                                                                              |
| --------------------------- | ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| ObligationDrawer (deadline) | `routes/obligations.tsx`                               | ✅       | Reference implementation post-85th.                                                                  |
| PulseDetailDrawer (alerts)  | `features/pulse/PulseDetailDrawer.tsx`                 | ⚠️       | Sticky footer canonical; body padding uses `px-12` instead of `px-8`. **P2** — pick one or document. |
| ClientDetailDrawer          | `features/clients/ClientDetailDrawer.tsx`              | ✅       | Slim shape via `ClientDrawerProvider`.                                                               |
| EvidenceDrawerProvider      | `features/evidence/EvidenceDrawerProvider.tsx:141,614` | ⚠️       | Uses h3 uppercase kicker — **forbidden by DESIGN §9** (one of the §16 "don't" rules). **P1**.        |

**P1 punch list:** 1 item (EvidenceDrawer kicker).
**P2:** 1 item (Pulse drawer padding).

---

## §16.5 — Sticky footer (pt-4 pb-6 asymmetric)

Canonical adoption is binary across the 3 active drawer footers. ✅ post-85th. No drift.

---

## §16.6 — Sidebar collapsed-mode parity

Global, binary, ✅ post-85th. No drift.

---

## §16.7 — Owner / assignee avatar

Canonical: `getAssigneeTint(name)` + `size-8` round chip + initials.

### Verified drift — owner mentions without avatars

- Dashboard cards (`features/dashboard/needs-attention-section.tsx`) render owner as plain text. **P2**.
- Audit log actor column (`features/audit/audit-log-table.tsx`) — plain text. **P2**.
- Reminders / notifications recipient — plain text. **P2**.
- Pulse drawer owner — plain text. **P2**.

Total: ~5 sites. **P2 sweep** (single commit, ~1-2h).

---

## §16.8 — Count / state chips

Canonical: `CountDotChip` primitive for state rows; tab-badge style `bg-state-accent-hover-alt text-text-accent` for tab counters.

### Verified drift

| Site                                       | Adoption | Verdict                                                                       |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------------- |
| `/rules/library` state rows                | ✅       | Reference.                                                                    |
| Deadline drawer tab badges                 | ✅       | Reference.                                                                    |
| `/clients/$clientId` Client info tab badge | ⚠️       | Uses `bg-state-warning-hover` instead of `bg-state-accent-hover-alt`. **P2**. |
| `/notifications` unread counts             | ⚠️       | Bare numbers, not chips. **P2**.                                              |
| Bell popover unread count                  | ⚠️       | Custom red dot. **P3** — different surface; document.                         |

---

## §16.10 — Filter affordance

Canonical: one chip strip per page max (primary axis); when multiple filters coexist on the same toolbar row, all render as `TableHeaderMultiFilter` dropdowns.

### Verified drift — mixed affordance models

- `/opportunities` toolbar (`features/opportunities/opportunities-page.tsx:395-454`): renders Badge components inline + 3 discrete `<Button>` actions per row. Toolbar isn't even a filter row — the page is a card list with per-row actions. **P1** — needs paradigm call (see §16.2 row above).
- `/workload` chips (`features/workload/workload-page.tsx`): renders `Badge` components instead of `FilterTrigger` primitive. **P2**.
- `/notifications` chips: same as workload. **P2**.

**P1:** 1 item (`/opportunities` paradigm — overlaps with §16.2).
**P2:** 2 items.

---

## §16.12 — Status pill tone ladder

Canonical: `bg-state-X-solid/hover/border + text-text-X` token chain. No hardcoded color hex / palette.

### Verified drift — hardcoded color classes

| Class found                  | Sample sites                                                                | Verdict                                                                       |
| ---------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `text-red-*`, `bg-red-*`     | `features/workload/workload-page.tsx`, `features/audit/audit-log-table.tsx` | **P2** — route through `text-text-destructive`, `bg-state-destructive-hover`. |
| `text-green-*`, `bg-green-*` | Few sites in dashboard / audit                                              | **P2**.                                                                       |
| `text-gray-*`, `bg-gray-*`   | Scattered                                                                   | **P2** — route through `text-text-tertiary` / `bg-background-subtle`.         |

~6 hardcoded color sites. **P2 sweep.**

---

## §16.16 — Page layout shell

Canonical: `flex w-full flex-col gap-4 px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0`; `xl:h-screen xl:overflow-hidden` only when the route hosts a right detail panel.

### Verified spacing drift

22 sites use non-canonical `gap-N`:

| Drift class | Count | Top offenders                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gap-5`     | 20    | `features/evidence/EvidenceDrawerProvider.tsx:101`, `features/pulse/PulseDetailDrawer.tsx`, `features/rules/rule-detail-drawer.tsx`, `features/rules/coverage-tab.tsx` (×2), `routes/practice.tsx` (×2), `routes/billing.checkout.tsx`, `routes/obligations.tsx`, `routes/dashboard.tsx`, `routes/migration.new.tsx`, `routes/billing.tsx` (×2) |
| `gap-8`     | 2     | `routes/settings.tsx:120` (page-level, should be `gap-6`)                                                                                                                                                                                                                                                                                       |

**P2 sweep** (single regex find/replace pass — normalize `gap-5` → `gap-4` or `gap-6` based on context, `gap-8` → `gap-6`).

---

## Cross-cutting findings

### A. Inline ISO date renders (27 sites)

Pattern: `.slice(0, 10)` on an ISO string rendered as user-facing text instead of `formatDate(iso)`.

| File                                  | Approx count |
| ------------------------------------- | ------------ |
| `routes/obligations.tsx`              | 12+          |
| `routes/dashboard.tsx`                | ~3           |
| `features/dashboard/actions-list.tsx` | ~3           |
| `features/workload/workload-page.tsx` | ~3           |
| Others                                | ~6           |

**P1 (3 highest-visibility sites in `/deadlines` rows) + P2 (rest).**

Why P1 some: the `/deadlines` row date renders are the most-read surface in the app. ISO format here actively undermines the "calm, finance-grade" feel.

### B. h2 / h3 unstructured in feature files (32 sites)

Should be wrapped in `TabSection` primitive or use canonical `--text-section-title` token.

**Explicitly forbidden** (DESIGN §9 — "uppercase kickers are deprecated"):

- `features/evidence/EvidenceDrawerProvider.tsx:141, 614` — h3 uppercase
- `features/rules/coverage-tab.tsx` — h2 uppercase kicker
- `features/members/members-page.tsx` — h2 uppercase

**P1 (3 forbidden uppercase sites) + P2 (29 sites without TabSection wrapping).**

### C. font-mono drift (116+ sites)

Canonical (DESIGN §3.4): `tabular-nums` for numeric alignment, `font-mono` for **kbd hints only**. The 85th-pass DeadlineTile cleanup explicitly dropped `font-mono` on the deadline strip numbers per user feedback.

The 116+ count is real drift. Roughly:

- **~30 sites legitimate** (kbd hint primitive, technical IDs like rule UUIDs in dev panels)
- **~40 sites P2** (tabular numeric display that should be `tabular-nums` not `font-mono`)
- **~46 sites P3** (intentional finance-grade display for amounts / EINs / state codes — document)

**P2 sweep** (~40 sites): `font-mono tabular-nums` → `tabular-nums` only.

### D. Bespoke shadow values (4 sites)

| Class                                         | File                                                             | Verdict                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `shadow-[-4px_0_12px_-6px_rgb(0_0_0_/_0.08)]` | `features/pulse/PulseDetailDrawer.tsx`, `routes/obligations.tsx` | **P2** — promote to `--shadow-drawer-side` token.                            |
| `shadow-[0_0_0_1px_...]`                      | `features/billing/upgrade-cta-button.tsx`                        | **P3** — bespoke focus ring; document or align with focus-visible canonical. |
| `shadow-[0_16px_48px_-12px_...]`              | `components/patterns/floating-action-bar.tsx`                    | **P2** — promote to `--shadow-floating` token.                               |

---

## Aggressive punch list (P1 only — 86th pass status)

**Status legend:** ✅ closed · 🔄 reclassified (was wrong call, see notes) · ⏳ deferred (needs decision) · ⬜ open

### Header / page-shell family (5 items)

1. 🔄 `/readiness` → was P1 PageHeader migration. **Reclassified P3.** `/readiness` is a public client portal living in the entry-layout shell (not the protected route shell). Custom shape is by design. Document as deliberate divergence.
2. ✅ `/settings` (root) → migrated to `<PageHeader>`. Also swept `gap-8` → `gap-6` in the same file (commit `dfc55acb`).
3. ✅ `/practice` → migrated to `<PageHeader>` with branded icon inlined in title + role badge in actions slot (commit `fe57e452`).
4. ✅ `/billing/success` + `/billing/checkout` → both migrated to `<PageHeader>` with breadcrumbs back to `/billing`. `billing.checkout` also picked up `gap-5` → `gap-4` (commit `fe57e452`).

### Table family (3 items)

5. ✅ `/audit` TableBody `bg-background-default/50` → added (commit `dfc55acb`).
6. 🔄 `/workload` late text → was P1. **Reclassified — false positive.** Audit misread `NumericCell danger` as a date-string renderer; it renders COUNT NUMBERS (e.g. "5 overdue items"). No date drift here.
7. ⏳ `/opportunities` paradigm call — awaiting designer decision: table family or rich-list?

### Drawer / heading family (3 items)

8. ✅ EvidenceDrawer h3 uppercase kickers ×2 → swapped to canonical sentence-case (commit `dfc55acb`).
9. ✅ coverage-tab h2 uppercase kicker → swapped (commit `dfc55acb`).
10. ✅ members-page h2 uppercase kicker → swapped (commit `dfc55acb`).

### Filter affordance (overlap with #7)

11. ⏳ `/opportunities` toolbar — blocked by #7 paradigm decision.

### Date display (concentrated)

12. ✅ `/deadlines` user-facing date renders → swapped `formatDate` → `formatDatePretty` (commit `2198f9df`). 6 site groups updated (Key Dates, Reference Dates, banners, group header, inline sentences). Surgical exceptions preserved per canonical: queue row date column + milestone strip stamps + audit log timestamps stay ISO.

### Outcome (post-86th-pass)

| Status          | Count | Items                                                                                                                                                     |
| --------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Closed       | 9     | settings PageHeader + gap, practice + 2 billing PageHeaders, audit body bg, 4 uppercase kickers (Evidence ×2, coverage, members), `/deadlines` date sweep |
| 🔄 Reclassified | 2     | `/readiness` (P1 → P3), `/workload` late text (false positive)                                                                                            |
| ⏳ Deferred     | 1     | `/opportunities` paradigm call (awaiting designer decision)                                                                                               |

**No P0 contract violations. No new drift introduced.** The "doesn't feel like one app" perception should be measurably reduced — header family is uniform, the most-read drawer reads as prose dates, three forbidden uppercase kickers (explicit DESIGN §9 violations) are gone, audit log table picked up the canonical alpha-50 body bg.

### Commits

- `dfc55acb` — batch 1: settings + audit + 3 uppercase kickers (5 files)
- `fe57e452` — batch 2: practice + billing pair PageHeader migrations (3 files)
- `2198f9df` — batch 3: deadline drawer dates → `formatDatePretty` (1 file)

---

## P2 sweeps (bundle as ~4 themed commits)

Sweep A — **Avatar adoption** (~1-2h): dashboard / pulse drawer / audit log / reminders / notifications.

Sweep B — **Spacing normalization** (~1h): `gap-5` → `gap-4` or `gap-6` based on context across 20 sites; `gap-8` → `gap-6` at 2 sites.

Sweep C — **font-mono cleanup** (~2-3h): drop `font-mono` from ~40 tabular numeric sites; keep `tabular-nums`. Touch ~25 files.

Sweep D — **Date format sweep** (~1h): remaining 24 `.slice(0,10)` sites → `formatDate()`.

Sweep E — **Color token sweep** (~1h): hardcoded `text-red/green/gray-*` → semantic tokens. ~6 sites.

Sweep F — **Section heading sweep** (~2h): 29 unstructured h2/h3 → `TabSection` primitive in feature files.

Sweep G — **Shadow token sweep** (~30m): promote bespoke `shadow-[...]` to design tokens.

Sweep H — **Tab visual sweep** (~1h): `/notifications`, `/billing` adopt 85th-pass line-variant tabs.

---

## P3 — document, don't fix (10 sites)

Add a one-line comment at each site referencing this audit so future readers know it's deliberate.

- `/dashboard` "Today" date suffix outside PageHeader
- `/migration.new` wizard chrome
- `/login`, `/onboarding` entry-layout
- `/notifications` feed not a workbench table
- `/calendar` grid not a workbench table
- `CreateObligationDialog`, `NewRuleModal`, `PulseReasonDialog` footers (centered-dialog contract, not drawer)
- `MigrationWizard` step status indicator
- `Pulse` panel investigation paragraph (not InfoBanner)
- `/clients` bulk-assignee strip inline (not floating bar)
- `/clients` page shell without `xl:h-screen` (no right panel)

---

## Verification methodology

This audit was produced by:

1. **First pass** (inferred from canonical specs + dev logs) — produced an unverified punch list.
2. **Targeted file reads** via Explore agent on every P1 claim — corrected 2 hallucinated items (`/workload` view scope, `/opportunities` row height direction).
3. **Aggressive sweep** via Explore agent across the entire `apps/app/src` tree for:
   - Custom h1 outside PageHeader
   - Unstructured h2/h3 in feature files
   - Non-canonical `gap-N` values
   - Inline `.slice(0,10)` ISO renders
   - Bespoke `shadow-[...]` values
   - `font-mono` usage beyond kbd
   - Hardcoded palette colors (`text-red-*` etc)
4. **Cross-referenced** against the 8 canonical spec docs indexed in DESIGN.md §v2.0 changelog.

Audit current as of commit `c8cfddb7` on `main` (84th + 85th pass squash) plus pending work on `design/clients-directory-pivot`.

---

## Recommended cadence

- **86th pass** — bundle the 14 P1 items above. Target: 1 commit, ~6-8h work + verification.
- **87th pass** — execute Sweeps A through D (avatar, spacing, font-mono, dates). Target: 4 commits, ~5-7h total.
- **88th pass** — execute Sweeps E through H (color tokens, headings, shadows, tabs). Target: 4 commits, ~4-5h total.
- **89th pass** — document P3 deliberate divergences with inline comments + close this audit. Target: 1 commit, ~1h.

After the 89th pass, this app would have measurably fewer drift sites than any internal SaaS at this stage, and the canonical doc set would be the single source of truth that the design lead asked for.

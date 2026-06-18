# Full-application audit — pass 2 (per-skill, 2026-06-18)

A deeper, **per-skill** sweep building on [pass 1](full-app-audit-2026-06-18.md):
26 design/UX/a11y lenses, one agent each, read-only, **net-new findings only**
(each cross-referenced pass 1 + the ~70 prior docs). 84 net-new findings.

**Headline (unchanged from pass 1): the app is in strong shape.** Every lens came
back "strong overall" — the gaps are the finer-grained items pass 1's 8 clustered
lenses couldn't reach (rail search-verb stragglers, a date-picker a11y gap, the
notification _bell_ vs _page_, dark-mode contrast on two pinned-text buttons, a
client-facing raw-enum leak, StatBand color dilution, font-mono-on-prose). Counts:

| Severity | Found | Fixed this pass | Backlog / design call |
| -------- | ----- | --------------- | --------------------- |
| P0       | 0     | —               | —                     |
| P1       | 11    | 11              | 0                     |
| P2       | ~45   | ~18             | ~27                   |
| P3       | ~28   | ~6              | ~22                   |

## Fixed + shipped this pass

- **P1 defects (2 rounds)** — `2026-06-18-pass2-p1-defects` + `…-p1-round2`:
  iso-date-picker day-cell aria-label; obligations queue row `aria-pressed`+label;
  notification-bell onError + isError; audit `createDownloadUrl` onError; readiness
  client-facing raw-enum leak; **error-as-empty** in dashboard needs-attention,
  reminders, and two obligations preview dialogs; dark-contrast on AlertDetailDrawer
  Confirm + AlertsListPage check (`text-white`→`text-text-primary-on-surface`); last
  raw `<kbd>`→`Kbd`.
- **Consistency** — `2026-06-18-pass2-consistency`: 6 rail/secondary search verbs
  "Search"→"Filter"; motion convergence (daily-brief 200→150, needs-attention press
  0.99→0.98, tooltip delay 100→400, deadlines-at-a-glance + FAB reduced-motion/
  entrance, focus-visible hover-token, PreviewCard closeDelay→200); font-mono dropped
  on non-carve-out numerics (ShortcutHelpDialog, rule-detail ×3, generation-preview);
  dashboard loading italic removed; `TableHead` default `scope="col"`.

## Backlog — clear P2/P3 (mechanical, no design call; safe to do next)

| Lens              | file:line                                                                       | Issue → fix                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feedback          | `rules.library.tsx:3952,3966,4330,4343` · `ClientFactsWorkspace.tsx:892`        | copy-to-clipboard row actions are silent → `toast.success`/error (extract a `copyWithToast` helper; 3 near-dup copy helpers already exist)                    |
| Navigation        | `notification-preferences-page.tsx:168`                                         | breadcrumb parent is dead-end `/settings` → `/notifications` (its real parent)                                                                                |
| Navigation        | `workload-page.tsx:85`                                                          | missing `Settings ›` breadcrumb (all 6 siblings have it)                                                                                                      |
| Navigation        | `app-shell-nav.tsx:511`                                                         | 5 Settings-family top-level pages (members/workload/billing/practice/reminders) don't light the sidebar Settings item → `isActive` predicate off the registry |
| Navigation        | `breadcrumb.tsx:59,77`                                                          | nav landmark `aria-label="Breadcrumb"` hardcoded English → `t\`\``                                                                                            |
| Loading           | `AlertHistoryView.tsx:319`                                                      | text loader vs sibling skeleton rows → skeleton rows                                                                                                          |
| Perceived-quality | `stat-band.tsx:78`                                                              | loading skeleton is a solid block vs the hairline band (8 consumers shift) → mirror the band chrome                                                           |
| Perceived-quality | `workload-page.tsx:61` · `calendar-page.tsx:232`                                | loader geometry ≠ loaded shell → wrap in the same cap + shape placeholders                                                                                    |
| Spacing           | `calendar:185 · notifications:169 · reminders:147 · members:290 · practice:480` | page-top below canon — **see page-rhythm canon call below**                                                                                                   |
| Proximity         | `CreateClientDialog.tsx:268` · `CreateObligationDialog.tsx:1113`                | FieldGroup `gap-4` == within-row gap → raise to `gap-5/6` so rows group                                                                                       |
| Search a11y       | `search-input.tsx:174`                                                          | clear-button label hardcoded "Clear search" → verb-neutral "Clear"                                                                                            |
| Empty state       | `reminders-page.tsx:297`                                                        | bare title-only EmptyState → add icon + description                                                                                                           |
| Nav separators    | `ObligationQueueDetailDrawer.tsx:1923`                                          | crumb `›` vs DeadlineCrumbBar `/` → unify to `/`                                                                                                              |

## Backlog — design calls (need Yuqi)

- **Color budget (von-Restorff):** `rules.library` StatBand has 4/4 colored columns
  ("Total" always accent + 3 amber) → reserve color for the one actionable stat.
- **`review` color is two hues:** navy (`--status-review`) on some surfaces, raw violet
  on rules.library + `badge.tsx` info. Pick one; promote a `--state-review-*` token
  (also closes the raw `bg-violet-500` + `orange-50` row-tint reaches).
- **Severity-chip primitive:** "High impact"/kind chip hand-rolled in 4 files (already
  drifting tone) → extract one primitive / Badge variant.
- **Form-control cohesion:** Combobox + IsoDatePicker are `h-8` vs Input/Select `h-9`
  (4px misalign in shared forms); Button radius `rounded-2xl` vs Input/Select
  `rounded-lg`. Pick one height + reconcile radius; update §4.8 doc (stale).
- **Auth H1 size:** two-factor/accept-invite `text-[32px]` vs login/onboarding `28px`
  → one token across the CenteredAuthScreen family (canon says 28/30).
- **Table overflow:** /clients + /members tables clip fixed columns (members' Actions
  clips at ALL widths) → `overflow-x-auto` or a `hidden xl:table-cell` ladder.
- **Page-rhythm canon:** pass-1 used `pt-8 pb-12`; `page-family-canonical.md` says
  `pt-6 md:pt-8 / pb-4 md:pb-6`. Reconcile, then the 5 spacing stragglers follow.
- **Dark theming:** `upgrade-cta-button` warning-solid on-color (needs a dark shift);
  splash vs login/auth dark-ground divergence.
- **Distill (/today):** daily-brief "Alerts N"/"Overdue N" pills duplicate the
  needs-attention section + merged-brief buckets directly above/below.
- **Hick's:** /deadlines toolbar shows the Sort-by control twice (pill + View submenu,
  different option orders) → pick one home.
- **FieldLabel name collision:** two exported `FieldLabel` primitives (form-control vs
  caps eyebrow); 3 files alias inconsistently (`CapsFieldLabel` vs `CapsLabel`) →
  rename one or standardize the alias + document in §4.11.
- **Doc reconciliations:** §3.2 type table, §4.8 radius table, search-prd "Phase 1
  done", rules.library Register-A usage — all stale vs shipped code.

## Method note (carry forward)

Audit by the **semantic signature** (color+size for labels; "page filter" intent for
verbs), not one incidental class. Run `compile --strict` after any new copy. The 8
rate-limited lenses were re-run via workflow resume (cached the 18, re-ran the 8).

# Full-application audit — 2026-06-18

A multi-lens audit of the whole product (46 routes · 18 primitives · 24 patterns ·
32 ui components), run as 8 parallel evidence-grounded passes. Every finding cites
`file:line`. Cross-referenced against the ~70 existing `docs/Design/` audits so we
don't re-litigate decided items.

**Headline: the app is in strong shape.** The big veins (raw-button, FieldLabel
register, token coverage, drift D1–D15, responsive contracts, reduced-motion,
overlay a11y) are already closed by prior work. What's left is mostly polish +
reconciling a few drifts back to already-shipped decisions. Counts:

| Severity | Count | Character                                                             |
| -------- | ----- | --------------------------------------------------------------------- |
| **P0**   | 1     | one query-error path hangs on a skeleton                              |
| **P1**   | ~16   | real defects: a11y wiring, silent error paths, one §4.11 link cluster |
| **P2**   | ~23   | inconsistency / cognitive-load polish                                 |
| **P3**   | ~18   | nice-to-haves, several already documented as intentional              |

## Lenses run

- Accessibility correctness (WCAG 2.2 AA)
- Color / contrast / color-system
- Visual hierarchy + typography
- Spacing / layout / responsive
- Interaction states (loading / empty / error / feedback)
- Motion + micro-interactions
- Navigation + search + cognitive load (Hick / Miller / proximity)
- Design-system consistency / governance (§4.11)

---

## Recommended fix sequence

Ordered by value × confidence. Batches 1–3 are mechanical / reconcile-to-canon
(low risk, no new design calls). Batch 4 needs per-site judgment. Batch 5+ are
design calls for Yuqi.

| Batch | Theme                                                                         | Risk           | Needs sign-off? |
| ----- | ----------------------------------------------------------------------------- | -------------- | --------------- |
| **1** | P0 hang + a11y form wiring (field.tsx, login, matrix-cell, ToggleChip)        | low            | no              |
| **2** | Silent error/feedback paths (isError branches + onError toasts)               | low            | no              |
| **3** | §4.11 accent-link cluster → `TextLink variant="accent"` (12 sites)            | low            | no              |
| **4** | Contrast: `text-muted` → `text-tertiary` on content text (~32 sites)          | med (per-site) | no, but review  |
| **5** | Search verb-discipline (3 placeholders) + audit Hick's grouping               | low            | small calls     |
| **6** | Page-top vertical rhythm + obligations column ladder                          | med            | yes (layout)    |
| **7** | Motion stragglers (hover-token convergence, Sheet easing, dead shadow tokens) | low            | minor           |

---

## 1 · Accessibility correctness

Strong overall — overlays are Base UI (aria-modal / labelledby / focus-trap+restore /
Esc all handled), icon buttons carry `sr-only`, reduced-motion is global, skip-link
present. Defects cluster in the notification-preferences page + the login form's
bespoke (forked) error rendering.

| Sev | file:line                                                      | Issue                                                                                                             | Fix                                                                    |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| P1  | `features/notifications/notification-preferences-page.tsx:514` | Matrix-cell `<button aria-pressed>` has no accessible name (only an `aria-hidden` check icon; empty when off)     | `aria-label={`${rowName} · ${columnName}`}`                            |
| P1  | `routes/login.tsx:706,777`                                     | Inline errors are bare `<p>` — not announced (no `role="alert"`) and not linked (`aria-describedby`) to the input | `<p id role="alert">` + `aria-describedby` on input                    |
| P1  | `features/auth/email-otp-sign-in-form.tsx:181-203,243-259`     | `FieldError` has `role="alert"` but `Input` isn't linked via `aria-describedby`                                   | Wire id↔aria-describedby in `field.tsx` primitive (fixes all adopters) |
| P2  | `notification-preferences-page.tsx:643`                        | Day ToggleChip `aria-label={day.key}` announces "mon"/"tue"                                                       | `aria-label={day.label}` (full day name)                               |
| P2  | `settings.profile.tsx:720-738`                                 | Local `Field` label is a `<span>`; Select has no `id` → visible label not associated                              | `htmlFor` + `id` on SelectTrigger                                      |
| P2  | `components/ui/field.tsx:152`                                  | `tone="warning"` static helper renders `role="alert"` → assertive on mount                                        | `role="alert"` only for `destructive`; `warning`→`status`/none         |
| P2  | `notification-preferences-page.tsx:718-725,295,590`            | Card/section titles are `<span>`, not headings → section structure not exposed                                    | render `CardHead` title as `<h2>`                                      |
| P3  | `login.tsx:696`                                                | OTP placeholder is the only visible label (sr-only label present — AT ok)                                         | optional visible-label parity                                          |
| P3  | repo-wide `animate-spin`                                       | spinners not slowed under reduced-motion (frozen spinner would remove feedback — debatable)                       | optional `motion-reduce` slow-down                                     |

Already handled (not re-reported): all overlay primitives, icon-button sr-only,
reduced-motion (`MotionConfig` + global kill-switch), toasts (sonner live region),
skip-link, member/2FA/accept-invite/migration forms.

---

## 2 · Color / contrast / color-system

Cyan hard-rule (navy-on-cyan, never white) is clean everywhere; two-layer model
holds (brand navy is identity-only); ~0 hardcoded color literals (prior token-audit
held). One systemic contrast issue dominates.

| Sev | file:line                                                                                                                                                                                                                                                                         | Issue                                                                                                  | Fix                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | ~32 sites of `text-text-muted` as small body text (e.g. `ClientDetailWorkspace.tsx:1416`, `AlertDetailDrawer.tsx:1483`, `AlertCard.tsx:291`, `members-page.tsx:330,899`, `rule-detail-drawer.tsx:968,995,1430,1727,1736`, `rules.library.tsx:1081,1137`, `app-shell-nav.tsx:219`) | gray-400 `#98A2B2` = 2.58:1 on white (2.3–2.5 on tints) — fails AA for content text                    | Promote content text to `text-text-tertiary` (gray-500, 5.2:1). Reserve `text-muted` for decorative / `aria-hidden` / struck "old value" runs only |
| P1  | `use-obligation-queue-columns.tsx:509`, `obligations.tsx:2514`                                                                                                                                                                                                                    | Statutory marker glyph in `text-quaternary` (1.95:1) — informational but sub-AA                        | informational glyph → `text-tertiary`; keep quaternary only on decorative `·` separators                                                           |
| P2  | `packages/ui/src/components/ui/badge.tsx:119`                                                                                                                                                                                                                                     | `info: 'bg-violet-500'` raw palette literal (only one left; size-2 dot so contrast N/A)                | add a `--components-badge-status-light-info-bg` token                                                                                              |
| P2  | `rules-console-primitives.tsx:279`, `AlertsListPage.tsx:1721`, `actions-list.tsx:209`                                                                                                                                                                                             | `text-tertiary` on `bg-subtle`/gray-200 lands ~4.2:1 — borderline; 4.21:1 on gray-200 fails small-text | body text on darker tint → `text-secondary`; uppercase headers may stay                                                                            |
| P3  | state-badge / brand-mark SVG hex, provider logos, neutral elevation shadows                                                                                                                                                                                                       | self-contained SVG fallbacks + 3rd-party brand colors — theme-invariant by design                      | document, no change                                                                                                                                |

Already handled: sidebar muted contrast (fixed 2026-06-14), token-audit hex sweep.

---

## 3 · Visual hierarchy + typography

Type scale is almost fully tokenized (zero arbitrary `text-[Npx]` in dense files),
zero `font-bold` in scope, registers A/B/C correctly applied. Findings are
weight/color-restraint polish.

| Sev | file:line                                        | Issue                                                                                                 | Fix                                                  |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| P2  | `obligations/queue/components/panels.tsx:686`    | Lateness note red **and** semibold (double-highlight); canon `DueDateLabel` uses 500                  | drop to `font-medium` (or render via `DueDateLabel`) |
| P2  | `queue/components/DeadlineRow.tsx:398` vs `:289` | Same row-name anchor is 600 in one variant, `text-row-name` (500) in another                          | use `text-row-name` at :398                          |
| P2  | `AlertDetailDrawer.tsx:2965`                     | Deadline-shift "new date" amber **and** semibold (strikethrough+arrow already carry it)               | drop `font-semibold`                                 |
| P3  | `ClientDetailWorkspace.tsx:614`                  | Client name `text-display-large` (36px) — canon §3.2 says landing-only (documented intentional VtC73) | reconcile §3.2 doc, not code                         |
| P3  | `ClientDetailWorkspace.tsx:1568`                 | Warning-colored `<h3>` on already-warning-tinted band (color redundancy)                              | heading → `text-primary`; band+icon carry tone       |
| P3  | `rule-detail-drawer.tsx:1625`                    | Minor red+bold on a mono error code in a bordered box                                                 | optional `font-medium`                               |

Doc-staleness note: `DESIGN.md §3.2` size table is stale vs `primitives.css` (semantic
tokens are the live canon) — worth a doc refresh.

---

## 4 · Spacing / layout / responsive

Documented responsive contracts (alerts split-dissolve, deadlines rail shrink,
Today col-ladder + overflow-x-auto, rules.library column ladder) are all correctly
implemented — no clips at supported widths. Findings are rhythm consistency.

| Sev | file:line                                                                                                                              | Issue                                                                                                             | Fix                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P1  | route shells — `dashboard.tsx:254`, `obligations.tsx:3348`, `workload-page.tsx:84`, `billing.tsx:296/324`, `clients.$clientId.tsx:109` | Inconsistent page-top rhythm (`pt-8 pb-12` vs `pt-8 pb-6` vs `py-6` vs off-scale `pt-5`)                          | standardize page-top; drop `pt-5`→`pt-6`/`pt-8`                               |
| P1  | `obligations.tsx:4408` (+ fixed col widths), wrapper `:3607`                                                                           | Queue table `table-fixed` w/ summed fixed cols + `overflow-x-clip` → rightmost cols can crop at lg with no scroll | port rules.library `hidden xl:table-cell` column ladder, or `overflow-x-auto` |
| P2  | `page-header.tsx:138`                                                                                                                  | `gap-y-1.5` half-step (doc "drop") — propagates to every header                                                   | `gap-y-1`/`gap-y-2`                                                           |
| P2  | `list-rail.tsx:59,91`                                                                                                                  | `py-3.5`/`py-2.5` half-steps in shared rail                                                                       | `py-3`/`py-4`, `py-2`/`py-3`                                                  |
| P2  | `detail-section-card.tsx:98,142`                                                                                                       | `py-1.5`/`py-2.5` header bands (governed by min-h, so borderline)                                                 | drive height via `min-h-*`, `py-2`                                            |
| P3  | `rules.library.tsx:1056,1074`                                                                                                          | `py-[3px]` off-scale pill padding                                                                                 | `py-0.5`                                                                      |
| P3  | `list-rail.tsx:59` `px-[18px]`, `rules.library.tsx:3984` `!pl-[34px]`                                                                  | off-scale but documented optical-alignment overrides                                                              | leave                                                                         |

Note: the pervasive `gap-1.5`/`gap-2.5`/`py-2.5` half-steps in chips/pills (100+ sites)
are the de-facto chip-internal standard — only the canonical pattern components are
flagged (where a fix has leverage).

---

## 5 · Interaction states

Root cause behind the P0 + several P1s: `queryClient` uses `throwOnError: false`
(main.tsx:14), so a failed query only sets `isError` — surfaces that branch on
`isLoading` alone render their **empty state (or a stuck skeleton) on error**.
Uniform fix: add an explicit `isError` branch (Alert/StatusBanner + retry).

| Sev           | file:line                                           | Issue                                                                                                                           | Fix                                                      |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **P0**        | `notification-preferences-page.tsx:174`             | Gate is `isLoading \|\| !preferences` → on query error, skeleton hangs forever, no retry                                        | add `isError` branch (Alert + retry) before the skeleton |
| P1            | `routes/rules.library.tsx:2605`                     | 4 core queries have no `isError`; failure → "no rules" empty state (error-as-empty)                                             | add `isError` branch above :2605                         |
| P1            | `features/alerts/AlertHistoryView.tsx:318`          | no `isError`; failure → "No handled alerts" (error-as-empty)                                                                    | add `isError` branch                                     |
| ~~P1~~ FALSE+ | `features/members/members-page.tsx:216,224,231,238` | NOT silent — all six mutation errors aggregate into one `mutationError` destructive Alert (`:402`); toasts would double-surface | no change (resolved by existing banner)                  |
| P1            | `notification-preferences-page.tsx:129-135`         | `updatePreferences` no `onError` → rejected toggle diverges silently                                                            | `onError` toast + invalidate                             |
| P1            | `features/notifications/notifications-page.tsx:110` | `markAllRead` no `onError` (inconsistent w/ `markRead`)                                                                         | mirror `markRead` onError toast                          |
| P2            | `routes/clients.tsx:156-179`                        | obligations/alert sub-queries `?? []` with no `isError` → counts silently 0                                                     | surface sub-query `isError`                              |
| P2            | `ClientDetailWorkspace.tsx:270-308`                 | 6 sub-queries pass `isLoading` but no error fallback per panel                                                                  | per-panel error fallback                                 |
| P2            | `notification-preferences-page.tsx:182-183`         | only digest card locks on pending; Channels/Types toggles not locked → double-submit                                            | thread `saving`/`disabled`                               |
| P2            | `ClientsEmptyState.tsx:106-128`                     | empty-state CTAs not disabled on create-pending                                                                                 | thread `isPending`                                       |
| P3            | `routes/alerts.tsx:36-40`, `dashboard.tsx:191,201`  | secondary probe/health queries degrade silently (graceful)                                                                      | optional                                                 |

Already covered: AlertsListPage / AlertDetailDrawer / billing portal / clients.$clientId /
workload / rules sources+temporary are fully stated; pending-label+escape audit (2026-05-24).

---

## 6 · Motion + micro-interactions

A mature, documented motion system — reduced-motion is fully solved (global
kill-switch + `MotionConfig` + WCAG spinner exception), no dead interactive elements.
Findings are convergence of stragglers onto the existing system.

| Sev | file:line                                                            | Issue                                                                                                                | Fix                                                             |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P2  | `packages/ui/src/components/ui/sheet.tsx:60`                         | only overlay not on `ease-apple` full-surface grammar (`ease-in-out` 200ms)                                          | `ease-apple` + 300ms (keep the opacity-only Base-UI workaround) |
| P2  | 12 sites (`stat-band.tsx:131`, `stat-tile`, `settings-sub-nav`, …)   | two competing neutral-row hover tokens: `hover:bg-state-base-hover` (58) vs `hover:bg-background-default-hover` (12) | converge stragglers onto `state-base-hover`                     |
| P2  | `PulseAlertRow.tsx:404`, `search-input.tsx:131`                      | explicit `duration-150` restates inherited default tempo (token owns it)                                             | drop explicit duration                                          |
| P2  | `AlertDetailDrawer.tsx:2340`, `ObligationQueueDetailDrawer.tsx:4946` | sticky-footer `duration-200` one-off vs 300ms                                                                        | align to `duration-300`                                         |
| P3  | `primitives.css:185-186`                                             | `--shadow-2xl`/`-3xl` dead tokens (blur≥24, zero call sites)                                                         | delete                                                          |
| P3  | `toggle-chip.tsx:58-59`                                              | selected chip has no hover affordance                                                                                | optional subtle hover/active                                    |
| P3  | `entry-brand-lockup.tsx:26`                                          | arbitrary `shadow-[0_8px_24px…]` should be `shadow-overlay`                                                          | tokenize                                                        |

---

## 7 · Navigation + search + cognitive load

Nav is well-chunked (all groups < 7±2), landmarks/skip-link/active-route correct.
Search is operable everywhere; an inventory of all 18 search/filter surfaces is in
the appendix. Two P1s reconcile drift back to shipped decisions.

| Sev | file:line                                                                  | Issue                                                                                                                    | Fix                                                                                                 |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| P1  | `features/audit/audit-log-page.tsx:851-855`                                | Hick's: 13 flat Category options + 5 simultaneous filters                                                                | group categories into sections, or fold Action/Actor/Entity behind one `FilterTrigger` like /alerts |
| P1  | `obligations.tsx:3729`, `AlertsListPage.tsx:889`, `audit-log-page.tsx:840` | verb-discipline drift — say "Search …" but search-strategy/prd lock page filters to "Filter …" (/rules, /clients comply) | rename 3 placeholders to "Filter …"                                                                 |
| P2  | `ClientFactsWorkspace.tsx:1554`                                            | filtered-empty has no inline Clear (3 sibling pages do)                                                                  | add "Clear filters" button                                                                          |
| P2  | `obligations.tsx` queue (~11 cols)                                         | Miller's: dense default column set                                                                                       | default-hide low-freq cols (tax category, evidence) → ~7                                            |
| P2  | `obligations.tsx:3718`                                                     | /deadlines collapsed magnifier shows no `/` kbd hint (logged Phase-1-pending)                                            | surface kbd hint                                                                                    |
| P2  | `AlertsListPage.tsx:883`                                                   | /alerts search has no `/` hotkey (other 3 list pages do)                                                                 | add `alerts` shortcut category + `/`                                                                |
| P2  | `members-page.tsx`                                                         | only list route with no find affordance                                                                                  | add SearchInput past ~15 seats, or document omission                                                |
| P3  | `audit-log-page.tsx:845`                                                   | hotkeyMeta "Filter audit events" vs placeholder "Search by person…"                                                      | align to "Filter" (resolved by P1)                                                                  |
| P3  | CommandPalette / search-prd                                                | ⌘K client entity search shipped ahead of docs                                                                            | refresh search-prd "Phase 1 done"                                                                   |

---

## 8 · Design-system consistency (§4.11)

§4.11 is genuinely well-followed (prior raw-button / drift / FieldLabel work closed
the big clusters). One live, clear-cut violation remains.

| Sev | file:line                                                                                                                                                                                                                                | Issue                                                                                                                                                                                                                      | Fix                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| P1  | 12 sites — `merged-brief-card.tsx:359`, `daily-brief-card.tsx:413,518`, `needs-attention-section.tsx:195`, `rules.library.tsx:4964,4975,5663`, `billing.checkout.tsx:389`, `DeadlineRow.tsx:592`, `ObligationQueueDetailDrawer.tsx:2877` | hand-rolled `text-text-accent … hover:underline` inline links — §4.11 explicitly bans this; `TextLink variant="accent"` exists to absorb them (raw-button-audit couldn't catch — these are `<Link>`/`<a>`, not `<button>`) | `<TextLink variant="accent" render={<Link/>}>`   |
| P2  | `obligations.tsx:6426`                                                                                                                                                                                                                   | hand-rolled `Esc` keycap duplicates `Kbd` primitive (dual keycap/close-button)                                                                                                                                             | ghost Button + `<Kbd>`                           |
| P2  | `PulseAlertRow.tsx:1098`                                                                                                                                                                                                                 | uppercase-tertiary band straggler from FieldLabel migration (12px vs group's 11px)                                                                                                                                         | `<FieldLabel variant="group">` (size shift)      |
| P3  | `ObligationQueueDetailDrawer.tsx:3956,4691`                                                                                                                                                                                              | 2 `<summary>` triggers carry FieldLabel look inline                                                                                                                                                                        | wrap label text in FieldLabel inside `<summary>` |
| P3  | `notification-preferences-page.tsx:514`                                                                                                                                                                                                  | matrix-cell custom toggle (raw-button-audit "CUSTOM-OK")                                                                                                                                                                   | leave                                            |

Distill: no new consolidation needed — banner family (EmptyState/InfoBanner/StatusBanner/
DetailStatusBanner) each has a distinct contract; CountPill vs Badge-lg exception is documented.

---

## Cross-cutting root causes (fix once, fixes many)

1. **`throwOnError: false` → error-as-empty.** Add a small shared "query error" helper
   (Alert + retry) and apply at every `isLoading`-only branch. Covers the P0 + 4 P1s.
2. **`text-muted` overused for content text.** A demote-to-`text-tertiary` sweep
   (keep muted for decorative/struck only) clears the dominant contrast issue.
3. **Form a11y wiring belongs in `field.tsx`.** Wire `aria-describedby` id↔Input once
   in the primitive; every adopter inherits it.
4. **Verb discipline (Filter vs Search) drifted** in 3 placeholders — reconcile to the
   shipped strategy.

## Deferred — needs Yuqi's design call

- Audit page Hick's-law filter grouping (info architecture).
- Page-top vertical-rhythm unification + obligations column ladder (layout).
- `DESIGN.md §3.2` size-table doc refresh; search-prd "Phase 1 done" refresh.
- `text-display-large` on client detail (carve a documented exception or rescale).

## Appendix — search/filter surface inventory

18 surfaces inventoried with per-surface state coverage (affordance / placeholder /
clear / empty / loading / keyboard) — see lens-7 detail. All operable; gaps are the
P1/P2 above (verb, /alerts hotkey, /clients inline-clear, /deadlines kbd hint).

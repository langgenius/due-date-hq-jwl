# UX consistency pass — 2026-07-22

A multi-part pass driven by design review: cross-page geometry, navigation
seams, a cross-surface primitive sweep, and the collapsed sidebar rail.

## 1. Cross-page title rhythm

Every top-level page now lands its h1 on the same line (title top ≈56px at
md+). The rules-shell family (/alerts, /rules/\*), /audit, and /settings were
on the pre-eyebrow `pt-8` avatar-centering tuning (title at y≈34) while the
eyebrow pages (/today, /deadlines, /clients) sat at y≈56 — hopping between
families jumped the title ~21px.

- `RulesPageShell`: `pt-14` when there is no breadcrumb row, else `pt-8`;
  inter-section `md:gap-8` to match /today.
- rules.library overview pane: `pt-14`; selected-jurisdiction pane keeps
  `pt-8` (its eyebrow reaches the same y).
- audit-log-page: moved to the `max-w-page-expanded` + `md:px-8` workbench
  width family (was 1100px reading column) + `pt-14`.
- settings-sub-nav: `pt-14`.
- Registered the rule in DESIGN.md (Layout).

## 2. Navigation seams

- Origin-aware deadline detail: the picker a detail was launched from ("/")
  is carried in history state (`from`), threaded through tab switches +
  prev/next paging + rail hops, and honored by close (✕/Esc) and the crumb
  bar (which shows a "Today /" segment). Closing a detail opened from /today
  returns to /today instead of the full queue. `deadlineDetailStateOrigin`
  only honors in-app absolute paths (no external-redirect via crafted state).
- Deadline detail (page mode) gets the interactive
  `ObligationQueueStatusControl` back in the header meta row — the surface
  most read as "work on this deadline" had no status control.
- Alert drawer sheet-mode "Alerts" crumb is now a real link into
  `/alerts?alert=<id>` (was a dead close button).

## 3. Cross-surface primitive sweep

An 8-family audit (272 call sites) with adversarial verification found 21
confirmed drifts, fixed at the primitive/registry level:

- Deleted dead `actions-list.tsx` (+ test) — it hand-rolled the retired
  per-status lucide glyph set and a divergent status-fold taxonomy; only its
  own test referenced it.
- `ObligationStatusReadBadge` roomy `h-6 px-2.5` is now the family default
  (removed h-5 overrides that forked the silhouette).
- Three rails' hand-rolled countdown strings → `DueCountdownText`
  (i18n-correct, one vocabulary). Alerts action-window tag kept as an
  intentional separate axis (documented).
- Three hand-rolled jurisdiction seal+code clusters → `JurisdictionChip`.
- needs-attention tax-code override → sanctioned `size="compact"`.
- Two assign-owner Unassigned circles → `AssigneeAvatar name={null}`.
- Rule-preview review tags → `SeverityChip` (new `tone="label"` sentence-case
  variant + `title` forwarding).
- `StatBandItem` gained `valueTooltip` (basis disclosure); /clients "Active
  deadlines" (open-only) now discloses it links to an all-statuses queue.
- Six date-format drifts → canon helpers (`formatDatePretty` /
  `formatRelativeTime`); added `formatDateLong` tier; fixed a local-time
  off-by-one in deadlines-at-a-glance.

## 4. Collapsed sidebar rail

Labeled icon rail (icon + one-line 11px caption) at 92px. A 2-line "Rule
library" wrap was breaking the even icon grid ("歪了不好读"); it now uses a
short `railLabel` ("Rules") in the collapsed rail (full label returns on
expand/hover). Grid is even (all tiles same height), nothing truncates.

Also: mobile nav trigger (hamburger) below md; nav click closes the mobile
Sheet; deadlines banner copy + glance frame; Daily Brief all-quiet moves into
the chip; status pill chevron affordance.

# Full-product UI/UX audit & critique — 2026-06-24

Method: 8 parallel auditors — 5 by surface cluster (daily-driver, deadlines workbench,
intelligence, admin/billing, entry/system) + 3 cross-cutting lenses (component
consistency, cross-page connections, motion/states). Each read real component code and
scored against the design canon (tokens-only, fixed radius 12/8/4/999, type-weight
restraint 400/500/600-titles-only, primitive vocabulary, von-Restorff budget, no-fiction,
calm-on-dense). Two headline "functional P0s" raised by auditors were **disproven on
verification** (see Corrections). All severities below are post-verification.

---

## Verdict on the six questions

| Question                   | Verdict                                   | Note                                                                                                                                                                       |
| -------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aligned?**               | Mostly (B+)                               | Shared PageHeader/StatBand/spacing rhythm. Broken by font-weight inflation, entry-cluster token divergence, and admin pages reading as a plainer app.                      |
| **Component-based?**       | Largely (B+)                              | Strong primitive library, well-used on core surfaces. ~17 hand-rolled pills + local Card/Field/ReadonlyValue re-inventions + raw `<button>` patterns drag it from A to B+. |
| **Enough design details?** | Uneven                                    | Hero surfaces (drawers, migration wizard, portfolio grid) are richly detailed. Supporting/admin/system surfaces are thin — no signature moment.                            |
| **Visually stunning?**     | Uneven (3.0 avg /5)                       | Range 1.5 (error boundary) → 4.5 (migration wizard). Core 3.5–4.5; admin/system 1.5–3. Not yet _uniformly_ stunning.                                                       |
| **Working & cohesive?**    | Working; cohesive forward, leaky backward | No critical bugs. Forward flows wired; loop-closing/reverse nav + a few cross-query invalidations are the gaps.                                                            |

**One-line:** a cohesive, well-engineered product with a strong primitive system and several
genuinely excellent surfaces — held back from "stunning everywhere" by (1) a pervasive
600-weight habit, (2) a tail of hand-rolled re-inventions of primitives that already exist,
and (3) a quality gradient where supporting/admin/system surfaces feel like a plainer app.

---

## Corrections (auditor claims that did NOT hold)

- ❌ **"Alert-apply mutation is silent (no success/error)."** False. `applyMutation`
  ([AlertDetailDrawer.tsx:1161](../../apps/app/src/features/alerts/AlertDetailDrawer.tsx))
  has `onSuccess` toast (1169), two `onError` toast branches (1192–1204), and an
  `applyingPill` sweep. The auditor inspected `DecisionActions.tsx`, the presentational
  button, not the mutation owner.
- ⚠️ **"Status change leaves all client counts stale → P0."** Narrower. `invalidateDetail()`
  ([ObligationQueueDetailDrawer.tsx:771](../../apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx))
  already invalidates `obligations.listByClient`, `firms` (sidebar badge), `dashboard`,
  `audit`. Only `clients.listByFirm` / `clients.get` are missing → P1, and only if the
  `/clients` at-risk flag derives from `clients.*` (to confirm).

---

## Systemic themes (ranked — fix these, not the symptoms)

### 1. Font-weight inflation — P1, ~100+ sites

`font-semibold` (600) appears on tabs, data values, card sub-headers, rail section
titles, nav, OTP digits — everywhere, not just page/section titles. This is the single
most widespread canon breach and the biggest single lever on perceived crispness.

- Worst files: `AlertDetailDrawer.tsx` (15), `panels.tsx` (16), `ClientDetailWorkspace.tsx`
  (tab triggers + card headers), `ClientFactsWorkspace.tsx` (portfolio hero numeral, triple-
  signalled), `otp-input.tsx:87`, `merged-brief-card.tsx` (bucket headers).
- Fix: sweep `text-xs font-semibold` / `text-sm font-semibold` on non-`h1–h3` / non-title
  slots → `font-medium`. Add a lint guard (semibold only with `text-lg`+ or on headings).

### 2. Hand-rolled re-inventions of existing primitives — P1, ~30+ sites

The primitive exists; the surface rebuilds it inline (no token inheritance, no dark-mode
guarantee, drift risk).

- **Pills/badges (~17×):** `AlertDetailDrawer.tsx:1727`, `AlertCard.tsx:261`,
  `PulseFormRevisedCard.tsx:140`, `PulseAlertRow.tsx:573`, count badges in
  `ClientDetailWorkspace.tsx:919,1193`, header counts in `members-page.tsx` → `Badge` /
  `CountPill` / `SeverityChip`.
- **Local Card / Field / ReadonlyValue:** `SettingsCard` + local `Field` in
  `settings.profile.tsx:696,725` (shadows the canonical), `Card`/`CardHead` in
  `notification-preferences-page.tsx:271`, `ReadonlyValue` re-hand-rolled in `practice.tsx:595`
  → canonical `Card`/`CardHeader`/`CardContent` + `Field`/`FieldLabel`.
- **Raw `<button>` as link/card:** `rules.library.tsx:856,949,1175,1179` (the `linkClass`
  variable reinvents `TextLink`), `AlertListRail.tsx:106` → `TextLink` / `Button variant="ghost"`.

### 3. Front-door inconsistency — P1

The highest-traffic surface (login) has a _different identity_ from the rest of entry.

- Login renders a letter-**"D"** `rounded-2xl` square instead of the real `BrandMark`
  ([login.tsx:222](../../apps/app/src/routes/login.tsx)); `AuthBrandAnchor` exists for this.
- Entry-shell vs auth-chrome token divergence: `bg-bg-canvas` vs `bg-background-subtle`,
  `border-border-default` vs `border-divider-subtle` ([\_entry-layout.tsx:34,66](../../apps/app/src/routes/_entry-layout.tsx)).
- `accept-invite` SSO buttons have no provider icons (login does); inviter avatar is
  hand-rolled instead of `AssigneeAvatar` ([accept-invite.tsx:230,296](../../apps/app/src/routes/accept-invite.tsx)).

### 4. Cross-page wiring & discoverability gaps — P1/P2

Forward flows are wired; loop-closing and reverse nav leak.

- Alert-type audit events are dead-ends: `auditEntityHref()` returns `null` for `pulse_*`
  ([audit-event-drawer.tsx:44](../../apps/app/src/features/audit/audit-event-drawer.tsx)) → map to `/alerts?alert=`. (P1)
- Client "Filed" stat is inert ([ClientSummaryStrip.tsx:157](../../apps/app/src/features/clients/ClientSummaryStrip.tsx)) while Blocked/Open drill in → add the filed-status filter link. (P1)
- Add `clients.listByFirm`/`clients.get` to `invalidateDetail()`. (P1, confirm derivation)
- Deadline detail crumb always → `/deadlines`, never back to the client ([DeadlineCrumbBar.tsx:52](../../apps/app/src/features/obligations/queue/DeadlineCrumbBar.tsx)). (P2)
- Dashboard's only `/audit` entry point is commented out ([dashboard.tsx:29](../../apps/app/src/routes/dashboard.tsx)). (P2)
- Rule StatBand "Coverage"/"Total" inert; no rule → clients roll-up. (P2)

### 5. Accessibility — P1/P2

- `rules.library` entity coverage matrix: cells are `aria-hidden` with no text alternative
  → an inaccessible table ([rules.library.tsx:340–431](../../apps/app/src/routes/rules.library.tsx)). (P1)
- Scroll-spy section navs (alert + deadline detail) are anonymous `<button>`s — no
  `role="navigation"` / `aria-label`. (P2)
- `audit-log-table.tsx:234` uses `<div role="button">` instead of `<button>`. (P2)
- `fallback.tsx` hides loading content from SR with `aria-hidden`. (P2)

### 6. Radius & type-scale freelancing — P2

- Radius: `rounded-md` (6) in `panels.tsx:331,345,357` + `sidebar-footer-zone.tsx:155`;
  `rounded-2xl` (16) in login "D", migration `ProcessingOverlay`, login window chrome →
  snap to 8/12.
- Type: `text-[28px]` H1 repeated across entry cluster (login/onboarding/accept-invite/
  two-factor); `text-[10px]`/`text-[11px]` in panels + stepper; raw `text-xl`/`text-2xl`
  on data values → extract `text-display-sm` / use named tokens.
- One live raw-hex: aurora gradient `#a78bfa` + `#f0a35e` in
  [daily-brief-card.tsx:233](../../apps/app/src/features/dashboard/daily-brief-card.tsx) → tokenize.

### 7. Quality gradient — supporting surfaces feel like a plainer app — P2 (design)

Standouts: migration wizard (4.5/5), clients portfolio grid (4), deadline + alert detail
drawers (4 / 3.5). Thin: error boundary (1.5 — anonymous red alert on blank canvas, no
brand, no path home), two-factor (2), workload (2 — `ManagerInsightMetric` duplicates
StatBand; busiest-owner buried in a `·`-joined string), calendar/reminders (2),
settings family (2–3). These share PageHeader but have no StatBand-level personality moment.

### 8. Smaller systemic items

- Tilegram divergence: `PulseAlertsMap` hand-codes its own US grid instead of consuming
  `us-jurisdiction-tiles` (the rules map does) → will drift. (P2)
- Dead code: `SHOW_COVERAGE_MAP = false` flag + ~30-line dead branch in `rules.library`;
  `deadlineTip` query/poll pipeline in the obligation drawer (Risk tab retired); unused
  `DeadlineCardGrid.tsx`. (P2)
- Stagger choreography (0.035–0.08) freelanced across 6 files — not in `motion.ts`. (P3)
- `/audit` "Audit filters" card has tutorial `CardDescription` + low-contrast `Badge`
  count → demote text, use `CountPill`. (P2)

---

## Per-cluster scores (stunning /5)

| Cluster             | Surfaces                                                                 | Best             | Weakest                 | Avg |
| ------------------- | ------------------------------------------------------------------------ | ---------------- | ----------------------- | --- |
| Daily driver        | /today, /clients, /clients/:id                                           | clients grid 4   | client-detail setup tab | 3.7 |
| Deadlines workbench | /deadlines, detail, /calendar, /workload, /readiness, /reminders         | detail drawer 4  | /workload 2             | 2.6 |
| Intelligence        | /alerts, history, /rules\*, /audit                                       | alert drawer 3.5 | history 2.5             | 3.0 |
| Admin & billing     | /members, /practice, /settings*, /notifications*, /billing\*, /migration | migration 4.5    | settings family 3       | 3.4 |
| Entry & system      | login, splash, onboarding, invite, 2fa, error, 404                       | login 3.5        | error 1.5               | 2.4 |

---

## Recommended execution order (highest leverage first)

1. **Font-weight sweep** (P1) — one mechanical pass, ~100 sites, biggest crispness gain.
2. **Primitive reclamation** (P1) — replace hand-rolled pills + local Card/Field/ReadonlyValue
   - raw link-buttons with the canonical primitives. Buys cross-surface parity for free.
3. **Front-door fix** (P1) — real BrandMark on login, harmonize entry-shell/auth-chrome
   tokens, SSO icons + `AssigneeAvatar` on accept-invite.
4. **Wiring + a11y** (P1) — alert-audit jump target, Filed-stat link, `clients.*`
   invalidation, entity-matrix SR text, scroll-spy nav landmark.
5. **Radius/type token snaps + tilegram unify + dead-code removal** (P2).
6. **Supporting-surface design pass** (P2) — give /workload, /calendar, error, 2fa one
   signature moment each; this is where "stunning everywhere" is won.

No critical functional defects found.

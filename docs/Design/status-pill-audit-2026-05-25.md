# Status pill audit — 2026-05-25

Inventory and unification proposal for every chip/pill in the CPA app
that signals "what state is X in?" Across five surfaces (`/`,
`/deadlines`, `/clients`, `/rules/library`, `/rules/pulse`) we found
**12 distinct status-pill families** that map to four different
shadcn `Badge` variants with no shared semantic ladder.

Primitive contract under audit:
[`packages/ui/src/components/ui/badge.tsx`](../../packages/ui/src/components/ui/badge.tsx)
exposes `Badge` (variants: `default | secondary | success | warning |
info | destructive | outline | ghost | link`) and `BadgeStatusDot`
(tones: `success | warning | error | normal | disabled | info`). Every
family below either composes those, hand-rolls SVG icons + tinted
text, or both.

---

## 1 · Per-family inventory

| #   | Family                                       | File · symbol                                                                                                                                              | Variants in use                                                                                                                      | Shape                                                                             | Badge variant(s)                                                                                                               | Notes                                                                                                                         |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Obligation status** (read)                 | `features/obligations/status-control.tsx:354` · `ObligationStatusReadBadge`                                                                                | `pending`, `in_progress`, `waiting_on_client`, `review`, `done`, `paid`, `extended`, `not_applicable`, `blocked`, `completed`        | filled chip + leading lucide icon                                                 | `secondary` / `info` / `outline` / `success` / `warning` / `destructive` per `STATUS_VARIANT` map (`status-control.tsx:85-99`) | Single source of truth; iconified `STATUS_ICON` map (`:146-157`) replaces dot in v2                                           |
| 2   | **Obligation status** (interactive)          | `features/obligations/status-control.tsx:258` · `ObligationQueueStatusControl`                                                                             | same 10                                                                                                                              | filled chip + icon + chevron (dropdown trigger)                                   | same                                                                                                                           | Renders via `badgeVariants(...)` inline, not `<Badge>`                                                                        |
| 3   | **Dashboard triage status**                  | `features/dashboard/actions-list.tsx:394-402`                                                                                                              | same 10                                                                                                                              | filled chip + `BadgeStatusDot` (legacy)                                           | `STATUS_VARIANT[row.status]`                                                                                                   | Still uses **dot**, not the new lucide icon — diverges from family #1                                                         |
| 4   | **Rule status** (detail header)              | `routes/rules.library.tsx:2318` · `RuleStatusKicker`                                                                                                       | `active`/`verified` → Active, `candidate`/`pending_review` → Needs review, `rejected` → Rejected, `archived`/`deprecated` → Inactive | bare icon + tinted text (no chip background)                                      | none — hand-rolled `<span>`                                                                                                    | Green/blue/gray; icons: `CircleCheck` / `MessageSquareText` / `CircleSlash`                                                   |
| 5   | **Rule status bar** (group header aggregate) | `routes/rules.library.tsx:337` · `RuleStatusBar`                                                                                                           | active / review / other                                                                                                              | stacked color segments in a 1.5-px-tall pill                                      | none                                                                                                                           | Tones from `STATUS_TONE` map (`:537-545`): `success`/`review`/`destructive`/`muted` — `review` is its own tone, not `warning` |
| 6   | **Rule coverage state** (per-entity cell)    | `routes/rules.library.tsx:267` · `EntityStateCell`                                                                                                         | `active`, `review`, `none`, `not_applicable`                                                                                         | count number + status icon (CheckCircle / AlertTriangle / outlined circle / dash) | none                                                                                                                           | Plus per-rule applicability dot in `EntityApplicabilityCell:305`                                                              |
| 7   | **Pulse firm-alert status**                  | `features/pulse/components/PulseStatusBadge.tsx`                                                                                                           | `matched`(=New), `snoozed`, `partially_applied`, `applied`, `reverted`, `dismissed`, `reviewed`                                      | "New" → filled `info` + Sparkles icon; others → `outline` + muted text            | `info` / `outline`                                                                                                             | No leading dot (intentional — sibling `PulsingDot` already carries tone)                                                      |
| 8   | **Pulse confidence**                         | `features/pulse/components/PulseConfidenceBadge.tsx`                                                                                                       | `>= 0.9 high`, `0.7-0.9 medium`, `< 0.7 low`                                                                                         | filled chip with mono % text                                                      | `success` / `info` / `destructive`                                                                                             | No icon, no dot                                                                                                               |
| 9   | **Pulse source status**                      | `features/pulse/components/PulseSourceStatusBadge.tsx`                                                                                                     | renders only when `source_revoked`                                                                                                   | `outline` chip + `BadgeStatusDot` tone=`error`                                    | `outline`                                                                                                                      | Uses dot — only Pulse family that still does                                                                                  |
| 10  | **Source health** (rules console)            | `features/rules/rules-console-primitives.tsx:294` · `HealthBadge`                                                                                          | `healthy` → Watched, `paused` → Paused                                                                                               | `outline` chip + tiny `size-1.5` dot                                              | `outline`                                                                                                                      | `success` / `disabled` dot tones                                                                                              |
| 11  | **Temporary rule status**                    | `features/rules/temporary-rules-tab.tsx:192` · `TemporaryRuleStatusBadge`                                                                                  | `active`, `reverted`, `retracted`                                                                                                    | `outline` chip + tiny dot                                                         | `outline`                                                                                                                      | Same shape as #10 — `success` / `disabled` / `error`                                                                          |
| 12  | **Client readiness**                         | `features/clients/ClientFactsWorkspace.tsx:4114` · `ClientReadinessBadge`                                                                                  | `needs_facts`, `ready`                                                                                                               | **filled** `warning` or `success` chip + matching `BadgeStatusDot`                | `warning` / `success`                                                                                                          | Doubled dot+fill (chip color === dot color); legacy pattern                                                                   |
| 13  | **Member status**                            | `features/members/members-page.tsx:974,987` · `MemberStatusPill` / `InvitationStatusPill`                                                                  | active, suspended, pending, expired                                                                                                  | mixed: `outline` chip+dot OR `warning`/`success` filled chip+dot                  | mixed                                                                                                                          | Inconsistent within the same file — invitations go filled, members go outline                                                 |
| 14  | **Insight / readiness response** (ad-hoc)    | `routes/obligations.tsx:5511` `InsightStatusBadge`, `:5903` `ReadinessResponseStatusBadge`, `:5442` "Preparing", `:6255` materials "Received/Needs review" | ready / failed / stale / pending; ready / need_help / not_yet                                                                        | bare filled chip (some + icon)                                                    | `success` / `warning` / `info` / `outline` / `destructive`                                                                     | None of these use `BadgeStatusDot`; pure variant-driven                                                                       |
| 15  | **Lifecycle v2 sub-chips**                   | `features/obligations/rejection-chip.tsx`, `blocked-by-chip.tsx`                                                                                           | rejected, blocked-by                                                                                                                 | hand-rolled border + bg + lucide icon                                             | none                                                                                                                           | Bespoke palette: rejection = red border + red bg + red icon; blocked-by = neutral bg + red icon                               |

---

## 2 · Top inconsistency findings

### 2.1 — "Review" is rendered three different ways across the app (SEV: HIGH)

Same word, same human meaning ("a person needs to review this"), three
different visuals depending on which surface you're on:

- **Obligation `review` status** → filled **blue** (`info` variant +
  `normal` dot), icon `MessageSquareText`. Per `STATUS_VARIANT` map at
  `status-control.tsx:85-99`. The comment block at `:78-84` explicitly
  notes this was flipped from amber → blue on 2026-05-25 because "work
  IS happening, someone is actively reviewing."
- **Rule `pending_review` status** → tinted **blue** text + same
  `MessageSquareText` icon, no chip fill, per
  `RuleStatusKicker` (`rules.library.tsx:2318`) and the `STATUS_TONE` map
  at `:537-545` which declares `review` as its own tone (`accent-default`,
  blue).
- **Coverage-state `review` cell** → **amber** count + amber
  `AlertTriangleIcon`, per `EntityStateCell` (`rules.library.tsx:267-300`)
  — `text-text-accent` resolves to the design system's accent which on
  this surface paints amber because the bar at `:537` mapped it
  separately to `accent-default` while the cell uses `text-text-accent`.
- **Coverage `CoverageCell` legacy** (`rules-console-primitives.tsx:225`)
  → still **amber** dot + amber text, comment-labelled `warning`.
- **Materials "Needs review" chip** (`obligations.tsx:6260`) → filled
  **red** (`destructive` variant) with `AlertTriangleIcon`.

A user looking at a Pulse-driven rule needing review (blue), an
obligation in review (blue chip), a coverage gap that needs review
(amber), and a materials needs-review entry (red) sees four different
colors for what is, conceptually, the same state.

### 2.2 — Amber means at least four different things (SEV: HIGH)

- `waiting_on_client` obligation status → uses `outline` variant + `info`
  (violet) dot per `STATUS_DOT` (`status-control.tsx:111-127`) and icon
  `Hourglass` tinted amber via `text-text-warning` (`:163-174`).
- "Needs review" materials chip in obligation drawer — amber tint via
  `text-text-warning` (`obligations.tsx:5917`, `ReadinessResponseStatusBadge`).
- `InsightStatusBadge` "Failed" → `warning` variant (`obligations.tsx:5519`).
- Rule library StatsBar "needs review" progress segment →
  `bg-state-warning-hover` + `text-text-warning` (`rules.library.tsx:1201-1210`)
  — explicitly chosen as the "amber means pending" half of the progress
  bar.
- `ClientReadinessBadge` `needs_facts` → `warning` variant (filled amber
  chip).
- `InvitationStatusPill` `expired` → `warning` variant (filled amber
  chip — `members-page.tsx:990`).
- `BlockedByChip` red icon on amber border in earlier passes (now neutral
  per 2026-05-25 redesign, `blocked-by-chip.tsx:39-47`).

Amber currently signals: "waiting", "failed", "review pending",
"needs facts", "expired", and "stuck on dependency". Five distinct
semantics, one color.

### 2.3 — `BadgeStatusDot` is half-deprecated; same family inconsistently dotted (SEV: MED)

- Obligation read-badge `ObligationStatusReadBadge` (`status-control.tsx:370`)
  — **icon-led**, no dot.
- Obligation queue control `ObligationQueueStatusControl` (`:258`) —
  **icon-led**, no dot.
- Dashboard triage row at `actions-list.tsx:400` rendering the SAME
  obligation status still uses **`BadgeStatusDot tone={STATUS_DOT[row.status]}`**
  — legacy dot pattern that the canonical badge dropped.
- Pulse `PulseStatusBadge` dropped the dot per Yuqi critique #18
  (`PulseStatusBadge.tsx:13-21`), but `PulseSourceStatusBadge` still
  ships one.
- `MemberStatusPill` and `InvitationStatusPill` both render a dot inside
  a chip whose fill color already encodes the same tone (`success` chip
  - `success` dot, `warning` chip + `warning` dot) — visually
    redundant.

Net: the new visual grammar ("icon = tone, no dot") is implemented in
two places, contradicted in five.

### 2.4 — `outline` chip means at least three things (SEV: MED)

- `waiting_on_client` obligation status (`outline` + violet info dot
  via icon) → "we're paused, waiting on the client."
- Pulse non-emphasis statuses ("Snoozed", "Applied", "Dismissed",
  "Reverted", "Reviewed") → all `outline` + muted text
  (`PulseStatusBadge.tsx:43-47`). Five distinct lifecycle states, one
  neutral chip.
- `HealthBadge` "Watched" / "Paused" both `outline` (only the dot
  changes) — `rules-console-primitives.tsx:307`.
- `TemporaryRuleStatusBadge` all three states (`active`, `reverted`,
  `retracted`) — `temporary-rules-tab.tsx:201`.

`outline` is the de-facto "I don't know what color to use" fallback
across roughly half the chip surfaces.

### 2.5 — `not_applicable` and `pending` share `outline`/`secondary` but read identically (SEV: LOW)

`STATUS_VARIANT.not_applicable = 'outline'` while
`STATUS_VARIANT.pending = 'secondary'`. The icons are both `Loader`
with `text-text-tertiary`. At rest the two chips look almost identical
— the only difference is a 1px border (`outline`) vs a soft gray fill
(`secondary`). Comments at `status-control.tsx:215-232` note future
work to mute the entire timeline for `not_applicable` at 60% opacity,
which would solve it; today the distinction is invisible.

### 2.6 — Lifecycle "Rejected" chip is the **only** family that paints the whole chip red (SEV: LOW)

`rejection-chip.tsx:42-50` uses a custom hand-rolled
`bg-state-destructive-hover` + `border-state-destructive-border` +
`text-text-destructive` combo. The shadcn `destructive` Badge variant
exists (`badge.tsx:23`) and would render the same visual intent in 5
lines. Bespoke palette divergence creates a maintenance trap.

---

## 3 · Proposed unified ladder

A status chip is a triple of `(tone, shape, ornament)`. Pick one tone
per semantic, one shape per category of state, and one ornament style
per family. Use these as the audit checklist.

### 3.1 — Tone → meaning

| Tone                       | Semantic                                                            | Examples                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `success` (green)          | Closed / settled / healthy                                          | `done` / `paid` / `completed`, rule `active`/`verified`, source `healthy`, materials `Received`, client `ready`                              |
| `info` (blue)              | **Active work in progress**                                         | obligation `in_progress` / `review`, rule `pending_review` / `candidate`, pulse alert `New`                                                  |
| `warning` (amber)          | **External pause** — we're blocked on someone else, no urgency yet  | obligation `waiting_on_client`, source `paused`, `expired` invites, tip `Failed` (current usage is correct here)                             |
| `destructive` (red)        | **Hard block / failure** — work cannot proceed without intervention | obligation `blocked`, rule `rejected`, coverage `none`, pulse confidence `< 0.7`, materials `Needs review` (because the action is the CPA's) |
| `secondary` (gray fill)    | Not started / dormant                                               | `pending`, `not_applicable`, rule `archived`/`deprecated`, member `suspended`                                                                |
| `outline` (neutral border) | Reference tag — not a state at all                                  | source name, tax code, jurisdiction code, entity tag                                                                                         |

Single change to land most of #2.1 above: `EntityStateCell` and
`CoverageCell` swap their `review` color from amber → `info` blue so it
matches the rest of the app's "review = work in progress" reading.

### 3.2 — Shape → category

| Shape                             | Means                                                             | Used by                                                               |
| --------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Filled chip + lucide icon         | Lifecycle / workflow state ("where is this in its journey?")      | `ObligationStatusReadBadge` (canonical), rule status (after redesign) |
| Outline chip + reference text     | Metadata tag, not a state                                         | tax codes, jurisdictions, entity types, source names                  |
| Bare icon + tinted text (no chip) | Inline kicker inside a header row — already in a labelled context | `RuleStatusKicker` (keep), `ClientReadinessBadge` once compacted      |
| Progress bar segment              | Aggregate count across many rows                                  | `RuleStatusBar`, the rule library StatsBar progress meter             |

### 3.3 — Ornament rule

- Filled chip → **icon, no dot**. The chip fill carries tone; the icon
  carries identity. This is the rule
  `ObligationStatusReadBadge`/`ObligationQueueStatusControl` already
  follow.
- `outline` chip → **dot allowed**, because the chip itself has no tone
  to communicate (`HealthBadge`, `TemporaryRuleStatusBadge` are correct
  here).
- Filled chip + dot is **redundant** and should not ship — currently
  used by `ClientReadinessBadge`, `InvitationStatusPill`, and the
  dashboard `actions-list.tsx` row.

---

## 4 · Concrete next-step recommendations

Ordered by impact-per-LoC. None of these change semantics — they only
align visual treatment to the ladder above.

1. **`apps/app/src/features/dashboard/actions-list.tsx:394-402`** —
   replace the inlined `badgeVariants(...)` + `BadgeStatusDot` with
   `<ObligationStatusReadBadge status={row.status} />`. One import, one
   component swap. Lands family #3 onto the canonical icon-led
   treatment and fixes finding 2.3.

2. **`apps/app/src/routes/rules.library.tsx:267-300`
   (`EntityStateCell`) and `:305-329` (`EntityApplicabilityCell`)** —
   change `state === 'review'` color class from `text-text-accent`
   (resolves amber here) to the same accent token
   `RuleStatusBar`/`STATUS_TONE` uses for `review` (`accent-default`,
   blue). Fixes finding 2.1.

3. **`apps/app/src/features/rules/rules-console-primitives.tsx:225-242`
   (`CoverageCell`)** — same fix as #2; the comment at `:227-228` still
   maps `review` → `warning`. Update tone to `info` and the
   inline text class to `text-text-accent` resolved as blue. Together
   with #2 closes finding 2.1.

4. **`apps/app/src/features/clients/ClientFactsWorkspace.tsx:4114-4136`
   (`ClientReadinessBadge`)** — drop the inner `BadgeStatusDot`. Chip
   fill already carries tone. Lands finding 2.3 on the client surface.

5. **`apps/app/src/features/members/members-page.tsx:974-995`** — pick
   one shape for the family: either both `outline` + dot (preferred per
   §3.3) or both filled + no dot. Currently `MemberStatusPill` is
   `outline` and `InvitationStatusPill` is filled, which makes
   "Suspended" and "Expired" look unrelated.

6. **`apps/app/src/features/obligations/rejection-chip.tsx:42-50`** —
   replace the bespoke `bg-state-destructive-hover` / `border-state-destructive-border`
   block with `<Badge variant="destructive" className="text-caption-xs uppercase tracking-wide"><AlertTriangleIcon aria-hidden /><Trans>Rejected</Trans></Badge>`.
   Same visual, half the LoC, on-grammar with the primitive. Fixes 2.6.

7. **`apps/app/src/features/pulse/components/PulseSourceStatusBadge.tsx:9-15`** —
   drop the `BadgeStatusDot tone="error"` and tint the chip itself
   `destructive` to match `PulseStatusBadge`'s no-dot grammar. Or keep
   `outline` + dot and remove it from `PulseStatusBadge.tsx`'s history
   comment so the two converge.

8. **`apps/app/src/features/obligations/status-control.tsx:85-99` and
   `:111-127`** — once #1-#7 land, `STATUS_DOT` is no longer used by
   `ObligationStatusReadBadge` (icon-led) or
   `ObligationQueueStatusControl` (icon-led). Audit remaining importers
   (`obligations.tsx:178`, `dashboard.tsx`, `actions-list.tsx` after #1)
   and remove `STATUS_DOT` from the export surface to prevent future
   regressions onto the legacy treatment.

9. **`apps/app/src/routes/obligations.tsx:5511-5535` (`InsightStatusBadge`)
   and `:5903-5927` (`ReadinessResponseStatusBadge`)** — these are
   one-off ad-hoc surfaces. Once §3.1's tone ladder is canonical,
   re-audit: "Failed" → `destructive` (not `warning`); "Need help" →
   `warning` (correct); "Stale" → `info` (correct).

10. **Documentation** — add this audit's §3 ladder to
    [`docs/Design/DueDateHQ-DESIGN.md`](DueDateHQ-DESIGN.md) so future
    chip additions reference one source. The
    [`filter-vs-badge-contract.md`](filter-vs-badge-contract.md) file
    already exists and covers the orthogonal "what's filtering vs what's
    a badge" question; the tone ladder belongs alongside it.

Estimated combined effort for #1-#7: ~150 LoC changed across 6 files,
no schema changes, no test rewrites (label text and component contracts
are preserved).

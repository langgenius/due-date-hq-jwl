# Obligation Panel V2 + Alerts vocabulary cleanup

**Date:** 2026-05-22 (plan written) · **Target start:** 2026-05-23
**Author:** Yuqi pairing with Claude
**Status:** Plan / not started. Single doc covering both work threads because they're queued for the same session.

---

## Why this doc exists

Two threads landed in the same plan because they're small + small + medium, and
we want a one-session push to ship them together:

1. **Alerts vocabulary cleanup** — three surgical edits to settle the
   "Alerts vs Pulse" naming drift in the sidebar.
2. **Obligation Panel V2** — replace the current right-side panel on
   `/obligations` and client detail with a status-first layout, and unify
   it with the bulk-review drawer that the 2026-05-21 meeting asked for.

The panel work is the main event. Alerts is a 30-minute warmup.

---

## Thread 1 — Alerts vocabulary cleanup

### Background

Today the same surface has three different names:

| Surface             | Label                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| Sidebar nav         | **Alerts**                                                                            |
| Route page title    | **Pulse Notification**                                                                |
| Breadcrumb          | **Pulse alerts**                                                                      |
| Source-of-truth doc | `docs/Design/pulse-vocabulary.md` says **"Pulse alert" (singular noun)** is canonical |

The badge count next to the sidebar entry is also wrong long-term — it
pulls from `useInboxUnreadCount()` (the unified inbox), which today is
dominated by Pulse alerts but won't be once teammate @-mentions / status
notifications start landing.

### Resolution

Reconcile by drawing a clean engine-vs-surface distinction:

- **"Pulse"** stays as the **internal engine name** — it's what the
  source-watcher fleet is called in code, ports, contracts, server jobs.
  Devs see it. Users do not.
- **"Alerts"** becomes the **only user-facing label** for the surface,
  the page, the bell, and the badge.
- Long-form copy that absolutely needs to disambiguate (e.g. an admin
  setting that says "subscribe to Pulse-engine source updates") can keep
  "Pulse" but those are edge cases.

This narrows `pulse-vocabulary.md` to be a backend/contracts vocabulary
doc, not a user-facing one. The doc itself needs a one-paragraph update
at the top calling out the split.

### Work items

1. **Rename in `apps/app/src/routes/rules.pulse.tsx`** — page title goes
   from `t\`Pulse Notification\``to`t\`Alerts\``. Breadcrumb goes from
`[Rule library, Pulse alerts]`to`[Rule library, Alerts]`.

2. **Switch the badge to a Pulse-specific count.** Today:

   ```ts
   useInboxUnreadCount() // wraps orpc.notifications.unreadCount
   ```

   Want either:
   - Add `orpc.pulse.unreadCount` server-side and call it
   - Or extend `orpc.notifications.unreadCount` to take a `category`
     filter and call it with `'pulse'`
     The TODO comment already in `app-shell-nav.tsx:506` admits the
     stopgap — replace it with the real query.

3. **Update `docs/Design/pulse-vocabulary.md`** — add a "User-facing vs
   engine-facing vocabulary" section at top. The "Always 'Pulse alert'
   (singular noun)" rule narrows to apply only when we're naming the
   noun type in long-form copy; the surface label everywhere is
   "Alerts."

4. **(Optional, P2)** Add a `/alerts` route alias that 301s to
   `/rules/pulse`. The actual route stays under `/rules/` because it's
   wired into the rule-coverage breadcrumb, but bookmark-friendly URLs
   match what the sidebar says. Skip if the implementation cost > 10 min.

### Files touched

- `apps/app/src/routes/rules.pulse.tsx`
- `apps/app/src/components/patterns/app-shell-nav.tsx`
- `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
  (verify the command-palette entry is also labeled "Alerts")
- `packages/contracts/src/notifications.ts` or `pulse.ts` (whichever
  exposes a Pulse-scoped unread count)
- `docs/Design/pulse-vocabulary.md`
- New dev-log in `docs/dev-log/`

### Time estimate

30–45 min for items 1–3. Item 4 if it fits.

---

## Thread 2 — Obligation Panel V2

### Background

The current right-side obligation panel (rendered on `/obligations`,
client detail, and the off-route drawer fallback) is a documentation
surface. It shows everything but decides nothing. The
`docs/Design/obligation-drawer-ux-audit-2026-05-21.md` write-up scored
it 22/40 — "the drawer **knows too much and decides too little**."

Yuqi sketched three iterations on a different shape (screenshots
attached to the 2026-05-22 session). Common thread:

- **Horizontal status pipeline** as the primary visual spine
- **Active-stage card** below the pipeline showing the substeps for
  the current state + the canonical action buttons in context
- **Sections, not tabs** for the supporting content
- **Lighter footer** — `Copy link · Close`, no shadow

The smartest move in the sketches is **nesting** the e-file substep
pipeline (Authorization requested → signed → submitted →
accepted/rejected) inside the active "Filed" stage card. The top-level
pipeline stays at 6 canonical states; the multi-step internals of
"Filed" only surface when the user is inside it.

### Anatomy (top → bottom)

#### 1. Header

Unchanged from current. Client name, jurisdiction chip, form name · tax
year. Cross-surface peek icon stays in the top-right corner.

#### 2. Status pipeline (new)

A horizontal row of the 6 canonical states from
`docs/Design/obligation-lifecycle-design-brief.md`:

`not_started · waiting_on_client · blocked · in_review · filed · completed`

Each dot renders as:

- **Completed stages** → filled green dot, small date stamp below
  (`2026-05-04`)
- **Current stage** → filled accent dot, label in accent color, date
  below
- **Future stages** → empty ring, `—` date placeholder
- Hover on any dot → tooltip with full state-entry timestamp
- Click on any dot → status change (with the same guardrails as today's
  status combobox — backward moves prompt, the `extended` memo modal
  still fires, locked transitions are dimmed)

Reusable as `<StatusPipeline obligation={...} onTransition={...} />`
elsewhere (e.g. dashboard hover-preview, batch-review drawer).

#### 3. Active-stage card (new)

Tinted block immediately below the pipeline, scoped to the current
stage. Dispatch logic by status:

| Current stage       | Card content                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `not_started`       | Single CTA: "Start work" → flips to `in_progress`                                                         |
| `waiting_on_client` | Readiness checklist (what we're waiting on — trial balance, K-1s, etc.) + "Mark received" CTA             |
| `blocked`           | Blocker note + "Unblock" CTA                                                                              |
| `in_review`         | Reviewer name + review-note input + "Approve" / "Send back" CTAs                                          |
| `filed`             | E-file substep pipeline (5 substeps from `efileState` machine) + "Mark accepted" / "Mark e-file Rejected" |
| `completed`         | Completion timestamp + read-only summary, no CTAs                                                         |

Each card has **at most two contextual action buttons** at the bottom.
No multi-CTA chaos.

#### 4. Deadlines section

Each on its own row, dates right-aligned:

- Internal due (the one we track ahead of statutory — from `0040_internal_deadline_offset`)
- Statutory due
- Filing due (only renders if different from statutory)
- Payment due (only renders if `is_payment` rule is in play)

#### 5. Period section

Only renders for fiscal-year clients. Hidden entirely for
calendar-year (the default) to avoid noise.

- Tax year ending (`Dec 31`)
- Related FYE (`2025-05`) + FYE-month label

#### 6. Evidence section

Collapsed by default to one-liner:
`Filed with 3 document items · [Add item]`

Expands to show each linked evidence row: type chip, source name,
date, and a chevron to open the evidence detail.

#### 7. Documents received section

Roll-up of the readiness checklist's progress, even when the obligation
is past `waiting_on_client`:

- ✓ Trial balance and general ledger — _Sent mail balance, schedule K-1_
- ✓ Payroll and officer wages — _Payroll reports, officer comp, W-2_
- ○ Fixed asset additions and disposals — _Late payment office PP…_

Always read-only here. The actionable version lives inside the
"waiting_on_client" active-stage card.

#### 8. Activity (optional, lazy-loaded)

Comments + status-change events. Same component the audit-log surface
uses, just filtered to this obligation. Lazy-loaded behind an "Show
activity" link so the panel doesn't pay the cost on every open.

#### 9. Footer

Light divider, no shadow. Just `Copy link · Close`. The current footer
gradient + multi-action toolbar goes away.

### Design logic checks (resolved)

- **Pipeline click = status change.** Same guardrails as combobox.
- **Substep checklist is read-only inline.** The single active substep
  has a CTA at the bottom of the card; we don't put inline `[Do that →]`
  links on every substep. That keeps the side panel from competing with
  itself for clicks.
- **`not_started` panels avoid emptiness** by showing a single "Start
  work" CTA instead of an empty active-stage card.
- **Tabs are removed**, not collapsed. Side panel = browse mode = scroll
  the sections. If content grows past 3 viewport heights, we revisit
  with a sticky sub-nav on the right rail.
- **Pipeline at narrow widths.** Below ~520px the dates under each dot
  truncate to two-letter labels. Below ~420px the pipeline switches to
  a vertical stepper. (Most usage is at 560–720px which fits fine.)

### Component plan

```
<ObligationPanel obligation={…} mode={'view' | 'review'}>
  <ObligationPanel.Header />
  <StatusPipeline value={status} onChange={…} dates={statusDates} />
  <ActiveStageCard status={status} obligation={…} onAction={…} />
  <DeadlinesSection />
  <PeriodSection />                 {/* conditional on fiscal */}
  <EvidenceSection />               {/* collapsed by default */}
  <DocumentsSection />              {/* roll-up, read-only */}
  <ActivitySection />               {/* lazy, behind "Show activity" */}
  <ObligationPanel.Footer />
</ObligationPanel>
```

`<StatusPipeline>` and `<ActiveStageCard>` are each their own files in
`apps/app/src/features/obligations/` — they'll be reused by the dashboard
hover-preview and batch-review drawer.

---

## Thread 3 — Batch-review drawer (unification with V2 panel)

### The move

`<ObligationPanel mode="review">` IS the batch-review drawer. The
component shell is identical; review mode adds three things:

1. **Top strip:** `Reviewing 3 of 12 · [← Prev] [Next →]`
2. **Footer strip (replaces normal footer):** `[Skip] [Reject] [Accept]` + a single-line review-note input
3. **Hotkeys:** `←` prev · `→` next · `A` accept · `R` reject · `S` skip · `⌘Enter` submits with note

Same visual shape as Rule Library V3's batch-review modal, but as a
right-side drawer (since obligations are richer than rules — full panel
of context matters during the review).

### Entry point

The current `/obligations` page has a floating bulk-action toolbar at
the bottom of the viewport (built 2026-05-21). It currently shows:

- "Assign owner" dropdown
- "Set status" dropdown
- "Export selected"
- "Clear"

Change: replace those four with **a single primary action**:

- `Review N obligations →` button (opens batch-review drawer)
- A "..." kebab for the old bulk operations (assign / set status /
  export) — those are still useful but rarely the primary intent.

The Review button uses the existing `selectedRows` / `selectedIds`
state. No data-layer changes needed.

### Server-side

The accept / reject / skip actions are status changes that already
exist on the contract (`bulkUpdateStatus`). The new piece is the
review note — needs a fresh column or a new event type. Two options:

- **Option A:** Add `review_note` to the bulk-update mutation payload.
  Stored on the `obligation_status_event` row as the event memo. No
  schema change because the event row already has a `memo` column.
- **Option B:** New mutation `bulkReviewSubmit(obligationId, action,
note)` that explicitly models "review" as its own event type rather
  than a status change with a note.

**Recommendation: Option A.** Reuses existing infra. Promote to B
later only if "review" needs its own audit category.

---

## Build sequence (chronological)

The two threads share an editor session but not a commit. Each lands
as its own dev-log entry.

### Day plan

1. **Alerts vocabulary cleanup (~45 min)**
   - Rename in `rules.pulse.tsx`
   - Wire Pulse-specific badge count
   - Update `pulse-vocabulary.md`
   - Dev-log + commit

2. **Obligation Panel V2 — foundation (~3 hrs)**
   - Build `<StatusPipeline>` component (own file)
   - Build `<ActiveStageCard>` with the 6-stage dispatch
   - Build the new `<ObligationPanel>` shell composing the above + sections 4–9
   - Swap mount in `/obligations` right column (this is the hot path)
   - Swap mount in client detail
   - Typecheck + dev-log

3. **Obligation Panel V2 — propagation (~1 hr)**
   - Hover-preview on dashboard rows uses `<StatusPipeline />` as the
     mini summary
   - Remove the old drawer's tabs/sections file once nothing imports it
   - Lingui extract

4. **Batch-review drawer (~2 hrs)**
   - Add `mode="review"` branch to `<ObligationPanel>`: top strip + footer strip + hotkeys
   - Wire to `selectedRows` on `/obligations` — Review button + kebab
     refactor of the floating toolbar
   - Extend `bulkUpdateStatus` mutation to accept `review_note`
   - Server: store note in `obligation_status_event.memo` when present
   - Dev-log + commit

5. **Wrap-up (~30 min)**
   - Run e2e smoke (`apps/app` route tests)
   - Update `docs/Design/obligation-drawer-ux-audit-2026-05-21.md` with
     "Resolved by V2 panel" note + link to this doc
   - Final dev-log summarizing the day

**Total: ~7 hrs of active build time.** Realistic for a focused day.

---

## Open questions / risks

1. **`<StatusPipeline>` click semantics on backward moves.** The current
   status combobox doesn't have a great answer — it lets you go
   backward with a confirm prompt. Pipeline-as-control needs to match
   that. Decision: confirm dialog on backward, no confirm on forward
   to the next adjacent state, confirm-with-note on non-adjacent
   forward jumps (e.g. `not_started → filed` skips 4 steps).

2. **What happens to the existing audit-trail tab inside the current
   panel?** The audit-log audit doc moved this to Settings. With V2
   panel, the in-panel "Activity" section becomes the lightweight view
   and the full audit log lives under Settings. No conflict — they're
   different scopes.

3. **Performance on `<StatusPipeline>` rendering inside a 200-row queue
   table for hover-preview.** The pipeline has 6 dots + dates; rendered
   200x for a hover preview is unnecessary. Render the pipeline only
   in the panel, and for the queue rows keep the existing single-dot
   status indicator. Avoid the trap of "use the new component
   everywhere."

4. **Mobile / narrow widths.** Below ~420px the pipeline collapses to a
   vertical stepper. The panel itself is rarely shown that narrow in
   practice (the queue page splits 1fr / 480px at lg+), but client
   detail on a phone could hit it. Acceptable: the panel scrolls
   internally on small screens.

5. **Does the batch-review drawer animate in over the queue, or replace
   it?** Decision: slides in from the right edge as a Sheet, queue stays
   visible underneath but dimmed. Mirrors how the Rule library batch
   review modal feels — workflow-oriented, with the source table still
   in peripheral view.

---

## Out of scope (deferred to a later doc)

- Comments inside the panel (the "Activity" section ships read-only; a
  reply input is a separate design pass)
- Email-send action from the active-stage card (e.g. "Send reminder to
  client" when in `waiting_on_client`) — needs the email-templating
  story to be locked first
- Mobile-first redesign of the queue + panel — desktop-first for now
- Renaming "Alert" to "Alert History" as a separate IA — depends on
  whether there's actually a History surface to build; this doc only
  fixes vocabulary, not IA structure

---

## Files this plan will touch (rough inventory)

### Thread 1 (Alerts)

- `apps/app/src/routes/rules.pulse.tsx`
- `apps/app/src/components/patterns/app-shell-nav.tsx`
- `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
- `packages/contracts/src/notifications.ts` (or `pulse.ts`)
- `apps/server/src/procedures/notifications/index.ts` (likely)
- `docs/Design/pulse-vocabulary.md`

### Thread 2 (Panel V2)

- `apps/app/src/features/obligations/StatusPipeline.tsx` (new)
- `apps/app/src/features/obligations/ActiveStageCard.tsx` (new)
- `apps/app/src/features/obligations/ObligationPanel.tsx` (new — replaces the current panel composition)
- `apps/app/src/features/obligations/ObligationDrawerProvider.tsx` (mount swap)
- `apps/app/src/routes/obligations.tsx` (panel column swap)
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` (panel mount swap)

### Thread 3 (Batch review)

- `apps/app/src/features/obligations/ObligationPanel.tsx` (extend with `mode="review"`)
- `apps/app/src/features/obligations/BatchReviewDrawer.tsx` (new, thin wrapper)
- `apps/app/src/routes/obligations.tsx` (replace floating toolbar primary action)
- `packages/contracts/src/obligations.ts` (extend `bulkUpdateStatus` input with `review_note`)
- `apps/server/src/procedures/obligations/_service.ts` (persist note on status event)

### Cleanup

- `apps/app/src/features/obligations/ObligationDetailDrawer.tsx` or similar — delete or shrink the old shape
- `docs/Design/obligation-drawer-ux-audit-2026-05-21.md` — append "Resolved by V2 panel" pointer
- `docs/dev-log/2026-05-23-*.md` (probably 2 entries — alerts + panel)

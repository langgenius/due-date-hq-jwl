# /clients family — UX critique + cross-route consistency audit

**Date:** 2026-05-27 (after PR #31 merge, branch `design/audit-drain-pass-1`)
**Audited surfaces:** `/clients` (list) + `/clients/[id]` (detail) + the three peek surfaces (`ClientDetailDrawer`, `ClientPeekHoverCard`, full page)
**Method:** Code investigation (3 parallel reconnaissance agents) + live preview screenshots of both pages in two states (needs-facts client, populated client, Client info tab) + diff against canonical patterns in `page-family-canonical.md` and the four sibling workbench pages (/deadlines, /rules/library, /alerts, /notifications).
**User signal that prompted the audit:** "audit and inspect the client page and client/id page. critique UX and product logic. also the user journey. also audit against the other pages — if they are in the same style."

---

## §0. Executive summary

The chrome is on canon (PageHeader, card frame, filter band, EmptyState, Skeleton all use the canonical primitives). The drift is in **interaction semantics, structural debt, and a handful of broken-in-front-of-the-user bugs** the live pass surfaced that the code pass missed.

Two passes contributed to this doc:

- **Pass 1** (code + cross-route compare): §1-§9. Identifies architectural and consistency issues.
- **Pass 2** (live click-through in preview): §10-§12. Identifies things that actually break, confuse, or behave unexpectedly when you click them.

### Pass 2 headliners — fix these first

**🔴 P0 — embarrassing if shipped, all <1h fixes:**

| #      | Finding                                                                                                                                                                                  | Where                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **L4** | User-facing copy leaks raw UUID — Activity tab → Client summary (AI) → Next step reads `"Request a refresh after updating risk inputs for client 10000000-0000-4000-8000-000000000007."` | AI summary template                          |
| **L2** | `FixNeedsFactsSheet` counter has a broken interpolation: `"0 of  fixed · 1"` (double space, missing total)                                                                               | `FixNeedsFactsSheet.tsx`                     |
| **L1** | "Quick peek" row menu item silently does full nav — confirmed live (drawer never opens, URL goes to `/clients/[id]`)                                                                     | `ClientDrawerProvider.tsx:45-52` + menu item |

**🟠 P1 promoted from live pass:**

| #       | Finding                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L10** | Obligation panel header shows "FILING DEADLINE green (Filed)" simultaneously with "INTERNAL TARGET 72 DAYS OVERDUE" in red. CPA can't tell whether the filing is done or overdue. |
| **L9**  | Right obligation panel squeezes the left column when it opens — SummaryStrip wraps ugly, "Activity" tab ellipsizes to "Activi…", "Add deadline" CTA cramps.                       |
| **L11** | Workpapers empty state is a dead end — names workpapers, gives no CTA to add one.                                                                                                 |

### Pass 1 headliners — structural / architectural

| #   | Finding                                                                                                                                                                           | Severity | Where                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| 1   | Row-click takes user to a full-page route while sibling workbench pages keep the user in-page via drawer / dialog                                                                 | **P0**   | `ClientFactsWorkspace.tsx:1637-1649`            |
| 2   | Three parallel "peek client" surfaces (hover card, drawer, full page) with hand-rolled next-due logic in each; the drawer is silently a no-op when invoked from `/clients` itself | **P0**   | `ClientDrawerProvider.tsx:45-52` + 3 components |
| 3   | `ClientFactsWorkspace.tsx` is **5,672 lines** and hosts BOTH the list and the detail page in one file — single largest structural debt in the app                                 | **P1**   | `ClientFactsWorkspace.tsx:756 + 2142`           |
| 4   | "At risk: 2" tile navigates AWAY to `/deadlines?status=blocked` instead of filtering the filing plan below (corrected in pass 2 — tile IS clickable, mental model is still wrong) | **P1**   | `ClientSummaryStrip` + `ClientWorkPlanPanel`    |
| 5   | Three queries fire on tabs the user may never open (risk-summary, pulse-history, audit-log) — wasted network on first paint                                                       | **P2**   | `clients.$clientId.tsx` query block             |

Plus 7 P2 items, 7 P3 polish items, and 7 additional live-pass P2 findings — full list in §3-§6 and §10.

### Recommended order (full list in §12)

1. Fix the two broken-string bugs (L2 + L4) — under an hour each
2. Decide the peek strategy — one conversation resolves P0-1/2/3 + L1 together
3. Disambiguate the obligation panel header (L10) — semantics of FILING DEADLINE / INTERNAL TARGET / PAYMENT DUE
4. Wire SummaryStrip tiles to filter in-place OR rename them (L8)
5. Fix the right-panel layout cascade (L9)
6. Polish: title switcher copy (L5), finish Discover→Opportunities rename (L6, L7), convert filing plan to real `<table>` (L3), Workpapers CTA (L11)

### Calibration note on methodology

The live pass also caught a falsifying observation: some "popover bleed-through" patterns that _appeared_ in screenshots from the Claude Preview tool turned out to be **screenshot artifacts**, not real visual bugs (computed styles confirmed `bg: white`, `opacity: 1`, `visibility: visible`). Those findings were dropped from the doc so the bugs list stays trustworthy. The preview tool is reliable for DOM structure, computed styles, click→navigation behavior, and text content — but unreliable for visual fidelity of overlays mid-animation. Treat any future "popover looks faded" claim as suspect unless backed by a computed-style read.

---

## §1. User journey — where it breaks

### Journey A: "I need to look up one client" (most common path)

```
/today  ──┐
/deadlines (filter by client) ──┤
/clients  ──┐                   ├──→  [the client]
hover/⌘K  ──┤                   │
direct URL ─┘                   │
                                ▼
                         ??? — three different surfaces ???
                         a) ClientPeekHoverCard (hover only, very brief)
                         b) ClientDetailDrawer (Sheet, ~400px wide, peek-style)
                         c) /clients/[id] full page workbench
```

**The friction:**

- From `/clients`, plain row click → **full page nav.** No way to peek without leaving.
- From `/clients`, ⌘-click → "supposed to" open the drawer, but `ClientDrawerProvider` hard-redirects to the full page when `pathname === '/clients'` (lines 45-52). **The ⌘-click is silently a no-op on the very page that documents it.**
- From `/clients` row menu, "Quick peek" item → same silent no-op (same provider override).
- The Eye-icon on hover IS the only working peek-without-leaving affordance on `/clients` — but it's a hover popover (mouse-only, no keyboard parity).
- From OTHER pages (/deadlines, /today, etc.), the same ⌘-click / row-menu / link to a client → the drawer DOES open. So the drawer works everywhere except on its own home.

**Net effect:** `/clients` users learn "click = leave" while users coming from `/deadlines` or `/today` learn "click = peek." Same data model, two different mental models, depending on the entry point.

### Journey B: "One client needs attention" → drilling in

The CPA opens `/clients/[id]` and sees three SummaryStrip tiles:

```
┌───────────────┬─────────────┬───────────────┐
│ Form 1065     │ 2           │ 1             │
│ Next due      │ At risk     │ Open filing   │
└───────────────┴─────────────┴───────────────┘
```

Then a `Work` tab with a filing plan below. **The "2 at risk" doesn't link to which 2 rows below.** Filtering or highlighting isn't wired — the count is informational only. CPA has to scan the plan manually to find the at-risk items.

Compare /deadlines: same data, but at-risk rows carry a red left-rail and a visible status chip, AND the toolbar can filter to scope=at_risk. The /clients/[id] filing plan doesn't borrow either affordance.

### Journey C: "Client lacks facts" (Needs facts state)

Screenshot 1 (Riverbend Draft Client):

- Header: client name + "Add filing state" warning chip
- Hero: "Nothing open · 0 At risk · 0 Open filing"
- Banner: "Add this client's filing state to start generating deadlines."
- Work tab: empty (the mock filing was an artifact of seed data — production would show empty state)

**The empty state of the detail page is structurally honest but emotionally flat.** The three SummaryStrip tiles all say "0" or "Nothing open" — but they don't say WHY. The banner explains it once, but the tiles re-render the no-data fact twice without coupling it to the cause.

A better treatment: a single full-width hero card on needs-facts clients that explains "deadlines will appear here once you set the filing state" + a single CTA "Add filing state" — replacing the three meaningless tiles + the redundant banner.

---

## §2. Product-logic question marks

These are decisions that look intentional but read as confusing in the rendered surface. Worth interrogating with the team before "fixing":

1. **"Filed" column hidden by default on /clients list.** Why? It's the primary CPA brag metric — "we filed N on time this year." Currently you have to enable the column manually. Either default-on, or move to a "year stats" hover card on the row.

2. **"Opportunities" tab still uses URL key `discover`** (`ClientFactsWorkspace.tsx:2772-2775`). A rename happened but the URL didn't. Either finish the rename (URL key → `opportunities`) or document the historical URL.

3. **"Next due" tile on the SummaryStrip shows just the FORM name (e.g. "Form 1065"), not the date.** The date lives in the eyebrow row above ("next due Nov 15 · Extended"). The tile is a structural placeholder — eye lands on it expecting to learn "when" and only learns "what." Either show the date in the tile or rename it ("Next filing").

4. **`At risk` tile counts but doesn't filter.** Clicking it doesn't scope the filing plan below. Either make the tile a filter trigger (canonical /deadlines tile-as-filter pattern) or rename to "Risk count" to set the right expectation.

5. **Three peek surfaces, three near-duplicate next-due calculations:**
   - `ClientDetailDrawer.tsx:108-129`
   - `ClientSummaryStrip.tsx` (tile)
   - `ClientPeekHoverCard.tsx`

   The drawer carries a comment (lines 31-39) noting `TERMINAL_STATUSES` drifted between them and was fixed once. The next drift will happen again. Pull next-due into a shared util.

6. **"Quick peek" menu item on /clients rows opens... nothing visible** (`ClientFactsWorkspace.tsx:1346-1348`). It calls `openClientDrawer` which the provider intercepts. Either fix the provider override OR remove the menu item OR rename it "Open client" (since that's what actually happens).

7. **`InfoBanner` "Import clients from CSV…" tip renders when `clients.length < 5`** (`clients.tsx:426-433`). This banner has zero affordance to dismiss it once dismissed-from-localStorage state is cleared, and the threshold of "5" is arbitrary. Likely should ship with the EmptyState body instead of as a separate banner.

---

## §3. Critical findings (P0)

### P0-1. Row-click leaves the workbench

**File:** `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1637-1649` (row handler)
**Compare:** `obligations.tsx` ~3666 (drawer pattern), `rules.library.tsx:3506` (dialog pattern)

| Surface        | Row click behavior                                     |
| -------------- | ------------------------------------------------------ |
| /deadlines     | Opens obligation detail drawer (split view, in-page)   |
| /rules/library | Opens rule detail Dialog modal (in-page)               |
| /alerts        | Opens pulse detail drawer (in-page)                    |
| /notifications | Marks read + navigates IF the notification has an href |
| **/clients**   | **Full route nav to `/clients/[id]`**                  |

`/clients` is the only workbench list page where plain click takes the user OFF the page. The escape hatch (⌘-click for drawer) is undocumented in the UI and silently broken on `/clients` itself.

**Why this matters:** A CPA scanning the list to confirm which client owns which next-due item should be able to peek without losing scroll position + active filter context. Today they have to back-button (lose context) or learn the ⌘-click chord (which doesn't even work here).

**Fix paths (not prescribed — discussion needed):**

- A. Make plain click open `ClientDetailDrawer` (canonical peek), promote drawer's "Open full page" button as the path to the workbench
- B. Keep current behavior on `/clients` but make ⌘-click work (delete the provider override for `/clients`)
- C. Add a dedicated Eye-icon column / row affordance that's keyboard-reachable (current Eye-icon is hover-only)

### P0-2. Three peek surfaces, three sources of truth

**Files:**

- `apps/app/src/features/clients/ClientDetailDrawer.tsx` (331 lines, Sheet, ~400px)
- `apps/app/src/features/clients/ClientPeekHoverCard.tsx` (hover popover, used on /clients row Eye-icon)
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx:2142+` → `ClientDetailWorkspace` (full page)

Each surface hand-rolls its own next-due math, its own "is the client terminal?" check, its own status chip layout. The drawer's docblock (lines 41-62) explicitly notes a 2026-05-22 rework from "drawer-shaped detail page" to "brief tooltip-style peek" — confirming this was an intentional split, but the split made the duplication worse, not better.

The cost: every status taxonomy change (e.g. our recent payment-overdue work) has to be propagated across 3 surfaces. Drift WILL happen — see the `TERMINAL_STATUSES` comment in the drawer flagging a past drift.

**Recommended:** Extract `useClientNextDue(clientId)` + `useClientReadiness(clientId)` as the single source of truth. All three surfaces consume the hook.

### P0-3. `ClientDrawerProvider` silently overrides intent on its home page

**File:** `apps/app/src/features/clients/ClientDrawerProvider.tsx:45-52`

```ts
function openDrawer(id) {
  if (pathname === '/clients') {
    navigate(clientDetailPath(client)) // ← drawer NEVER opens here
    return
  }
  setDrawerClientId(id) // ← drawer opens everywhere else
}
```

The override exists because — per inferred design intent — "you're already on the list, opening a drawer over it is redundant." But:

- The row context menu offers "Quick peek" which calls `openDrawer` → does nothing visible
- The ⌘-click handler describes opening a drawer in its inline comment (`ClientFactsWorkspace.tsx:1638-1645`) → does nothing
- Users with this knowledge break their mental model on the very page that exposes the affordance

**Fix:** Either remove the override (let drawer open on `/clients` too, treat it as a peek), OR remove the "Quick peek" menu item + the ⌘-click handler (don't expose what doesn't work).

---

## §4. High-impact findings (P1)

### P1-1. `ClientFactsWorkspace.tsx` is 5,672 lines and houses two pages

**File:** `apps/app/src/features/clients/ClientFactsWorkspace.tsx`

Structure:

- L756 → `ClientFactsWorkspace` (list page workspace, ~1,400 lines)
- L2142 → `ClientDetailWorkspace` (detail page workspace, ~3,500 lines including inlined panels)
- ~80 top-level functions, ~952 comment-prefixed lines of design-residue

This is the largest single file in the app and the most expensive to navigate in IDE / git blame / code review. Splits worth considering:

- `ClientListWorkspace.tsx` (just the list)
- `ClientDetailWorkspace.tsx` (just the detail shell)
- `ClientWorkPlanPanel.tsx` (the filing plan grouping, sorting, bulk bar — currently inlined ~3170-3700)
- `ClientFactPanels.tsx` (compliance posture, jurisdictions, risk, source — currently lower in the file)

Cost is "design residue" comments: every inline comment with a date and a name is signal — useful as audit trail — but at 952 such lines it dominates the file. Most are addressable by extracting + dedicated unit files.

### P1-2. At-risk count doesn't filter the filing plan

See §1 Journey B + §2 Q4. Concrete: the tile should either become a filter trigger OR be replaced with a per-row signal in the filing plan (red rail + chip — same as /deadlines).

### P1-3. Eager-load all tabs' queries on first paint

**File:** `apps/app/src/features/clients/ClientFactsWorkspace.tsx:2238-2255` (query block in `ClientDetailWorkspace`)

Currently runs:

- `clients.get(id)` — needed always
- `obligations.listByClient(id)` — needed for Work tab + SummaryStrip
- `clients.getRiskSummary(id)` — only needed for Activity tab (AI summary)
- `pulse.listHistory({client: id})` — only needed for the active alerts section (rare)
- `audit.list({entityId: id})` — only needed for Activity tab + only when `canReadAudit`

On first paint, 5 queries fan out. If the CPA only ever opens Work + Client info, queries 3 and 5 were wasted.

**Fix:** Gate the lazy queries on `activeTab === 'activity'` (and `pulse` on the alerts-section presence). Standard pattern. Saves ~2 round-trips per detail page open.

### P1-4. N+1 query pattern on /clients list for pulse data

**File:** `apps/app/src/routes/clients.tsx:150-168`

```ts
const pulseAlerts = pulseHistoryQuery.data ?? []
const pulseDetailQueries = useQueries({
  queries: pulseAlerts.map((alert) => ({
    ...orpc.pulse.getDetail.queryOptions({ input: { id: alert.id } }),
  })),
})
```

With 50 alerts: 50 individual queries, each rerunning when the pulse history list mutates. Add server-side batch endpoint `pulse.getDetailsBatch({ids: [...]})` and consume that instead.

---

## §5. Medium findings (P2)

### P2-1. SummaryStrip "Next due" tile shows the form name, not the date

See §2 Q3. The eyebrow row above ALREADY shows the date — the tile is now duplicative AND ambiguous (it says "Form 1065 / Next due" with no temporal hint until the eye finds the eyebrow).

### P2-2. "Client info" tab count badge "(1)" is unexplained

Looking at the screenshot, the Client info tab carries a "1" badge but the panel below shows fully-filled compliance posture + jurisdictions. What does the "1" count? Probably "1 missing fact" or "1 needing CPA confirmation" — unlabeled. Add a `title` attribute or a tooltip.

### P2-3. NeedsFacts action strip uses `rounded-full` (one-off)

**File:** `ClientFactsWorkspace.tsx:2034`

Sibling pages use `rounded-md` for analogous status strips. This is `rounded-full` (pill-shaped). The 2026-05-26 design system audit logged it as "deliberate divergence" — but with no documented rationale on the visual canon. Either document why it's full-round OR normalize to `rounded-md`.

### P2-4. Eyebrow back-link "< Clients" is a hand-styled `<Link>` instead of canonical `breadcrumbs` prop

**File:** `ClientFactsWorkspace.tsx:2504-2517`

The PageHeader pattern primitive supports a `breadcrumbs` prop. `/clients/[id]` overrides with `eyebrowAside`. Settings, members, billing.checkout all use `breadcrumbs={[...]}`. The override has an inline rationale (carrying `ClientCycleArrows` in the same row) but it puts /clients/[id] on its own island.

### P2-5. `InfoBanner` "Import tip" is /clients-local

**File:** `clients.tsx:426-433`

No other workbench list page renders an `InfoBanner` between PageHeader and the table card. Belongs in the EmptyState body when `clients.length === 0`, not as a persistent strip when `clients.length < 5`.

---

## §6. Polish (P3)

| #   | Issue                                                                                                                                                                                                        | File:line                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 1   | Hard-coded pixel widths on workspace table columns (`w-[240px]`, `w-[120px]`, `w-[90px]`)                                                                                                                    | `ClientFactsWorkspace.tsx:952-1321`       |
| 2   | Unused workspace props (`readinessFilter`, `sourceFilter`, `pulseFilter`) declared but never consumed                                                                                                        | `ClientFactsWorkspace.tsx:216-219`        |
| 3   | Comment-prefixed dead imports (`SectionFrame` + `SectionLabel` retired 2026-05-24, comment stays)                                                                                                            | `ClientFactsWorkspace.tsx:151-154`        |
| 4   | `useEffect` to sync responsive page size (flagged as exception to project's "no useEffect" rule)                                                                                                             | `ClientFactsWorkspace.tsx:1454-1456`      |
| 5   | Eye-icon Peek button uses hover-only `opacity-100` (focus-visible kicks in but tab order still hits invisible element)                                                                                       | `ClientFactsWorkspace.tsx:938-947`        |
| 6   | `ClientCycleArrows` was dropped from header then reinstated to a different slot (history in comments)                                                                                                        | `ClientFactsWorkspace.tsx:2586-2594`      |
| 7   | `ClientSummaryStrip` uses some tones (`accent`, `warning`) but the tile colors don't align with the brown-unification work just shipped on /rules/library — possibly the next page to receive that treatment | `ClientSummaryStrip.tsx` L347, L356, L369 |

---

## §7. Cross-route consistency matrix

| Aspect                                                  | /clients                              | /deadlines               | /rules/library                             | /notifications    | Verdict                                                    |
| ------------------------------------------------------- | ------------------------------------- | ------------------------ | ------------------------------------------ | ----------------- | ---------------------------------------------------------- |
| PageHeader                                              | ✅ canonical                          | ✅                       | ✅                                         | ✅                | unified (PR #32)                                           |
| Title count chip                                        | ✅ `rounded-full bg-state-base-hover` | ✅                       | ✅                                         | ✅                | unified                                                    |
| Card frame (`rounded-md border-divider-subtle`)         | ✅                                    | ✅                       | ✅                                         | n/a               | unified                                                    |
| Filter chips (`TableHeaderMultiFilter` toolbar variant) | ✅                                    | ✅                       | ✅                                         | n/a               | unified                                                    |
| Scope tabs                                              | ❌ none                               | ✅ "Active / All / etc." | ✅ "All / Active / Needs review / Missing" | ✅ "Unread / All" | **/clients lacks scope tabs** (likely fine — single scope) |
| Row interaction                                         | ❌ **full nav**                       | ✅ in-page drawer        | ✅ in-page dialog                          | ✅ mark + nav     | **DRIFT**                                                  |
| Peek surfaces                                           | ❌ **three (hover/drawer/page)**      | one (drawer = detail)    | one (dialog = detail)                      | one (full page)   | **DRIFT**                                                  |
| Empty / loading / error                                 | ✅ EmptyState / Skeleton / Alert      | ✅                       | ✅                                         | ✅                | unified                                                    |
| Pagination footer                                       | ✅ canonical                          | ✅                       | ✅ (infinite scroll)                       | n/a               | unified                                                    |
| Eyebrow back-link on detail                             | ⚠️ hand-rolled `<Link>`               | n/a (drawer)             | n/a (dialog)                               | n/a (drawer)      | drift                                                      |
| Status badge family                                     | ✅ `ObligationStatusReadBadge`        | ✅ same                  | ✅ same                                    | n/a               | unified                                                    |
| Pulse/alert chrome                                      | ✅ `ClientActiveAlertsSection`        | ✅ banner                | n/a                                        | n/a               | similar                                                    |

**Material drift:** row interaction (P0-1), peek surface multiplicity (P0-2).
**Acceptable divergence:** no scope tabs, eyebrow back-link (documented rationale).
**Open question:** SummaryStrip tone palette vs the brown-unification just shipped on /rules/library.

---

## §8. Recommended sequencing

If addressing the full list, this order delivers the most user value with the least churn:

1. **Decide the peek strategy** (§3 P0-1, P0-2, P0-3 together). One conversation, one decision. Outcomes:
   - Drawer-as-peek everywhere → fix the provider override, retire ClientPeekHoverCard
   - Full-page-as-peek (current) → retire ClientDetailDrawer, retire Quick-peek menu item
   - Hybrid → document the rules in `page-family-canonical.md`
2. **Extract the duplicated next-due math** (§3 P0-2) — same scope as #1 but a code-only follow-up
3. **Wire "At risk" tile as a filter trigger** (§4 P1-2) — small, high-leverage IA fix
4. **Gate lazy tab queries** (§4 P1-3) — performance win on every detail-page open
5. **Replace N+1 pulse queries with a batch endpoint** (§4 P1-4) — server + client change
6. **Address SummaryStrip "Next due" copy** (§5 P2-1) — small, removes confusion
7. **Split `ClientFactsWorkspace.tsx`** (§4 P1-1) — structural refactor, low-risk if scoped to mechanical extraction
8. P2 + P3 items as opportunistic polish

---

## §9. Related docs

- `page-family-canonical.md` — the canon
- `cross-route-consistency-matrix.md` — matrix /clients was last audited against
- `clients-list-and-detail-critique-2026-05-22.md` — prior critique (some items below already addressed)
- `clients-family-macro-micro-audit-2026-05-26.md` — most recent prior audit
- `clients-detail-critique-2026-05-26-post-revamp.md` — companion to the macro/micro audit
- `2026-05-27-page-header-chip-unification.md` (dev-log) — PR #32 baseline
- `2026-05-27-clients-deadlines-parity-refactor.md` (dev-log) — earlier table chrome unification work

---

## §10. Live interaction audit (pass 2)

After Yuqi pushed back ("you should view and audit from a product design perspective and ensure the flow is good, it has good usability and everything is working"), this section logs findings from actually clicking through the surfaces in a running preview rather than only reading the code. Each finding is a thing I tried that either broke, confused, or behaved in a way the user didn't expect from the visible affordance.

Method: 9 mock clients, 2 personas (Riverbend Draft = needs-facts; Lakeview Medical Partners = populated). Tried every clickable affordance on /clients and /clients/[id] including hover-only ones.

### L1 — "Quick peek" menu item is a lie [CONFIRMED LIVE]

**Reproduced:** /clients list → row menu (`⋯`) → "Quick peek" → navigates to `/clients/[id]` full page. Drawer never opens.

This was hypothesized in §3 P0-3 from the code; now it's confirmed in the running app. The label promises a peek; the action performs full nav. Closest analogy in the rest of the app: a "Preview" button that loads the full editor. Confusing.

**Fix:** either honor the peek (un-redirect the provider on `/clients`) OR rename the menu item to "Open client" so the label matches the behavior. The current state is the worst of both worlds.

### L2 — `FixNeedsFactsSheet` counter has a copy bug

**File:** `apps/app/src/features/clients/FixNeedsFactsSheet.tsx`

Visible string in the sheet header: `"0 of  fixed · 1"`. Two spaces between "of" and "fixed" — the total number is missing from the template. Should read "0 of 1 fixed" or similar. Reads as a broken interpolation in front of the user.

**Why this matters:** the sheet is the canonical surface for resolving the "1 client is missing state or entity type" banner — the page where the CPA is most likely to encounter the broken counter is the page that should feel most polished.

### L3 — Filing plan rows are `<div>`, not `<tr>`

**File:** filing-plan rows on `/clients/[id]` Work tab render as `<div class="group/row flex min-h-14 cursor-pointer items-center …">` instead of `<tr>` inside a `<table>`. Confirmed via DOM inspection.

**Why this matters:**

- Screen-reader users get no "table" / "row N of M" announcement
- Column-header relationship is unannounced (the "Form / Internal deadline / Official deadline / Status" header row is also `<div>`)
- Native keyboard table navigation (arrow keys to traverse cells, Home/End) doesn't work
- The /clients LIST page uses real `<table>` — so the same product domain renders two different DOM shapes for the same conceptual data

The visual rhythm matches the rest of the workbench tables (h-14, divider-r borders), but the semantics underneath are weaker.

### L4 — User-facing copy leaks raw UUID

**Reproduced:** /clients/[id] → Activity tab → Client summary (AI) → Next step section, copy reads:

> Request a refresh after updating risk inputs for client 10000000-0000-4000-8000-000000000007.

The literal UUID is rendered as part of the CPA-facing instruction. Either the AI prompt template embeds the UUID by mistake, or a substitution was missed. Should be the client name (`Lakeview Medical Partners`) or just dropped from the sentence ("Request a refresh after updating risk inputs.").

### L5 — Title switcher dropdown items have no whitespace between name and state

**Reproduced:** /clients/[id] → click the chevron next to the client title → dropdown lists every client. Items render as:

> "Arbor & Vale LLCCA · llc"
> "Bright Studio S-CorpCA · s_cor…"
> "Lakeview Medical PartnersMA · …"

There's no whitespace between the client name and the state code. Also `llc` / `s_cor` etc. are raw enum values, not the canonical entity labels ("LLC" / "S-Corp" used everywhere else on the page).

### L6 — `Opportunities` tab uses stale URL key `?tab=discover`

**Reproduced:** /clients/[id] → click "Opportunities" tab → URL becomes `?tab=discover`. The label says Opportunities but the URL still says `discover` (the prior name).

Side effect: shareable deeplinks to the Opportunities tab use a name that doesn't match what the user clicks. Counts as a small inconsistency for everyone, a real surprise for anyone who has a `?tab=opportunities` muscle memory from anywhere else in the app.

### L7 — Two surfaces named "Opportunities" with different scopes

Sidebar `Opportunities` (firm-wide) vs `/clients/[id]?tab=discover` (per-client). Same label, different scope. The per-client one is also conceptually closer to "Suggested forms" since its main content is a forms-catalog list ("Form 7004, Form 941, Payroll tax deposit, Form 1099-NEC" with `+ Add deadline` actions). Either rename, OR document the two-tier "Opportunities" concept.

### L8 — SummaryStrip tiles navigate AWAY instead of filtering in place

**Reproduced:** /clients/[id] → click "At risk" tile → navigates to `/deadlines?client=…&status=blocked`. Loses scroll position + active tab on the client detail page.

This corrects my P1-2 finding (which assumed the tile was non-interactive — it IS clickable, just with a different destination than expected). Two issues remain:

- The mental model is "click count to filter view below" not "click count to leave the page"
- The mapping "at-risk" → `status=blocked` is implicit; the SummaryStrip says "At risk" but the destination filter says "blocked"

### L9 — Right obligation panel squeezes the left column hard

**Reproduced:** /clients/[id] → click a filing-plan row → right panel slides in (~607px / 60% width). The left column compresses:

- SummaryStrip tiles reflow to 2-per-row + "Open filing 1" hanging on its own row
- Tab strip ellipsizes: "Activi…" instead of "Activity"
- The "Add deadline" CTA gets cramped against the title
- The "More client actions" `⋯` button gets pushed around

The CSS-only width transition is functional but the responsive cascade isn't designed — it's just whatever flexbox produces. Either a min-width on the left column with horizontal scroll, OR a defined narrow layout for when the panel is open.

### L10 — Obligation panel header has conflicting status signals

**Reproduced:** open the obligation panel for the first Form 1065 row of Lakeview (it's a `Filed` row with a payment-overdue notation). Header shows three boxes:

- `FILING DEADLINE 2026-03-16` with green tinted bg
- `INTERNAL TARGET 2026-03-16` with red `72 DAYS OVERDUE` chip
- `PAYMENT DUE 2026-03-16`

The eye reads "this filing is overdue by 72 days" while ALSO reading "this filing is filed (green)." The 72-days-overdue refers to PAYMENT being late (`Payment 73d late` chip on the row) — but it's labeled "INTERNAL TARGET" not "PAYMENT." The semantics need to be tightened: either "internal target" should sit under FILING DEADLINE, or the overdue chip should sit under PAYMENT DUE.

Also `72` vs `73` — the day count differs by 1 between the panel header and the row. Looks like one is computed from "now" and the other from "yesterday" — small but worth investigating for date-rounding consistency.

### L11 — Workpapers empty state is a dead end

**Reproduced:** obligation panel → Evidence tab → "Workpapers" section shows "No workpapers attached to this deadline yet." in a disabled-looking gray box. No "Add workpaper" CTA. No drop zone. No link to where workpapers come from.

If the CPA wants to attach a workpaper, the surface that names workpapers gives them no affordance to add one. Either add a CTA here, OR document the upstream surface that produces workpapers and link to it.

### L12 — "Forms catalog 8 applicable · 8 gap" header is dense

**Reproduced:** /clients/[id]?tab=discover → "Suggested forms" block → header strip reads "Forms catalog · 8 applicable · Lakeview Medical Partners · 8 gap". The "8 gap" chip is in red but it's not clear what "gap" means here — "8 of the 8 applicable forms have no scheduled deadline yet"? "8 gaps in the firm's rule library for this client's entity type"? The word `gap` carries baggage from the rule-library surface where it means "no rule exists."

### L13 — Risk panel button "Explain Risk profile" exists on Work tab too (probably)

Aria-labels enumeration found "Explain Risk profile" even though I was on the Work tab. Either the button is hidden but rendered (dead DOM node — bad for screen readers tabbing through), or it lives on a panel that's mounted regardless of the active tab.

---

## §11. Revised severity ranking after the live audit

Promoted to **P0** (was P1 or lower):

- **L4 — UUID in user-facing copy.** Embarrassing in front of a customer. Quick fix.
- **L2 — Broken interpolation in FixNeedsFactsSheet counter.** First impression of the canonical needs-facts fix flow.

Stays P0:

- **L1 — Quick peek silent nav** (§3 P0-3)

New P1:

- **L10 — Obligation panel conflicting status signals.** A "Filed" row with a red "72 days overdue" badge is the kind of thing a CPA escalates as a bug because they can't tell whether they're done or not.
- **L9 — Right-panel layout squeeze.** Painful on common workflow ("click filing → review panel").
- **L11 — Workpapers dead-end.** Affordance promised, never delivered.

New P2:

- L3, L5, L6, L7, L8, L12, L13

---

## §12. Updated sequencing (after live pass)

1. **Fix the two broken-string-class bugs** (L2, L4) — both <1h fixes that erase the most visible roughness
2. **Decide the peek strategy** (§3 P0 cluster + L1) — single decision unblocks the next 3 items
3. **Disambiguate the obligation panel header** (L10) — tighten the semantics of FILING DEADLINE / INTERNAL TARGET / PAYMENT DUE so the three boxes can't disagree about whether the filing is overdue
4. **Wire SummaryStrip tiles to filter in-place** OR commit to "tile = nav to /deadlines" and rename the affordance (L8)
5. **Fix the right-panel layout cascade** (L9) — defined narrow layout instead of whatever flexbox produces
6. **Title switcher whitespace + canonical entity labels** (L5) — 5-minute fix
7. **Finish the Discover → Opportunities rename** (L6, L7) — URL key + decide whether two "Opportunities" surfaces is intentional
8. **Convert filing plan to a real table** (L3) — a11y win, modest code change
9. **Workpapers empty-state CTA** (L11) — needs upstream design conversation
10. P2 + P3 items as opportunistic polish

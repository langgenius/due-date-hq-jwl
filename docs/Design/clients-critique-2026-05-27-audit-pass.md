# /clients family — UX critique + cross-route consistency audit

**Date:** 2026-05-27 (after PR #31 merge, branch `design/audit-drain-pass-1`)
**Audited surfaces:** `/clients` (list) + `/clients/[id]` (detail) + the three peek surfaces (`ClientDetailDrawer`, `ClientPeekHoverCard`, full page)
**Method:** Code investigation (3 parallel reconnaissance agents) + live preview screenshots of both pages in two states (needs-facts client, populated client, Client info tab) + diff against canonical patterns in `page-family-canonical.md` and the four sibling workbench pages (/deadlines, /rules/library, /alerts, /notifications).
**User signal that prompted the audit:** "audit and inspect the client page and client/id page. critique UX and product logic. also the user journey. also audit against the other pages — if they are in the same style."

---

## §0. Executive summary

The chrome is on canon (PageHeader, card frame, filter band, EmptyState, Skeleton all use the canonical primitives). The drift is in **interaction semantics and structural debt**, not visual style.

**Top 5 findings, ranked by leverage:**

| # | Finding | Severity | Where |
|---|---|---|---|
| 1 | Row-click takes user to a full-page route while sibling workbench pages keep the user in-page via drawer / dialog | **P0** | `ClientFactsWorkspace.tsx:1637-1649` |
| 2 | Three parallel "peek client" surfaces (hover card, drawer, full page) with hand-rolled next-due logic in each; the drawer is silently a no-op when invoked from `/clients` itself | **P0** | `ClientDrawerProvider.tsx:45-52` + 3 components |
| 3 | `ClientFactsWorkspace.tsx` is **5,672 lines** and hosts BOTH the list and the detail page in one file — single largest structural debt in the app | **P1** | `ClientFactsWorkspace.tsx:756 + 2142` |
| 4 | "At risk: 2" on the SummaryStrip doesn't visually map to specific rows in the filing plan below — user can't tell WHICH 2 are at risk | **P1** | `ClientSummaryStrip` + `ClientWorkPlanPanel` |
| 5 | Three queries fire on tabs the user may never open (risk-summary, pulse-history, audit-log) — wasted network on first paint | **P2** | `clients.$clientId.tsx` query block |

The audit also found 7 P3 (polish) items and 4 product-logic question marks. Full list in §3-§6.

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

| Surface | Row click behavior |
|---|---|
| /deadlines | Opens obligation detail drawer (split view, in-page) |
| /rules/library | Opens rule detail Dialog modal (in-page) |
| /alerts | Opens pulse detail drawer (in-page) |
| /notifications | Marks read + navigates IF the notification has an href |
| **/clients** | **Full route nav to `/clients/[id]`** |

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
    navigate(clientDetailPath(client))  // ← drawer NEVER opens here
    return
  }
  setDrawerClientId(id)  // ← drawer opens everywhere else
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
  queries: pulseAlerts.map(alert => ({
    ...orpc.pulse.getDetail.queryOptions({ input: { id: alert.id }}),
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

| # | Issue | File:line |
|---|---|---|
| 1 | Hard-coded pixel widths on workspace table columns (`w-[240px]`, `w-[120px]`, `w-[90px]`) | `ClientFactsWorkspace.tsx:952-1321` |
| 2 | Unused workspace props (`readinessFilter`, `sourceFilter`, `pulseFilter`) declared but never consumed | `ClientFactsWorkspace.tsx:216-219` |
| 3 | Comment-prefixed dead imports (`SectionFrame` + `SectionLabel` retired 2026-05-24, comment stays) | `ClientFactsWorkspace.tsx:151-154` |
| 4 | `useEffect` to sync responsive page size (flagged as exception to project's "no useEffect" rule) | `ClientFactsWorkspace.tsx:1454-1456` |
| 5 | Eye-icon Peek button uses hover-only `opacity-100` (focus-visible kicks in but tab order still hits invisible element) | `ClientFactsWorkspace.tsx:938-947` |
| 6 | `ClientCycleArrows` was dropped from header then reinstated to a different slot (history in comments) | `ClientFactsWorkspace.tsx:2586-2594` |
| 7 | `ClientSummaryStrip` uses some tones (`accent`, `warning`) but the tile colors don't align with the brown-unification work just shipped on /rules/library — possibly the next page to receive that treatment | `ClientSummaryStrip.tsx` L347, L356, L369 |

---

## §7. Cross-route consistency matrix

| Aspect | /clients | /deadlines | /rules/library | /notifications | Verdict |
|---|---|---|---|---|---|
| PageHeader | ✅ canonical | ✅ | ✅ | ✅ | unified (PR #32) |
| Title count chip | ✅ `rounded-full bg-state-base-hover` | ✅ | ✅ | ✅ | unified |
| Card frame (`rounded-md border-divider-subtle`) | ✅ | ✅ | ✅ | n/a | unified |
| Filter chips (`TableHeaderMultiFilter` toolbar variant) | ✅ | ✅ | ✅ | n/a | unified |
| Scope tabs | ❌ none | ✅ "Active / All / etc." | ✅ "All / Active / Needs review / Missing" | ✅ "Unread / All" | **/clients lacks scope tabs** (likely fine — single scope) |
| Row interaction | ❌ **full nav** | ✅ in-page drawer | ✅ in-page dialog | ✅ mark + nav | **DRIFT** |
| Peek surfaces | ❌ **three (hover/drawer/page)** | one (drawer = detail) | one (dialog = detail) | one (full page) | **DRIFT** |
| Empty / loading / error | ✅ EmptyState / Skeleton / Alert | ✅ | ✅ | ✅ | unified |
| Pagination footer | ✅ canonical | ✅ | ✅ (infinite scroll) | n/a | unified |
| Eyebrow back-link on detail | ⚠️ hand-rolled `<Link>` | n/a (drawer) | n/a (dialog) | n/a (drawer) | drift |
| Status badge family | ✅ `ObligationStatusReadBadge` | ✅ same | ✅ same | n/a | unified |
| Pulse/alert chrome | ✅ `ClientActiveAlertsSection` | ✅ banner | n/a | n/a | similar |

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

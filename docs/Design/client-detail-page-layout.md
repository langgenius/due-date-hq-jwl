# Client detail page layout — design ↔ code mapping

**Date:** 2026-06-10
**Status:** Code-grounded design spec, FRONTEND-ONLY
**Pencil ref:** `M7Ady4` (client detail master-detail rebuild)
**Live code:** `apps/app/src/features/clients/ClientDetailWorkspace.tsx` · `apps/app/src/routes/clients.$clientId.tsx`
**Companion docs:** `docs/Design/deadline-row-interaction.md` · `docs/dev-log/2026-06-10-design-handoff-index.md`

This doc maps every Pencil section in `M7Ady4` to an existing React component. Where the design uses a NEW pattern, that's flagged. Where the design DIVERGES from the actual codebase, that's flagged loudly. Read this before implementing.

---

## ⚠ Backend constraint

**FRONTEND-ONLY.** No schema changes, no contract changes, no new mutations. The four flagged divergences (§5) are design-level fixes — adapt the Pencil to the data that exists, not the data that doesn't.

---

## 1. Existing detail-page primitives (use these — DO NOT recreate)

| Pencil concept | Existing React component | File | Reuse for |
|---|---|---|---|
| Page header (crumb + title + meta + actions) | `<PageHeader>` | `apps/app/src/components/patterns/page-header.tsx:34-150` | Hero block in M7Ady4 |
| Section card with bar header (h36 bg-subtle + body) | `<DetailSectionCard>` | `apps/app/src/components/patterns/detail-section-card.tsx:19-62` | Every body section in M7Ady4 |
| 3-slot stat strip (border-y, no card) | `<StatBand>` | `apps/app/src/components/patterns/stat-band.tsx:62-150` | Snapshot KPI strip in M7Ady4 |
| Single KPI tile (rounded-lg border) | `<StatTile>` | `apps/app/src/components/patterns/stat-tile.tsx:75-199` | If you need single KPI cards instead of the band |
| Per-name avatar with tint | `<AssigneeAvatar>` | `apps/app/src/features/obligations/AssigneeAvatar.tsx` | Every avatar in M7Ady4 (client tile, deadline owner, contact rows) |
| Status badge | `<Badge>` from `@duedatehq/ui` with variant + `<AlertStatusChip>` / `ObligationStatusReadBadge` | `apps/app/src/features/alerts/components/AlertStatusChip.tsx` and obligation surfaces | Status pills on rows |
| Row actions kebab | `<RowActionsMenu>` | `apps/app/src/components/patterns/row-actions-menu.tsx` | The kebab icon at the right of contact / deadline rows |
| Crumb bar (master-detail) | `<DeadlineCrumbBar>` (deadline-specific; pattern reusable) | `apps/app/src/features/obligations/detail/DeadlineCrumbBar.tsx:15-59` | If we want prev/next client nav at the top — currently NOT in client detail |

**Token classes** are documented in `docs/dev-log/2026-06-10-design-handoff-index.md` §A. Do not invent new tokens.

---

## 2. The existing client detail page — what's actually there

`apps/app/src/features/clients/ClientDetailWorkspace.tsx` (2167 lines) renders, in order:

```
<PageHeader>
  breadcrumbs={[/clients, /clients/:id]}
  title={client.name}
  metaRow={<MetaChips entity ein state owner />}
  actions={<EditClient />, <Reverify />, <Export />}
</PageHeader>

<ClientNotesStrip />               ← persistent read-only notes preview
<ClientActiveAlertsSection />      ← active alerts banner
<ClientSummaryStrip />             ← uses <StatBand> with 3 slots:
                                    Next filing · Blocked · Open filings

<Tabs>
  <Tab key="work">
    <ClientWorkPlanPanel />        ← filings table, hand-rolled <Table>
    <ObligationQueueDetailDrawer mode="page" /> ← opens inline on row click
  </Tab>
  <Tab key="setup">
    <DetailSectionCard title="Compliance posture" />
    <DetailSectionCard title="Tax classification" />
    <DetailSectionCard title="Filing jurisdictions" />
    <DetailSectionCard title="Risk profile" />
    <DetailSectionCard title="Import source" />
  </Tab>
  <Tab key="history">
    <DetailSectionCard title="AI summary" />
    <DetailSectionCard title="Audit log" />
  </Tab>
</Tabs>
```

**Tab names today are `Work` / `Setup` / `History`** — NOT `Deadlines / Engagements / Documents / Contacts / Audit log` as drawn in the Pencil. Adapt design to the actual tabs.

---

## 3. Pencil ↔ React mapping (M7Ady4 → ClientDetailWorkspace)

| M7Ady4 section | Pencil ID | What it should render as in React |
|---|---|---|
| Icon rail (56w) | `bvF62` | Existing app shell sidebar (already wraps every route — NOT part of the client detail component) |
| Client list pane (380w) | `luI9n` | **DOES NOT EXIST in code today.** Client detail today is full-width with NO list pane. Either build it as a new component OR drop it from the design (recommended — see §4). |
| Crumb (h48) | inside `CurLo` | `<PageHeader breadcrumbs={[/clients, /clients/:id]}>` ← reuse PageHeader's built-in crumb |
| Hero (title + meta tile + chips + Healthy chip) | inside `CurLo` | `<PageHeader title={client.name} metaRow={…}>` with: PageHeader handles title + meta + actions. Add the brand tile + health chip as `<PageHeader>` slot extensions OR as a sub-component slotted into the eyebrow row. |
| Meta strip (4 stats: Onboarded · Last activity · Open · Filed) | inside `CurLo/Hero` | `<StatBand>` — but StatBand renders 3 slots, not 4. See §5.B for the fix. |
| Tabs bar | inside `CurLo` | Existing `<Tabs>` with tabs **`work` / `setup` / `history`** (not Pencil's `Deadlines/Engagements/Documents/Contacts/Audit log`) — see §5.D |
| Snapshot card (4 KPI cells in card) | `Ogl5M` | `<StatBand>` (border-y, not boxed) — replace the boxed card with the band pattern; OR use 4 `<StatTile>` instances if a boxed look is desired |
| Deadlines card (with table inside) | `ez3Za` | `<DetailSectionCard title="Filings" headerRight={…}>` wrapping a hand-rolled `<Table>` — see `ClientWorkPlanPanel` for the pattern |
| Recent activity card (timeline) | `HMBb1` | `<DetailSectionCard title="Recent activity">` + custom timeline body (no existing timeline primitive found) |
| Contacts card (3 contacts) | `Ui9eX` | **DIVERGENT.** No contacts table exists. See §5.C |

---

## 4. Macro layout decision: list pane or no list pane?

The Pencil M7Ady4 uses a 380w **client list pane on the left** (master-detail like HThur alert detail / s1IBL deadline detail). The existing `ClientDetailWorkspace` does NOT have this — it's a full-width single-client page.

**Two options:**

| Option | Behavior | Cost |
|---|---|---|
| **A — Drop the list pane** | Match existing `ClientDetailWorkspace`: full-width, no list pane. Navigation back to `/clients` via crumb. | Zero — matches existing code |
| **B — Add the list pane** | Build new `<ClientNavigatorRail>` mirroring `<DeadlineNavigatorRail>` (`apps/app/src/features/obligations/detail/DeadlineNavigatorRail.tsx` — referenced in `deadline-detail.tsx:34-149`). Use `trpc.clients.list` for the data. | New component + new route variant `/clients/:id` with rail vs. `/clients/:id?full=true` |

**Recommendation:** **Option A for v1**. Master-detail with rail is a meaningful UX upgrade but it's its own scope. Ship the canonical detail content first; rail is v1.1.

**If you do Option B later:** mirror `DeadlineNavigatorRail` exactly — same 380w fixed width, same paginated load (50 per page), same selected-row pattern (`bg-accent-hover` + 2px left accent stroke).

---

## 5. The four design divergences — fix these before implementing

### 5.A — "Hero" duplicates PageHeader

**Pencil M7Ady4** renders a custom hero with: 56×56 brand tile + name 26/700 + meta chips + Healthy chip + meta strip.

**Code:** `<PageHeader>` already handles title + metaRow + actions cluster. Building a custom hero next to PageHeader **duplicates the page chrome.**

**Fix:**

- Use `<PageHeader>` for the crumb + title + meta + actions
- Extend `<PageHeader>` with an optional `aside` slot to render the brand tile + Healthy chip if needed. PROPOSAL:

```tsx
// apps/app/src/components/patterns/page-header.tsx — extension
export interface PageHeaderProps {
  // ... existing
  aside?: React.ReactNode   // NEW: right-aligned visual (brand tile, status chip, etc.)
}
```

- The brand tile (`HW` in a colored circle) is the existing `<AssigneeAvatar type="firm" name={client.name} size="lg" />` — pass `client.name` to get the per-client tint via `getAssigneeTint()`.
- The Healthy chip is the existing `<Badge variant="success">Healthy</Badge>` — or a thin wrapper that maps the client health field to a variant.

**Don't:** render a parallel custom hero. Always use `<PageHeader>` as the page chrome.

---

### 5.B — Meta strip slots mismatch

**Pencil M7Ady4** shows 4 stats: `ONBOARDED · LAST ACTIVITY · OPEN DEADLINES · FILED YTD`.

**Code:** existing `<ClientSummaryStrip>` uses `<StatBand>` with exactly 3 slots: `Next filing · Blocked · Open filings`.

**Fix:** **Use the existing 3 slots, don't add a 4th.** The Pencil should be updated to match:

| Pencil label | Code label (existing) | Source field |
|---|---|---|
| Open deadlines | Open filings | `client.openObligationsCount` (or similar — verify in `ClientPublic`) |
| At risk / Blocked | Blocked | `client.blockedObligationsCount` |
| Next due | Next filing | derive from earliest `currentDueDate` |

**Drop:** `ONBOARDED` and `LAST ACTIVITY` — they're nice-to-have but not in the existing summary strip and don't justify a 4th slot. If product wants them, propose a separate doc.

`StatBand` is `border-y border-divider-subtle py-7` (no boxed card) — the Pencil renders it as a boxed card with cornerRadius. **Update Pencil to match border-y treatment.**

---

### 5.C — Contacts section is fictional

**Pencil M7Ady4** shows a `Contacts` card with 3 named contacts (Sarah Hudson · Tom Wells · Lisa Chen) including email + phone.

**Code:** `ClientPublic` has ONE `primaryPhone` + ONE `email` field. No contacts/stakeholders table exists. The 3-contact rendering is **fictional**.

**Fix — three options:**

| Option | Behavior | Cost |
|---|---|---|
| **A — Drop the contacts section** | Remove from Pencil and React. Email + phone live in PageHeader meta or in Setup tab. | Zero — matches existing data |
| **B — Render single primary contact** | Show ONE contact row using existing `primaryPhone` + `email`. Title the section "Primary contact" not "Contacts". | Zero — matches existing data |
| **C — Add contacts table** | Backend schema work: new `client_contacts` table + contract + mutations. Then frontend renders. | BACKEND — defer per §1 |

**Recommendation:** **Option B for v1.** Single primary contact row matches the existing data model. If multiple contacts are needed, propose a separate ticket with schema work.

```tsx
<DetailSectionCard
  title="Primary contact"
  headerRight={canEdit && <button>Edit →</button>}
>
  <div className="flex items-center gap-3">
    <AssigneeAvatar
      name={client.primaryContactName ?? client.name}
      size="md"
      type="human"
    />
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold">{client.primaryContactName}</span>
      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
        {client.primaryPhone && <span className="font-mono">{client.primaryPhone}</span>}
      </div>
    </div>
  </div>
</DetailSectionCard>
```

If `primaryContactName` doesn't exist on `ClientPublic`, default to the client name with a note "(self / single contact on record)".

---

### 5.D — Tabs don't match existing tabs

**Pencil M7Ady4** tabs: `Deadlines · Engagements · Documents · Contacts · Audit log`

**Code** tabs in `ClientDetailWorkspace`: `Work · Setup · History`

**Fix:** **Use the existing 3 tabs.** Map Pencil sections to existing tabs:

| Pencil tab | Map to existing tab | Renders |
|---|---|---|
| Deadlines | **Work** | Filings table (deadlines) via `<ClientWorkPlanPanel>` — already there |
| Contacts | **Setup** → add a `<DetailSectionCard title="Primary contact">` | Primary contact (per 5.C) |
| Documents | **Setup** → add a `<DetailSectionCard title="Documents">` | If a documents feature exists, otherwise drop |
| Engagements | **Setup** → add a `<DetailSectionCard title="Engagements">` | If engagement tracking exists, otherwise drop |
| Audit log | **History** | Already lazy-loaded via `<AuditLog>` — already there |

**Don't:** add new tabs without backend feature support. Tabs imply a feature exists. Empty tabs read as broken.

---

## 6. The body sections in priority order (what to actually render)

Based on existing `ClientDetailWorkspace` + the divergence fixes above:

```tsx
<PageHeader
  breadcrumbs={[{href: '/clients', label: 'Clients'}, {label: client.name}]}
  title={client.name}
  metaRow={<ClientIdentityMeta client={client} />}
  actions={<EditClientButton /><ReverifyButton /><ExportButton />}
  aside={<HealthChip status={client.healthStatus} />}  // NEW slot per §5.A
/>

<ClientNotesStrip />        {/* existing */}
<ClientActiveAlertsSection /> {/* existing */}
<ClientSummaryStrip />       {/* existing - uses StatBand with 3 slots */}

<Tabs defaultValue="work">
  <TabsList>
    <TabsTrigger value="work">Work</TabsTrigger>
    <TabsTrigger value="setup">Setup</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>

  <TabsContent value="work">
    <ClientWorkPlanPanel client={client} />  {/* existing - filings table */}
    {/* Use new <DeadlineRow mode="inline-expand"> per deadline-row-interaction.md */}
  </TabsContent>

  <TabsContent value="setup">
    <DetailSectionCard title="Primary contact">{...}</DetailSectionCard>  {/* §5.C */}
    <DetailSectionCard title="Compliance posture">{...}</DetailSectionCard> {/* existing */}
    <DetailSectionCard title="Tax classification">{...}</DetailSectionCard> {/* existing */}
    <DetailSectionCard title="Filing jurisdictions">{...}</DetailSectionCard> {/* existing */}
    <DetailSectionCard title="Risk profile">{...}</DetailSectionCard>      {/* existing */}
    <DetailSectionCard title="Import source">{...}</DetailSectionCard>     {/* existing */}
  </TabsContent>

  <TabsContent value="history">
    <DetailSectionCard title="AI summary">{...}</DetailSectionCard>       {/* existing */}
    <DetailSectionCard title="Audit log">{...}</DetailSectionCard>        {/* existing */}
  </TabsContent>
</Tabs>
```

---

## 7. What this means for the Pencil M7Ady4

The Pencil mockup is a **vision board**, not a 1:1 spec. The four divergences above mean Pencil needs updates:

| Pencil change | Reason |
|---|---|
| Drop the client list pane (or move to v1.1) | Existing client detail is full-width — §4 |
| Replace custom hero with PageHeader treatment | PageHeader exists, don't duplicate — §5.A |
| Change meta strip from boxed card → border-y band (3 slots) | StatBand pattern — §5.B |
| Rename "Contacts" card → "Primary contact" with 1 row | No contacts table — §5.C |
| Rename tabs to Work · Setup · History | Existing tabs — §5.D |
| Move "Deadlines" section to be the body of the Work tab (no card wrapper around it — it IS the tab content) | Matches `ClientWorkPlanPanel` |

After these edits, M7Ady4 will be a faithful representation of what the React renders. Until then, **engineering reads this doc, not the Pencil mockup.**

---

## 8. Reuse map (code grep targets for the implementer)

When you sit down to implement, search for these first:

```bash
# Page header / chrome
rg "import.*PageHeader.*from.*patterns/page-header" apps/app/src

# Section card
rg "import.*DetailSectionCard.*from.*patterns/detail-section-card" apps/app/src

# Stat band
rg "import.*StatBand.*from.*patterns/stat-band" apps/app/src

# Stat tile
rg "import.*StatTile.*from.*patterns/stat-tile" apps/app/src

# Avatar
rg "import.*AssigneeAvatar.*from.*AssigneeAvatar" apps/app/src

# Existing client detail
cat apps/app/src/features/clients/ClientDetailWorkspace.tsx | head -100

# Existing summary strip
rg "ClientSummaryStrip" apps/app/src --files-with-matches

# Existing notes strip
rg "ClientNotesStrip" apps/app/src --files-with-matches

# Existing active alerts
rg "ClientActiveAlertsSection" apps/app/src --files-with-matches

# Existing filings table
rg "ClientWorkPlanPanel" apps/app/src --files-with-matches
```

Read each of these BEFORE writing new code. If you find a pattern that does what you need, use it. Per the component-reuse policy in `docs/dev-log/2026-06-10-design-handoff-index.md` §J.5.

---

## 9. Cross-page layout consistency

The user asked: "all detail pages should follow the same layout."

Three detail pages live in this app:

| Page | Wrapper | Layout primitives used |
|---|---|---|
| `/alerts/:id` | `AlertDetailDrawer.tsx` | `DetailSectionCard` × N + `DeadlineChangeCard` + `AlertStatusChip` |
| `/deadlines/:obligationRef` | `deadline-detail.tsx` + `ObligationQueueDetailDrawer` | `DeadlineCrumbBar` + tabs + `DetailSectionCard` × N |
| `/clients/:clientId` | `ClientDetailWorkspace.tsx` | `PageHeader` + `ClientSummaryStrip` (StatBand) + tabs + `DetailSectionCard` × N |

**The shared layout is the section-card pattern.** Every detail page uses `<DetailSectionCard>` for content sections. That's the consistency thread.

**They diverge intentionally on:**

- Master-detail vs full-width: alert is sheet/drawer, deadline is master-detail, client is full-width
- Top chrome: alert has DetailStatusBanner, deadline has DeadlineCrumbBar, client has PageHeader

This divergence is correct because the JOBS differ:

- **Alert** is a drawer over a list — focus + commit
- **Deadline** is a worked-on artifact — master-detail for browsing
- **Client** is the central entity — full-page hub

Forcing identical chrome across them would be wrong.

**What SHOULD be identical:**

- Section card chrome (`DetailSectionCard`) ✅ already shared
- Status pill semantics (success/warning/destructive tier mapping) ✅ already shared via Badge variants
- Avatar component (`AssigneeAvatar`) ✅ already shared
- Type ramp (Geist sizes, weights, letter-spacing) ✅ token system enforces
- Token use (`bg-default`, `divider-subtle`, etc.) ✅ enforced by lint

**What's NOT identical and shouldn't be:**

- Page-level chrome (sheet vs master-detail vs full-page) — driven by job
- Number of tabs — driven by feature scope
- Body layout (table vs card stack vs timeline) — driven by content type

---

## 10. Implementation order

### Phase 1 — Update Pencil to match code

Edit `M7Ady4` per §7 changes. This is design work, not code. Open the Pencil file and apply the 6 changes.

### Phase 2 — Audit `ClientDetailWorkspace` for token / chrome drift

```bash
# Find hex leaks
rg "#[0-9a-fA-F]{6}" apps/app/src/features/clients/

# Find freelance corner radii
rg "rounded-\[6px\]|rounded-\[10px\]|rounded-\[14px\]|rounded-\[16px\]" apps/app/src/features/clients/
```

Replace per the token reference in handoff index §A.

### Phase 3 — Apply `<DeadlineRow mode="inline-expand">` to the Work tab

Per `docs/Design/deadline-row-interaction.md` §8.1. The `<ClientWorkPlanPanel>` filings table should use `<DeadlineRow>` for each row.

### Phase 4 — Tighten Setup tab section cards

Each `<DetailSectionCard>` in Setup should match the canonical chrome. Audit and fix.

### Phase 5 — Polish

- Add `aside` slot to `<PageHeader>` for the health chip
- Add `<DetailSectionCard title="Primary contact">` to Setup tab
- Wire up inline edit affordances

---

## 11. Anti-patterns (refuse in code review)

1. **Building a new "client detail header" component** — use `<PageHeader>`. Always.
2. **Building a "contacts" feature without backend support** — there's no contacts table. Add a primary contact section using existing scalar fields, or defer.
3. **Adding tabs that don't have a feature behind them** — empty tabs read as broken.
4. **Adding a 4th slot to `StatBand`** — it's 3 slots by design. If product wants more, propose a new variant.
5. **Building a custom table when `ClientWorkPlanPanel` exists** — reuse, extend, or replace its rows with `<DeadlineRow>`.
6. **Using `<Card>` from another library** — use `<DetailSectionCard>` for canonical chrome.
7. **Wrapping the page in a custom shell** — Tanstack Router layouts handle the icon-rail sidebar. Don't duplicate.

---

## 12. Definition of done

- [ ] Pencil `M7Ady4` updated per §7 (6 changes)
- [ ] `ClientDetailWorkspace.tsx` uses `<PageHeader>` (already does — verify no drift)
- [ ] `ClientSummaryStrip` uses `<StatBand>` with 3 slots (already does — verify)
- [ ] Setup tab adds `<DetailSectionCard title="Primary contact">`
- [ ] Work tab filings table uses `<DeadlineRow mode="inline-expand">` per deadline-row-interaction.md
- [ ] Zero hex leaks in `apps/app/src/features/clients/`
- [ ] Zero freelance corner radii
- [ ] Visual diff of updated Pencil M7Ady4 vs rendered client detail = pixel-equivalent on each section
- [ ] PR description lists Pencil node IDs + cross-doc links
- [ ] Dev-log entry per project convention

---

## 13. Cross-references

- `docs/Design/deadline-row-interaction.md` — for the `<DeadlineRow>` component used in the Work tab
- `docs/Design/rule-library-review-flow.md` — sibling design doc; same handoff conventions
- `docs/dev-log/2026-06-10-design-handoff-index.md` — token reference, component reuse policy, canonical chrome specs
- `apps/app/src/features/clients/ClientDetailWorkspace.tsx` — the page's current React entry
- `apps/app/src/components/patterns/*` — the shared primitive library (PageHeader, DetailSectionCard, StatBand, StatTile)
- `apps/app/src/features/obligations/AssigneeAvatar.tsx` — avatar primitive
- `packages/contracts/src/clients.ts` — `ClientPublic` schema (truth for what fields exist)

---

## Summary

The Pencil `M7Ady4` is **not the best I can do**. It was built using canonical chrome RULES but without reading the codebase. The actual codebase already has `<PageHeader>`, `<DetailSectionCard>`, `<StatBand>`, `<StatTile>`, `<AssigneeAvatar>`, `<ClientSummaryStrip>`, `<ClientNotesStrip>`, `<ClientActiveAlertsSection>`, and `<ClientWorkPlanPanel>` — all of which a faithful design would compose.

The 4 divergences (§5) are:
1. Custom hero duplicates `<PageHeader>`
2. Meta strip uses 4 slots when existing has 3
3. Contacts section is fictional (no contacts table)
4. Tab names don't match existing tabs

These are fixable in Pencil. The React side already has the right structure. The biggest engineering work is migrating the Work tab to `<DeadlineRow mode="inline-expand">` per the sibling deadline-row-interaction doc.

After §7 Pencil edits, the design is **a vision board faithful to the code**. Engineering implements by composing existing primitives. No new components needed at the page-level chrome.

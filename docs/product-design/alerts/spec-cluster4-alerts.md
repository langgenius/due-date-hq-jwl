# Cluster 4 — ALERTS surfaces · implementation spec

READ-ONLY design intake. Maps Pencil frames to existing code for 100% replication
reusing components. Visual language: CURRENT (blue `#155aef` / Geist), NOT Verdant.
Quiet CTAs. Alert detail opens **in-page via `?alert=` query param** — the
`/alerts/[id]` frame names are labels only, NOT routes.

Pencil file: `/Users/yuqi/Desktop/duedatehq_work.pen`
Nodes: `g5kKJQ` (/alerts list), `ibEoz` + `g6zqRl` (detail, in-page),
`hFOEo` (history), `O3s4ie` (alerts empty), `rR9X1` (history empty).

**Headline finding:** the shipped code already implements all five surfaces. The
dev-log comments in the code cite the exact Pencil nodes (e.g. row "100% REPLICATED"
against `i90PZ`; header unification; `?alert=` panel architecture). This spec is
therefore a _verification + small-gap_ spec, not a rebuild. Token/string/icon
deltas and the two empty-state CTAs are the only real action items.

Shared tokens seen across all frames:

- Accent `#155aef` (text-accent), accent tint `#eff4ff` (state-accent-hover).
- Text: `#101828` primary, `#354052` secondary-strong, `#676f83` secondary,
  `#98a2b2` tertiary/muted. Divider `#10182814`.
- Destructive `#d92d20` / tint `#fef3f2`,`#FEE4E2`. Success `#079455`/`#17b26a`,
  tint `#ECFDF3`/`#E8F5EE`. Warning surface `#FFFBEB`/`#FFF7ED`.
- Fonts: Geist (UI), JetBrains Mono (codes/keys/dates-in-pills). Radii 6/8/10/12/16.

---

## Node g5kKJQ — `/alerts` (main list)

### Design spec

- **Shell**: 280px sidebar (`loYYm`, fill `#f9f9f9`) + `Main` (`I8o3b`, fill
  `#f2f4f7`) with `PageContent` padding `[32,48]`, gap 20. Sidebar = global app
  nav (Today/Alerts active `#eff4ff`+megaphone+red `4` badge/Deadlines/Rule library
  457/Clients 9/Opportunities/Audit log/Settings/user footer).
- **PageHeader** (`KPEnV`):
  - Eyebrow (`rafh6`): `refresh-cw` 12 `#676f83` + "Synced just now" 13/500.
  - TitleRow (`ur6WP`, space_between):
    - Title "Alerts" 32/600 `#101828` letterSpacing -0.5.
    - Active chip (`JMGLU`): pill `#fef3f2`, "6" 13/500 `#d92d20`.
    - Monitoring chip (`kdHsZ`): pill `#eff4ff` border `#155aef40`, `database` 12 +
      "Sources · Federal + 50 states + DC" 13/500 `#155aef` + `chevron-right`.
    - Right acts (`rOipx`): kbd hint `?`, My morning sweep (icon `coffee`, white
      pill r12), Alert history (icon `history` + label, white pill r12).
- **FilterRow** (`vt2By`):
  - Search (`eEOXX`) 320×36 white r12: `search` 14 + "Search alerts" 13.
  - ViewToggle (`cAXfJ`) white r12: List pill active (`#eff4ff`, `list`+#155aef) /
    Map pill (`map`+#676f83).
  - RightCluster (`hwcW1`): FilterTriggers Client(12)/Severity(4)/Due(3)/Status(5)
    — white r12 pills, label 13/500 `#354052` + count badge `#f9fafb` + `chevron-down`;
    "Clear all" 13/500 `#155aef`; SortBy (`WUC9Q`) accent pill `#eff4ff` border
    `#155aef33`: "Sort" + "Priority" 600 + `chevron-down`.
- **AlertCards** (`F5lMBp`) white r12 bordered, clipped, vertical:
  - **BulkSelectStrip** (`TAamJ`, fill `#fafbfc`, pad `[12,24]`): checkbox 18 +
    "Select all" 13/500 + "·" + "5 dispatches" 13/500 `#98a2b2` + spacer +
    "Mark all read" (`check-check`+label, `#676f83`).
  - **Day header** (`Y8iqQF`, fill `#f9fafb`, space_between): `sun` 14 +
    "TODAY · FRI · JUN 5, 2026" 11/700 letterSpacing 1.2 + "5 DISPATCHES" 11/700.
    Plus "EARLIER THIS WEEK" (`ztGeE`), "LAST WEEK" (`dA7Eg`).
  - **Row** (`r12MDc` = anatomy): pad `[18,24]`, gap 14. Columns:
    - checkbox 18 (`gT3zO`); timeCol (`y3rBWp`, 90w): date 13/500 + time 11/500
      mono + "18 days ago" 11 `#98a2b2`.
    - `main` (`FdfL7`, vertical gap 12):
      - **metaRow** (`iMPxe`): levelPill "URGENT" (`#FEE4E2`/border `#FCA5A5`,
        10/700 `#d92d20`) + state pill "NY" (mono 11) + form badge "Form 1065"
        (`#f2f4f7` mono) + "DEADLINE SHIFTED" 10/700 `#155aef` +
        "· 3 sources confirm" 11/600 `#079455` + spacer + source link
        "IRS Disaster Relief"+`external-link` `#155aef` + "Why?"+`chevron-up` accent pill.
      - **title** 17/600 `#101828` lh1.3; **summary** 13/normal `#676f83` lh1.5.
      - **diffRow** (`V8tc3E`): oldDate mono `#98a2b2` + `arrow-right` +
        newDate mono 700 `#101828` + "93 days later" 12 `#d92d20`.
      - **actionRow**: `corner-down-right` + action pill `#FFFBEB`.
      - **PriorityReasons** (`IciLB`, `#FAFBFC` r10): `sparkles`+
        "Why this is urgent · priority 92" 11/700 + "4 signals" + 4 chips (white r6).
      - **bottomMeta** (`zHJzz`, top border): `building-2`+"Affects 1 client" +
        avatar stack + sourcesConf pill (`check-check`+"3 sources · 94% conf",
        `#E8F5EE`) + spacer + hover actions Snooze/Dismiss (white r8) + Review (`#155aef`).
  - **ViewAllAffordance** (`ur7Hy`, top border): "View all 21 alerts" 13/500 `#155aef`
    - `chevron-right`, centered.
- **BulkActionBar** (`saDv7`) — floating dark `#101828` r16, absolute: check chip +
  "2 selected / of 5 dispatches" + Apply all (`#155aef`, `A` kbd) + Snooze/Mark read/
  Assign/Export (bell-off/check-check/user-plus/download) + close `x`.

### Current code (file:line)

- Route: `apps/app/src/routes/alerts.tsx:21` (`AlertsRoute`) — `RulesPageShell`
  with `titleNode` (Alerts + urgent count Badge + Monitoring Badge w/ `PulsingDot`,
  `:76`), actions cluster My morning sweep / Sources / Alert history (`:201`), wraps
  `<AlertsListPage embedded />` in `MorningSweepProvider`.
- List: `apps/app/src/features/alerts/AlertsListPage.tsx:125`.
  - Search + ViewToggle + Filters: `:730`–`1160` (`FilterTrigger` from
    `@/components/patterns/filter-trigger`, imported `:41`). View toggle List/Map
    `:479`,`:514`,`:825`. Sort `:168`,`:1121`–`1149`.
  - Day-grouped `PulseAlertRow` rendering: list body `:1277`+ (comment cites Pencil
    `i90PZ` 100% replicated). Row component:
    `apps/app/src/features/alerts/components/PulseAlertRow.tsx` (chrome helpers in
    `components/pulse-alert-chrome.ts`).
  - Sub-chips reused: `AlertConfidencePill`, `AlertSourceBadge`, `AlertStatusBadge`,
    `AlertReadinessStatus`, `PulseFormChip`, `PulseJurisdictionChip`,
    `PulseChangeKindChip`, `PulseAffectedClientChips`, `PulseAlertActionsRow`,
    `AlertCard`, `PulseFormRevisedCard` (all under `components/`).

### Divergences

- Title chip count: design shows "**6**" active + Monitoring label
  "**Sources · Federal + 50 states + DC**". Code renders "**{N} urgent**" +
  "**Monitoring: Federal · 50 States · DC**". Wording differs (intentional per
  dev-log round 83 #6/#7 — keep code copy, it post-dates the frame). No change.
- Monitoring chip in design has a leading `database` icon + trailing `chevron-right`
  (it's a link to Sources). Code uses a `PulsingDot` and no chevron. **Optional**:
  if the chip should navigate to `/rules/sources`, add the chevron affordance.
  Low priority — flag only.
- Eyebrow "Synced just now" + `?` keyboard hint are present in design header but
  live elsewhere in code (sync state is in shell). No action.

### Reuse plan

- 100% existing components. No new component. Verify the four `FilterTrigger`
  labels match (Client/Severity/Due/Status) and SortBy default reads "Priority"
  vs code "Newest first" (code is canonical). No code change required for parity;
  any copy tweaks are one-line `<Trans>` edits.

---

## Node ibEoz / g6zqRl — `/alerts/[id]` (detail, IN-PAGE)

> `g6zqRl` is the 2560-wide variant of `ibEoz`; identical structure, wider columns.
> **Not a route** — opens via `?alert=` on `/alerts`.

### Design spec (MainRow `oSUlx` = two columns)

- **List Pane** (`DOga0`, 380w, white, right border): compact list — ListHead
  (`UMVII`) + FilterRow (`bnuTo`) + ListBody (`g2pZz`) of compact alert cards.
- **Detail Pane** (`YXIZ6`, fill `#f2f4f7`, vertical):
  - **BackStrip** (`NqdmD`, pad `[12,28]`, bottom border): back affordance row.
  - **DecisionBanner** variants — warning `#FFFBEB` (`hPWvb`), failed-apply
    `#FEE4E2` (`WlJuP`), applied/undo `#ECFDF3` (`Za9cb`).
  - **ScrollArea** (`FvHji`, fill `#f2f4f7`, pad `[28,40]`, gap 18): the body
    sections (hero, structured fields, affected clients, provenance & confidence).
  - **StickyFooter** (`a6MZf`, white, top border, pad `[14,28,40,28]`): action shelf.
- **Toast** (`s0pEJ`) — floating "Applied to N clients" w/ Undo, green strip, shadow.

### Current code (file:line)

- Mount/architecture: `apps/app/src/features/alerts/DrawerProvider.tsx:24` —
  `openDrawer(id)` → `navigate('/alerts?alert=<id>')`; `:35` reads
  `searchParams.get('alert')`; route owns inline panel, off-route fallback Sheet
  at `:87`. **Matches the in-page `?alert=` decision exactly.**
- Drawer: `apps/app/src/features/alerts/AlertDetailDrawer.tsx:118`
  (`mode: 'sheet' | 'panel'`, `:106`). Header `:534` (SheetHeader, title `<h2>` 22px
  `:643`). Sections: `AlertStructuredFields` (`:969`), `AffectedClientsTable`
  (`:818`,`:855`), `ApplySafetyChecklist` (`:1016`), Provenance & confidence section
  (`:1043`, AI confidence % + tier + Source & audit). Sticky footer `DrawerActions`
  `:1386`+ — Apply / Mark reviewed / Apply reviewed set / Request review / Copy draft
  (`:1421`–`:1506`); Apply verification dialog `:1859`+.

### Divergences

- Design "List Pane | Detail Pane" two-column split = code's route inline panel
  (list column + `<AlertDetailDrawer mode="panel">`). Same architecture.
- Footer label: design Undo toast "Applied to 4 clients"; code emits equivalent
  toast on apply. Copy parity only.
- DecisionBanner color variants (warning/fail/success) ↔ `AlertDecisionStatusNotice`
  (`AlertReadinessStatus.tsx`, imported `:66`). Confirm all three tones present.

### Reuse plan

- No new component. The drawer is fully built. Action: confirm `mode="panel"`
  renders the BackStrip + sticky footer with the same spacing
  (`px-12 pt-10 pb-6` header, footer min-h-16) — already in code.

---

## Node hFOEo — `/alerts/history`

### Design spec

- Same shell. Header: breadcrumb "Alerts / History" (accent / muted),
  meta "482 handled alerts · last 90 days", title "Alert history" 32/600 +
  context "Mar–Jun 2026" 32/normal `#676f83`, Export action (`download`+label).
- Summary stat strip (4 stats incl. counts) + filter row + **table** of handled
  alerts grouped by day with status badges (Applied/Dismissed etc.) — read-only,
  no hover actions.

### Current code (file:line)

- Route: `apps/app/src/routes/alerts.history.tsx:31` (`AlertsHistoryRoute`) —
  `RulesPageShell` title `t\`Alert history\``, `breadcrumbs={[{label:'Alerts',to:'/alerts'}]}`
(`:53`), actions Active alerts / Sources (`:64`), renders
`<AlertsListPage embedded historyMode />` (`:87`).
- `historyMode` paths in list: query `:267`, status filter options `:283`,
  suppressed row hover/handlers `:1308`,`:1318`, status labels `:1503`–`1520`.

### Divergences

- Design header shows meta "482 handled alerts · last 90 days" + context range
  "Mar–Jun 2026" + Export button. Code header is plain title + breadcrumb + Active
  alerts/Sources actions. **Gap (optional):** add an Export action and a
  count/range subtitle if desired. Currently no Export. Flag only — low priority.
- Design is a dense **table**; code reuses the same card list in `historyMode`
  (handlers suppressed). Functional parity; visual density differs. No change
  unless a table variant is explicitly requested.

### Reuse plan

- Existing route + `AlertsListPage historyMode`. No new component. If Export is
  wanted: add a `Button variant="outline"` with `DownloadIcon` to the actions
  cluster (mirror the pattern already in `alerts.tsx`).

---

## Node O3s4ie — `/alerts` EMPTY (exact copy)

### Design spec

- Full-surface centered card. Icon circle (accent tint) with **`megaphone`** (size 36,
  `#155aef`). No CTA.
- **Title:** `No alerts — you're caught up` (20/600 `#101828`, tracking -0.2)
- **Sub:** `When IRS, CA FTB, or another monitored source publishes a change, it will
land here. Last check: 12 minutes ago.` (14/500 `#676f83`, centered, lh1.5)
- **CTA:** none.

### Current code

- `apps/app/src/features/alerts/AlertsListPage.tsx:1270` → currently renders
  `<AlertsAllClearBanner sources={sourceHealth} />` (a status banner, NOT the
  prominent empty card).
- Shared primitive available: `apps/app/src/components/patterns/empty-state.tsx`
  now has `variant="prominent"` (`:46`) — solid-border card, 88px accent-tint
  icon-circle, `size-9 text-text-accent` icon, `text-xl` title, `max-w-[520px]` sub,
  CTA slot.

### Reuse plan (action)

- Replace `AlertsAllClearBanner` (the `isEmpty` branch at `:1270`) with:
  ```tsx
  <EmptyState
    variant="prominent"
    icon={MegaphoneIcon}
    title={<Trans>No alerts — you're caught up</Trans>}
    description={
      <Trans>
        When IRS, CA FTB, or another monitored source publishes a change, it will land here. Last
        check: {lastCheck}.
      </Trans>
    }
  />
  ```
- Icon: `megaphone` → `MegaphoneIcon`. "12 minutes ago" should be the live last-check relative
  time (`lastCheck` from `sourceHealth`), not hardcoded.

---

## Node rR9X1 — `/alerts/history` EMPTY (exact copy)

### Design spec

- Full-surface centered card. Icon circle with **`history`** (size 32, `#98a2b2`).
- **Title:** `No history yet` (22/600 `#101828`)
- **Sub:** `Once you decide on alerts (apply / dismiss / snooze) they'll show up here
as an immutable record. Last 60 days of activity will appear automatically.`
  (14/normal `#354052`, centered, lh1.55)
- **Primary CTA:** `Go to alerts` (filled `#155aef`, white 14/500 label, leading
  `megaphone` icon)
- **Footnote block** "WHAT GETS RECORDED" (11/600 `#98a2b2`, tracking 0.5) + 4
  labeled icon chips: Apply (`circle-check`) · Dismiss (`x`) · Snooze
  (`alarm-clock`) · Revert (`undo-2`), each 12/500 `#354052`.

### Current code

- History uses the same `AlertsListPage historyMode`; the empty branch falls to
  `FilteredEmptyState` / `AlertsAllClearBanner`. No dedicated prominent empty for
  the genuinely-empty history case.

### Reuse plan (action)

- In the `isEmpty && historyMode` branch render `EmptyState variant="prominent"`:
  ```tsx
  <EmptyState
    variant="prominent"
    icon={HistoryIcon}
    title={<Trans>No history yet</Trans>}
    description={
      <Trans>
        Once you decide on alerts (apply / dismiss / snooze) they'll show up here as an immutable
        record. Last 60 days of activity will appear automatically.
      </Trans>
    }
    cta={
      <Button render={<Link to="/alerts" />}>
        <MegaphoneIcon data-icon="inline-start" />
        <Trans>Go to alerts</Trans>
      </Button>
    }
  />
  ```
  Primary (filled) CTA here (not quiet) — design shows a filled button.
- The "WHAT GETS RECORDED" Apply/Dismiss/Snooze/Revert chip strip
  (`circle-check`/`x`/`alarm-clock`/`undo-2`) has no current equivalent. Either:
  (a) pass it via the `cta` slot as a secondary block, or (b) extend `EmptyState`
  with an optional `footer` slot. **New (small): optional `footer?: ReactNode`**
  prop on `EmptyState` is the cleanest reusable home for this — both empties can
  then carry supplementary content without bespoke wrappers.

---

## Summary of action items (ranked)

1. **`/alerts` empty** (`AlertsListPage.tsx:1270`): swap `AlertsAllClearBanner` →
   `EmptyState variant="prominent"` (megaphone, settings-2 quiet CTA, live last-check).
2. **`/alerts/history` empty**: add `EmptyState variant="prominent"` (history icon,
   filled "Go to alerts" CTA) for the empty-history case.
3. **New (small):** add optional `footer?: ReactNode` to `EmptyState` for the
   history "WHAT GETS RECORDED" chip strip (circle-check/x/alarm-clock/undo-2).
4. _(optional/flag)_ Monitoring chip chevron-link to Sources; history Export action
   - count/range subtitle. Both low priority — code post-dates these frames.

Everything else (list rows, filters, sort, view toggle, bulk bar, in-page detail
drawer w/ `?alert=`, provenance section, sticky footer) is **already shipped and
component-reused** — no rebuild needed.

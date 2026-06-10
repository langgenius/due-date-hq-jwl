# Spec — Cluster 2: Deadline Detail Tabs

Implementation spec mapping the four Pencil deadline-detail tab designs to the
existing code in `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`
(+ adjacent panels/primitives). Goal: replicate the designs in the **current
visual language** (blue `#155aef` accent, Geist font, quiet CTAs) while reusing
existing components.

Design source: `/Users/yuqi/Desktop/duedatehq_work.pen`

- `d4YrtC` — `/deadlines/hudson-1040` — **Summary** tab
- `Ls3vb` — `/deadlines/aspen-1065` — **Extension** tab
- `AYpfU` — `/deadlines/hudson-1040` — **Materials** tab
- `KsbdI` — `/deadlines/aspen-1040` — **Evidence** tab

## Important framing: page vs drawer

The Pencil designs are **full-page** recreations (1920×1080 frame, left icon
sidebar 56px + page header + hero + tab bar + 2-col body). The current code is a
**right-rail drawer / sheet** (`mode: 'sheet' | 'panel'`), one column, tabs
inside. We are NOT rebuilding the page shell — we map the **tab body content +
copy + field set** from each design onto the existing drawer's `<TabsContent>`
panels. The page-level chrome (sidebar, breadcrumb, hero metric strip, page
header actions) is out of scope for this cluster; the drawer already has its own
header (drawer header L1248+) and sticky deadline strip.

Token mapping used throughout (design hex → existing token):

- `#155aef` accent → `text-text-accent` / `bg-state-accent-*` / blue Button
- `#101828` → `text-text-primary`; `#354052`/`#676f83` → `text-text-secondary`;
  `#98a2b2` → `text-text-tertiary`
- card border `#10182814` → `border-divider-subtle` / `border-divider-regular`
- success green `#17b26a`/`#079455` → `text-state-success`/success Badge
- amber `#b9501a` → `text-text-warning`; red `#d92d20`/`#f04438` → destructive
- Geist Mono / JetBrains Mono labels → `font-mono` / `tabular-nums`
- Keep CTAs quiet: design's filled blue primaries become **at most one** blue
  `<Button>` per section; secondaries are `variant="outline"`/`ghost`.

Tab value mapping (design label → code `TabsTrigger` value):
Summary→`summary`, Materials→`readiness`, Extension→`extension`, Evidence→`evidence`.

---

## 1. SUMMARY tab (design `d4YrtC`)

### (a) Design spec

2-col body: **Primary** col (880) + **Rail** col (320).

Primary column, top to bottom:

- **Hero**: title `Form 1040 — individual income tax return` (28px/600,
  letterSpacing -0.4); sub-row = green due pill (`clock-3` + "Internal due in 9
  days", fill `#17b26a`) + meta text `Official: Apr 15, 2026 · Status: In
preparation · last touched 2h ago by Mira Robinson`.
- **PrimaryAction card** (`Z6n7Z5`): a milestone **Strip** of 3 pill chips
  (Prep / Review / Filed) each with a status dot + label + sub-state
  (`IN PROGRESS` / `PENDING`), separated by 24px hairlines; below it an
  **ActionRow** — blue primary `Mark as ready for review` (`arrow-right`) +
  outline `Send portal request to client` (`send`).
- **WHAT'S LEFT TO DO** card (`xOO3r`): header `WHAT'S LEFT TO DO` + `2 of 5
complete`; 5 checklist rows (checkbox + title + optional "received Feb 14"
  sub). Checked rows use filled blue box + muted text.
- **EXPECTED REFUND** card (`w9bXOk`): kicker; big green `$4,210` + `expected
refund · IRS`; 3 key/value rows (Federal withholding $12,400, CA state
  withholding $3,100, Estimated tax credit $2,210).
- **SOURCE DOCS** card (`D9cnC`): header `SOURCE DOCS` + `4 attached` chip + `+
Add file`; 4 file rows (`file-text` icon tile + mono filename + "218 KB ·
  uploaded Feb 14" + outline `Preview`).

Rail column: **STATUS** card (3 date rows: INTERNAL DUE / OFFICIAL DUE /
MONITORING SINCE, each `label` + date + colored sub), **ASSIGNED** card (3
people rows: avatar initials + name + role + `+ Add team member`), **RECENT
ACTIVITY** card (timeline dots + text + relative time).

### (b) Current-code state

`ObligationQueueDetailDrawer.tsx` L1856–1964 (`<TabsContent value="summary">`).
Renders, in `grid gap-3`:

- `PathToFilingSummary` — `panels.tsx:674`. A 6-stage milestone strip (Not
  started / Waiting on client / Blocked / In review / Filed / Completed) with
  timestamps. **This is the code analogue of the design's 3-pill Strip**, just
  richer (6 stages vs 3).
- `AuthorityResponsePanel` — `panels.tsx:1057` (accept/reject filed return).
- `ActiveStageDetailCard` — `panels.tsx:1220` (active-stage zoom: prep/review
  sub-stage pipeline, e-file pipeline, contextual forward CTAs).

There is **no** "What's left to do" task list, **no** "Expected refund"
panel, **no** "Source docs" list, and **no** right-rail Status/Assigned/Recent-
activity block on the Summary tab today (drawer is single-column; dates live in
the sticky strip + header).

### (c) Divergences to fix

- **Milestone strip**: design shows 3 chips (Prep/Review/Filed) with dot +
  IN PROGRESS/PENDING sub-state; code `PathToFilingSummary` shows 6 stages.
  Decision needed: keep the richer 6-stage strip (recommended — it is the
  product's milestone vocabulary) but adopt the design's **chip styling** (pill
  bg `#eff4ff` for active = `bg-state-accent-hover`, dot, sub-state caption).
  Do NOT regress to 3 stages.
- **ActionRow CTAs**: design's `Mark as ready for review` + `Send portal request
to client` already exist as contextual actions inside `ActiveStageDetailCard`
  (forward-status buttons) and the Materials "send request" flow. Surface the
  primary forward action as ONE blue Button; keep portal request as outline.
- **"What's left to do" task list** — NEW on Summary. Maps to the readiness
  checklist data (`detail.readinessChecklist`). Either reuse `ChecklistItemRow`
  read-only, or add a compact summary list. Copy `2 of 5 complete` = received/
  total. (Note: Materials tab already owns the full checklist; on Summary this
  is a condensed mirror — confirm with Yuqi whether to duplicate or link.)
- **Expected refund panel** — NEW. No data source exists today (no
  refund/withholding fields on `ObligationQueueRow`). Flag as design-only / mock
  unless a contract field is added. Likely **defer**; do not invent fields.
- **Source docs list** — overlaps the Evidence tab "Workpapers" + the design's
  own Materials uploads. On the drawer, files live under Evidence
  (`detail.evidence`). Recommend NOT duplicating on Summary; if kept, reuse the
  Evidence file-row pattern.
- **Right rail (Status/Assigned/Activity)** — drawer is single column. Status
  dates already render in the sticky deadline strip + header. Assigned + Recent
  activity have no drawer home today. Recommend: fold "Recent activity" into the
  existing Audit/Timeline tab (already present), and surface assignees as a
  compact inline block, NOT a full rail (the drawer has no room for a 320px
  rail).

### (d) Component reuse plan

- Milestone chips → restyle inside `PathToFilingSummary` (`panels.tsx`).
- CTAs → existing `Button` (`@duedatehq/ui/.../button`) + the contextual actions
  in `ActiveStageDetailCard`.
- Task list → `ChecklistItemRow` (`ChecklistItemRow.tsx`) read-only, or
  `DetailRow` (`primitives.tsx:204`) for a compact view.
- KV rows (Expected refund / Status dates) → `DetailRow`.
- File rows → reuse the Evidence workpaper row markup (see Evidence §4d).
- Avatars/people rows → existing avatar pattern; `Badge` for role tags.
- **New reusable worth extracting**: `MilestoneChip` (dot + label + sub-state
  caption) and a small `KeyValueCard` (kicker header + DetailRow list) — both
  recur across Summary, Extension, Evidence.

---

## 2. EXTENSION tab (design `Ls3vb`)

### (b is folded in — design is full-page; tab body = `Body > apply-row` + `sec-history`)

### (a) Design spec

Body (`SHwne`), vertical gap 18:

- **state-header** (`mWiE6`): outline pill `No extension on file` (grey dot) +
  sub `You have until Mar 17 to file Form 7004 for an automatic 6-month
extension.` + outline secondary `Rule reference` (`book-open`).
- **apply-row** (`dsqgY`) = two cards side by side:
  - **rule-ref card** (`G56hAH`): header `Form 7004 — automatic extension of
time to file` (`book-open` blue) + `Open rule →` link; source line (mono)
    `IRS · Title 26 §6081 · v.2026.1 · 38 days old`; amber warn-note
    (`triangle-alert`) `Extension defers filing, not payment. Estimated tax of
$48,200 still owed by original deadline.`; then a bordered **grid** of fact
    cells: POLICY=`Automatic 6-month extension`, FORM=`Form 7004`,
    LENGTH=`+183 days`, ORIGINAL DEADLINE=`Mar 17, 2026`, EXTENDED
    DEADLINE=`Sep 15, 2026`, PAYMENT STILL DUE=`Mar 17, 2026 · $48,200` (amber),
    RULE NOTES (full-width paragraph). Cell labels are mono 10px/700 uppercase.
  - **apply-extension card** (`QLZ99`): header `Apply extension` + sub `File
Form 7004 with the IRS. The extended deadline will replace the original on
Aspen's calendar.`; 4 form fields (label + input): `Extension form`=Form
    7004 — Automatic 6-month, `Filing channel`=IRS MEF, `New extended
deadline`=Sep 15, 2026 (`calendar` icon), `Reason code`=09 — Form 1065;
    amber payment-due callout (`Payment of $48,200 still due Mar 17, 2026` +
    `Schedule payment →`); CTA row: outline `Cancel` + blue `File`.
- **sec-history** card (`muzOr`): `Extension history` + sub + `View all client
extensions →`; a table (col-head mono: YEAR/FORM/LENGTH/ORIGINAL/EXTENDED
  TO/FILED BY/RESULT) with rows 2024/2023/2022, RESULT cell = dot + status
  (`Filed on time` green / `Filed without extension` grey).

### (b) Current-code state

`ObligationQueueDetailDrawer.tsx` L2723–2868 (`<TabsContent value="extension">`).

- `AlertPanel` (`primitives.tsx:181`): copy "This saves the firm's internal
  extension plan for this deadline…".
- `section "Rule reference"` with `DetailRow` list: Extension policy / Official
  form or method / Extension length / Original filing deadline / Extended filing
  deadline / Payment still due / Rule notes — all from `detail.matchedRule.
extensionPolicy`.
- Form inputs: `IsoDatePicker` (extended filing deadline, manual case),
  `IsoDatePicker` (internal extension target date), `Input` (source), `Textarea`
  (decision memo, required).
- Blue `Save extension` Button + "Last decided …" hint.

### (c) Divergences to fix

- **Two-column → one column**: design's side-by-side rule-ref + apply cards must
  stack in the drawer. Keep order: rule facts first, then the apply form.
- **Rule facts**: design uses a bordered **grid** of cells with mono uppercase
  labels; code uses flat `DetailRow` list. Match the design's label set + values
  — code already has all of them via `DetailRow`. Optionally restyle into the
  2-col cell grid, but `DetailRow` list is acceptable (quieter). The design's
  POLICY/FORM/LENGTH/EXTENDED/PAYMENT map 1:1 to the existing rows; add a
  **`+183 days` LENGTH** style (code shows "6 months" — keep months).
- **Form fields diverge**: design exposes `Extension form` (select), `Filing
channel` (select), `New extended deadline` (date), `Reason code` (select).
  Code exposes: extended-deadline date (manual only), internal target date,
  source text, memo textarea. Reconcile:
  - `New extended deadline` ↔ existing manual `IsoDatePicker` (extendedFiling
    Date). Keep.
  - Internal target date (code) has NO design field — it is the firm-internal
    plan, core to this product. **Keep it.** Design omits it because the design
    frames Extension as "file Form 7004 with IRS" (authority action), while code
    frames it as "save internal extension plan." Per project memory the code
    semantics (internal plan) are intentional — keep AlertPanel copy.
  - `Extension form` / `Filing channel` / `Reason code` are display-only in
    design (derived from matched rule). Render as read-only fact rows, not new
    editable selects, unless contract adds them.
  - `source` Input + `memo` Textarea (code) have no design field; keep — they
    back the audit trail.
- **Amber "payment still due" callout** — design has it twice (warn-note +
  payment-due card). Code surfaces "Payment still due" only as a `DetailRow`.
  ADD a single amber callout using `Alert`/`AlertPanel` styling with
  `triangle-alert` and `text-text-warning` when `row.paymentDueDate` set.
  Copy: `Filing Form 7004 does not extend the time to pay…`.
- **CTAs**: design = Cancel + blue File. Code = single blue `Save extension`.
  Keep one quiet primary (`Save extension`); the `File`/`Schedule payment` links
  are out of scope (no e-file/payment pipeline). Do not add dead CTAs.
- **Extension history table** — NEW. No prior-year extension history data source
  on the obligation today. Maps conceptually to audit events but not 1:1. Flag
  as **defer / needs data** unless `detail` gains a history field.

### (d) Component reuse plan

- Intro copy → `AlertPanel` (`primitives.tsx:181`) — already used.
- Rule facts → `DetailRow` (`primitives.tsx:204`) — already used; optionally a
  2-col cell grid built with plain frames + `font-mono` labels.
- Date fields → `IsoDatePicker` (`@/components/primitives/iso-date-picker`).
- Read-only selects (form/channel/reason) → `DetailRow` (display) or `Select`
  (`packages/ui/.../select.tsx`) if made editable.
- Payment callout → `Alert` + `AlertDescription` (`packages/ui/.../alert`) with
  `AlertTriangleIcon`.
- Save → `Button`.
- History table → `Table` family (`packages/ui/.../table.tsx`) IF data lands.
- **New reusable**: the amber "payment defers, not payment" callout is reused on
  Extension + Evidence-adjacent flows — extract a `PaymentStillDueCallout`.

---

## 3. MATERIALS tab (design `AYpfU`) — code value `readiness`

### (a) Design spec

Body (`DGcft`): **left** col (fill) + **right** rail (340).

Left column:

- **MatHeader card** (`gLQLJ`): kicker `DOCUMENT CHECKLIST` (mono) + title
  `Materials for Form 1040` (18px/600) + sub `0 of 14 received` (mono); right:
  outline `Add item` (`plus`) + blue `Request all from client` (`send`). Below:
  a **progress bar** (`kQkqL`, green fill) + **legend** row: green dot `2
received` / red dot `12 outstanding` / grey dot `0 waived` + `Last update Mar
22, 2026`.
- **Received** card (`hMuwj`): head = green dot + `RECEIVED` (mono) + green count
  pill `2`. Rows (`r-W-2`): filled green check box + mono code `W-2` + `·
Hudson Wells primary employer` + sub `W2_2025_HW.pdf · uploaded Mar 18` +
  `f9fafb` `View` (`eye`).
- **Outstanding** card (`YmaDy`): head = red dot + `OUTSTANDING` + red count pill
  `12` + blue `Request all 12` (`send`). Rows (`r-1099-INT`): empty checkbox +
  mono code + `· Chase savings interest` + sub + per-row quiet actions `Upload`
  (`upload`), `Request` (`send`, blue), `Waive` (`circle-off`, grey). Footer
  `more` row: `+ 6 more outstanding (…)` + `View all 12 →`.
- **Waived** card (`BGLC4`): head + empty state.

Right rail:

- **Ownership** card (`t8grh`): `Ownership` + `Edit`; rows Assignee / Client
  owner / Reviewer = avatar + role kicker (mono) + name + role tag.
- **Linked from** card (`yeTJG`): `Linked from` + `1 source`; row = `megaphone`
  tile + `Past-deadline Q1 sweep` + `Alert` tag + `Accepted May 12, 2026 ·
auto-converted to obligation` + `arrow-up-right`.

### (b) Current-code state

`ObligationQueueDetailDrawer.tsx` L1965–2722 (`<TabsContent value="readiness">`).
Single column, `grid gap-4`:

- `ReadinessOverview` (`panels.tsx:70`): headline + subline state machine +
  counts (received/total). **Maps to MatHeader title/sub + progress.**
- Client-response-due `Badge` (warning) when a request is outstanding.
- Correction-mode banner (when efile rejected).
- **"Materials checklist"** `<h3>` + `checklistReference` Badge; `Select all`
  Checkbox + `Add item` ghost Button.
- Empty state: blue `Generate document list` CTA / preparing / error states.
- Checklist rendered via `ChecklistItemRow` (`ChecklistItemRow.tsx`) — checkbox
  - code + label + description + status chip + per-row actions; multi-select
    drives a batch "Mark received" action.
- Send-request preview flow (`Request all from client` analogue) +
  `MaterialsRequestPreviewDialog`.
- Tax-year profile editor section.

### (c) Divergences to fix

- **Single section → Received / Outstanding / Waived grouping**: code renders ONE
  flat checklist; design groups into 3 status-bucketed cards with per-group
  count pills + per-group header actions (`Request all 12`). Refactor the
  checklist render to group by `item.status` (received / outstanding /
  waived). `ChecklistItemRow` already varies by status; wrap groups in section
  cards with the colored dot + mono header + count Badge.
- **Header layout**: adopt design's `DOCUMENT CHECKLIST` kicker + `Materials for
{form}` title + `N of M received` mono sub + progress bar + legend. Code has
  the counts in `ReadinessOverview` but no progress bar / 3-dot legend. ADD a
  `Progress` bar (`packages/ui/.../progress.tsx`) + legend row.
- **CTAs**: design `Add item` (outline) + `Request all from client` (blue) sit
  in the header; code has `Add item` (ghost, next to h3) + send-request lower
  down. Move to one header action cluster; keep ONE blue primary
  (`Request all`).
- **Per-row actions**: design shows `Upload` / `Request` / `Waive` per
  outstanding row + `View` on received. Code's `ChecklistItemRow` currently has
  multi-select + status chip, no per-row Upload/Waive. ADD `Waive` (maps to a new
  status) and `Request` per-row; `Upload` is a stub (no ingest yet — toast like
  Evidence "coming soon").
- **"View all 12" / "+N more" collapse** — design truncates long lists; code
  shows all. Optional: add a show-more after ~7 rows.
- **Right rail (Ownership / Linked from)** — drawer single-column. Ownership
  (assignee/reviewer/owner) has partial data on the row; render as a compact
  section, not a 340px rail. `Linked from` (origin alert) maps to the
  obligation's source/origin — surface only if data exists; else defer.
- **Mono `0/14` count in the tab trigger** — design Extension/Materials tab
  triggers show a count chip (`0/14`, `3`, `—`). Code tab triggers (L1777+) may
  not show counts. ADD count chips to `TabsTrigger` labels.

### (d) Component reuse plan

- Overview/header → keep `ReadinessOverview` (`panels.tsx:70`), add `Progress`
  - legend.
- Group cards → plain frames + colored dot + `font-mono` header + `Badge` count.
- Rows → `ChecklistItemRow` (`ChecklistItemRow.tsx`) — extend per-row actions.
- Add item / Request → `Button` (ghost + blue); request flow already wired
  (`previewRequestEmail`/`sendRequest` + `MaterialsRequestPreviewDialog`).
- Select-all → `Checkbox` (already used).
- Ownership rows → avatar pattern + `Badge` role tags + `DetailRow`.
- Tab count chips → `Badge` inside `TabsTrigger`.
- **New reusable**: `ChecklistGroupCard` (dot + mono title + count Badge + rows)
  and `MaterialsProgressLegend` (bar + 3-dot legend).

---

## 4. EVIDENCE tab (design `KsbdI`)

### (a) Design spec

Body (`L0Zuo2`), single column (`left` fills), gap 18:

- **hero-status card** (`H3xJg`): top = red pill `Not filed yet` (`fff4f1` bg) +
  sub block (`Evidence required to close out filing` + `Four artefacts confirm
the return is filed, accepted, and signed off.`) + progress `1 / 4` (mono).
  Below: a bordered 4-cell **checks** grid: WORKPAPERS=`3 of 5` (red dot),
  FILED RETURN=`Awaiting` (grey dot), E-FILE ACK.=`Awaiting`, FORM 8879=`Not
signed`. Cell labels mono 10px/700.
- **sec-workpapers card** (`cW4El`): head `Workpapers` + count `3` + `sort` +
  blue cta; file rows (`row-…`): `f9fafb` icon tile + name (`2025 W-2 packet —
Hudson + Wells`) + mono meta (`PDF · 840 KB · Maya Hudson`) + date (`Feb 24,
2026`) + actions (`download`, `trash-2`).
- **artifact-row** (`noIGz`) = two cards:
  - **sec-filed-return** (`Lh5Vb`): head `Filed return` (`file-check`) +
    `Awaiting` chip; empty state `No return PDF uploaded` + `Upload after filing
for evidence trail` + outline `Upload return PDF` (`upload`).
  - **sec-efile** (`BWykm`): head + KV grid: CONFIRMATION #=`—`, ACCEPTED ON=`—`,
    GATEWAY=`IRS MEF · ready to submit` (mono labels).
- **sec-signoffs card** (`KPb9Z`): head `Client signoffs` (`signature`) +
  `Request signature →`; 3 fact cells: FORM 8879=`Not sent` / `E-file
authorization`, ENGAGEMENT LETTER, RETURN REVIEW (each dot + label + value +
  sub).
- **strip-authority** (`FXD1b`, `f9fafb`): mono fact strip — AUTHORITY=`IRS ·
Title 26 §6012`, RULE=`Form 1040 v.2026.1 · 21 days old`, DUE=`Apr 15, 2026`,
  PRIOR YEAR=`Filed Apr 11, 2025` + `Open rule reference →`.

### (b) Current-code state

`ObligationQueueDetailDrawer.tsx` L2870–3041 (`<TabsContent value="evidence">`).
`grid gap-4`:

- **Workpapers** `<section>`: `<h3>Workpapers</h3>` + count + outline `Add
workpaper` (stub → toast "coming soon"). Rows via `EvidenceInlineItem`
  (`evidence.tsx:112`) when `detail.evidence.length > 0`, else `EmptyPanel`.
- **Authority citation** `<details>` (collapsed): rule-id `Badge` linking to
  `/rules/library?rule=…`; rule title + defaultTip; per-evidence cards
  (summary + authorityRole Badge + sourceExcerpt + source/retrievedAt).

No hero-status checks grid, no Filed-return / E-file-ack / Form-8879 artifact
cards, no client-signoffs section, no authority strip (the authority info is in
the collapsed `<details>` instead).

### (c) Divergences to fix

- **Hero-status "1 / 4" checks grid** — NEW. The 4 artefacts (Workpapers / Filed
  return / E-file ack / Form 8879) map to existing data: e-file pipeline state
  (`row.efileState`, used by `ActiveStageDetailCard`), `detail.evidence`,
  filed/accepted timestamps. ADD a summary header card computing the 4 states
  from existing fields. Status badge `Not filed yet` ↔ `row.status !== 'done'`.
- **Workpapers rows**: design row = icon tile + name + mono meta + date +
  download/trash. Code `EvidenceInlineItem` renders a richer typed card (penalty
  / extension / checklist / response). Keep `EvidenceInlineItem` for typed
  evidence; for plain file artefacts adopt the design's compact file-row (icon
  tile + name + meta + actions). `Add workpaper` stays a stub toast.
- **Filed return / E-file ack cards** — NEW; data from e-file pipeline. Filed-
  return empty state CTA `Upload return PDF` = stub toast (no ingest). E-file KV:
  CONFIRMATION # / ACCEPTED ON / GATEWAY → from `row` efile fields (some null →
  `—`). Render with `DetailRow`.
- **Client signoffs** — NEW; Form 8879 state already tracked
  (`row.efileState: authorization_requested/signed`). `Request signature →` maps
  to the existing `remindSignature` / `SignatureReminderDialog` flow + the
  drawer's `onRemindSignature`. Reuse, don't rebuild.
- **Authority strip vs `<details>`** — design promotes authority to an always-
  visible bottom strip (`f9fafb`, mono labels); code hides it in a collapsed
  `<details>`. Reconcile: either keep `<details>` (quieter, current pattern) OR
  flatten to the design's mono strip. Recommend the flat strip for the headline
  facts (AUTHORITY/RULE/DUE/PRIOR YEAR) + keep `<details>` for the verbose
  per-source excerpts. Rule-id link already wired to `/rules/library`.
- **`Sort` control** on workpapers — minor; optional `DropdownMenu`.

### (d) Component reuse plan

- Hero checks grid → plain frames + colored dot + mono labels; counts computed
  from `row.efileState` + `detail.evidence` + filed timestamps.
- Typed evidence rows → keep `EvidenceInlineItem` (`evidence.tsx:112`),
  `ReadinessChecklistEvidence`, `ReadinessClientResponseEvidence`,
  `AuditSummaryRows` (`primitives.tsx:190`).
- File artefact rows → reuse the Summary "Source docs" file-row pattern (shared).
- KV cells (E-file ack / authority strip) → `DetailRow` (`primitives.tsx:204`)
  - `font-mono` labels.
- Empty states → `EmptyPanel` (`primitives.tsx:150`).
- Signoffs `Request signature` → existing `onRemindSignature` →
  `SignatureReminderDialog` (`./dialogs`).
- Authority link → existing `Badge` + `Link` to `/rules/library` (L2966).
- **New reusable**: `EvidenceArtifactStatusGrid` (the 1/4 checks header) and a
  shared `FileArtifactRow` (used by Summary Source Docs + Evidence Workpapers +
  Filed return).

---

## Cross-tab summary of NEW reusable components worth extracting

1. `MilestoneChip` — dot + label + sub-state caption (Summary strip).
2. `KeyValueCard` / lean wrapper over `DetailRow` (Summary, Extension, Evidence).
3. `PaymentStillDueCallout` — amber `Alert` (Extension; e-file/payment surfaces).
4. `ChecklistGroupCard` + `MaterialsProgressLegend` (Materials).
5. `FileArtifactRow` — icon tile + name + mono meta + actions (Summary Source
   Docs, Evidence Workpapers, Filed return).
6. `EvidenceArtifactStatusGrid` — the 1/4 artefact checks header (Evidence).

## Data gaps to confirm before building (no contract field today)

- Summary: Expected refund / withholding figures; per-deadline source-docs list.
- Extension: prior-year extension **history** table; editable form/channel/reason
  selects (currently derived from matched rule, display-only).
- Evidence: filed-return PDF + e-file confirmation # / accepted-on / gateway
  (partially in `row.efileState`); engagement-letter / return-review signoff
  states.
  Treat these as **design-only** until a contract field is added; do not fabricate.

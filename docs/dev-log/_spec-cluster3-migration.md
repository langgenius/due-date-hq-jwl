# Implementation Spec — Migration Wizard (`/migration/new`)

Cluster 3 design intake. Maps each canonical `/migration/new` design frame
(Pencil `duedatehq_work.pen`) to existing code in
`apps/app/src/features/migration/` for high-fidelity replication, reusing
components wherever possible.

Source of truth: the `/migration/new — *` frames. The parallel
`/onboarding — import: *` frames are the OLD naming of this same flow and are
ignored.

Visual language: current (blue `#155aef`, Geist / Geist Mono, quiet CTAs).
Design uses `JetBrains Mono` for some code-ish text; code uses the `font-mono`
token (Geist Mono) — treat as the same role, keep the token.

## Conventions / token map (design hex → code token)

| Design value                      | Meaning                         | Code token                                         |
| --------------------------------- | ------------------------------- | -------------------------------------------------- |
| `#155aef`                         | accent solid / primary CTA fill | `bg-state-accent-solid` / `Button` default         |
| `#eff4ff` / `#E8EEFF`             | accent tint surface             | `bg-accent-tint` / `state-accent-hover-alt`        |
| `#101828`                         | text primary                    | `text-text-primary`                                |
| `#354052`                         | text secondary                  | `text-text-secondary`                              |
| `#676f83`                         | text muted                      | `text-text-muted`                                  |
| `#98a2b2`                         | text tertiary                   | `text-text-tertiary`                               |
| `#079455` / `#067647` / `#17b26a` | success                         | `text-text-success` / `state-success-*`            |
| `#ECFDF3` / `#dcfce7`             | success tint                    | `bg-state-success-hover`                           |
| `#b9501a` / `#B45309` / `#92400E` | warning text                    | `text-text-warning`                                |
| `#FFFBEB` / `#fff4f1`             | warning tint                    | `bg-state-warning-hover`                           |
| `#FDE68A`                         | warning border                  | `border-state-warning-*`                           |
| `#d92d20` / `#f25f4c`             | destructive                     | `text-text-destructive` / destructive Alert        |
| `#fef3f2` / `#fff4f1`             | destructive tint                | destructive `Alert` bg                             |
| `#10182814` (`#101828` @ ~8%)     | hairline divider                | `border-divider-subtle` / `border-divider-regular` |
| Geist                             | body font                       | default sans                                       |
| Geist Mono / JetBrains Mono       | code/field font                 | `font-mono`                                        |

Modal shell across all step frames: 960px wide card, `cornerRadius:16`, white
fill, 1px hairline stroke, `shadow-overlay` (design `blur:48 / y:24 / spread:-8`,
`#0F172A40`). Backdrop `#0F172A` @ 40–55%.

---

## Shared shell — Header + StepPills + Footer

### Design spec (consistent across all step frames)

- **Header** (`padding:[16,24]`, bottom hairline): title **"Import clients"**
  (Geist 16–18 / 600, `#101828`), spacer, **"Import history"** ghost button
  (lucide `history` 11–14px + label, `#676f83`/`#354052`), **close** square
  button (lucide `x`, 28–32px, sometimes on `#f9fafb`).
- **StepPills** (`padding:[14,24]`, bottom hairline): 4 pill steps
  **Intake / Mapping / Normalize / Dry run**. Each pill = rounded-full frame
  with a 16px numbered circle + label.
  - Active pill: fill `#155aef`, white label, white-on-translucent number
    circle (`#ffffff26`/`33`).
  - Completed pill: fill `#ECFDF3` (or white), green `check` icon in circle,
    green `#079455` label, green border `#A6E9C5`.
  - Pending pill: white fill, `#f9fafb` number circle, `#676f83`/`#354052`
    label, hairline border.
  - Later frames (Step 1 file-ready onward) add a lucide `chevron-right`
    separator between pills (`#98a2b2`, 11px).
- **Footer** (`padding:[14,24]`, top hairline): leading quiet exit
  (**Skip for now** / **Discard draft** / **Cancel** / **Back**), spacer,
  optional secondary (**Save and finish later** / **Use Generic CSV instead**),
  primary CTA on right (blue fill + lucide `arrow-right`). Disabled CTA on
  error frames = `#f9fafb` fill, `#98a2b2` text.
- Step-specific CTA labels: **"Continue · map columns"** (S1),
  **"Continue · normalize values"** (S2), **"Continue · dry run"** (S3),
  **"Import 28 clients"** (S4).

### Current code (file:line)

- `WizardShell.tsx:171-209` — header. Title **"Import clients"** wrapped in
  `ConceptLabel`, `text-lg`. Close = `Button variant="ghost"` with `XIcon` +
  `KbdHint` (Esc). **No "Import history" entry point in the header.**
- `Stepper.tsx:26-89` — the step indicator. Renders rounded-**md** bordered
  step chips (`number + label`, check on done) connected by a `h-px flex-1`
  rail. NOT rounded-full pills; NOT filled-blue active; uses a flex connector
  rail, not chevrons.
- `WizardShell.tsx:248-271` — footer. Right-aligned **Back** (`variant=outline`,
  Step>1 only) + **Continue** (`ArrowRightIcon`). `continueLabel` only
  overrides Step 4 → **"Import & Generate"** (`Wizard.tsx:574-577`). No
  per-step "· map columns" suffixes; no leading Skip/Discard; no
  "Save and finish later".
- The route variant (`WizardRouteShell.tsx:360-396`) hides the close control
  and renders the `MigrationActivationIntro` header above the card; the
  in-card header still shows.

### Divergences

1. **Stepper shape**: design = filled-blue rounded-full pills with numbered
   circles + green completed pills + chevron separators; code = bordered
   rounded-md chips + hairline connector rail. Largest shared-shell gap.
2. **"Import history"** header button: present in every design frame; absent in
   code. (An `ImportHistoryDrawer.tsx` exists in the feature folder — wire its
   trigger into the header.)
3. **Footer composition**: design splits actions left (quiet exit) / right
   (primary); code right-aligns Back+Continue only. Design adds
   "Save and finish later / Save & continue later" (a resume-draft affordance)
   — code has resume _in_ but no explicit save-later button.
4. **CTA labels**: design uses step-descriptive suffixes ("· map columns",
   "· normalize values", "· dry run"); code uses bare "Continue" + Step-4
   "Import & Generate". Note: `Wizard.tsx:568-573` documents that tests assert a
   literal "Continue" on Steps 1–3 — any label change must update
   `Wizard.test.tsx`.
5. **Title size**: design 16–18px; code `text-lg` (18px) — close enough.

### Reuse plan

- Keep `WizardShell` / `WizardFrame` as the shell owner.
- **Restyle `Stepper.tsx`** to the pill spec (filled-blue active, green
  completed pill + `CheckIcon`, `ChevronRightIcon` separators, rounded-full).
  Single component, all steps inherit. Keep display-only (no click-to-jump).
- Add an **"Import history"** trigger to `WizardShell` header → opens existing
  `ImportHistoryDrawer`. Gate to `variant==='dialog'` or show in both.
- If adopting per-step CTA labels, extend the `continueLabel` memo in
  `Wizard.tsx` to cover Steps 1–3 and update `Wizard.test.tsx` in the same
  commit.

---

## Step 1 — Intake

Frames: `SLw8Q` (intake modal w/ resume + unlock card), `XXm55` (empty),
`dCUv7` → `W5vHR` (file ready), `JA2gl` → `Ni54l` (file rejected).

### Design spec

**Empty / first-run (`SLw8Q` body `b12CL`)**

- **Resume banner** (`v7qlHB`, `#eff4ff` fill, `#155aef` border): `history`
  icon tile, **"Resume your last import"** + sub
  _"clients-export-2026-q1.csv — paused at Mapping on Mar 2"_, blue **Resume**
  button. Followed by an **"or start fresh"** divider (`QEfbR`).
- **Dropzone** (`yHoOG`, `#f9fafb`, hairline): `cloud-upload` (20px, `#155aef`)
  in a `#eff4ff` rounded tile, **"Drag a CSV or Excel file to start"**, sub
  _"We'll detect columns automatically. Supports up to 5,000 rows per file."_,
  blue **Browse files** button (lucide `folder-open`). Below: label
  **"Detects automatically — or pick the export you have:"** + 3 rows of preset
  chips: QuickBooks, Karbon, TaxDome, Canopy, UltraTax CS, Drake, Lacerte,
  ProSeries, ProConnect Tax, CCH Axcess, CCH ProSystem fx, File In Time,
  IIF (QuickBooks Desktop), Generic CSV / Excel.
- **UnlockCard** (`NRXcn`, `#eff4ff`): `sparkles` + **"Bring everything you
  have"** + eyebrow **"WHAT BRINGING MORE DATA UNLOCKS"**; three tiles, each
  "IF YOU BRING… [fields] / YOU GET [outcomes]". Footer hint (italic): _"You
  can also bring a thin file and enrich later — nothing here is locked."_
- Footer: **Skip for now** / spacer / **Continue** (arrow).

**File ready (`W5vHR`)**

- **Detection banner** (`pbf29`, `#ECFDF3`/green): "Kn" source tile,
  **"Looks like a Karbon contact export"** + green **"92% match"** chip, sub
  _"Matched on signature columns: contactkey · OrganizationKey · Client owner"_,
  **Override source** button (lucide `shuffle`).
- **FileCard** (`j46UtG`): `file-spreadsheet` + filename (Geist Mono)
  _brightline-karbon-contacts.csv_, meta _"248 KB · 28 rows · 9 columns ·
  parsed in 0.4s"_, **Replace file** button (`refresh-cw`). Below: a 5-column
  preview table (name/email/entity/ein/state) of the first 3 rows.
- **NextStrip** (`Ck0lP`, `#f9fafb`): `info` + _"Next: AI maps your 9 columns
  to DueDateHQ fields. You review and override any row."_
- Footer: **Discard draft** (`x`) / **Save and finish later** /
  **Continue · map columns**.

**File rejected (`Ni54l`)**

- **FileRow** (`neuzu`): `file-text` tile, _clients-ultratax-export.csv_,
  _"UltraTax CS export · 2 clients · 14.2 KB"_, red **Rejected** badge
  (`x`, `#fef3f2`/`#d92d20`).
- **Callout** (`f3Ms1`, `#fef3f2`): `alert-octagon` (`#d92d20`),
  **"Source format unrecognized"**, sub _"We expected UltraTax CS export
  columns but the file has only 4 of the 14 required columns. Pick a different
  preset or use Generic CSV."_
- **MissingPanel** (`tXKDx`): head **"MISSING REQUIRED COLUMNS"** + count
  **"10 of 14"** (mono, red); rows each lucide `circle-x` (red) + column name
  (mono) + _"not found in source"_. Columns: client_id, entity_type,
  ein_or_ssn, fiscal_year_end, primary_contact_email, state_filings,
  federal_extension, franchise_state, engagement_type, billing_terms.
- Footer: **Cancel** / spacer / **Use Generic CSV instead** (`shuffle`) /
  **Continue** (disabled).

### Current code (file:line)

- `Step1Intake.tsx` (59,529 bytes). Dropzone with `UploadCloudIcon`
  (`Step1Intake.tsx:14`), preset tiles with real source logos
  (`assets/source-logos/*`, `Step1Intake.tsx:26-98`) — design uses text chips,
  code uses logo tiles. SSN/PII detection (`detectSsnColumns`,
  `Step1Intake.tsx:18`). File parse + `prepareUploadFile`
  (`intake-files.ts`). `motion` empty→detection transition
  (`Step1Intake.tsx:55-58`).
- **Resume**: handled one level up in `Wizard.tsx:228-236, 673-698` as an
  `Alert` ("Resume your in-progress import?" / Resume / Start fresh), NOT the
  styled blue banner in the design body.
- **Parse error**: `dispatch INTAKE_PARSE_ERROR` (`Wizard.tsx:715`); rendered
  inside `Step1Intake` via an `Alert`.

### Divergences

1. **Resume banner**: design = rich blue in-body banner + "or start fresh"
   divider; code = generic `Alert` rendered by the Wizard. Restyle to match or
   move into `Step1Intake`.
2. **Preset picker**: design = compact text chips in 3 rows (incl. Canopy, IIF,
   Generic); code = logo tiles. Decide chips vs logos; design list adds
   **Canopy** + **IIF (QuickBooks Desktop)** + **Generic CSV / Excel** not in
   `PRESET_LABELS` (`Step1Intake.tsx:60-72`).
3. **UnlockCard** ("Bring everything you have" 3-tile teaser): present in design
   `SLw8Q`, **no equivalent in code** — new content block.
4. **Detection banner / FileCard / preview table** (file-ready): design shows
   confidence %, signature-columns match, file meta, and a 3-row preview;
   confirm code surfaces these (large file unread in full — verify the
   detection + preview region exists).
5. **Reject state**: design = dedicated `alert-octagon` callout + a
   "MISSING REQUIRED COLUMNS (10 of 14)" panel listing each missing column.
   Code currently shows a single parse-error `Alert` — **the structured
   missing-columns panel does not exist**. This is the Step-1 error state to
   build.
6. **Footer**: design adds Discard / Save-later / step-suffixed CTA;
   "Use Generic CSV instead" recovery on reject. Code has none of these.

### Error state status

- **File-rejected: NOT fully implemented.** A generic parse-error Alert exists;
  the structured "Source format unrecognized" callout + missing-columns panel +
  "Use Generic CSV instead" recovery must be built.

### Reuse plan

- Keep `Step1Intake` as the container. Reuse `Alert` (destructive) for the
  callout; build the missing-columns list as a small bordered panel reusing
  `Table`/list primitives + lucide `CircleXIcon`.
- Reuse `Button` for Browse / Replace / Override source / Use Generic CSV.
- Move the resume banner styling into a small `ResumeBanner` (or restyle the
  Wizard `Alert`) — shared with the header "Import history" entry.
- **New shared bits**: missing-columns panel (could generalize for any preset
  validation), the UnlockCard teaser.

---

## Step 2 — Mapping

Frames: `tovkz` (mapping modal), `kVCz1` → `AQoBE` (happy), `vzicH` → `C1rGt`
(AI failed).

### Design spec

**Happy (`AQoBE`)**

- **Intro** (`Pw0RL`): `sparkles` (blue) + **"AI mapped 8 of 9 columns from
  brightline-karbon-contacts.csv — review and confirm"**.
- **PillStrip** (`CDjph`): chips **"Auto-mapped · 8"** (green),
  **"Needs review · 1"** (amber), **"Skipped · 0"** (gray) + hint
  _"You can override any row"_.
- **Table** (`hLFWZ`): columns **YOUR COLUMN / DUEDATEHQ FIELD / SAMPLE (FIRST
  ROW) / CONFIDENCE**. Each row: source col (Geist 12.5/600) → lucide
  `arrow-right` → target field (Geist Mono, blue `#155aef`) → sample → status
  pill (green **"Auto · 98%"** with `check`; amber **"Confirm · 82%"** with
  `triangle-alert`; gray **"Skipped"**). Needs-review row has amber fill
  (`#FFFBEB`) + an editable target dropdown (amber border + `chevron-down`).
- **Helper** (`J8kNo`): `shield-check` (green) + _"Nothing applies until step 4.
  Every change is logged in the audit trail."_
- Footer: **Back** / **Save & continue later** / **Continue · normalize values**.

**AI failed (`C1rGt`)**

- **Alert** (`xzoaT`, `#fef3f2`/destructive): `sparkles` (`#d92d20`),
  **"Couldn't map columns"**, sub _"The mapping AI is temporarily unavailable.
  You can map columns manually below."_, inline **Re-run AI** button
  (`refresh-cw`).
- **MapTable** (`IXE92`): head **SOURCE COLUMN / SAMPLE / MAP TO**; every row
  has source (mono) + sample + an unset **"Pick a target"** dropdown with red
  border (`#f25f4c`) + `triangle-alert` (amber) + `chevron-down`.
- Footer: **Back** / **Re-run AI** (`refresh-cw`) / **Continue with manual
  mapping**.

### Current code (file:line)

- `Step2Mapping.tsx:80-243`. Header h2: **"AI prepared your columns"** (or
  **"Review your column mappings"** on fallback) + `MappingCapabilityBadge`.
- Summary headline (`MappingHeadline`, `Step2Mapping.tsx:254-288`): single
  sentence **"# columns mapped · # need review · # ignored"** — NOT the
  separate colored count chips of the design's PillStrip.
- **Re-run** button in header row (`Step2Mapping.tsx:140-152`):
  **"Re-run AI"** / **"Re-run AI (keep my changes)"**.
- Rows = `MappingBannerRow` (`Step2Mapping.tsx:298+`): click-to-expand banner
  rows with inline "Change" link + dropdown, NOT a fixed 4-column table. (Note
  `Step2Mapping.tsx:78` comment explicitly chose banner rows over the old
  table; design `AQoBE` reverts to a **table** layout.)
- **AI-failed banner**: fully present. `Step2Mapping.tsx:172-203` destructive
  `Alert` **"AI mapping unavailable"** (+ preset/no-preset/all-ignore copy);
  `Step2Mapping.tsx:156-171` info `Alert` **"Matched your columns by name"**
  (heuristic fallback); `Step2Mapping.tsx:205-212` **"Couldn't map columns"**
  banner from `mapping.errorBanner`. Re-run handler:
  `Wizard.tsx:375-399` (`handleStep2Rerun`).
- Bad-rows panel: `BadRowsPanel` (`Step2Mapping.tsx:214-216`) for
  EIN_INVALID/EMPTY_NAME etc.
- Loading: `Skeleton` rows (`Step2Mapping.tsx:218-223`); processing overlay in
  `WizardShell ProcessingOverlay` (`rerun_mapper`/`mapping` phases).

### Divergences

1. **Row layout**: design = strict 4-column table (`AQoBE`); code = expandable
   banner rows (deliberate prior redesign). This is the central Step-2 layout
   decision — design is asking to go back to a table.
2. **Count chips**: design = 3 colored count chips + hint; code = one inline
   text headline. Restyle headline to chips if matching design.
3. **Confidence display**: design = per-row pills with % ("Auto · 98%",
   "Confirm · 82%"); code = `confidenceTier` text (no % pill in banner head per
   the doc). Add % pills.
4. **Header title**: design intro sentence is in-body ("AI mapped 8 of 9…");
   code uses h2 "AI prepared your columns". Different shapes.
5. **Footer**: design adds Save-later + suffixed CTA + (on fail) "Continue with
   manual mapping" / footer Re-run. Code keeps Back + Continue only and the
   Re-run lives in the body header.

### Error state status

- **AI-failed: IMPLEMENTED.** Code has the destructive/info fallback alerts,
  the `errorBanner` "Couldn't map columns", manual mapping, and Re-run. Copy
  differs ("AI mapping unavailable" vs design "Couldn't map columns") — align
  strings + add the unset red-bordered "Pick a target" dropdown styling.

### Reuse plan

- Reuse the `Table` primitive (already imported, `Step2Mapping.tsx:33-40`) if
  reverting to the design table; otherwise keep banner rows and only adopt the
  count chips + % pills.
- Reuse `Alert` (destructive) — already wired for the failed state; align title
  to "Couldn't map columns".
- Reuse `DropdownMenu` for the "Pick a target" / "Change" target picker
  (`Step2Mapping.tsx:23-32`). Style unset state with destructive border.
- Reuse `Badge` for count chips.

---

## Step 3 — Normalize

Frames: `Kt8BV` (modal), `oIjlr` → `g8CrCZ` (happy), `wxqxd` → `tGcB0`
(AI failed).

### Design spec

**Happy (`g8CrCZ`)**

- **Intro** (`gw56Z`): `sparkles` + **"AI normalized 211 of 252 values across
  28 rows — review and apply defaults for what was missing"**.
- **PillStrip** (`JCrwD`): **"Auto-normalized · 211"** (green),
  **"Confirm · 6"** (amber), **"Default Matrix · 35"** (gray) + hint
  _"Audit logged"_.
- **Table** (`FHgPa`): head **FIELD / BEFORE / AFTER / STATUS**. Rows: field
  (mono blue) / before (raw variants) / `arrow-right` / after (mono) / status
  pill. Green **"Auto"** / **"Auto · lowercased"**; amber **"Confirm · 4
  missing"** with `triangle-alert` + an editable "Use 12/31 if missing"
  dropdown; gray **"Default applied"** for matrix-filled fields (with a "matrix
  default" badge, e.g. tier=B).
- **MatrixToggle** (`daU2Q`, `#f9fafb`): pill toggle (on) + **"Apply Default
  Matrix when fields are missing"** + sub _"Fills tier, partner_email,
  fiscal_year_end with firm-wide defaults"_ + **Edit defaults** link
  (`arrow-up-right`).
- **Helper** (`F01v6`): `shield-check` (green) + _"Nothing applies until step 4.
  Every normalization is logged and reversible for 24h."_
- Footer: **Back** / **Save & continue later** / **Continue · dry run**.

**AI failed (`tGcB0`)**

- **Alert** (`nejMu`, `#fff4f1`/warning): `triangle-alert` (`#b9501a`),
  **"Couldn't organize some values"**, sub _"We standardized 8 of 12 columns. 4
  columns need your input."_, inline **Re-run AI**.
- **Sections** (`n8JIp`) — 3 category cards side by side:
  - **DATES** (`calendar`, green check head) — resolved rows raw→norm
    (e.g. `3/15/26 → 2026-03-15`), all green `check`.
  - **ENTITY TYPES** (`building-2`, red border `#f25f4c`, **NEEDS INPUT**) —
    each raw value (LLC (single member), S-Corp election, sole prop,
    partnership (LP)) has an unset red-bordered **"Pick a target"** dropdown.
  - **STATES** (`map-pin`, green check head) — resolved rows
    (California → CA, etc.).
- Footer: **Back** / spacer / hint **"4 columns need your input"** /
  **Continue** (disabled).

### Current code (file:line)

- `Step3Normalize.tsx:50-107+`. h2 **"AI standardized your values"** + privacy
  line (`LockIcon`) _"Your uploaded file stays unchanged…"_.
- Renders by **category** (Entity types / States / Tax types) auto-opening on
  review (`Step3Normalize.tsx:37-49` doc, `buildCategories`) — conceptually the
  same category grouping as the design's Sections, but the happy frame `g8CrCZ`
  shows a flat FIELD/BEFORE/AFTER/STATUS table.
- Matrix toggle: `Checkbox` (`Step3Normalize.tsx:14`) + `buildMatrixSummary`;
  "Apply Default Matrix" semantics handled via `onToggleApplyToAll` and
  `applyDefaultMatrix` mutation (`Wizard.tsx:168-172, 432-446`). Design draws a
  pill switch, not a checkbox.
- **Error banner**: `normalize.errorBanner` → `Alert role="alert"`
  (`Step3Normalize.tsx:109+`). Re-run for normalize is NOT a dedicated handler
  (Step 2 has `handleStep2Rerun`; normalize re-run = go Back and re-confirm
  mapping). Privacy helper uses `LockIcon`/`ShieldCheckIcon`.

### Divergences

1. **Happy layout**: design = single FIELD/BEFORE/AFTER/STATUS table; code =
   collapsible categories. Design happy frame is flatter than code.
2. **Count chips**: design PillStrip (3 chips + "Audit logged"); code has no
   chip strip (counts live in category heads).
3. **Matrix control**: design = pill toggle + "Edit defaults" link; code =
   `Checkbox`. Restyle to a `Switch`-style control; add Edit-defaults link.
4. **Status pills**: design per-row "Auto / Confirm · 4 missing / Default
   applied" + "matrix default" badge; code shows status differently per
   category. Add explicit pills + badge.
5. **AI-failed**: design = warning (`triangle-alert`, amber) with 3 category
   cards where one card is red "NEEDS INPUT"; code uses a single generic Alert.
   The categorized layout (Dates/Entities/States with per-card status) is the
   target shape and matches code's category model — but the styled
   per-category needs-input state must be built.
6. **Re-run on Step 3**: design shows an inline **Re-run AI** on the failed
   frame; code has no Step-3 re-run handler — add one mirroring
   `handleStep2Rerun` against `runNormalizerMutation`.

### Error state status

- **AI-failed: PARTIAL.** A generic `errorBanner` Alert exists, but the
  designed warning callout ("Couldn't organize some values") + the per-category
  cards (resolved Dates/States green; Entities red "NEEDS INPUT" with unset
  "Pick a target" dropdowns) + footer disabled-with-hint + inline Re-run are
  NOT built.

### Reuse plan

- Keep the category model in `Step3Normalize`; the design's Sections map onto
  `buildCategories`. Build a per-category card head with status (green check vs
  red "NEEDS INPUT").
- Reuse `Alert` (warning variant) for the failed callout; align copy.
- Replace `Checkbox` with a `Switch` primitive for the matrix toggle; reuse
  `Button`/`TextLink` for "Edit defaults".
- Reuse `DropdownMenu` for the unset "Pick a target" rows (destructive border).
- Add `handleStep3Rerun` in `Wizard.tsx` for the inline Re-run.

---

## Step 4 — Dry run + Applied success

Frames: `zKPm2` → `YcJR4` (dry run), `OBKVs` → `uoNwI` (applied success + undo).

### Design spec

**Dry run (`YcJR4`)** — note the body fill is `#f2f4f7` (gray) with white cards.

- **Hero** (`xotna`, white card): eyebrow `#17b26a` dot + **"READY TO IMPORT"**,
  **"You're about to create:"**, a 3-cell metric grid:
  **28 CLIENTS to create / 2 ALREADY in your client list / 142 DEADLINES to
  generate** (26px values, divider lines between). Sub: _"Estimated from the
  rules you activated during onboarding · Federal + 6 states"_.
- **Dup card** (`xV6gf`): `copy` + **"Duplicates · 2 detected"** + a segmented
  control **[Skip duplicates | Import as new]** (Skip selected). Rows with
  `link-2`: _"Acme Corp matches Acme Corp (existing client #14)"_,
  _"Hudson Wells matches Hudson Wells (existing client #28)"_. Italic impact:
  _"Duplicates won't be imported."_
- **RuleReview card** (`y9OYI`, `#FFFBEB`): `triangle-alert` +
  **"Some state deadlines need rule review"** + **Review rules →** link, sub
  _"2 jurisdictions (CA · NY) have rules awaiting your verification before they
  generate deadlines for the new clients."_
- **BeforeImport card** (`P2Cn3`): eyebrow **"BEFORE YOU IMPORT"** + 3 green
  `check` rows: _"This import can be undone for 24 hours and keeps an audit
  record."_, _"Audit log captures every AI decision."_, _"No emails will be
  sent automatically."_
- Footer: **Back** / **Save and review later** / **Import 28 clients**
  (lucide `play`).

**Applied success + undo (`uoNwI`)** — a distinct SuccessModal, not a 5th step.

- **Hero** (`IHLU5`, `#ECFDF3`): `check-check` (`#17b26a`) tile,
  **"28 clients imported."** (24px), sub _"Live on your dashboard. 142 rules
  are now watching them. Nothing will email a client until you turn the
  matching rule on."_
- **Stats** (`Z9Uzp`): 4-cell — **28 clients** / **142 rules active** /
  **17 upcoming · 30 days** / **0 emails sent** (each with a sub line).
- **UndoBanner** (`tw9Ix`, `#FFFBEB`): `undo-2` (`#b9501a`),
  **"Roll back this import within 24 hours, no questions asked"**, sub
  _"Batch #BAT-2026-0607-001 · countdown: 23h 58m · single-client undo also
  available from any client page"_, **Revert batch** button (`undo-2`).
- **WhatNext** (`qI6Yc`): eyebrow **"WHAT TO DO NEXT"** + 3 action rows
  (Review 2 jurisdictions / Customise reminder templates / Browse your first
  deadlines), each icon tile + title + sub + `arrow-right`.
- Footer: **View audit log entry** (`scroll-text`) / **Import another file** /
  **Open dashboard** (`arrow-right`).

### Current code (file:line)

- `Step4Preview.tsx:46-100+`. h2 **"Ready to import"** + **"You're about to
  create:"** then a `<ul>` of `PlayIcon` rows (# clients / # deadlines to
  monitor / skipped / historical / rolled-forward) — NOT the 3-cell hero metric
  grid.
- **Duplicates**: `conflicts` block (`Step4Preview.tsx:172-225`) with **Skip
  duplicates** / **Import as new** rendered as two `Button`s (default/outline),
  impact line "Duplicates won't be imported." / "…created as new clients."
  Strings match design; control shape = button pair, design = segmented pill.
- **Rule review**: `ruleReviewWarnings` → state summaries
  (`Step4Preview.tsx:36-41`), surfaced as an `Alert` with a Review-rules action
  (route `reviewRules` in `migration.new.tsx:40-48`). Matches design intent.
- **Before-you-import safety**: `ShieldCheckIcon` reassurance block exists
  lower in `Step4Preview.tsx` (undo/audit/no-emails) — verify all three lines.
- **Apply CTA**: lives in the WizardShell footer (`Wizard.tsx:574-577` label
  "Import & Generate"; design = "Import 28 clients" with `play`).
- **Applied success**: **NOT a modal.** On apply success the code fires a
  `toast.success` with an **"Undo import"** action
  (`Wizard.tsx:489-500`), shows a transient `LiveGenesisOverlay` count pulse
  (`Wizard.tsx:799-834`), then navigates to `/` after ~1.2s
  (`Wizard.tsx:514-523`). Undo runs through an `AlertDialog`
  ("Undo this import?", `Wizard.tsx:761-793`) + `revertMutation`.

### Divergences

1. **Hero**: design = bordered 3-cell metric grid + "READY TO IMPORT" eyebrow +
   gray body; code = plain `<ul>` of icon rows. Restyle to metric cells (reuse
   `SummaryMetric.tsx`).
2. **Duplicate control**: button pair vs segmented pill — cosmetic.
3. **Apply CTA label/icon**: "Import & Generate" vs "Import 28 clients" + `play`.
4. **Success state — biggest gap**: design specifies a full **SuccessModal**
   (hero + 4 stats + undo banner with live countdown + WhatNext + footer); code
   replaces it with toast + genesis-overlay + redirect to `/`. The undo
   _capability_ exists (toast action → AlertDialog → revert) but the rich
   success surface, the 24h countdown banner, the WhatNext actions, "View audit
   log entry", and "Import another file" do **not** exist.
5. **Stats source**: success stats (rules active, upcoming-30-days, emails sent)
   are richer than the current `result.clientCount/obligationCount` — needs
   additional data from `apply` result / dashboard.

### Error/success state status

- **Dry-run preview: IMPLEMENTED** (counts, conflicts, rule-review, safety) —
  needs restyle to the hero metric grid + segmented dup control.
- **Applied success + undo: PARTIAL.** Undo mechanism implemented (toast +
  AlertDialog + revert); the **SuccessModal surface itself is not built** — it's
  currently a toast + overlay + redirect. This is the main net-new build for
  Step 4.

### Reuse plan

- Reuse **`SummaryMetric.tsx`** for the hero 3-cell grid and the success 4-stat
  grid.
- Reuse `Button` for the dup control (or a small segmented control if added) —
  strings already match.
- Reuse `Alert` (warning) for the rule-review card; keep `reviewRules` route.
- For **applied success**: build a new `WizardSuccess` panel (reuse
  `SummaryMetric`, `Alert` for the undo banner, list rows for WhatNext). Wire
  the existing `revertMutation` + `AlertDialog` to the in-modal "Revert batch"
  button. Keep `LiveGenesisOverlay` as the brief pulse, then show the success
  panel instead of auto-redirecting. Add a live 24h countdown component.
- **New shared component candidates**: `WizardSuccess` (success surface),
  `Countdown` (24h undo timer), segmented control (if not already in `@ui`).

---

## Summary of error/success-state coverage

| State                     | Frame   | In code?                                                                                             |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| S1 file rejected          | `Ni54l` | **No** — only generic parse-error Alert; missing-columns panel + "Use Generic CSV" recovery to build |
| S2 AI failed              | `C1rGt` | **Yes** — fallback alerts + manual map + Re-run; align copy + unset-dropdown styling                 |
| S3 AI failed              | `tGcB0` | **Partial** — generic errorBanner Alert; categorized per-card needs-input + inline Re-run to build   |
| S4 applied success + undo | `uoNwI` | **Partial** — undo via toast+AlertDialog+revert works; full SuccessModal surface to build            |

## Files touched for replication

- `apps/app/src/features/migration/Stepper.tsx` — restyle to pill stepper.
- `apps/app/src/features/migration/WizardShell.tsx` — header "Import history",
  footer composition, per-step CTA labels.
- `apps/app/src/features/migration/Step1Intake.tsx` — resume banner, preset
  chips (+Canopy/IIF/Generic), UnlockCard, missing-columns reject panel.
- `apps/app/src/features/migration/Step2Mapping.tsx` — table vs banner decision,
  count chips, % confidence pills, align failed-state copy.
- `apps/app/src/features/migration/Step3Normalize.tsx` — count chips, switch
  toggle + Edit-defaults, per-category needs-input cards, inline Re-run.
- `apps/app/src/features/migration/Step4Preview.tsx` — hero metric grid,
  segmented dup control.
- `apps/app/src/features/migration/Wizard.tsx` — `handleStep3Rerun`, per-step
  `continueLabel`, replace toast/redirect success with `WizardSuccess` surface.
- `apps/app/src/features/migration/SummaryMetric.tsx` — reuse for hero/stats.
- New: `WizardSuccess` (+ `Countdown`), missing-columns panel, UnlockCard.
- Tests to update on copy/label change: `Wizard.test.tsx`, `Step2Mapping.test.tsx`,
  `Step3Normalize.test.tsx`, `Step4Preview.test.tsx`.

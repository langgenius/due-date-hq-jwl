# Eighty-seventh pass — Tidy 4b/N: dedup remaining 6 name collisions

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d`

## What this pass does

Closes out the same-name-function audit. Pass 4a resolved `EmptyState`
(3×) and `KbdHint` (2×). This commit walks through the remaining six
collisions, classifying each as either a **real duplicate** (extract
to a shared module) or a **name collision on different concepts**
(rename the non-canonical one to surface what it actually is).

Result: re-running the audit afterwards returns **zero collisions**:

```
$ grep -rhnE "^(export )?function [A-Z][A-Za-z0-9_]*\b" apps/app/src \
    --include='*.ts' --include='*.tsx' \
    | sed -E 's/^[0-9]+:(export )?function ([A-Z][A-Za-z0-9_]*).*/\2/' \
    | sort | uniq -c | sort -rn | awk '$1 > 1'
(no output)
```

## Per-pair decisions

### 1. `SummaryMetric` × 2 — **real duplicate → extract**

`migration/Step2Mapping.tsx` and `migration/Step3Normalize.tsx` had
**byte-identical** copies of the same component (uppercase kicker
label + bold metric value tile, used at the top of both wizard
steps). Extracted to:

**New file: `apps/app/src/features/migration/SummaryMetric.tsx`**

Both step files now import it. Side-effect: dropped the now-unused
`type ReactNode` import in `Step3Normalize.tsx`.

### 2. `SectionLabel` × 2 — **name collision** → rename drawer's local

- `rules-console-primitives.tsx` (canonical, exported): `<p>` with
  `text-xs uppercase tracking text-text-tertiary` — a small kicker.
- `rules/rule-detail-drawer.tsx` (local): `<h4>` with `text-sm
font-semibold text-text-primary` — a regular section heading.

Same name, different DOM element AND different visual treatment.
Renamed the drawer's local function from `SectionLabel` →
**`RuleSectionHeading`** (14 references in one file). All 14 sites
follow the same `<RuleSectionHeading>…</RuleSectionHeading>` shape.

### 3. `SectionHeader` × 2 — **name collision** → rename both for clarity

- `dashboard/actions-list.tsx`: `{ count, onOpenAll }` — the "Actions
  this week" panel header with an attached View-all link.
- `members/members-page.tsx`: `{ title, count, note, action? }` —
  generic section divider used by the Members page for "Active
  members" + "Pending invitations" sections.

Same name, completely different prop shapes and roles. Renamed:

- dashboard → **`ActionsListHeader`** (3 call sites)
- members → **`MembersSectionHeader`** (2 call sites)

### 4. `MetadataRow` × 2 — **name collision** → rename both

- `calendar/calendar-page.tsx`: row-style `flex justify-between`
  with monospaced value on the right. Used for ICS integration
  metadata (token, URL, last sync).
- `audit/audit-event-drawer.tsx`: stacked `<dt>/<dd>` with uppercase
  kicker label. Used for audit event fields (Practice time, Actor,
  Entity, IP hash, etc.) — 9 usages.

Different DOM structure, different presentation. Renamed:

- calendar → **`IntegrationKeyValueRow`** (3 call sites)
- audit → **`AuditEventField`** (9 call sites)

### 5. `EvidenceCard` × 2 — **name collision** → rename rule-drawer's

- `evidence/EvidenceDrawerProvider.tsx`: takes `EvidencePublic` (the
  generic evidence shape) and renders the canonical evidence card
  used in the evidence drawer.
- `rules/rule-detail-drawer.tsx`: takes `RuleEvidence` (a different
  contract type) and renders a clickable card with source link
  styling tailored to the rule-detail drawer.

Different prop types → different components. Renamed the rule-drawer
copy to **`RuleEvidenceCard`** (3 call sites) to surface that it's
rule-specific. The evidence-drawer copy keeps the canonical name.

### 6. `ConfidenceBadge` × 2 — **name collision** → rename migration's

- `evidence/EvidenceDrawerProvider.tsx`: takes `confidence: number |
null` and returns the canonical `<Badge>` component with i18n
  labels ("Recorded", "Confirmed", etc.).
- `migration/Step2Mapping.tsx`: takes `{ tier, confidence }` and
  renders a single-letter tier glyph (H / M / L) in a styled `<span>`.

Wildly different output: Lingui-translated badge vs single-letter
tier glyph. The evidence one is the canonical "AI confidence"
indicator; the migration one is specifically the CSV-column mapping
confidence tier. Renamed the migration copy to
**`MappingConfidenceTier`** (2 call sites).

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

No UI/UX changes — every rename is a pure identifier-rename inside
the file that defines the function plus the file's own call sites.
No prop signatures changed. No render output changed. No Lingui
macros moved across scopes.

## Files touched

- New: `apps/app/src/features/migration/SummaryMetric.tsx`
- Modified: `apps/app/src/features/migration/Step2Mapping.tsx` (drop
  local, import shared, also dedup rename for ConfidenceBadge)
- Modified: `apps/app/src/features/migration/Step3Normalize.tsx`
  (drop local, import shared, drop unused ReactNode type import)
- Modified: `apps/app/src/features/rules/rule-detail-drawer.tsx`
  (rename SectionLabel→RuleSectionHeading + EvidenceCard→RuleEvidenceCard)
- Modified: `apps/app/src/features/dashboard/actions-list.tsx`
  (rename SectionHeader→ActionsListHeader)
- Modified: `apps/app/src/features/members/members-page.tsx`
  (rename SectionHeader→MembersSectionHeader)
- Modified: `apps/app/src/features/calendar/calendar-page.tsx`
  (rename MetadataRow→IntegrationKeyValueRow)
- Modified: `apps/app/src/features/audit/audit-event-drawer.tsx`
  (rename MetadataRow→AuditEventField)
- New: `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-4b-dedup-remaining-six.md`

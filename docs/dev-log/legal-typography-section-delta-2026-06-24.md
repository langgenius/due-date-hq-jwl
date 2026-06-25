# Legal typography — § Citation + Δ DeltaMark + Notes icon canon

**Date:** 2026-06-24
**Files:**

- `apps/app/src/components/primitives/legal-typography.tsx` (new)
- `apps/app/src/features/audit/audit-log-table.tsx`
- `apps/app/src/features/obligations/timeline.tsx`
- `apps/app/src/features/alerts/components/AlertCard.tsx`
- `apps/app/src/features/alerts/components/AlertTeamNotes.tsx`
- `docs/Design/icon-vocabulary.md`

## Why

Yuqi's brand brainstorm landed on three semantic marks the product was already living next to but had never made into typography:

- **§** — the section sign every CPA reads in IRC / Treas. Reg. citations
- **¶** — the pilcrow paragraph reference paired with §
- **Δ** — the change/diff convention used in regulatory amendment documents

These read more honestly as **typographic glyphs** than as SVG icons. Seed data already carries them (penalty breakdown labels use `§6651(a)(1)`, one Pulse alert carries `authorityRefs: ["IRC 6511"]` in `structuredChange`), but the UI rendered them as plain text. Surfacing them in canonical typography turns "we activate near tax law" into a felt detail.

Companion fix in the same pass: the `MessageSquareIcon` ↔ "internal discussion / notes" association was canonical in `AlertDetailDrawer.tsx` but absent from `AlertTeamNotes.tsx`, where the section was the most direct example of the concept.

## What changed

### 1) New primitive — `apps/app/src/components/primitives/legal-typography.tsx`

Three exports:

- **`<Citation>`** — typographic chrome for a legal reference (`§ 199A`, `§ 6651(a)(2)`, `IRC § 6511`). Renders inline as `font-mono text-[0.92em] font-medium tabular-nums text-text-secondary` so adjacent citations align and read as "this is a real statutory pointer". One notch under body color — a typographic mark, not a colored chip.
- **`<DeltaMark>`** — the Δ glyph as a row prefix for any change event (amendments, status transitions, version bumps). `aria-hidden` because the surrounding event copy already names the change in prose. Stays `text-tertiary` so Δ reads as a margin mark, not a foreground value. Never combined with a separate "change" icon — that would double-encode.
- **`highlightCitations(text)`** — parse a free-text string and wrap inline `§ XXXX` / `¶ N` matches in `<Citation>` chrome. Non-matching text passes through verbatim. Zero-cost early-return on the common case (no `§`/`¶` in the input).

Regex: `/[§¶]\s?[0-9][0-9A-Za-z().\-]*/g` — conservative on purpose. § literal + immediate digit anchor catches the realistic shapes (`§6651(a)(1)`, `§ 6511`, `§ 1.199A-1(b)(14)`, `§ 199A`, `¶ 14`) without grabbing "Section" the everyday word.

Verified live in browser:

```js
'Late filing — §6651(a)(1)'        → ['§6651(a)(1)']
'IRC § 6511'                       → ['§ 6511']
'Treas. Reg. § 1.199A-1(b)(14)'    → ['§ 1.199A-1(b)(14)']
'§ 199A · ¶ 14'                    → ['§ 199A', '¶ 14']
'Plain text no citation here'      → null  (early return, no work)
```

### 2) Δ on audit log — `audit-log-table.tsx`

The amendment / revert / unfile row gets a leading Δ via `<DeltaMark />`. The category icon tile (PenLineIcon for amendments) already signals the kind; Δ adds the semantic mark at the prose level so the row reads as "Δ <what changed>" at scan speed:

```tsx
{
  type === 'amendment' ? <DeltaMark className="mr-1" /> : null
}
{
  highlightCitations(changeHeadline) || `${actionLabel} · ${entityDisplay.primary}`
}
```

Meta-chip reason text (line ~306) also runs through `highlightCitations` — reason strings routinely carry `§ 6651`-style citations (penalty justification, extension reason).

### 3) Δ on obligation timeline — `obligations/timeline.tsx`

Every event inside a `MilestoneNode` IS a status transition, so each row earns a leading Δ + reason text running through `highlightCitations`:

```tsx
<p className="mt-1 text-sm text-text-primary">
  <DeltaMark className="mr-1" />
  {highlightCitations(event.reason)}
</p>
```

The `OtherActivity` section's reason text also runs through `highlightCitations` for consistency.

**Verified live** at `/deadlines/000000000005/audit` — the In-review milestone now renders "Δ Extension filed." with the Δ typography correctly preceding the prose. Screenshot captured.

### 4) § in AlertCard summary + title — `alerts/components/AlertCard.tsx`

`alert.title` and `alert.summary` are free-text fields that occasionally carry `§ 199A`-style citations (e.g. "IRS modifies § 199A QBI deduction limits"). Both pipes through `highlightCitations` — when no `§`/`¶`, the helper returns the original string as a no-op so the common path stays clean.

**No new `Statute` field added** — the `PulseAlertPublic` contract has no statute / code-section column and adding a 4th facts-grid column would have been fiction.

### 5) MessageSquareIcon canon on `AlertTeamNotes.tsx`

Added `<MessageSquareIcon className="size-3.5 text-text-tertiary" aria-hidden />` to the Team notes section header so the icon → "internal discussion" association is consistent wherever notes appear (the same icon was already used in `AlertDetailDrawer.tsx` line 18 + 2862 + `notification-preferences-page.tsx`).

**Considered but rejected:** per-alert-card note-count badge on `AlertCard.tsx`. Notes are loaded per-alert via `useAlertNotesQueryOptions(alertId)`; surfacing a count on each list card would force an N+1 fan-out. The list page batches `affectedClients` via a single `getDetailsBatch` call — there's no equivalent batch for notes. Deferred to drawer.

**Verified live** in alert detail — `MessageSquareIcon` confirmed present in Team notes header (DOM query: `svg.lucide-message-square` inside the `Team notes` parent). Screenshot captured.

### 6) Doc canon — `docs/Design/icon-vocabulary.md`

Added two rows to the canonical concept → glyph table:

- `Internal notes / discussion` → `MessageSquareIcon`
- `Attachments / evidence` → `PaperclipIcon`

And a new **"Semantic characters (typography, not icons)"** section that codifies `§` · `¶` · `Δ` as text characters rendered through `<Citation>` / `<DeltaMark>` (not SVG icons). Includes the call-site guidance: `Δ` is never combined with a separate "change" icon, and `highlightCitations` is the canonical way to surface inline citations in free text.

## Rejected paths (no-fiction)

The original surface list from the design conversation included three slots that would have required fabricated data:

- **Statute column on AlertCard facts grid** — `PulseAlertPublic` has no `statute` field. A 4th column would render `—` for 90% of alerts.
- **"Regulatory basis" section on rule detail drawer** — `RuleEvidence` carries an `authorityRole` enum (basis/cross_check/watch/early_warning) but no structured statute citation. The § references live inside `evidence.summary` / `evidence.sourceExcerpt` free text and are already highlighted there via the same `highlightCitations` path.
- **Authority ref column on sources tab** — `RuleSource` has no authority citation field at all.

All three are now surfaced opportunistically — wherever `§ XXXX` appears in real free text (summaries, audit reasons, evidence excerpts), the `Citation` typography renders. When the text doesn't carry one, the column doesn't pretend it does.

## How to verify

```
# Δ on timeline status events
/deadlines/000000000005/audit
# → In-review milestone shows "Δ Extension filed."

# MessageSquareIcon on Team notes
/alerts → click first alert → scroll to Team notes section
# → MessageSquareIcon precedes "Team notes" label

# § auto-highlighting
# any audit reason / alert title containing "§ 6651" or similar
# renders the citation in mono-tabular text-secondary

# Doc canon
docs/Design/icon-vocabulary.md
# → "Internal notes" + "Attachments" rows
# → "Semantic characters (typography, not icons)" section
```

## Anchors

- The three semantic marks (§ ¶ Δ) are **characters in the typeface**, not icons. Future change events should use `<DeltaMark />` not a new `ChangeIcon`. Future statutory citations should use `<Citation>` not a `<Badge>`.
- The notes canon is now bi-directional: `MessageSquareIcon` is the discussion glyph everywhere notes/threads appear. `PaperclipIcon` is reserved for evidence files.

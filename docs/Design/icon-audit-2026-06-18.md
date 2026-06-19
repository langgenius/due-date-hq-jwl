# Icon audit

> Consistency / redundancy / semantic-fit / a11y review of the app's icon
> vocabulary. _2026-06-18._ Inventory snapshot: **202 lucide imports → 177 unique
> glyphs** across `apps/app/src` + `packages/ui/src` (see the `/icons` gallery).
> Icons are the app's one icon library (lucide `1.16.0`); bespoke marks
> (`StatusRing`, brand bars, `StateBadge` seals) are out of scope.

## Resolution (2026-06-18, same day)

- **#1 rename-twins — DONE.** Codemod merged every twin to one canonical name:
  `AlertCircle*`/`CircleAlert*` → `CircleAlertIcon`; `AlertTriangle*` →
  `TriangleAlertIcon`; `CheckCircle2*`/`CircleCheck` → `CircleCheckIcon`;
  `MoreHorizontal*`/`Ellipsis` → `EllipsisIcon`. Verified pixel-identical via
  lucide's export map before running. Pixel count unchanged.
- **#3 AI marker — DONE (Yuqi: Sparkles).** `Astroid*` + `WandSparkles*` →
  `SparklesIcon`. The unique-glyph count dropped 177 → **171**; `/icons` reflects
  it (no Astroid / WandSparkles / AlertCircle; SparklesIcon present).
- **#2 `X`/`XIcon` naming — DONE.** The risk was overstated: the precise
  bare-import set was 14 mostly-icon-specific compounds (`Check`/`Circle`/`Clock`
  turned out to be 0 files; `Plus` 1, verified collision-free). Codemod suffixed
  them all (`Plus`→`PlusIcon`, `Loader2`→`Loader2Icon`, `Building2`→`Building2Icon`,
  …); `Crown` done targeted to preserve its explanatory comments.
- **#4 edit glyph — DONE.** `Edit3Icon` → `PencilIcon` (the only real feature
  usage was reminders; Pencil/PenLine otherwise appeared only in galleries).
- **#5 concept sprawl — DONE.** `Clock3Icon` → `ClockIcon` (one clock glyph); and
  added `icon-vocabulary.md` — the canonical concept→glyph table (icon analogue of
  §4.11) to stop future synonym drift.
- **#6 icon-button a11y — VERIFIED CLEAN.** A focused audit found **zero** genuine
  violations: every icon-only control already carries an accessible name
  (`aria-label` / `title` / `sr-only` / Tooltip-or-Popover wrapper). The rough ~43
  count was all false-positives (label on an adjacent line). No fixes needed.

All audit findings are now closed. Unique glyph count: 177 → **169**.

## Severity summary

| #   | Finding                                          | Class      | Severity               |
| --- | ------------------------------------------------ | ---------- | ---------------------- |
| 1   | Lucide rename-twins — same glyph under two names | redundancy | **High**               |
| 2   | `X` vs `XIcon` import-name drift (24 glyphs)     | naming     | Med                    |
| 3   | AI/auto marker drift — 3 glyphs for one concept  | semantic   | **High** (design call) |
| 4   | Action-glyph drift (edit ×3, ellipsis twin)      | semantic   | Med                    |
| 5   | Concept sprawl (alert ×7, check ×15, time ×12)   | scale      | Low–Med                |
| 6   | Icon-only buttons w/o an accessible name         | a11y       | Med (needs verify)     |

---

## 1. Lucide rename-twins — the same glyph imported under two names (High)

lucide renamed several icons and keeps both names as aliases. The app uses BOTH
names for the **same picture**, so a single concept is split across two
identifiers — a grep for "the warning icon" finds half the call sites, and the
next dev picks whichever they remember.

| Glyph (concept)  | name A (files)             | name B (files)          | canonical (lucide-current) |
| ---------------- | -------------------------- | ----------------------- | -------------------------- |
| warning circle   | `AlertCircle(Icon)` (18)   | `CircleAlertIcon` (9)   | `CircleAlert`              |
| warning triangle | `AlertTriangle(Icon)` (22) | `TriangleAlertIcon` (9) | `TriangleAlert`            |
| check in circle  | `CheckCircle2Icon` (15)    | `CircleCheckIcon` (7)   | `CircleCheck`              |
| horizontal dots  | `MoreHorizontalIcon`       | `EllipsisIcon`          | `Ellipsis`                 |

**Fix (mechanical, no visual change):** pick one name per glyph (recommend
lucide's current `CircleAlert` / `TriangleAlert` / `CircleCheck` / `Ellipsis`) and
codemod every call site. Pure find-replace — the rendered pixels are identical.
This is the single highest-value icon cleanup: ~80 files but zero risk.

## 2. `X` vs `XIcon` import-name drift (Med)

24 glyphs are imported **both** bare (`Check`, `Plus`, `Sparkles`, `Hourglass`,
`ChevronDown`…) and `Icon`-suffixed (`CheckIcon`, …) in different files. The app
leans `XIcon` (175 vs 27). Standardize on `XIcon` and codemod the 27 bare
holdouts — one convention so imports read consistently. (Folds in with #1.)

## 3. AI / auto marker drift — three glyphs for one idea (High · design call)

The "this is AI / automated" signal is rendered three ways:

- **`Astroid`** (10 files) — the AI-confidence marker (`AlertConfidencePill` uses
  it for every tier; `AlertCard`, `audit-event-drawer` provenance).
- **`Sparkles`** (5 files) — AI source (`EvidenceDrawerProvider`: `sourceType
includes 'ai' → Sparkles`), AI-boundary chip, morning sweep.
- **`WandSparkles`** (1 file) — `PulseAlertRow:731`.

`PulseAlertRow` renders **both** `WandSparkles` (731) and `Sparkles` (748). Three
glyphs for one concept is exactly the drift the status-glyph work just fixed.
**Decision needed:** pick ONE canonical AI/auto glyph. `Sparkles` is the
industry/lucide convention; `Astroid` is the most-used here but an unusual mark.
Whichever wins, the other two retire (or take a deliberately distinct meaning).

## 4. Action-glyph drift (Med)

- **edit** → `PencilIcon` + `Edit3Icon` + `PenLineIcon` (three glyphs, one
  action). Pick one (recommend `PencilIcon` or `SquarePenIcon`).
- **external / open** → `ExternalLinkIcon` + `ArrowUpRightIcon`. May be
  intentional (standalone link vs inline ↗ per the lateness/external-link canon)
  — verify the split is deliberate; if not, unify.
- **add** → `Plus(Icon)` (button affordance) + `PlusCircleIcon`. Likely fine
  (bare Plus for buttons, circle for a distinct "add row" mark) — confirm intent.

## 5. Concept sprawl (Low–Med)

177 glyphs is a large vocabulary: **7** alert/warning glyphs (circle / triangle /
octagon / shield / octagon-x), **15** check/verified glyphs, **12** calendar/time
glyphs (incl. `Clock` vs `Clock3`). Much is legitimately domain-specific
(`MailCheck`, `UserCheck`, `CalendarSearch`), but the alert + check + clock
families have real overlap. Recommend a **canonical-icon-per-concept table**
(an icon analogue of DESIGN §4.11) so new code reaches for the established glyph
instead of adding a synonym. `Clock` vs `Clock3` is a quick win (pick one).

## 6. Icon-only buttons without an accessible name (Med · needs verification)

A rough grep found ~43 `size="icon*"` Buttons with no `aria-label` on the same
line. Many are likely false-positives (label on an adjacent line, or a labeled
child), so this needs a focused pass — best run through the `/audit` (a11y)
skill rather than estimated here. Flagging the dimension, not the count.

## 7. `Astroid` provenance note

`Astroid` is an unusual export (not in standard public lucide; valid in this
`1.16.0` build, renders a 4-point star/diamond). It's the de-facto house
AI-confidence mark today. If it stays (per #3), document it as the canonical AI
glyph so it doesn't read as a typo to the next contributor.

---

## Recommended sequence

1. **Mechanical, zero-risk (do first):** consolidate the rename-twins (#1) +
   the `X`/`XIcon` drift (#2) in one codemod — identical pixels, ~80 files,
   `tsgo` guards it. Refresh `/icons` after.
2. **Design call (steer):** the AI marker (#3) — pick the canonical glyph, then
   migrate. Same for the edit glyph (#4).
3. **Stop future sprawl:** add the canonical-icon-per-concept table to the design
   docs (#5); quick-win `Clock3`→`Clock`.
4. **Separate a11y pass (#6)** via `/audit`.

Nothing here changes how the product looks today (the twins are pixel-identical);
the value is consistency + a smaller, governed vocabulary.

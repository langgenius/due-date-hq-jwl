# Icon vocabulary

> The canonical glyph for each recurring concept. Reach for the listed icon;
> don't add a synonym. The full inventory of what's actually used lives in the
> `/icons` gallery; this table is the **governance layer** — the icon analogue of
> DESIGN §4.11. Established 2026-06-18 after the icon audit + consolidation.
> Library: lucide (`1.16.0`). Import the `*Icon`-suffixed name.

## Rules

1. **One glyph per concept.** If a concept below has a canonical glyph, use it —
   never reach for a near-synonym (the audit found the same warning glyph imported
   under two names, three glyphs for "AI", three for "edit").
2. **`*Icon`-suffixed imports.** Import `CircleAlertIcon`, not `CircleAlert` /
   `AlertCircle`. lucide keeps deprecated aliases; we don't use them.
3. **Color/size from the canon, not the glyph.** Status tone comes from
   `STATUS_ICON_COLOR`; size from `icon-sizing.md` (`size-3` / `size-3.5` /
   `size-4` / `size-5`). Don't encode meaning in a new glyph when tone/size
   already carries it.
4. **Decorative icons get `aria-hidden`; icon-only controls get a name** (an
   `aria-label`, a tooltip, or an `sr-only` label). The a11y audit (2026-06-18)
   found the app already does this consistently — keep it that way.

## Canonical concept → glyph

| Concept                     | Canonical glyph                                                 | Notes / don't-use                                                                         |
| --------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Warning, attention (circle) | `CircleAlertIcon`                                               | not `AlertCircle(Icon)` (deprecated alias)                                                |
| Warning, caution (triangle) | `TriangleAlertIcon`                                             | not `AlertTriangle(Icon)`                                                                 |
| Success, done (circle)      | `CircleCheckIcon`                                               | `CircleCheckBigIcon` only when a bolder filled mark is genuinely needed                   |
| Plain check / applied       | `CheckIcon` · `CheckCheckIcon` (double = "all")                 | —                                                                                         |
| Blocked / hard stop         | `ConstructionIcon` (barrier) · `BanIcon` (prohibition)          | distinct meanings — barrier = environmental, ban = not-allowed                            |
| AI / automated              | `SparklesIcon`                                                  | not `Astroid`, not `WandSparkles` (retired 2026-06-18)                                    |
| Edit                        | `PencilIcon`                                                    | not `Edit3Icon` / `PenLineIcon`                                                           |
| Delete                      | `Trash2Icon`                                                    | —                                                                                         |
| Add / new                   | `PlusIcon`                                                      | bare button affordance; `CirclePlusIcon` only for a distinct "add row" mark               |
| Time / clock                | `ClockIcon`                                                     | not `Clock3Icon` (retired → ClockIcon)                                                    |
| Waiting (external)          | `HourglassIcon`                                                 | the obligation status mark is `StatusRing` (status-control); this is the standalone glyph |
| Overflow menu (horizontal)  | `EllipsisIcon`                                                  | not `MoreHorizontal(Icon)`                                                                |
| Overflow menu (vertical)    | `EllipsisVerticalIcon`                                          | not `MoreVertical(Icon)`                                                                  |
| External link / open out    | `ExternalLinkIcon` (standalone) · `ArrowUpRightIcon` (inline ↗) | deliberate split — see the external-link order canon                                      |
| Premium / paid tier         | `CrownIcon`                                                     | reserved for billing; not an AI/feature mark                                              |
| Loading / spinner           | `Loader2Icon` (animate-spin)                                    | —                                                                                         |
| Internal notes / discussion | `MessageSquareIcon`                                             | team threads, milestone notes — not for attachments                                       |
| Attachments / evidence      | `PaperclipIcon`                                                 | files only — text annotations go to `MessageSquareIcon`                                   |
| Obligation status           | **not a lucide glyph** — use `<StatusMark>` (`StatusRing`)      | see obligation-status-icon-vocabulary.md                                                  |

## Semantic characters (typography, not icons)

Some concepts read more honestly as **typographic glyphs** — they're characters
in the typeface, not SVG icons. Render them inline via `<Citation>` / `<DeltaMark>`
(`apps/app/src/components/primitives/legal-typography.tsx`) so the typography
register (mono · tabular-nums · text-tertiary) is consistent across surfaces.

| Concept                           | Glyph    | How                                                            |
| --------------------------------- | -------- | -------------------------------------------------------------- |
| Legal / regulation reference      | **`§`**  | `<Citation>§ 6651(a)(2)</Citation>` (parsed by `highlightCitations`) |
| Paragraph reference within a code | **`¶`**  | same chrome — `<Citation>§ 199A · ¶ 14</Citation>`             |
| Change / amendment / version bump | **`Δ`**  | `<DeltaMark />` as a row prefix                                |

`highlightCitations(text)` parses any free-text string (audit reason, alert
summary, evidence excerpt) and wraps inline `§ XXXX` / `¶ N` matches in
`<Citation>` chrome — non-matching prose passes through unchanged so the
helper is a zero-cost passthrough on the common path.

`Δ` is **never** combined with a separate "change" icon — the icon tile +
glyph would double-encode. Use Δ when the surface has no category tile, OR
when the row IS the change (amendment audit rows, status-transition timeline
events, version-history entries).

## Concept families that legitimately have several glyphs

Some breadth is correct — these are domain-specific, not drift:

- **Calendar**: `CalendarIcon` (generic), `CalendarClockIcon` (deadline),
  `CalendarDaysIcon` (month), `CalendarRangeIcon` (span), `CalendarSearchIcon`
  (lookup), `CalendarPlusIcon` (add). Pick by the specific meaning.
- **Check, qualified**: `MailCheckIcon`, `UserCheckIcon`, `ClipboardCheckIcon`,
  `ShieldCheckIcon`, `FileCheckIcon` — the noun matters; keep them.
- **Chevrons / arrows**: directional, self-evident.

If you need a concept not listed here, add the glyph AND a row to this table in the
same change — the way §4.11 governs primitives.

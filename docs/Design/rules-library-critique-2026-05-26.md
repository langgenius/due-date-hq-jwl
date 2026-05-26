# /rules/library critique — 2026-05-26

**Date:** 2026-05-26 (right after the /clients revamp pass)
**Surface:** `/rules/library` (Rule library)
**Method:** LLM design review against the canonical
(`page-family-canonical.md`) + impeccable deterministic scan +
Nielsen's 10 heuristic scoring + 3 persona walkthroughs +
side-by-side comparison with /alerts, /deadlines, /today.
**User signal:** "Rule library is looking quite coarse, undesigned,
squeezed, and raw."

---

## §1. Design Health Score

| #     | Heuristic                      | Score     | Key issue                                                                                                                                       |
| ----- | ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Visibility of system status    | 2.5       | Progress bar at top is good. But the grouped table doesn't surface which row is the focus — clicking a state row shows ALL its rules in one go. |
| 2     | Match system / real world      | 2.5       | "Filter rules…" placeholder reads ok. But "0 jurisdictions" + "Expand all" copy is technical; CPAs think in states + forms.                     |
| 3     | User control & freedom         | 2.0       | Long-page scroll. No keyboard nav across rows. No back-to-top. The Expand All / Collapse All buttons are tiny in the upper-right of the table.  |
| 4     | Consistency and standards      | 2.0       | DIVERGES from /deadlines + /alerts patterns: no table-card frame, no scope tabs at top, page-level scroll instead of independent table scroll.  |
| 5     | Error prevention               | 3.0       | New rule modal + edit flow are well-gated. Batch review modal prevents accidental bulk-accepts.                                                 |
| 6     | Recognition rather than recall | 2.5       | The 7-entity-column matrix forces visual scanning. Jurisdiction codes (AK/AL/AR/AZ…) are abbreviated; no flag icon next to each row title.      |
| 7     | Flexibility & efficiency       | 2.0       | No keyboard hotkeys. `/` search shortcut shown but no other shortcuts. Power users running 476 rules need J/K, shift+click, search-then-filter. |
| 8     | Aesthetic / minimalist         | 2.0       | The 10-column table (Rule / Form / 7 entities / Tier) + N jurisdictions + N rules creates visual density. Feels "raw" per Yuqi's word.          |
| 9     | Error recovery                 | 2.5       | Rule edit + accept-draft flows have undo. But there's no "undo last entity-filter" affordance; user re-clicks chip.                             |
| 10    | Help & documentation           | 2.0       | "Every filing deadline the practice tracks..." description is generic. No inline help on Tier badges, source-defined-calendar warnings.         |
| Total |                                | **23/40** | **Below average.** Matches Yuqi's read — page hasn't been through the same canonical pass /deadlines + /alerts got.                             |

---

## §2. Anti-patterns verdict

**LLM assessment:** The page does NOT look AI-generated, but it
looks _under-designed_. The signature problem is structure not
finish: it's been polished in fragments (progress bar, entity
chips, table headers) without anyone resolving the page-level
layout against the canonical. Looks like the page was the FIRST
draft of the family pattern and never got iterated like /deadlines

- /alerts later did.

**Deterministic scan (impeccable):** 0 findings on the source file.
No gradient text, glassmorphism, or generic AI-slop tells. Visual
issues are family-pattern divergence, not AI slop.

**Browser overlay:** Not run — dev session lost auth during the
prior structural change.

---

## §3. Side-by-side: what /alerts, /deadlines, /today do that /rules/library doesn't

| Surface                      | Outer container                           | Scroll mechanism             | Scope tabs / filters                                             | Table-card frame                                                   | Detail-panel mechanism            |
| ---------------------------- | ----------------------------------------- | ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| **/today**                   | Regular variant `gap-6` `max-w-page-wide` | Page-level                   | Daily-driver: Today / Tomorrow / This week tabs                  | No table — sectioned action-cards                                  | n/a                               |
| **/alerts**                  | Sticky-footer variant                     | Independent rows-area scroll | Filter chips + state badges + segmented status                   | Bordered alert-card per row                                        | Motion-animated 60% width panel   |
| **/deadlines**               | Sticky-footer variant                     | Independent table scroll     | Scope tabs (All / Open / Late / In review / Done) + action chips | Bordered table-card with `flex-1 min-h-0` rows + pinned pagination | Motion-animated 600px width panel |
| **/clients** (just revamped) | Sticky-footer variant                     | Independent table scroll     | FilterTrigger dropdowns + search input                           | Bordered table-card + pagination footer                            | Static 480 → 600px                |
| **/rules/library**           | Regular variant `max-w-[1440px]`          | **Page-level scroll**        | Entity-filter chips (7 chips) + free-text search                 | **No frame** — table sits directly on bg                           | n/a (modal instead)               |

**The pattern:** every other list-or-table surface in the family
runs the **sticky-footer + table-card + independent scroll**
pattern. Rule library is the holdout. It still uses the
**Regular + frameless + page-scroll** pattern.

---

## §4. Overall impression

Rule library reads as one rough draft inside an otherwise
canonical family. The bones are right — title chip, progress bar,
entity filters, grouped table — but the page LACKS:

1. A bordered table-card to make the table read as a "data
   surface" instead of "loose elements on the page."
2. The sticky-footer scroll mechanism that pins the
   PageHeader + filters above and lets only the rule grid scroll.
3. A scope-tab band like /deadlines has (e.g., All /
   Active / Needs review / Missing rules), so the user navigates by
   STATUS first, then narrows by entity.
4. A consistent row treatment per jurisdiction. The current state
   rows have many small interactive numbers crowded into a tight
   row — visually too busy.
5. Empty-state polish — "No rules and no coverage data yet" with
   no illustration, no CTA, no warmth.

The fix is **structural**, not cosmetic. Once the page sits inside
the canonical scroll mechanism + table-card, the existing
StatsBar + EntityChipRow + GroupedRulesTable will breathe.

---

## §5. What's working

1. **Title chip + count** — matches the canonical perfectly.
2. **Progress bar restored** — clear active vs needs-review split,
   reads well.
3. **EntityChipRow as filter** — chip strip is canonical, doesn't
   pretend to be data viz.
4. **Rule detail Dialog modal** — focused review surface; better
   than a sidebar drawer when reviewing a single rule deeply.
5. **Batch-review modal (dating-app card stack)** — distinctive,
   delightful, works well for the review-N-rules workflow.

---

## §6. Priority issues

### [P0] Page doesn't follow the canonical structure

- **What:** Rule library is the only list-or-table page that uses
  Regular variant + frameless table + page-level scroll. /alerts,
  /deadlines, /clients (now) use sticky-footer + table-card +
  independent scroll.
- **Why it matters:** CPAs switching between /deadlines and
  /rules/library feel two different products. The page-scroll
  mechanism means the PageHeader scrolls AWAY when the user
  reaches row 30 of 200+ rules.
- **Fix:** Adopt the canonical pattern. (1) RulesPageShell shifts to
  sticky-footer (`gap-4`, `pb-0`, `xl:h-screen
xl:overflow-hidden`). (2) Wrap the grouped table in the
  canonical bordered card: `rounded-md border border-divider-subtle
overflow-hidden flex flex-col`. (3) Rows-area `flex-1 min-h-0
overflow-y-auto` so only it scrolls.
- **Suggested command:** `/shape`

### [P0] Missing scope tabs — page can't be navigated by status

- **What:** /deadlines has scope tabs (All / Open / Late / In
  review / Done) at the top. /rules/library has only entity chips
  (which slice the same set by entity-type). No way to say "show
  me only rules that need review" without scrolling.
- **Why it matters:** CPAs landing on /rules/library mid-quarter
  want to act on the queue first. Today they have to visually scan
  the entire grid to find rules with the "Needs review" mark.
- **Fix:** Add scope tabs above the search input. Tabs map to:
  - **All** (476)
  - **Active** (20)
  - **Needs review** (456)
  - **Missing** (gaps — entity × jurisdiction combos with no rule)

  Active scope = clicking the corresponding progress bar segment.
  Reuse the `ObligationQueueScopeTab` pattern from /deadlines (or
  build a shared `ScopeTab` primitive).

- **Suggested command:** `/clarify` + `/shape`

### [P1] Squeezed-feeling row treatment

- **What:** Each state row carries: chevron + flag + 2-letter
  abbreviation + state name + rule count + 7 entity columns (each
  with count + warning icon) + needs-review tag + tier bar. That's
  ~12 elements crammed into ~48px of row height.
- **Why it matters:** Yuqi's "squeezed" / "raw" perception. Each
  element steals visual weight from the others.
- **Fix:** (1) Drop the 7-column entity matrix from the table.
  Move to a single column showing applicable entities as small
  StateBadge-style chips when expanded. (2) The "Tier" bar at the
  far right reads as a third data dimension — reconsider whether it
  belongs in the row or in the rule-detail Dialog.
- **Suggested command:** `/distill` + `/layout`

### [P1] Page description copy is generic + the actions cluster carries 4 buttons

- **What:** Description reads "Every filing deadline the practice
  tracks. Review pending rules, fill missing coverage, and add new
  ones." That's the whole page's job written out.
- **Why it matters:** Verbose. Doesn't help the CPA decide what
  to do first. Compare /deadlines' minimal description = none, or
  /alerts' "Pulse alerts the practice should know about."
- **Fix:** Either drop the description entirely (matches
  /deadlines), or shorten to a 6-word tagline ("The catalog every
  client filing comes from.").

  And the **actions cluster has 4 buttons** (Start review N /
  Sources / Export coverage / + New rule). Canonical = ≤2 outline +
  1 primary. Recommend: move Sources + Export coverage to the ⋯
  overflow.

- **Suggested command:** `/clarify` + `/quieter`

### [P2] No keyboard navigation across rows

- **What:** /deadlines has J/K to navigate rows + Enter to open.
  /rules/library has only `/` to focus search.
- **Why it matters:** Power users running 476 rules need muscle
  memory. Critical for the daily-driver workflow.
- **Fix:** Add J/K (next/prev row in current group), Enter (open
  detail), Esc (close detail), `e` (expand/collapse current
  group), `?` (show keyboard hint sheet).
- **Suggested command:** `/adapt`

### [P2] Empty state is bare

- **What:** "No rules and no coverage data yet." — 7 words on a
  blank page.
- **Why it matters:** First-timers landing here see nothing
  inviting. No CTA, no illustration, no guidance.
- **Fix:** Use the canonical empty state with an icon + title +
  description + primary CTA. Title: "Your rule catalog is empty."
  Description: "Import from the federal/state sources we maintain,
  or write your first rule." CTA: + Import from sources (primary)
  / + New rule (outline).
- **Suggested command:** `/clarify`

### [P3] "Expand all" link in upper-right reads as table chrome

- **What:** "0 jurisdictions" left + "Expand all" right of the
  table header. The "Expand all" is a tiny text link.
- **Why it matters:** Discoverable only if you know to look.
- **Fix:** Promote to a small button next to the search bar, or
  use a kbd hint `E to expand all`.
- **Suggested command:** `/clarify`

---

## §7. Persona red flags

### Alex (Power User — manages 80 clients across 3 firms)

- ✗ No J/K row navigation; can't power-scan 476 rules
- ✗ No "show me only what changed since last week" filter
- ✗ No CSV bulk-edit mode
- ✗ Sources link buried in header — Alex curates sources daily
- ✓ Batch-review modal is excellent once Alex finds it

### Jordan (First-Timer — solo CPA, week 1)

- ✗ Page-level scroll makes the page feel "infinite"
- ✗ "Filter rules…" placeholder doesn't say WHAT to type
- ✗ Tier column is unexplained — what's tier-A vs tier-B?
- ✗ No scope tabs → can't filter to "things I should look at first"
- ✓ Rule detail Dialog modal is approachable

### Casey (Manager — reviews team's work)

- ✗ No "rules added by team this week" filter
- ✗ No timestamp on rule rows ("last reviewed 2026-05-22 by Avery")
- ✓ Audit log on individual rule's detail Dialog is good
- ✓ Sources link surfaces the policy-of-truth

---

## §8. Recommended action plan

In priority order:

1. **`/shape`** — Adopt sticky-footer outer + table-card frame +
   independent rows-area scroll. **The structural P0.** Same
   approach as /clients revamp. ~3 hour pass.
2. **`/shape` + `/clarify`** — Add scope tabs (All / Active /
   Needs review / Missing) above search. Reuse the
   `ObligationQueueScopeTab` style from /deadlines or build a
   shared `ScopeTab` primitive. ~1 hour.
3. **`/distill`** — Drop the 7-column entity matrix from the
   table. Move applicable entities to the rule-detail Dialog. The
   table becomes Form / Jurisdiction / Status / Tier / chevron. ~2
   hours.
4. **`/quieter`** — Move Sources + Export coverage to ⋯ overflow.
   Drop or shorten the page description. ~30 min.
5. **`/adapt`** — Wire J/K row nav + Enter to open + Esc to close
   - `e` for expand-all. ~1 hour.
6. **`/clarify`** — Empty state with icon + title + CTA. ~30 min.
7. **`/polish`** — Final pass after the above.

Estimate: **~8 hours** to get Rule library to /deadlines-grade
polish.

Re-run `/critique` after the structural pass — target ≥32/40.

---

## §9. Related docs

- `page-family-canonical.md` — the rubric. §2 outer container,
  §3 PageHeader, §6 table-card frame, §7 FloatingActionBar.
- `clients-detail-critique-2026-05-26-post-revamp.md` — sibling
  critique that informed this scoring methodology.
- `clients-family-macro-micro-audit-2026-05-26.md` — the
  /clients pass that was just shipped. Rule library is the next
  surface to receive the same treatment.
- `inset-surface-design-system.md` — card chrome tokens.

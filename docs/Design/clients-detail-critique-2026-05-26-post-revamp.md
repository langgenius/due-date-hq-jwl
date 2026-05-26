# /clients/[id] critique — post-revamp pass

**Date:** 2026-05-26 (after Bucket C Rounds A+B landed)
**Surface:** `/clients/[id]` (Client Detail page)
**Method:** LLM design review against the canonical
(`page-family-canonical.md`) + impeccable deterministic scan +
Nielsen's 10 heuristic scoring + 3 persona walkthroughs.
**Pre-revamp baseline:** 23/40 (from `clients-family-critique-2026-05-26.md`).

---

## §1. Design Health Score

| #     | Heuristic                      | Score       | Key issue                                                                                                                                                             |
| ----- | ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Visibility of system status    | 3.0         | Readiness chip surfaces "needs facts" inline. Tab counts on Pulse/Activity could be surfaced — Client info has a single dot, no count.                                |
| 2     | Match system / real world      | 3.5         | Tab labels (Work / Client info / Discover / Activity) read in CPA-natural language. "Discover" still slightly abstract — surfaces forms, not opportunities.           |
| 3     | User control and freedom       | 2.5         | Cmd+K is missing. Cycle-arrows on `ClientTitleSwitcher` aren't visibly discoverable. Back-link is a small eyebrow.                                                    |
| 4     | Consistency and standards      | 3.0         | Section frame tokens DIVERGE inside tabs (Work: `bg-soft rounded-xl border-subtle`; Client info / Discover: `bg-default rounded-md border-regular`). Should pick one. |
| 5     | Error prevention               | 3.0         | Archive moved to ⋯ overflow ✓; destructive action no longer adjacent to + Create obligation. Filing-state Add badge tone now warning (was destructive) ✓.             |
| 6     | Recognition rather than recall | 3.5         | ContactMetaRow surfaces entity + owner + states + contacts in one row — strong recognition.                                                                           |
| 7     | Flexibility & efficiency       | 2.5         | No keyboard shortcuts on the detail page itself (J/K cycle still hidden in `ClientTitleSwitcher` arrows). No "Save & Next" pattern when editing client facts.         |
| 8     | Aesthetic / minimalist         | 3.5         | Title cluster reduced from 4–5 chips to 1 readiness chip ✓. Identity moved to ContactMetaRow. Major win vs pre-revamp.                                                |
| 9     | Error recovery                 | 2.5         | Mutation errors surface via toast with retry guidance. No undo on Archive action — modal confirmation is the only safety.                                             |
| 10    | Help & documentation           | 2.0         | No inline help on what "Compliance posture" means. The TabSection summary line is the only context.                                                                   |
| Total |                                | **29.5/40** | **Strong** — up from 23/40 baseline. Remaining issues are mostly consistency + flexibility, not foundational.                                                         |

---

## §2. Anti-patterns verdict

**LLM assessment:** The page does NOT look AI-generated post-revamp.
The hero pattern is unique (title + 1 conditional warning chip,
metadata row underneath), the tab labels read in CPA language, and
the action cluster avoids the typical "3 primary buttons in a row"
AI tell.

**Deterministic scan (impeccable):** 0 findings across both source
files. No gradient text, no glassmorphism, no hero-metric layout,
no generic font stack, no color palette tells.

**Browser overlays:** Not run — preview-server gap (this worktree
has no dev server, the 4 running belong to siblings).

---

## §3. Overall impression

The revamp delivered a significantly cleaner hero pattern. Pre-
revamp, the H1 carried 4–5 chips + a destructive Archive button
next to the primary CTA; the eye couldn't tell what mattered first.
Post-revamp, the H1 is title + (optional) 1 warning chip + 2-action
cluster, and the identity facts flow naturally into the
ContactMetaRow below.

The remaining work is **inside the tabs**. Section frames don't
share a vocabulary across the 4 tabs (Work uses one frame style,
Client info / Discover use another, Activity is mixed). The single
biggest opportunity left: pick one section frame and apply across
all 4 tab bodies. After that, the page will read as one surface
instead of four design dialects stitched together.

---

## §4. What's working

1. **Title cluster reduction is decisive.** Title + (conditional)
   readiness chip + 2-action cluster. The page identifies itself in
   one scan. Matches the canonical PageHeader shape.
2. **ContactMetaRow as identity surface.** Entity + owner + states +
   email + phone in one wrap row at body width. Carries the same
   data the title used to overload, but in the right semantic slot
   (metadata under header).
3. **Archive in ⋯ overflow.** Destructive action no longer competes
   with the primary CTA. The visible cluster is now ⋯ + outline
   Create-obligation, which canonically reads as "secondary +
   primary".

---

## §5. Priority issues

### [P1] Tab section-frame inconsistency

- **What:** Inside the 4 tabs, section frames diverge:
  - Work tab: `bg-background-soft rounded-xl border-divider-subtle`
  - Client info: `bg-background-default rounded-md border-divider-regular p-4`
  - Discover: `bg-background-default rounded-md border-divider-regular p-4`
  - Activity: mixed
- **Why it matters:** Two visual dialects inside one page reads as
  two design generations. CPAs who land on Work then click Client
  info feel the texture shift before they read the content.
- **Fix:** Pick one frame token and apply across all tab bodies.
  Recommend Client info's `bg-default rounded-md border-regular`
  (matches the canonical inset-surface design system).
- **Suggested command:** `/shape`

### [P1] "Discover" tab label is abstract

- **What:** Tab label "Discover" doesn't tell the CPA what's there.
  The tab actually shows "Suggested forms" and "Opportunity
  matches" — both are forms-the-system-found.
- **Why it matters:** CPAs scan tabs left-to-right; an opaque label
  is friction. Match the macro→micro audit's recommendation to
  rename to "Opportunities".
- **Fix:** Tab label `Discover` → `Opportunities`. Already in the
  prior critique queue; should be re-confirmed before code.
- **Suggested command:** `/clarify`

### [P2] No global keyboard shortcuts on detail page

- **What:** `ClientTitleSwitcher` has J/K bound but hidden in cycle-
  arrows. Cmd+K isn't routed to the detail page's per-client search
  surface. Tab keys (1-4) don't switch tabs.
- **Why it matters:** Power-user CPAs running 50+ clients/day need
  the muscle memory.
- **Fix:** Surface a "?" footer toast with the available keys (J/K
  next client, 1-4 switch tabs, Cmd+K opens command palette).
- **Suggested command:** `/adapt`

### [P2] Onboarding state visibility

- **What:** When `readiness.missingRequiredFacts.length > 0`, the
  "Onboarding state" TabSection summary surfaces the count but the
  tab itself only renders a small `BadgeStatusDot` (no count).
- **Why it matters:** A new CPA can't tell from the tab bar where
  the work-needed signal lives. The summary on the section header
  is too far down.
- **Fix:** Replace the dot on the Client info tab with a `count`
  bubble carrying the missing-fact count.
- **Suggested command:** `/clarify`

### [P3] Cycle-arrows on title remain hover-only

- **What:** Per-client cycle arrows on `ClientTitleSwitcher` only
  appear on hover.
- **Why it matters:** Discoverable only by accident. Critique flagged
  this pre-revamp; deferred during the macro audit (§3.2).
- **Fix:** Either (a) always-visible chevrons next to the title or
  (b) hide entirely and route prev/next through Cmd+K.
- **Suggested command:** `/clarify`

---

## §6. Persona red flags

### Alex (Power User — manages 80 clients across 3 firms)

- ✗ No keyboard shortcut hint anywhere on the detail page.
- ✗ Cycle-arrows are hover-only — Alex doesn't know j/k works.
- ✗ Cmd+K not routed to client search.
- ✓ Tab structure stable + URL-bound — deep-linking works.

### Jordan (First-Timer — solo CPA, week 1 on the product)

- ✗ "Discover" tab label is opaque; Jordan can't tell what's there
  without clicking.
- ✗ "Compliance posture" is jargon — no inline tooltip.
- ✓ Readiness warning chip in the H1 tells Jordan exactly what
  needs attention.
- ✓ ContactMetaRow tells Jordan "this is a Trust client, owned by
  Sarah, files in CA + NY" in one scan.

### Casey (Manager — reviews team's client work, doesn't edit)

- ✗ No read-only mode signal — Casey doesn't know which sections
  are editable until clicking into them.
- ✓ Activity tab + audit log are easy to find.
- ✓ Pulse alerts banner above the tabs surfaces global state.

---

## §7. Minor observations

- **TableHeader bg on per-tab tables** — Client info renders 3
  panels that each have their own internal table. Each table's
  header bg is `--background-default-dimmed` per canonical, but the
  `bg-default rounded-md border-regular` frame around each makes
  them feel like 3 isolated cards rather than 3 sections of one
  page. (Reinforces P1 finding.)
- **PageHeader eyebrow** — back-link "← Clients" sits as the
  eyebrow. Matches breadcrumb pattern. The chevron + label could
  be a hair larger (currently `text-xs`); not a P-class.
- **`Filing jurisdictions` TabSection** — `id="client-filing-
jurisdictions"` + `scroll-mt-20` suggests there's a deeplink
  target somewhere. Worth surfacing the anchor in the
  ClientFactChecklist so the user can jump back from a fact to
  the jurisdiction they need.

---

## §8. Questions to consider

1. **Should "Discover" be "Opportunities"?** Critique flagged this
   pre-revamp. The macro audit deferred for a future round. Worth
   a 1-line decision now.

2. **Section-frame token: rounded-xl `bg-soft` (Work) or
   rounded-md `bg-default` (everywhere else)?** Both are canonical
   tokens; pick the one that matches what the rest of the product
   uses most. The /deadlines drawer's TabSection uses rounded-md
   bg-default — that's the larger-deployment vocabulary.

3. **Cycle-arrows on title — keep, always-visible, or retire?**
   Three options; pick one and we move forward.

4. **Tab badge for Client info — dot or count?** If you have
   missing facts you really want to surface the NUMBER, switch from
   `BadgeStatusDot` to a small count badge.

---

## §9. Recommended action plan

In priority order:

1. **`/shape`**: Unify section-frame token across all 4 tab bodies
   (P1 above). Single largest visual-coherence win remaining.
2. **`/clarify`**: Tab label "Discover" → "Opportunities"; Client
   info tab dot → count badge if missing facts; cycle-arrows visible
   chevrons (or retire). (Three small copy + signal fixes.)
3. **`/adapt`**: Keyboard shortcut overlay — j/k for prev/next,
   1-4 for tab switching, Cmd+K to open client search.
4. **`/polish`**: Final pass after the above.

Re-run `/critique` after these to see the score climb to ≥ 33/40.

---

## §10. Related docs

- `clients-family-critique-2026-05-26.md` — pre-revamp critique
  (baseline 23/40).
- `clients-family-macro-micro-audit-2026-05-26.md` — macro→micro
  consistency audit. Section §3.5 "Tab body section-frame
  inconsistency" maps directly to P1 here.
- `page-family-canonical.md` — the rubric. §3 PageHeader, §9
  section heading scale, §10 color reservation.
- `inset-surface-design-system.md` — frame-token reference for the
  P1 fix.

# Design brief: Dashboard "Actions this week" + Obligations differentiation

> Produced by `/shape` on 2026-05-19, following a `/critique` of the
> dashboard/obligations overlap. Locks the design direction for the
> Dashboard redesign so the two pages stop feeling like the same
> table with different chrome.
>
> **Anchor docs**
>
> - Status taxonomy (memory): `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/project_status_taxonomy.md`
> - Obligation lifecycle brief: [docs/Design/obligation-lifecycle-design-brief.md](./obligation-lifecycle-design-brief.md)
> - Live preview: `http://localhost:5177/?dashboard=v2&mockPulse=1&lifecycle=v2&nav=v2`

## 1. Feature summary

Reshape the Dashboard from a capped table of obligations into a **verb-led action list** — a daily-standup view where every line is _something to do this week_, not a row in a spreadsheet. Obligations stays the data grid. The two pages become structurally different: Dashboard reads like Slack, Obligations reads like a CRM.

## 2. Primary user action

A CPA firm owner or preparer opens the Dashboard at 8am and can answer **"what do I need to act on this week?"** in 5 seconds, by glancing at:

1. Radar alerts that need a decision
2. An aggregate exposure strip
3. A short list of action-prompt-led lines

They click an action → it expands inline → they make the call → they collapse it → they keep moving. No table to scan. No drawer to enter unless they choose to.

## 3. Design direction

Operational, calm, dense-but-light. Reads like a **morning briefing**, not a spreadsheet. Each action line has the visual weight of a Slack message: subject (the action prompt), context (client + form), urgency (days late + dollars), no chrome. The aggregate strip reads like a stock ticker — mono numerals, hairline-separated, no graphs. The Radar cards above keep their existing weight (already designed in slice 1).

Same design language as the rest of the app (chips, hairline borders, no glow), but the **shape of a row** is fundamentally different from Obligations.

## 4. Layout strategy

Single-column stack, no tables, no tabs.

**2026-05-25 update (Yuqi review #4, #5):** "This week's exposure"
section was merged INTO "Actions this week" as its summary header
because both rendered the same week scope. The Alerts (Needs
attention) section gained a soft destructive-tint frame +
12px padding to anchor it as the highest-priority surface.

```
Today · May 19                                              [Import clients]
─────────────────────────────────────────────────────────────────────────
┌─ ALERTS  (boxed, soft destructive tint, 12px padding) ─┐
│ [Radar alert card]  [Radar alert card]  [+N tile]      │
└─────────────────────────────────────────────────────────┘

(2026-05-27: "View all alerts" trailing link dropped — the [+N]
tile is the only path to /rules/pulse from this section. Header
row now carries the h2 + monitoring chip alone.)

ACTIONS THIS WEEK                                            All deadlines ↗
  [3 In review]  [2 Blocked]  [4 Waiting on client]   ← summary tiles
                                                         (was exposure strip)
  › Confirm filing for Lakeview Medical Partners · 18d late · $4.3k
  › Follow up on Copperline Studios materials · 14d late · $1.85k
  › Complete CPA review for Bright Studio S-Corp · 4d late · $3.1k
  › … 5 more
```

**Visual hierarchy** (top → bottom by ink weight, 2026-05-25):

1. Today + date (largest text on page; muted date)
2. Alerts (boxed soft-destructive frame — the heaviest visual on
   the page because it's the only thing that demands an
   immediate decision)
3. Actions this week heading + per-status summary tiles
4. Actions list (medium, single-line items, hover-to-expand)
5. Footer link (small, muted)

No card containers around the actions list. No tab strip. No filters. No sort controls. The list is system-ordered (by Smart Priority, descending) and that's the only ordering.

**On Obligations** (peer change): default sort flips from Smart Priority → **Due date ascending**. Smart Priority stays available in the sort dropdown but isn't the implicit ranking. Reinforces "Dashboard curates, Obligations sorts."

## 5. Key states

Status names everywhere use the v2 vocabulary (`not_started · waiting_on_client · blocked · in_review · filed · completed`) per `project_status_taxonomy.md`. Completed and `not_applicable` rows are filtered out of the actions list — they're not actions.

| State                             | What the user sees + feels                                                                                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default (loaded, has actions)** | Date header · NEEDS ATTENTION (when present) · exposure strip · 5–10 action lines · footer link. Quiet, scannable.                                                                                                               |
| **Loading**                       | Skeleton: 3 skeleton lines under "Actions this week", no shimmer. Exposure strip shows `— need decision · $— at risk` with hairlines.                                                                                            |
| **Empty (no actions this week)**  | Replace the list with a single calm line: _"You're caught up. Next deadline in 6 days."_ Show the exposure strip if there are still open items beyond this week, else hide it entirely. No celebration art — calm, not gamified. |
| **No Radar alerts**               | NEEDS ATTENTION section hides entirely (no empty placeholder). Page starts at "This week's exposure."                                                                                                                            |
| **Error**                         | One thin error strip above the actions list with a Retry link. Aggregate strip + Radar stay rendered with last-known data when available.                                                                                        |
| **Action item expanded**          | The line grows in-place to ~80px. Shows reason (one sentence) + two buttons (primary: context-aware verb · secondary: "Open in Obligations →"). Other items dim slightly to give it focus.                                       |
| **Action committed**              | Inline toast at the bottom: _"Marked filed. Undo (8s)."_ The committed item collapses and slides out (next item shifts up).                                                                                                      |
| **Many actions (overflow)**       | Cap at 10 visible. If more exist, show `… 14 more in the queue → Open Obligations` as the footer link. Do not paginate the dashboard itself.                                                                                     |

## 6. Interaction model

**Click an action line → inline expansion.** The line accordion-expands to ~80px in-place. No popover, no panel, no nav. Other items in the list dim to 60% opacity to focus attention. The expansion contains:

- **One-sentence reason** explaining why this surfaced (`Status: Not started · K-1 pending from #partnership-1065 · 18 days past due`)
- **Primary action button** — context-aware verb derived from the row's status and readiness
- **Secondary link** — always `Open in Obligations →` to escape into the corpus when the action needs more depth

**Click the same line again → collapse.** Esc also collapses.

**Click a different action line → previous collapses, new expands.** One open at a time.

**Click a primary action button → commit immediately + undo toast.** No confirmation dialog. Toast lives 8s; click Undo to revert. After commit, item slides out with a 200ms ease-out; next item shifts up.

**Click `Open in Obligations →`** → navigate to `/obligations?obligation=<id>` with the drawer pre-opened. Same destination clicking an Obligations row reaches today.

**Aggregate strip chips are deep links.**

- `5 need your decision` → `/obligations?status=in_review`
- `$14,200 at risk` → `/obligations?sort=legacyPenaltyEstimate&exposure=ready`
- `2 blocked` → `/obligations?status=blocked`
- `3 waiting on client` → `/obligations?status=waiting_on_client`

**Keyboard:**

- `↑/↓` move focus between action lines
- `Enter` or `Space` expands focused line
- `Esc` collapses
- `1` triggers primary action when expanded
- `2` triggers "Open in Obligations"
- `?` opens command palette (existing)

## 7. Content requirements

**Section eyebrows (all-caps, 11px, muted):**

- `NEEDS ATTENTION` (red, kept from current)
- `THIS WEEK'S EXPOSURE`
- `ACTIONS THIS WEEK`

**Aggregate strip format (mono numerals, hairline-separated):**
`5 need your decision · $14,200 at risk · 2 blocked · 3 waiting on client`

When any segment is zero, drop the segment (don't show `0 blocked`).

**Action line format (sentence case, no end punctuation):**
`<Action prompt>  ·  <Client>  ·  <Days late or until>  ·  <Risk amount or "needs input">`

The **action prompt is the existing `nextCheck` text** the current dashboard column already produces (e.g. _"Confirm filing or payment status today"_, _"Follow up for client materials"_). No new verb registry — see §9 Open questions for the rationale.

**Expansion microcopy:**

- Reason line: `Status: <v2 label> · <Why-now context, ≤80 chars>`
- Primary button labels: short verbs (`Mark filed`, `Send reminder`, `Unblock`, `Approve review`, `Confirm acceptance`)
- Secondary link: `Open in Obligations →`

**Toast on commit:** `Marked <new status>. Undo (8s)` with a click-target on "Undo".

**Empty-state copy:**

- Quiet: `You're caught up. Next deadline in 6 days.`
- If genuinely nothing scheduled: `No obligations this week.` (no celebration)

**Footer link:**
`Open full queue →` (left-aligned, muted, only visible when actions exist)

## 8. Recommended references

- `interaction-design.md` for the accordion expansion timing + focus management
- `spatial-design.md` for the vertical rhythm between sections (no card chrome, hairline-only separation)
- `motion-design.md` for the slide-out-on-commit (200ms ease-out) and dim-other-items focus
- The existing `PulseAlertCard` for the Radar row style — match it
- The existing chip patterns from `status-control.tsx` — match the chip language

## 9. Open questions

1. **Action prompt source.** The brief leans on reusing the existing `nextCheck` computation as the action prompt text. If that proves too vague in user testing (e.g. _"Confirm filing or payment status today"_ doesn't read urgently enough), a tighter status-keyed verb dictionary is a later option. Don't build a new dictionary preemptively.
2. **Milestone notes on the dashboard?** No. Per `project_status_taxonomy.md`, milestone notes live on the client-obligation detail page (Timeline tab in the drawer), not on the dashboard. Dashboard expansion stays one-sentence-reason only.
3. **Aggregate strip data source.** Could be a small server-side rollup endpoint, OR derived client-side from the existing dashboard load. Decide during implementation — both are cheap.
4. **Aggregate strip animation when numbers change.** Probably no — would steal attention from the Radar section. Numbers update silently; a brief 80ms color flash on change if wayfinding helps.
5. **Mobile layout.** Out of scope for this brief (desktop-first per existing app). A `/adapt` follow-up.
6. **Primary action button label dictionary.** The brief lists examples (`Mark filed`, `Send reminder`, etc.) but doesn't commit to a full mapping. Decide during implementation; keep the registry small.

## 10. Decision log (from `/critique` 2026-05-19)

| Question                                     | Decision                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Dashboard = obligation rows or action items? | Action items (verb-led list, not table rows)                                                   |
| Click target on a dashboard item             | Inline expansion (accordion) — no popover, no drawer, no nav                                   |
| Smart Priority sort home                     | Both pages; Obligations defaults to **Due date asc** instead of Smart Priority                 |
| Time-bucket tabs on Dashboard                | Drop entirely; "this week" is implicit scope                                                   |
| Aggregate exposure strip                     | Yes — new (`5 need decision · $14k at risk · 2 blocked · 3 waiting on client`)                 |
| Status vocabulary                            | v2 6-state model (`not_started · waiting_on_client · blocked · in_review · filed · completed`) |
| Action prompt source                         | Reuse existing `nextCheck` text — no new verb dictionary                                       |

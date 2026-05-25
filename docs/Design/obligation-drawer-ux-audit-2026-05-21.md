# Obligation Detail Drawer — UX Audit

_2026-05-21 · auditor: Claude (acting as design director) · scope: the right-side Sheet drawer that opens when a row is clicked from `/obligations`_

---

## TL;DR

The drawer **knows too much and decides too little**. It's a documentation panel masquerading as a workspace — every fact about the obligation is shown, but the user has to do the cognitive work of figuring out what to do next. Three or four design moves would turn this into the best surface on the app.

**Design Health Score: 22 / 40 (Moderate)** — see scoring table below.

---

## Anti-Patterns Verdict

Mostly **not AI-slop**. The drawer uses tokenized colors, semantic badges, and avoids the typical "card with gradient + glow" tells. But it has a different anti-pattern that's just as fatal: **"PRD-driven design."** Many sections cite specific PRD clauses in the code comments (`PRD §3.1`, `§7.2`, `anti-pattern #4`). That's a tell that someone designed the drawer by reading a spec and ticking boxes, not by sitting next to a CPA and watching them triage 40 rows.

Result: every documented requirement is **present**, but the **frequency** of need wasn't weighted. Tax-year profile editing, K-1 blocker setup, statutory-vs-internal deadline disambiguation, audit-trail browsing — all coexist on equal footing with the daily-driver workflow of "review checklist → send portal link → mark filed."

---

## Design Health Score

| #         | Heuristic                       | Score       | Key Issue                                                                                                                                                  |
| --------- | ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3           | Path-to-Filing chevron + status pill convey "where am I", but the chevron is visually noisy.                                                               |
| 2         | Match System / Real World       | 3           | "Path to filing" stages don't match how CPAs talk (they say "in collection" not "Collecting").                                                             |
| 3         | User Control and Freedom        | 2           | No undo on status changes inside the drawer. K-1 blocker dropdown buries the "Clear blocker" action.                                                       |
| 4         | Consistency and Standards       | 2           | Status pill in header is `secondary`/uppercase (doesn't match new colored pills in queue). Tab "Audit" / "Timeline" swap on a flag. Headings inconsistent. |
| 5         | Error Prevention                | 3           | Extension form gates Save behind required memo + max-date. Good. But no inline guard against premature "Send to client" before docs are configured.        |
| 6         | Recognition Rather Than Recall  | 1           | Header subtitle has 7 metadata chips. User must hold all of them in mind to interpret the body.                                                            |
| 7         | Flexibility and Efficiency      | 2           | No keyboard shortcut to switch tabs. No way to jump from drawer to row above/below without closing.                                                        |
| 8         | Aesthetic and Minimalist Design | 2           | Snapshot card is too elevated (`bg-section`), too tall, too eager. Path-to-Filing has 5 × 4 = 20 type elements in one row.                                 |
| 9         | Error Recovery                  | 3           | "Couldn't load — Retry" pattern present. "Couldn't generate" + retry present. Solid.                                                                       |
| 10        | Help and Documentation          | 2           | `ConceptLabel` exists ("evidence", "auditTrail") but doesn't extend to confusing labels like "Path to filing", "Scope/Collecting/Signature/Filed".         |
| **Total** |                                 | **23 / 40** | **Moderate — significant improvements needed**                                                                                                             |

---

## Overall Impression

When the drawer opens, your eye lands on:

1. **Client name** (h2)
2. **Tax code + 4 chips + 2 dates** (subtitle and sub-subtitle — 7+ inline metadata items)
3. **"Open client detail" cross-link**
4. _(maybe)_ Status-CTA cluster (Mark accepted / Mark e-file rejected) — only when status is `done`/`paid`
5. **"DATES" microheader + 4-column StatutoryDatesPanel** (Internal / Filing / Payment / Tax period)
6. **"PATH TO FILING" microheader + 5-step chevron** with circles + labels + dates + status words
7. **ObligationForwardingPanel** (forwarding rule, if any)
8. **4 tabs** (Readiness / Extension / Evidence / Audit)

…and only THEN do you reach the actual checklist that lets you do work.

That's **8 distinct visual regions before the work surface.** A CPA opening this drawer at 11:47 AM with 40 rows still to triage doesn't need an obligation dossier — they need an answer to "**what's blocking this row, and what's the next action?**" That answer is buried somewhere on row 7 (the Readiness tab's `ReadinessOverview` summary).

The drawer is performing for a manager who wants to audit a row, when the typical user is a preparer who wants to _move_ a row.

---

## What's Working

1. **Tab-per-concern model is sound.** Readiness / Extension / Evidence / Audit are real, distinct concepts. The tabs aren't artificial. (Whether all four belong on a drawer vs. some living on the client page is a separate question — see P1 below.)
2. **Inline retry on every async failure.** "Couldn't generate", "Couldn't load", "Retry" buttons everywhere. Solid.
3. **Source-backed deadline citations.** The Evidence tab's "Matched rule" + "Authority citations" panel is genuinely defensible work — you can show a CPA exactly which IRS publication date a deadline came from. That's a moat.
4. **"Open client detail" peek instead of navigation.** Smart choice — preserves queue context. Don't lose this.
5. **Lifecycle-aware CTAs at top of header.** "Mark accepted" / "Mark e-file rejected" only show when the row is in `done`/`paid` — good progressive disclosure.

---

## Priority Issues

### **[P0] Header overstuffing — too much before you can act**

**What**: The drawer header packs 7+ metadata items in two text rows, then a 3rd row with statutory + internal dates, then "Open client detail" link, then maybe a 2-button CTA cluster. Below that is a `bg-section` Snapshot Card with 4 dates AND a 5-step funnel. Net: ~17 distinct text elements + 5 chevron circles before the user reaches any "work" surface.

**Why it matters**: This is the Nielsen recognition-vs-recall failure (#6). The user has to _hold_ the obligation's whole context in working memory to read the body below. Triage requires the opposite — the body should be self-contained, the header should be a lightweight breadcrumb.

**Fix** (concrete):

- **Header**: Client name + 1 line of `Form 1120-S · Brightline CPA · TY 2026` · status pill. That's it. Move the "Open client detail" affordance to a small icon button (linking arrow) inline with the client name.
- **Snapshot card**: collapse into a single line — `Internal Apr 15 · Stat Apr 15 · Filed: in 3 days`. Drop the `bg-section` elevation; the snapshot doesn't need to be a card. Make Path-to-Filing collapsible / behind a `[Show timeline]` toggle.
- The 4-date matrix in StatutoryDatesPanel only matters when they DIVERGE. Show 1 date with a quiet "+3 more dates" affordance that expands inline.

**Suggested command**: `/distill` (reduce visual + cognitive density) then `/clarify` (rewrite labels).

---

### **[P0] "Status" pill in header doesn't match the queue's new colored pills**

**What**: The header renders status with `<Badge variant="secondary">` + uppercase tracking. The queue table row uses the new `STATUS_VARIANT` + `STATUS_DOT` colored pill system (red blocked / amber review / violet waiting / green done / etc.).

**Why it matters**: Consistency #4. A user clicks a "Waiting on client" row (violet dot) and lands on a drawer where Status reads as a generic gray uppercase chip. The mental model "this row is paused on the client" gets dropped at the drawer entry.

**Fix**: Use `badgeVariants({ variant: STATUS_VARIANT[row.status] })` + `<BadgeStatusDot tone={STATUS_DOT[row.status]} />` in the header. Same as the obligation queue cell.

**Suggested command**: `/polish` (consistency pass).

---

### **[P1] Path-to-Filing chevron is visually loud and conceptually opaque**

**What**: 5 milestones (Scope → Collecting → Preparing → Signature → Filed). Each cell has a circle + label + date stamp + status word ("Done/Active/Overdue"). That's 4 text/icon items × 5 columns = **20 rendered elements**. The labels are also unfamiliar — "Scope" / "Collecting" / "Signature" don't match standard CPA workflow vocabulary.

**Why it matters**:

- **Aesthetic + minimalist (#8)**: A timeline this prominent should be exceptionally readable. 20 elements packed across one row reads as decoration, not navigation.
- **Match real world (#2)**: A CPA would say "intake → prep → review → signoff → file → done". The funnel doesn't match.
- **Help (#10)**: No tooltip explains what each stage means. A first-time user (`Jordan`) sees "Signature: Active" and doesn't know if that means waiting on client signature, waiting on partner sign-off, or something else.

**Fix**:

- Collapse the 5-step chevron into a single sentence in the header: "**Preparing · started Apr 1**" (or whatever stage is active). Make it click-to-expand into the full chevron.
- Rename labels to CPA vocabulary: "Intake → Collecting → Preparing → Review → Filed".
- Add per-stage tooltip explaining what triggers the transition.

**Suggested command**: `/distill`, `/clarify`.

---

### **[P1] "Readiness" tab is doing four jobs**

**What**: The Readiness tab currently surfaces:

1. **`ReadinessOverview`** summary (what readiness IS)
2. **Tax year profile editor** (for fiscal-year obligations)
3. **`ObligationBlockerSection`** (K-1 / parent-obligation dependency)
4. **Documents received** action cluster + checklist
5. **Sent-request panel** (portal link, expiry, revoke)

**Why it matters**: A user expecting "Readiness" to be a checklist of docs gets a configuration panel + an upstream-dependency picker on top of that. Cognitive load #6 again.

**Fix**:

- **Tax year profile**: this is a one-time-per-obligation setup, NOT a daily task. Move it to the client detail panel (it's a client-level property anyway). The tax_year_type rarely changes after row creation.
- **K-1 blocker**: this conceptually belongs in a "Dependencies" subsection of the Readiness tab — but visually it should be folded into the `ReadinessOverview` summary as one of the listed blockers ("waiting on K-1 from Acme Partners"). Don't render a full editor unless the user clicks "Edit blocker."
- **Documents + Portal**: these stay. They're the daily-driver workflow.

The result: the Readiness tab becomes ONE thing — "what materials do I need, who am I waiting on, and is the portal request sent yet?"

**Suggested command**: `/distill`, `/layout`.

---

### **[P1] Action affordance hierarchy is flat**

**What**: At the top of the Readiness tab, three buttons sit side by side:

- `[Generate document list]` (outline, with refresh icon)
- `[Add item]` (ghost, with plus icon)
- `[Send to client]` (default/filled, with send icon)

All three are at the same visual weight. "Generate document list" is an AI affordance that only matters if the list is empty. "Add item" is a manual fallback. "Send to client" is the actual workflow goal — but it only stands out because of the `default` variant.

**Why it matters**: User control + flexibility (#7). The "Send to client" button is the _terminal_ action in this workflow, but it's just visually equivalent to the prep tools that come before it.

**Fix**:

- When the checklist is empty → only show `[Generate document list]` (large, primary). Add item is a "+" icon next to the heading once a list exists.
- When the checklist exists → primary button is `[Send portal link]` (or `[Resend]` if one's already sent). The other actions become secondary inline icons.
- Action affordance follows the row's state, not its full capability surface.

**Suggested command**: `/clarify`, `/polish`.

---

### **[P2] "Evidence" tab mixes two different concepts**

**What**: The Evidence tab shows BOTH:

- **Matched rule + Authority citations**: the deadline's source-of-truth chain (IRS publication, retrieval date).
- **Client evidence**: workpaper attachments the team has uploaded.

These two concepts answer different questions:

- "Where does this April 15 deadline COME from?" (Authority citation)
- "What does the team have on hand?" (Client evidence)

**Why it matters**: Match real-world (#2). A CPA looking for the IRS source has to scroll past file attachments; a CPA looking for last year's PDF has to scroll past IRS Pub 509.

**Fix**: Split into two sections within the tab with a clear divider — `Authority` (collapsed by default if there's a rule binding) and `Workpapers` (expanded, where attachments live). Or split into TWO tabs: "Source" and "Files".

**Suggested command**: `/layout`.

---

### **[P2] Drawer width feels like a full-page takeover**

**What**: The drawer scales from 100vw → 720px → 840px → **920px** at xl breakpoints. With the new global page cap of 1280px, the drawer covers ~72% of the viewable area on a 1440px monitor and almost the whole page on a 1280px monitor.

**Why it matters**: A drawer is supposed to be a "peek" — a glance you can dismiss without losing context. At 920px wide the queue behind it is barely visible, which defeats the "stay in context" purpose. Aesthetic + minimalist (#8).

**Fix**: Cap at **640–720px** on all viewports. The drawer has to choose: be a peek (narrow, keeps queue visible) OR be a workspace (full page). At 920px it's neither. If a user wants more space, the drawer's "Open client detail" affordance + a future "Open in full page" link should be the escape hatch.

**Suggested command**: `/shape`.

---

## Persona Red Flags

### **Alex (Power User — partner doing morning triage)**

- **No keyboard shortcut to switch tabs.** Has to mouse over to TabsList.
- **No keyboard shortcut to mark filed / accepted from inside the drawer.** Status changes require clicking the (sometimes hidden) "Mark accepted" button.
- **No "next obligation" affordance from inside the drawer.** Closing the drawer to find the next row is friction at scale.
- **Snapshot Card is unmissable noise.** Alex has the dates memorized; he doesn't need to read them every time he opens a row.

### **Jordan (First-Timer — junior preparer)**

- **"Path to filing" labels mean nothing.** What's the difference between "Scope" and "Collecting"? When does an obligation reach "Signature"?
- **"Tax year profile" panel appears mid-tab with no explanation.** A junior preparer sees Calendar/Fiscal/MM-DD inputs and has no context for whether they're supposed to fill it in.
- **"K-1 blocker" dropdown** opens with a list of other obligations — no explanation of WHY they'd pick one. The label `Blocked by` is too terse.
- **"Internal deadline" vs "Statutory" vs "Filing Deadline" vs "Payment Deadline"** — four different date concepts in close proximity. Jordan can't tell which one drives "5 days late" in the queue.
- **No visible help affordance** explaining the difference between the four date types. `ConceptLabel` is used inconsistently — present on "Evidence" and "Audit Trail" headings but not on "Internal deadline".

### **Sam (Sole-proprietor CPA on the Solo plan)**

- **Path-to-Filing is irrelevant** when Sam IS every milestone owner. The chevron is sized for a large firm where stages map to different people.
- **Tax year profile editing on every obligation** is annoying for Sam, who has 12 clients and knows them all by heart.

---

## Minor Observations

- **`extensionFiledAt` / `extensionAcceptedAt`** are computed but never surfaced. If the extension was confirmed with the authority, there's no UI for that state.
- **Status badge styling** uses `uppercase tracking-wide` but the queue's new pill doesn't. Pick one.
- **"Send to client" toast** says "Readiness check sent" or similar — but the user just clicked "Send to client". Use the same verb across button + toast.
- **Loading skeletons in the drawer body are just a dashed border with text** ("Loading obligation detail…"). The queue uses richer skeletons. Inconsistency.
- **`AlertPanel` is used in the Extension tab** for the disclaimer text — but there's no semantic styling distinction between info / warning / blocking. Same component for all severities.
- **The `Example` heading** above the rule extension policy block (line 3864) is just confusing copy — it's not an example, it's the actual rule policy for this row.
- **Header `<h2>`** is `text-base font-semibold`. That's small for the visual anchor of a 920px drawer. Should probably be `text-lg` or `text-xl`.
- **`row.daysUntilDue` is computed in 4 places** in the drawer (Path-to-Filing stage labels, "Overdue" text, header subtitle, ReadinessOverview). Centralize.

---

## Questions to Consider

1. **What is the drawer FOR?** Right now it's "see everything about this obligation." If we constrained the answer to "advance this row to the next state," the design would collapse to something much smaller and more decisive.
2. **Could the drawer be three panes instead of one tall scroll?** A two-column layout (~320px metadata sidebar + ~600px active workspace) would let the snapshot live on the side without competing for vertical attention.
3. **Why does the drawer have an Audit/Timeline tab at all?** Audit is rarely the user's _current_ job. Could be a slide-out from the header instead of a top-level tab.
4. **What's the next state the drawer wants the user to drive toward?** If we make that explicit — a single primary CTA at the top, varying by status (e.g. "Send portal link" / "Mark filed" / "Confirm rejection") — the drawer becomes purposeful instead of encyclopedic.
5. **Why is the K-1 blocker buried in the Readiness tab?** It's the single most catastrophic blocker on the row. It deserves header prominence: "**🔒 Blocked by Acme Partners' Form 1065** · clear blocker | view parent".

---

## Suggested Action Order

If we ship this drawer iteratively, here's the priority order:

1. **`/polish` Status pill consistency** (P0 #2) — 1 hour, removes a glaring inconsistency.
2. **`/distill` the header** (P0 #1) — half-day, biggest perceived improvement.
3. **`/clarify` Path-to-Filing labels + tooltips** (P1 #3) — half-day, unlocks first-timer comprehension.
4. **`/layout` Readiness tab — extract Tax year profile** (P1 #4) — half-day, real architectural cleanup.
5. **`/clarify` action hierarchy on Readiness tab** (P1 #5) — couple hours.
6. **`/shape` drawer width to 720px max** (P2 #7) — 10 min, big perceived impact on "is this a drawer or a takeover?"
7. **`/layout` Evidence tab split** (P2 #6) — couple hours.

Re-run `/critique` after step 3 to see the score improve.

---

_Auditor's parting thought: the drawer's bones are good — the data is there, the tabs are correct, the inline retries and source citations show care. The drawer is overweight, not unwell. Stripping out 30% of the chrome (header noise, snapshot card height, path-to-filing density) will reveal a much sharper tool. Don't redesign — distill._

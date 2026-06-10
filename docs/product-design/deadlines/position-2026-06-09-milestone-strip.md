# Position memo — The workflow milestone strip is the wrong primary surface

**Author:** UX (Yuqi + assistant)
**Date:** 2026-06-09
**Status:** Position — not yet committed to roadmap

## TL;DR

The 6-stage workflow milestone card occupies the second-most-prominent slot on the deadline detail page after the Hero. It's pleasant to look at and **delivers almost no behavioral value.** It answers "what stage of 6 am I in?" — a question users don't ask. Meanwhile the journey-stage concept doesn't appear anywhere outside the detail page, so it can't function as product infrastructure.

**Recommendation**: Compress the visual to a 28px context band above the Hero title (forensic glance). Spend the freed ~200px of body real estate on a "Now / Next / Blocking" panel that surfaces what monitored events drive the next transition. Promote the journey-stage vocabulary across `/today`, `/deadlines`, `/clients/[id]`, and reporting — where it becomes infrastructure.

## What's wrong with the current strip (harshly)

1. **It's trivia.** Users open a deadline page to learn what to do, not what stage of an idealized journey they're on. The strip tells you the latter with a beautiful visual that does nothing about the former.

2. **It pretends the journey is linear.** Real workflow loops: Filed → rejected → back to In review; Waiting → wrong-upload → Not started; Blocked → parent-completes → Pending. A linear horizontal bar can't show those without bolted-on hacks. The strip lies by omission.

3. **It's the most expensive passive real estate on the page.** ~200px vertical for a non-actionable visualization. Every other element on the page (Hero metrics, tabs, body sections) is denser per pixel.

4. **It tempts misdesign.** Every time we try to make the strip do something (clickable dots, "Move back" button, dropdown), we have to add UI that fights the monitoring model (status is observed, not chosen — see `feedback_status_is_observed_not_chosen` memo). The strip's correct answer is "I'm decoration, leave me alone." Then we should be honest about it.

5. **It's localized.** The journey vocabulary exists in this one card. The product's "tracking + monitoring" promise is undermined because the concept doesn't propagate. A status that lives in one card is wallpaper. A status concept that lives across the app is infrastructure.

## What replaces it on the detail page

### A. Workflow context band — 28px above Hero title

A single-line stripe with 6 dots/segments, abbreviated labels below each dot, and a right-side meta ("2 of 6 · Waiting on client today · View full journey →"). The "View full journey" link opens a drawer/modal with the rich forensic timeline for users who want depth.

Cost: 28px (1/8th of current strip card height + zero body real estate).

Value: enough for a forensic glance without earning prime body real estate. The journey is acknowledged but doesn't demand attention.

### B. Now / Next / Blocking panel — replaces the card body real estate

A 3-column section that bind to **monitored events**, not state-picking:

| Column                     | Content                                                                                           | Source                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Now**                    | Primary CTA (next-state verb) + meta on last fire (e.g. "Send reminder" + "Last reminder 2d ago") | Cascade matrix per stage                               |
| **Next monitored trigger** | "Status advances to {next_state} when {condition}" + mini progress (4/5 materials in)             | Computed from monitored conditions per state           |
| **Blocking**               | What's stuck right now + inline resolution action (Send reminder · Resolve · Mark waived)         | Outstanding materials + blocker reference + auto-flags |

This replaces the strip's 200px with content that drives action. The panel is the real answer to "how does status advance?" — the user reads what monitored conditions matter and how close each is.

## Integration map — making the journey concept infrastructure

If we keep the journey vocabulary, it MUST appear across the app. Here's where:

### `/today` dashboard

- **Stage heatmap**: a 6-bar chart showing how many of your active obligations are in each stage. Hot bar = needs attention. Clicking a bar filters the obligation list below.
- **"X waiting > 5 days"** callout: surfaces obligations stuck longer than the firm's SLA in any stage. Auto-derived from monitored timestamps.

### `/deadlines` list (HuYeb)

- **Workflow mini-stripe column**: a tiny 6-segment horizontal stripe inline in each row, showing what stage that obligation is in at a glance. Lets the user scan 60 obligations and immediately see distribution.
- **Status pill stays** at the left of the row — the stripe is supplementary, not replacement.

### `/clients/[id]` (when built)

- **Portfolio journey rollup**: stacked horizontal bar showing % of this client's obligations in each stage. Below, per-stage breakdown with the longest-stuck obligation surfaced. Relationship manager's primary diagnostic.

### `/alerts/[id]` apply panel

- The status breakdown chip strip (already shipped 2026-06-09) is the precedent. It uses the same vocabulary.

### `/audit-log` (or Audit tab within deadlines)

- **Time-in-stage analytics**: avg / p50 / p95 time spent in each stage, sliced by obligation type. Defensible SaaS metric. "Your 1040 obligations spend 14 days avg in Waiting on client; the industry benchmark is 9. Here are 12 that exceeded 21 days."

### Notifications / reporting

- Status transitions trigger configurable notifications by rule.
- Weekly digest: "12 obligations advanced from Materials → In review this week. 3 fell back to Waiting on client due to rejected uploads."

## What this contract refuses

- A workflow card on every detail page taking 200+ vertical pixels. Compress or remove.
- A "Change status" dropdown anywhere outside bulk actions. See `feedback_status_is_observed_not_chosen`.
- Clickable journey dots. Stripe is glance-only.
- A "Move back" peer to the primary CTA. Backward is rare admin work, lives in a kebab.
- More than 6 stages. 4 are the absolute max if we ever need a smaller model; 6 is the lock today.

## Migration sequence

1. **Ship the context band + Now/Next/Blocking** on `/deadlines/[id]`. Keep the existing milestone card behind a feature flag for 2 weeks. Measure: does the new layout reduce time-to-action? Track click on primary CTA per detail-page view.
2. **Add the workflow mini-stripe column** to `/deadlines` list (HuYeb). Existing status pill column stays. Measure: do users scan more deadlines per visit?
3. **Ship the stage heatmap on `/today`**. Make stage segments clickable as filters. Measure: do users click into specific stages more than the overall obligation list?
4. **Build portfolio journey rollup on `/clients/[id]`** when that page exists. (Requires the page to be built first.)
5. **Time-in-stage analytics** on Audit tab + reporting. Requires status-transition event capture (already exists in audit trail) + aggregation queries.

Each step earns the next: if step 1 doesn't reduce time-to-action, don't propagate.

## Open questions for PM

- Does the firm-level SLA exist? ("Waiting on client more than 5 days is a problem" is a firm-defined threshold.) If not, this is a settings + per-firm configuration workstream.
- Is the journey vocabulary the SAME for payment-only obligations and information-only obligations? The cascade matrix today assumes filing obligations. Payment-only might have 4 stages, information-only might have 3. Per-type customization is needed at the contract level.
- Do partners have an opinion on the "kill the milestone card" recommendation? Some PMs love progress bars for political reasons (the board likes to see them). Worth checking before committing.

## The agents in flight illustrate this

Two agents are building proof-of-concept frames for the recommendation:

- The compact 28px band + Now/Next/Blocking panel (Hero alternative)
- 3 integration demos: `/today` stage heatmap, `/deadlines` row mini-stripe, `/clients/[id]` portfolio rollup

Use those Pencil frames to evaluate the position before committing to the migration sequence.

## What I'd refuse to do even if pushed

- Reintroduce a generic "Change status" dropdown. It's been deleted (`IgaL9`) and shouldn't come back.
- Make the milestone strip clickable. The pull toward making decoration interactive is constant and wrong here.
- Add a 7th tab or stage to absorb new requirements. The 4 tabs and 6 stages are caps.
- Custom per-firm status vocabularies. The 6-stage enum is canonical.

These positions are durable. If the team disagrees, that's a product debate worth having — not a design tweak.

## Related memories

- `feedback_status_is_observed_not_chosen` — the principle this memo extends
- `reference_workflow_state_cascade` — the per-stage cascade matrix
- `reference_workflow_aggressive_integration` — the integration philosophy + 3 modes
- `project_tab_count_locked` — the tab structure this memo respects
- `reference_record_tab_storage_gap` — the storage gap that informs what content the Record tab can actually carry

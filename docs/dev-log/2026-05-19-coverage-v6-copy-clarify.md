---
title: 'Coverage v6: clarify UX copy — drop fake-button labels, name where actions happen'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage v6: clarify UX copy

## Context

Designer flagged "Approve 7 pending" with a screenshot and asked:

> "i still don't understand 'Approve 7 pending' those kind of wording —
> please ensure they are clear. this just looks very random to me. Can
> you clarify all of the UX copies. Originally, where do the actions
> of e.g. 'Approve 3 pending' happen?"

The diagnosis: the card status pill used the imperative verb "Approve"
even though clicking the pill did nothing. It read like a button but
wasn't. Same pattern in the rail header. Compounded by section labels
("Manual verify", "Auto-managed") that were vague jargon, and an
expander that referenced "standard queue" (an internal coined term
from the PRD that doesn't read as plain English).

The actual approval action lives **inside the rail**:

1. Click a jurisdiction card → rail opens with that jurisdiction's
   pending rules
2. Either click a single rule (preview → Accept rule → confirm) or
   tick checkboxes and use the bulk strip (Accept N rules → confirm)

Card-level labels are _descriptions of what's queued_, not buttons.

## Change

Audited every visible string and applied the rule **"imperative verbs
are reserved for real buttons; descriptive copy everywhere else."**

### Card status pills

| Section                  | Before                              | After                                                                                                                                                                 |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Needs your approval      | `Approve N pending` pill            | **Pill removed**. The count in the card header is now tinted orange (`text-status-review`) so the pending signal still reads at a glance, without a fake-button verb. |
| Needs your approval (TX) | `Approve all 4 pending` pill        | **Pill removed** (same treatment — TX still groups under the section title).                                                                                          |
| Verify per client (WA)   | `Verify cadence per client` pill    | **`Cadence varies per client`** — informational, not imperative.                                                                                                      |
| Auto-tracked (FL)        | `Auto-tracks the IRS calendar` pill | **`Tracks IRS calendar`** — same, shorter.                                                                                                                            |

The pill stays on verify / auto cards because those carry information
the section title alone doesn't (the _why_ — varies-per-client policy,
inherits-from-IRS-calendar). Approval cards drop it because the
section header + count was already saying it twice.

### Rail header

| Where                   | Before                   | After                                                                                                                                                                      |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rail header status pill | `Approve 7 pending` pill | **Pill removed**. The stats line under the header now reads `7 pending · 0 active · 6 sources` with the pending count tinted orange. Same information, no imperative verb. |

### Section headers

| Before                    | After                 | Reason                                                                                               |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| Manual verify             | **Verify per client** | "Verify" alone was vague; the qualifier "per client" makes the user task explicit.                   |
| Auto-managed              | **Auto-tracked**      | "Managed" is fuzzy; "tracked" matches the underlying action (Pulse tracks the source automatically). |
| Standard queue (expander) | **Routine-review**    | "Standard queue" was internal jargon from the PRD; "routine-review" reads as plain English.          |

### Bulk-select copy

| Before                                    | After                                 |
| ----------------------------------------- | ------------------------------------- |
| `Select rules to act on multiple at once` | **`Select rules to approve in bulk`** |
| `2 rules ready to accept`                 | **`2 selected`**                      |

"Ready to accept" was filler. The strip shows up because rules are
selected; saying so directly is shorter and truer.

### Footer CTA

| Before                      | After                     |
| --------------------------- | ------------------------- |
| `View all rules in Library` | **`Open all in Catalog`** |

Matches the new sidebar label ("Catalog") and uses a clearer verb
("Open" instead of "View all", which was redundant with the
all-jurisdictions semantics already implied).

### Page description

| Before                                                                                                                                                            | After                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Do we have rules where clients file? Pending counts and source documents are clickable. Every count traces back to the official federal, state, or DC document." | "Do we have rules where clients file? **Click a jurisdiction to review its pending rules and accept them in the side panel.** Every count traces back to an official federal, state, or DC document." |

Adds one sentence that names the journey: where to click, where the
action lives.

### Rule-detail rail labels

| Before                                                               | After                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Open full audit detail` (button)                                    | **`Open full rule detail`**                                    |
| "Open full audit detail to review evidence before deciding" (helper) | "Open the full rule detail to review evidence before deciding" |

"Audit detail" was tech-y and overloaded with the system audit log;
"rule detail" is what the modal actually shows.

## Why this is right

The page-level rule of thumb that came out of this:

> **Imperative verbs only on real buttons.**

When card pills said "Approve N pending" the verb implied a button
where there wasn't one. Users have to learn that the verb is just a
description, which is exactly the kind of micro-learning a well-
designed UI shouldn't require. Pulling the verbs into buttons
(`Accept rule`, `Confirm accept`, `Accept N rules`) and using
descriptive prose elsewhere ("7 pending", "Cadence varies per
client") collapses the ambiguity.

## Files

- `apps/app/src/features/rules/coverage-rail-view.tsx`
  - `JurisdictionCard`: status pill conditional on tone (drops on
    approval section); pending count gets `text-status-review` tint
  - Section header titles renamed
  - Standard-queue expander copy
  - Rail header stats line replaces the pill
  - `BulkSelectHeader` and `BulkAcceptStrip` copy refined
  - Footer "Open all in Catalog"
  - Rule preview "Open full rule detail"
- `apps/app/src/routes/rules.coverage-v6.tsx`
  - Page description gains the journey sentence

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage-v6`:
  - Description reads "…**Click a jurisdiction to review its pending rules and accept them in the side panel.** Every count traces back to an official federal, state, or DC document."
  - Approval cards (CA/NY/FED/TX) show only header + orange-tinted count + stats footer — no pill
  - WA card pill reads "Cadence varies per client"
  - FL card pill reads "Tracks IRS calendar"
  - Section headers: "Verify per client (1)", "Auto-tracked (1)"
  - Expander reads "Show 46 routine-review jurisdictions"
  - Rail header (at `?jur=CA`): "**7** pending · 0 active · 6 sources"
    (pending number tinted orange) — no Approve pill
  - Bulk strip idle: "2 selected · Cancel · Accept 2 rules"
  - Bulk strip confirming: "Activate 2 rules? Each will start generating client obligations. · Cancel · Confirm accept 2"
  - Footer: "Open all in Catalog →"

## Open

- **Card-level entity chips still use short codes (LLC, PRT, S-C, …)
  while the rail uses full names.** Minor inconsistency — could
  unify by using full names everywhere once the entity-coverage
  checkbox sees real use.
- **Promotion of v6 → /rules/coverage** is still pending explicit
  go-ahead.

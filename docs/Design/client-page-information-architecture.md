# Client surfaces — what belongs where

**Date:** 2026-05-21
**Status:** Recommendation. Use as the spec when iterating on `/clients` (list) and `/clients/[id]` (detail).

## The split

| Surface                  | Role                     | Mental model                                               |
| ------------------------ | ------------------------ | ---------------------------------------------------------- |
| `/clients` (list)        | Browse + find + reassign | "Which of my 240 clients do I open?"                       |
| `/clients/[id]` (detail) | Complete picture         | "Now that I'm here, give me everything about this client." |

A field belongs on the list **only** if it helps the user pick the right row. Everything else goes on detail.

## `/clients` — list page

Today shows: Name · Entity type · State · Owner · Source. **That's the right floor.** Keep it tight.

Worth adding (if you want a P1 follow-up):

| Column                     | Why                                                                                          | Effort                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Open obligations count** | Workload glance — "this client has 5 things open, that one has 0"                            | S — already aggregable from `obligations.listByClient`        |
| **Next due**               | "Who needs me first?" answer at the list level                                               | M — needs server-side aggregation or a separate roll-up query |
| **Risk dot**               | Single tone-coded dot per row (red = blocked/overdue, amber = needs attention, none = quiet) | S — derives from the same data as the detail summary strip    |

**Do NOT put on the list:**

- Contact details (email/phone/contact name) — too much for a row, and you don't need them to pick the right client
- Compliance flag bundle (the 5 booleans) — too granular for a scan
- Risk inputs, late-filing history, equity owner count — only useful when you're focused on one client
- Filing-plan details, notes, audit log

## `/clients/[id]` — detail page

The page should answer four questions, in order of how often the CPA asks them:

### 1. "Where are we right now?"

Hero + summary strip + alerts band. **This is what we're refactoring today.**

- Hero (`<PageHeader>`): name, entity badge, action cluster (View all obligations · View audit log)
- Identity strip: state chips, **EIN actually displayed**, primary owner badge, source/readiness/radar badges
- 3-tile Summary strip: Next due · At risk · Team
- `ClientAlertsBand` (existing) for Pulse + extension mismatch + missing facts

### 2. "What do they owe?"

Filing plan + obligations. **Working today.**

- Filing-plan year grouping (good as-is)
- Suggested forms (good as-is)
- Click any obligation → opens the obligation drawer in place (recently fixed)

### 3. "What's their compliance posture?" — **MISSING TODAY**

A dedicated panel that surfaces the data the contract already stores but the page hides:

| What                     | Source field                                    | How to render                               |
| ------------------------ | ----------------------------------------------- | ------------------------------------------- |
| **Federal tax ID (EIN)** | `client.ein`                                    | Big mono text — CPA copies this constantly  |
| **Tax year end**         | `client.taxYearType` + `fiscalYearEndMonth/Day` | "Calendar year" or "Fiscal — ends March 31" |
| **Foreign accounts**     | `client.hasForeignAccounts`                     | Chip with FBAR/FinCEN hint when true        |
| **Payroll**              | `client.hasPayroll`                             | Chip with "941/940/W-2 owed" hint           |
| **Sales tax**            | `client.hasSalesTax`                            | Chip with state filings hint                |
| **1099 vendors**         | `client.has1099Vendors`                         | Chip — January 1099 work                    |
| **K-1 activity**         | `client.hasK1Activity`                          | Chip — K-1 dependency exposure              |
| **Owners**               | `client.ownerCount` / `equityOwnerCount`        | "N owners · N equity holders"               |
| **Late-filing history**  | `client.lateFilingCountLast12mo`                | Number with tone (red ≥3, amber 1-2, none)  |
| **Engagement date**      | `client.createdAt`                              | "Client since Mar 2023"                     |

Each flag should be editable inline (mutation already exists for risk profile updates).

The five compliance booleans are the most material — they drive what obligations get generated server-side. Showing them as chips lets the CPA verify "yes, this entity has payroll, so the 941s are expected" or catch the bug "this client shouldn't have hasForeignAccounts; let me fix it."

### 4. "What's been happening?" — partial today

- Activity / audit log panel (existing)
- Notes tab (existing)
- Mailbox tab (Phase 2 — recommend removing the tab until shipped)
- Communication history (not built — would live under Mailbox)

## What's still missing from the contract entirely

Worth tracking as future schema work — don't ship today:

- **Phone number** — schema has email but no phone
- **Mailing address** — for paper filings, IRS notices
- **Multiple contacts** — entities usually have ≥2 (CFO, controller, owner). Schema has one `primaryContact*` pair
- **Engagement letter status** — signed? expiration? document ID?
- **Billing context** — annual fee, last invoice, balance
- **State tax IDs** — separate from federal EIN
- **Linked entities** — "this person owns 25% of XYZ Partnership"
- **Document repository** — engagement letter, prior returns, source docs

## Sequencing

1. **In flight (sub-agent):** hero swap to `<PageHeader>`, summary strip, Mailbox tab removal, body primitive alignment, polish.
2. **Next (after sub-agent finishes):** Compliance posture panel + surface EIN + primary contact in the identity strip.
3. **Follow-up:** list-page column additions (open count, next due, risk dot).
4. **Future schema work:** phone, address, multi-contact, engagement letter, etc.

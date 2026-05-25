# PRD — The Obligation Row

> The product logic for a single row in the Obligations queue. Synthesizes the **previous DueDateHQ** product (lightweight deadline tracker at `/Users/yuqi/Documents/_GitHub/DueDateHQ`), the **current** worktree implementation, and the canonical product spec (the Chinese-language PDF on §3.4, §6.4, §9.7, §10, §12).
>
> Author: 2026-05-20 · Owner: Yuqi (design) · Implementation track: design/preview-integration

---

## 1. Why this doc exists

The Obligations queue is the product. Everything else (clients, rules, dashboard, calendar sync) supports it. Yet every implementation pass since v1 has interpreted "a row" differently — sometimes a date-with-status, sometimes a workflow node, sometimes a billing item. This PRD pins **what one obligation row IS, what it promises a CPA, and what state machinery has to back it**, so that subsequent implementation passes don't drift.

It is not a design spec (see [docs/Design/obligation-lifecycle-design-brief.md](../Design/obligation-lifecycle-design-brief.md)). It is not a contract reference (see [packages/contracts/src/obligation-instance.ts](../../packages/contracts/src/obligation-instance.ts)). It is the **product logic** — the contract between the row and the user.

---

## 2. Product context (carried forward + sharpened)

### 2.1 What DueDateHQ is

A **deadline operations workbench** for US small CPA firms (1–3 CPAs, 20–300 clients, 2–10 states). Positioning: **deadline source of truth + workflow control layer**. Not tax prep (UltraTax/Lacerte own that), not practice management (Karbon/TaxDome/Canopy own that), not bookkeeping or payroll.

### 2.2 The thesis

> "You will never be the last CPA in your state to find out about a filing extension."

When a state announces an extension or a deadline moves, the firm sees the list of _its affected clients_ within 24 hours and can action it in one click. That promise drives every product decision.

### 2.3 Primary user

The **owner-operator CPA** at a 1–3 CPA firm:

- 20–300 clients, 2–10 states of operation
- Currently runs the practice in Excel + Outlook + a half-broken Karbon trial
- Opens the queue 30+ times per day, every weekday
- Triages on Mondays (the "5-minute weekly triage" — vs. 45 minutes in Excel today)
- Personally bills the work; misses cost real client trust + real penalties

Secondary: **partner / manager** (reviews queue weekly, doesn't drill in), **preparer** (lives in the queue, owns ~10 clients), **client_contact** (receives requests, doesn't see the queue).

### 2.4 Primary pain point

Three failure modes the existing toolset (Excel + Outlook) cannot solve at scale:

1. **State announcements are dispersed across 50+ government websites** — manual monitoring is infeasible. The CPA finds out via word of mouth, 3 weeks late.
2. **Government announcement language is arcane** — interpreting impact takes 10–30 minutes per announcement, then mapping to affected clients takes another 30 minutes.
3. **The deadline / status / readiness / payment / e-file / acceptance pipeline is six distinct concepts that all collapse into "did we file it?"** — and that collapse hides the failure modes that cause penalty notices (Filed ≠ Done; payment still due during extension; K-1 cascade delays).

### 2.5 What changed since v1

The previous product (the OLD repo) modeled an obligation as a **flat `Deadline`** with 6 status values, a client link, and an extension chain. It got the thesis right (24-hour announcement SLA, weekly triage) but encoded the four anti-patterns from the PDF §10 wrong:

| Anti-pattern                | OLD product behavior                                       | Current direction                                                                                                                 |
| --------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Extension ≠ payment         | One `filed_extension` status, no separate payment tracking | Extension is a deadline mutation tagged `extended_by: filing\|payment\|both`; payment is its own obligation type                  |
| LLC is not a fixed tax form | LLC clients had one fixed form per row                     | Tax classification (`disregarded\|partnership\|s_corp\|c_corp`) is a client-level property; the row binds to a _rule_, not a form |
| Filed ≠ Done                | `completed` was set on filing                              | Six states explicitly separate `filed` from `completed`; `completed` = acceptance confirmed                                       |
| K-1 is a dependency blocker | Modeled as activity-log note                               | `blocked` status carries a typed `blocked_by: obligation_id` pointer; auto-unblocks when parent completes                         |

The current product is **mid-migration**. The contract still has the 10-value enum (8 legacy + `blocked` + `completed`), and `useLifecycleV2()` swaps the vocabulary behind a flag. This PRD describes the **target** product logic.

---

## 3. What an Obligation IS

An **Obligation** is a single "the firm owes the authority a thing by a date" record. It binds:

```
( client × authority × form × tax-period × deadline ) → workflow state
```

The five identifiers on the left compose a unique obligation. The workflow state on the right is what the row carries through its lifecycle.

### 3.1 Six obligation types

From PDF §3.1. The current product models only `filing` cleanly; the rest are partial or aspirational.

| Type                  | Example                                             | Status today                                                   |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| **`filing`**          | Form 1065, Form 1120-S, NY CT-3-S                   | ✅ Fully modeled                                               |
| **`payment`**         | Q1 estimated tax, federal withholding deposit       | ⚠️ `paymentState` enum exists; not generated as its own row    |
| **`deposit`**         | Form 941 semi-weekly federal payroll deposit        | ⚠️ Defined in enum, not generated                              |
| **`information`**     | W-2 / W-3 (Jan 31), 1099-NEC (Jan 31), K-1 issuance | ❌ Not modeled                                                 |
| **`client_action`**   | "Send us your QuickBooks file by Mar 1" (firm-set)  | ❌ Not modeled                                                 |
| **`internal_review`** | "Partner must sign off by Apr 10" (firm-set)        | ⚠️ `reviewerUserId` field exists; not generated as its own row |

**Implication for the row:** the row is type-aware. A `payment` row should NOT show e-file state; an `information` row should NOT show payment state. Today the row renders all state machinery for all types, which produces empty "—" cells everywhere.

### 3.2 Three deadline classes — PDF §9.7

Every obligation has three deadlines that must stay separate:

| Class             | Who sets it                 | Why it matters                                       |
| ----------------- | --------------------------- | ---------------------------------------------------- |
| **Statutory**     | IRS / state — source-backed | The audit-trail anchor. Cannot be moved by the firm. |
| **Firm-internal** | Manager / partner           | The buffer date the team actually operates on        |
| **Client-action** | Firm-set, per client        | "Send us your stuff by X"                            |

The current product carries `baseDueDate` (statutory) and `currentDueDate` (post-extension) — the firm-internal buffer is missing as a distinct concept. Hovering an internal-deadline pill on the row should surface the statutory date one keystroke away (and the v2 Due cell does this now).

### 3.3 Six product responsibilities — PDF §12

Every obligation row must enable, in order:

1. **Identify** the obligation exists (rule generation from client profile)
2. **Generate the deadline** from the source-backed rule catalog
3. **Distinguish** statutory / firm-internal / client-action deadlines
4. **Track** readiness → extension → payment → e-file → acceptance
5. **Notify** the right person (owner / partner / manager / preparer / client) at the right time
6. **Audit** every transition — full history reconstructable

Today's queue covers 1, 2, 4 (partially), and 6. Coverage of 3 (deadline classes), 5 (per-role notifications), and complete 4 (e-file auth + acceptance) is in-flight.

---

## 4. What the row PROMISES the CPA

The row is a single line in a dense scanning surface. It promises four things:

### 4.1 "Tell me what I owe and when"

The row answers in under 1 second:

- **Who** (client name, anchor of the row)
- **What** (form / tax type)
- **Where** (state)
- **When** (a binding date + relative pill)

This is the v1 promise the OLD product mostly delivered. The current product retains it via the merged Due cell (relative pill + absolute internal date + statutory tooltip).

### 4.2 "Tell me what's blocking me from finishing it"

The row answers in under 3 seconds:

- **Status** in the 6-state taxonomy — chip on the right
- **The specific blocker** when applicable: "Waiting on W-2 from client" (chip + drawer Timeline tab), "Blocked by parent #1065" (chip + parent link)

A row that says `In review` should NOT also need the user to open the drawer to learn which reviewer is sitting on it; that fact lives on the chip or its tooltip.

### 4.3 "Tell me what I might pay in penalties"

The row answers in under 3 seconds:

- **Legacy penalty estimate** ($ amount, soft-amber pill if non-zero)
- **Accrued penalty subtitle** when relevant
- **$0 or unknown** rendered as `—` so the eye doesn't read it as data

This is the financial-stake signal. Combined with `daysUntilDue`, the row's left-right scan reads as: `[when] [who] [what] [where] [exposure]`. That's the CPA's working memory.

### 4.4 "Let me do the next action in one click without leaving the queue"

The row supports:

- **Change status** (dropdown on chip)
- **Open drawer** (click row body) to take richer actions (readiness checklist, extension decision, e-file accept)
- **Bulk-select** for multi-row status / assignment / export
- **Keyboard navigation** (J/K/Esc/`/` per the v2 design)

What the row does NOT do (intentional, per PDF §3.14, §3.20–22):

- Track hours
- Store client documents (evidence is a _reference_ to artifacts, not a vault)
- Act as a client portal
- Generate invoices

---

## 5. Lifecycle — the 6 states

Adopted from [docs/Design/obligation-lifecycle-design-brief.md](../Design/obligation-lifecycle-design-brief.md). Replaces today's 8-state enum.

```
not_started ──┐
              ├── waiting_on_client ──┐
              │                        ├── in_review ──── filed ──── completed
              └── (blocked) ───────────┘                    │
                       ▲                                    │
                       └────────────────────────────────────┘
                            (rejected unwinds to in_review)

Parent obligation completes ──> child obligation auto-flips from blocked to not_started
                                + system note: "Unblocked by parent #<id>"
```

Per-state semantics:

| State               | What it means                                                | Auto-transition into                      | Visual cue                                    |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------- | --------------------------------------------- |
| `not_started`       | Nothing has happened. Default.                               | (created with this state)                 | Neutral chip                                  |
| `waiting_on_client` | We've asked the client for something                         | When request sent                         | Amber chip                                    |
| `blocked`           | Stuck on an upstream obligation (K-1) or external dependency | Readiness flag → blocked; manual          | Red chip + inline `Blocked by #1065` link     |
| `in_review`         | Internal work in progress (preparer → manager → partner)     | Manual or after readiness=ready           | Indigo chip                                   |
| `filed`             | Submitted to authority; awaiting acceptance                  | E-file submission event                   | Green chip with "awaiting acceptance" eyebrow |
| `completed`         | Authority acceptance landed                                  | Manual confirmation (v1) or webhook (v2+) | Solid green; row de-emphasizes after 30 days  |

**Invariants:**

- **No `extended` status.** Extension is a deadline mutation tagged `extended_by: filing\|payment\|both`. Status stays put.
- **No `paid` status.** Payment is its own obligation type with its own `completed` state.
- **`not_applicable`** is a row-suppression flag, not a queue state. Hidden by default, surfaced only via explicit toggle.
- **Rejection** unwinds `filed → in_review` and surfaces a red `Rejected` chip on the row.

---

## 6. Anti-patterns the row must NOT encode

Per PDF §10. These are the **six** ways products in this space typically get it wrong; the row must defend against all of them.

1. **Extension ≠ payment.** Form 4868 / 7004 extends _filing only_. Payment is still due at the original date. The row for a payment obligation does NOT show the filing extension state. Tag every extension rule `extends_filing | extends_payment | extends_both`. PDF §6.3 expands the implication: the status vocabulary must distinguish `Filing extension due · Tax payment due · Extension payment estimate needed · Client approval needed · Payment confirmation needed` — five distinct row states that today collapse into one `extended` enum.

2. **LLC is not a fixed tax form.** LLC is a state-law entity; tax classification is `disregarded | partnership | s_corp | c_corp`. The row binds to a _rule_, not a form. When the client's classification changes, the obligation set regenerates.

3. **Filed ≠ Done.** The chain is `Submitted → Accepted by IRS → Accepted by state → (paper-filed | rejected | corrected & resubmitted)`. `filed` and `completed` are distinct states. A row that says "Filed" still owes work.

4. **K-1 is a dependency blocker, not an attachment.** One partnership delay cascades to N partner 1040s. The `blocked` row carries a typed `blocked_by: obligation_id` pointer; parent completion auto-unblocks the children with a system note. PDF §6.4 names the cascade explicitly: `Partnership return not done → partner K-1 not issued → partner 1040/1041/1120 cannot finish → partner may need extension`. Source entity obligation → K-1 recipient obligation. This is the flagship product opportunity that separates DueDateHQ from a calendar reminder app.

5. **State deadline ≠ Federal deadline.** PDF §10 anti-pattern #5. State extension, state payment, PTE election, state franchise tax, state annual report — all may differ from federal. Don't assume parity. The row carries a `jurisdiction` field that drives an independent rule lookup.

6. **AI does not determine tax rules.** PDF §10 anti-pattern #6. AI may _assist_ with: source extraction, draft generation, client classification, change summarization, reminder copy. But the deadline-rule catalog itself **must** be `source-backed · versioned · human-reviewed · auditable`. The row's deadline came from a rule that came from an IRS Pub 509 citation reviewed by a human. The audit row records both.

---

## 7. Row-level requirements (v1.next implementation scope)

### 7.1 Must

- [ ] **6-state queue taxonomy** with auto-hide on zero-count scopes ✅ _shipped in this branch_
- [ ] **Merged Due cell** with statutory anchor (tooltip or inline) ✅ _shipped_
- [ ] **$0 exposure renders as `—`** ✅ _shipped_
- [ ] **No legacy status leakage in v2 mode** — migrate `pending → not_started`, retire `extended` and `in_progress`, fold `paid` into `completed` for payment-type rows
- [ ] **K-1 dependency pointer**: `blocked` row shows `Blocked by #<parent-id>` chip with inline link; parent completion auto-unblocks via system note (event-driven)
- [ ] **Rejection sub-flag**: `filed → e-file rejected event → in_review` with red `Rejected` chip
- [ ] **Type-aware rendering**: a `payment`-type row hides e-file state; an `information`-type row hides payment state
- [ ] **Source-backed deadlines**: every row's deadline links to a versioned rule with an IRS / state citation in the audit trail (PDF §10 anti-pattern #6)

### 7.2 Should

- [ ] **Generate `payment`, `deposit`, and `information` obligations** as their own rows (today only `filing` is generated)
- [ ] **Three-class deadline display** — surface firm-internal as the binding date, statutory as the tooltip, client-action as a chip on the readiness tab
- [ ] **Per-state milestone notes** on the drawer Timeline tab — replace the Evidence tab as the second tab
- [ ] **Smart-priority signal becomes implicit sort** — drop the explicit "Priority" column; let sort handle it
- [ ] **Form 8879 e-file authorization workflow** (PDF §3.6 — explicitly missing today): obligation can't transition `in_review → filed` until the matching 8879 / 8879-PE / 8879-S / 8879-CORP is recorded as signed by client. Surface as a sub-checklist on the Readiness tab.

### 7.3 Could (post-MVP)

- [ ] **BOI/FinCEN** as a separate compliance category, not a filing obligation. PDF §4.12 note: as of 2025-03-26 FinCEN exempts US-domestic entities; only foreign entities registered in the US still need to file. Treat as low-priority.
- [ ] **Webhook-driven `filed → completed`** transition (IRS/state acceptance feeds)
- [ ] **Saved-view pinning** as horizontal tabs (vs. dropdown)
- [ ] **Client-defined dependency graph** (user authoring of K-1 cascades, not just the rule-built ones)
- [ ] **Estimated-tax calculator** — PDF §4.8 calls out that estimated tax depends on prior-year safe harbor, current-year projection, withholding, extension payment, state estimated tax, PTE election, owner distribution, cash flow. Today the product shows a placeholder dollar; a real estimate requires CPA review workflow.

### 7.4 Won't (this PRD)

- Hour tracking · Document storage · Invoicing · Client portal · Tax-prep computation · Bookkeeping · IRS transcript integration · International tax forms deep coverage (PDF §11 "won't")

---

## 8. Edge cases the row must handle

| Edge case                                                              | Expected behavior                                                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Same client, 5 obligations (multi-state filer or payroll + filing mix) | Adjacency grouping: client name renders on first row of group; subsequent rows show indented connector glyph                        |
| Client moved from `partnership` → `s_corp` mid-year                    | Old obligations (1065) marked `not_applicable`; new obligations (1120-S) generated. Audit trail captures the classification change. |
| Statutory date changed by state announcement                           | Bulk-adjust dialog at firm level; affected rows show "Date changed: prev May 15 → new Jun 15" in drawer audit                       |
| K-1 parent obligation rejected by IRS                                  | Children remain `blocked`; system note added: "Parent #<id> rejected; awaiting correction"                                          |
| Client uploads requested W-2 to portal                                 | Readiness `waiting → ready` auto-transition (when AI checklist agrees); row stays in current status until preparer moves it         |
| Firm-internal deadline missed but statutory not yet                    | Row stays in queue; days-until-due pill goes amber on the firm-internal date; statutory date in tooltip stays neutral               |
| Past `completed` row 31+ days old                                      | Hidden from default queue; surfaced via "All time" scope or saved view                                                              |

---

## 9. Success metrics

The Obligations queue ships when:

1. **Triage time** (open queue → triage 12 rows): <60s for partner; <3min for preparer who acts on rows
2. **Filed ≠ Done leak**: 0 instances of `completed` being set before acceptance event lands
3. **K-1 cascade lag**: median <2 hours from parent `completed` to children unblock
4. **Status-clarity test** (qual, n=5 CPAs): for any row, the user can describe "what's blocking it" within 5 seconds without opening the drawer
5. **Demo data tells the story**: at least one client has 3+ obligations spanning multiple types; the demo queue shows ≥1 example of each scope (not_started, waiting_on_client, blocked, in_review, filed, completed)

---

## 10. Open questions

### Decided 2026-05-20 (Yuqi)

1. **Per-state role permissions**: who can transition `in_review → filed`? → **Preparer.** The preparer who owns the row can mark it filed. Manager-self-promotion flag in audit not required at v1 — review by the manager happens _before_ `in_review → filed`, captured in the prep/review stage history.
2. **`completed` retention**: is the 30-day auto-hide firm-configurable, or global? → **Firm-configurable.** Setting lives on the firm profile (default 30 days). Saved views can override with their own scope.
3. **Bulk transition matrix**: which row-state → target-state combinations are legal in bulk? → **No constraint now.** Ship without a matrix; observe usage; tighten if real misuse appears. The audit trail catches whatever ships.

### Still open

4. **Acceptance confirmation surface**: does "Mark accepted" live in the drawer header (primary CTA when status=`filed`) or in the status dropdown alongside other transitions?
5. **Migration plan for legacy enum values**: one-time backfill (`pending → not_started`, `done → completed`, `extended → audit-log replay`) or lazy-migrate on read?
6. **Payment obligation generation**: how aggressively do we generate payment rows? Every payment-due-date implied by the rule catalog (high volume), or only when the firm marks the client as "pays-in"?

---

## 11. References

- Canonical spec: `/Users/yuqi/Downloads/美国小型会计事务所报税种类、流程与规则产品指南.pdf` (42 pages, fully read 2026-05-20)
- Design brief (taxonomy): [docs/Design/obligation-lifecycle-design-brief.md](../Design/obligation-lifecycle-design-brief.md)
- Current data model: [packages/contracts/src/obligation-instance.ts](../../packages/contracts/src/obligation-instance.ts), [packages/contracts/src/obligation-queue.ts](../../packages/contracts/src/obligation-queue.ts)
- Previous product (for narrative comparison): `/Users/yuqi/Documents/_GitHub/DueDateHQ/files/01-product-brief.md`, `duedatehq-prd.md`
- Existing umbrella PRDs (whole product, not row-scoped): [docs/PRD/DueDateHQ-PRD-v2.0-Part1A.md](DueDateHQ-PRD-v2.0-Part1A.md) and parts 1B / 2A / 2B
- Memory: `~/.claude/projects/-Users-yuqi-dev-due-date-hq-jwl/memory/project_product_model.md`, `project_status_taxonomy.md`

---

## Appendix A — The PDF's 18 sub-states (vocabulary for milestone notes)

Per PDF §3.4. These are NOT queue states — they are the **vocabulary CPAs already use** for the detail timeline. Each note on the drawer Timeline tab should be tagged with one of these terms (free text fine, but autosuggest from this list):

```
1.  Not started
2.  Waiting on client
3.  Waiting on third-party K-1
4.  Bookkeeping cleanup needed
5.  Ready for prep
6.  In prep
7.  Prepared, waiting for review
8.  In review
9.  Review notes open
10. Ready for client approval
11. Waiting for signature authorization   ← Form 8879
12. Ready to e-file
13. E-file submitted
14. Accepted
15. Rejected
16. Filed by paper
17. Extended
18. Completed
```

Mapping to the 6 queue states:

| Queue state                     | Sub-states it absorbs |
| ------------------------------- | --------------------- |
| `not_started`                   | 1                     |
| `waiting_on_client`             | 2, 10, 11             |
| `blocked`                       | 3, 4, 9               |
| `in_review`                     | 5, 6, 7, 8, 12        |
| `filed`                         | 13, 16                |
| `completed`                     | 14, 18                |
| (rejection sub-flag on `filed`) | 15                    |
| (deadline mutation, not status) | 17                    |

---

## Appendix B — Coverage priorities (from PDF §11)

The canonical PDF's "must / should / won't" coverage list for what tax types DueDateHQ should generate as obligations.

### Must (table-stakes — generate or fail the thesis)

```
Federal Form 1040 / 4868
Federal Schedule C flag (not full tax prep)
Federal Form 1065 / 7004 / K-1
Federal Form 1120-S / 7004 / K-1
Federal Form 1120 / 7004
Individual estimated tax reminders (Q1-Q4)
Corporate estimated tax reminders
Form 941 quarterly filing deadline
Basic payroll deposit configuration: monthly / semiweekly
W-2 / W-3 (Jan 31)
1099-NEC (Jan 31)
Custom state / local / internal deadlines (firm-authored)
```

### Should (high-value, post-MVP)

```
Form 1041 (Trust / estate)
Form 990 (Nonprofit)
FBAR (FinCEN 114, Apr 15 → auto-extends Oct 15)
Selected state packs (CA, NY, TX, FL — top filing volume states)
Sales tax recurring deadlines
State payroll withholding
State annual report
PTE election tracking
K-1 dependency graph (the flagship product opportunity)
```

### Won't (explicit non-goals)

```
Full 50-state auto rules
Tax amount calculation
E-file integration (we record acceptance, we don't transmit)
IRS transcript integration
Tax return preparation (UltraTax/Lacerte own this)
Client document portal (TaxDome owns this)
Full payroll compliance (Gusto/ADP own this)
International tax forms deep coverage (FBAR is the boundary)
```

---

## Appendix C — Complete CPA tax workflow (PDF §3 narrative)

The row participates in this 8-stage annual workflow. Today the product covers stages 4 and 7 well; stages 1, 2, 3, 5, 6, 8 are partial or absent.

| Stage                                                                                                                                                                                                                                                  | PDF § | Today's product coverage                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------- |
| 1. **Pre-season** (Nov-Jan): client list refresh, engagement letters, organizers sent, firm-internal deadlines set                                                                                                                                     | §3.1  | ❌ Engagement letter / organizer not modeled                                                        |
| 2. **Intake** (Jan-Feb): collect W-2s, 1099s, K-1s, TB, payroll reports, prior-year return — the most painful step                                                                                                                                     | §3.2  | ⚠️ Readiness checklist exists; AI-driven; gap on "is the doc set complete enough to start" judgment |
| 3. **Classification** (post-intake): decide which obligations this client owes this year                                                                                                                                                               | §3.3  | ⚠️ Rule-driven generation works for filings; gap on payment/deposit/info obligations                |
| 4. **Preparation** (Feb-Apr): preparer → reviewer → partner workflow                                                                                                                                                                                   | §3.4  | ✅ `prepStage` + `reviewStage` modeled (7 + 6 sub-stages); maps to v2 `in_review`                   |
| 5. **Review** (final pre-file): 12-item review checklist (income vs W-2/1099/K-1, deductions, state allocation, prior-year carryforward, depreciation, estimated tax, basis, payroll, balance sheet, M-1/M-2, e-file diagnostics, client instructions) | §3.5  | ❌ No review checklist surface                                                                      |
| 6. **Client approval + 8879** (pre-file): client signs Form 8879 / 8879-PE / 8879-S / 8879-CORP authorizing e-file                                                                                                                                     | §3.6  | ❌ Explicitly flagged "we don't do this" in PDF                                                     |
| 7. **Filing + acceptance tracking** (Mar-Oct): submit → accepted-by-IRS → accepted-by-state → (paper / rejected / corrected & resubmitted) → payment scheduled → confirmed → final copy delivered                                                      | §3.7  | ⚠️ `efileState` enum has 9 values but transitions aren't wired; acceptance is manual confirm        |
| 8. **Extension workflow** (when can't finish in time): decide → estimate tax due → inform client → submit 4868/7004 → continue collecting → file extended return                                                                                       | §3.8  | ✅ Extension state + decision modeled; missing: payment-estimate sub-step                           |

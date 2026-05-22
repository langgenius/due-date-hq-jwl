# IA — Obligations queue + Obligation row

> Information architecture companion to [docs/PRD/obligation-row-PRD.md](../PRD/obligation-row-PRD.md). Specifies entities, page surfaces, navigation paths, URL state, drawer/tab structure, and the API contract surface that backs the queue.
>
> Author: 2026-05-20 · Implementation track: design/preview-integration

---

## 1. Entity model — what backs a row

```
                        ┌──────────────┐
                        │     Firm     │
                        └──────┬───────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌─────────────┐ ┌──────────┐ ┌─────────────┐
        │   Client    │ │ Rule Lib │ │  Member     │
        │ ─────────── │ │ ──────── │ │ ─────────── │
        │ entity_type │ │ tax_type │ │ role        │
        │ tax_class   │ │ authority│ │ name        │
        │ states[]    │ │ deadline │ │ assignable  │
        │ counties[]  │ │ recurr.  │ └─────┬───────┘
        └──────┬──────┘ └────┬─────┘       │
               │             │             │
               └──────┬──────┘             │
                      ▼                    │
              ┌───────────────┐            │
              │   Obligation  │◀───────────┘
              │  (the ROW)    │  assigneeUserId
              │ ───────────── │
              │ status (v2)   │
              │ deadlines×3   │
              │ blocked_by ───┼──▶ (sibling Obligation)
              │ exposure $    │
              └───┬───┬───┬───┘
                  │   │   │
                  ▼   ▼   ▼
         ┌────────┐ ┌──────────┐ ┌──────────┐
         │ Evidence│ │  Audit  │ │  Notes   │
         │ files[] │ │ events[]│ │ per state│
         └─────────┘ └─────────┘ └──────────┘
```

### 1.1 Entities

| Entity            | Owns                                                         | Belongs to                       | Cardinality                                 |
| ----------------- | ------------------------------------------------------------ | -------------------------------- | ------------------------------------------- |
| **Firm**          | everything                                                   | (root)                           | 1                                           |
| **Client**        | tax_year_profiles, jurisdictions                             | Firm                             | 20–300 per firm                             |
| **Member**        | (none)                                                       | Firm                             | 1–10 per firm                               |
| **Rule**          | source citations, evidence requirements, extension policy    | Firm (overlay on global library) | ~100–500 active per firm                    |
| **Obligation**    | evidence refs, audit events, milestone notes, K-1 dependents | Client + Rule                    | 5–30 per client per year                    |
| **Evidence**      | (none)                                                       | Obligation OR Rule               | 0–10 per obligation                         |
| **AuditEvent**    | (none)                                                       | Obligation                       | append-only, ~5–50 per obligation lifecycle |
| **MilestoneNote** | (none)                                                       | Obligation × state               | 0–N per state                               |

### 1.2 Key relationships

- **Obligation → Client**: required FK. Denormalized to the row as `clientName`, `clientState`, `clientCounty` for fast queue render.
- **Obligation → Rule**: optional but recommended; nullable for legacy / hand-entered rows. Exposes extension policy + evidence requirements to the row.
- **Obligation → Obligation** (`blocked_by`): soft pointer (no FK constraint). When the parent reaches `completed`, an event flips children from `blocked` to `not_started` and writes a system note.
- **Obligation → AuditEvent**: append-only history; every state transition + every mutation writes one.
- **Obligation → MilestoneNote**: notes hang off a specific state node on the Timeline tab. State transition does NOT delete prior states' notes; they remain readable.

### 1.3 Canonical PDF §9 object model — for parity check

The canonical product spec proposes an explicit object model. The table below maps each PDF object to our current contracts and flags gaps.

| PDF §9 object                | PDF fields                                                                                                                                                                                                                                                                            | Current contract                                                                                         | Gap                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Client** (§9.1)            | legal name, DBA, EIN/SSN masked, entity type, tax classification, fiscal/calendar year, states, owners/shareholders/partners, responsible staff, partner, client contacts                                                                                                             | `ClientPublic` covers most; `tax_classification` field exists                                            | ⚠️ No `DBA` field; no first-class `client_contacts[]` (just an email)                                                                                                            |
| **Filing Obligation** (§9.2) | client, jurisdiction, authority, form, tax year, obligation type (filing\|payment\|deposit\|information\|client_action\|internal), due date rule, calculated due date, adjusted due date, extension available, extension form, payment due separate, source, confidence/review status | `ObligationInstancePublic` covers most                                                                   | ⚠️ `due_date_rule` (the _formula_) isn't stored — we store the calculated date; ⚠️ `payment_due_separate` flag missing; ⚠️ `confidence/review_status` on the rule itself missing |
| **Work Item** (§9.3)         | obligation, owner, status, missing info, review notes, due date, internal due date, escalation level                                                                                                                                                                                  | merged into `ObligationInstancePublic` (no separate Work Item entity)                                    | ❌ `escalation_level` not modeled; ❌ `internal_due_date` is conflated with `currentDueDate`                                                                                     |
| **Extension** (§9.4)         | original due date, extension form, extension filed date, extended due date, estimated payment required, payment confirmed                                                                                                                                                             | `extension*` fields on obligation                                                                        | ⚠️ `payment_confirmed` field missing; ⚠️ `estimated_payment_required` is implicit only                                                                                           |
| **Reminder** (§9.5)          | recipient (internal/client), schedule, template, sent status, bounced, acknowledged                                                                                                                                                                                                   | partial — `readinessRequests[]` covers client reminders; internal reminders in dashboard `actions` table | ⚠️ No unified Reminder entity; ⚠️ no bounce / acknowledged tracking                                                                                                              |
| **Audit Evidence** (§9.6)    | who changed what, when, source, client approval, e-file authorization, acceptance/rejection                                                                                                                                                                                           | `AuditEventPublic` covers who/what/when; rule citations attached                                         | ⚠️ Form 8879 e-file authorization records not first-class; rejection not first-class                                                                                             |

---

## 2. Page surfaces

### 2.1 Primary surfaces

```
/                                  → Today (dashboard — Pulse + Actions)
/obligations                       → Obligations queue ★ this PRD
/obligations?id=<id>&drawer=...    → Queue with right-side drawer open
/clients                           → Clients table
/clients/:id                       → Client detail (obligations grouped under one client)
/rules/coverage                    → Rule coverage map
/rules/library                     → Rule catalog
/radar                             → State-announcement intelligence
/calendar                          → Calendar view of all obligations (read-only sync)
```

### 2.2 The Obligations queue — page anatomy

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ◀ Header ──────────────────────────────────────────────────────────────────▶  │
│  Obligations ⓘ                              [Export] [Calendar sync] [Saved▾] │
├────────────────────────────────────────────────────────────────────────────────┤
│  ◀ Filter bar ──────────────────────────────────────────────────────────────▶  │
│  All 12  Not started 3  Waiting on client 1  In review 3  Filed 2             │
│    · | · Past due · Due this week · Needs evidence · Penalty input needed     │
├────────────────────────────────────────────────────────────────────────────────┤
│  ◀ Search + meta row ──────────────────────────────────────────────────────▶  │
│  🔍 Search clients              /              Applied: scope · chip  12 rows │
│                                                              [Columns]         │
├────────────────────────────────────────────────────────────────────────────────┤
│  ◀ Table ──────────────────────────────────────────────────────────────────▶  │
│  ☐  Client                State  Tax type  Due ▲      Projected  Evidence  Status │
│  ☐  Bright Studio S-Corp    —     1120-S   65d late  —         1 source   Filed  │
│  ☐  Lakeview Medical        NY    1065     65d late  $4,300    2 sources  In rev │
│      ↳ (continuation)             1120-S   12d late  $2,100    1 source   Filed  │
│      ↳                            941      8d  late  $410      1 source   ...   │
│  ...                                                                            │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 The right-side drawer (when a row is clicked)

```
┌──────────────────────────────────────────────┐
│ Lakeview Medical Partners · Form 1065        │
│ Due May 15 · Internal May 12 · NY            │
├──────────────────────────────────────────────┤
│ [Readiness] [Timeline] [Extension] [Risk]    │
│ [Evidence] [Audit]                            │
├──────────────────────────────────────────────┤
│  ... tab body ...                            │
└──────────────────────────────────────────────┘
```

Six tabs (was 5; Timeline added per the v2 brief):

| Tab                | Purpose                                                                                          | Source                                        |
| ------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Readiness**      | CPA internal document checklist; optional client request actions                                 | `readinessChecklist[]`, `readinessRequests[]` |
| **Timeline** (new) | Milestone notes per state, in reverse-chrono. System + human notes interleaved (different fonts) | `MilestoneNote[]`, system events              |
| **Extension**      | Decision + memo + source + expected new date                                                     | `extension*` fields                           |
| **Risk**           | Penalty breakdown, source refs                                                                   | `penaltyBreakdown[]`, `penaltySourceRefs[]`   |
| **Evidence**       | Linked files (W-2, 1099, K-1)                                                                    | `evidence[]`                                  |
| **Audit**          | Full transition history                                                                          | `AuditEvent[]`                                |

The drawer width per DESIGN §Layout: **720–880px** (workflow-drawer band, scales for the tables/evidence content).

---

## 3. Navigation paths — where the row points

The row is a **hub**. Every interactive element on it leads somewhere specific:

| Click target on row              | Destination                                                                | Drawer?       |
| -------------------------------- | -------------------------------------------------------------------------- | ------------- |
| Client name                      | `/clients/:clientId` (groups all obligations under that client)            | No — full nav |
| Tax type code                    | Drawer · Readiness tab (rule definition + requirements)                    | Yes           |
| Due cell / date                  | Drawer · Timeline tab (anchor on current state node)                       | Yes           |
| Legacy penalty estimate pill     | Drawer · Risk tab                                                          | Yes           |
| Evidence count                   | Evidence drawer (multi-row evidence side-panel, not the obligation drawer) | Side panel    |
| Status chip                      | Inline dropdown (status change)                                            | No            |
| Status chip · `Blocked by #1065` | Navigate to parent obligation's drawer                                     | Yes           |
| Status chip · `Rejected` flag    | Drawer · Audit tab (anchor on rejection event)                             | Yes           |
| Anywhere else on row body        | Drawer · last-opened tab                                                   | Yes           |
| Row checkbox                     | Toggle bulk selection                                                      | No            |
| Shift-click checkbox             | Range selection from last anchor                                           | No            |

---

## 4. URL state — what's persistent

The queue's filter + selection state is fully URL-encoded so saved views are shareable links.

### 4.1 Query parameter surface (`useQueryStates`)

| Param               | Type     | Meaning                                                       |
| ------------------- | -------- | ------------------------------------------------------------- |
| `q`                 | string   | Free-text search                                              |
| `status`            | string[] | Lifecycle states (one or more)                                |
| `client`            | uuid[]   | Client filter                                                 |
| `state`             | string[] | State code filter                                             |
| `county`            | string[] | County filter (depends on state)                              |
| `taxType`           | string[] | Tax type filter                                               |
| `assignees`         | string[] | Assignee names                                                |
| `owner`             | enum     | `unassigned`                                                  |
| `due`               | enum     | `overdue`                                                     |
| `dueWithin`         | int 1–30 | Days                                                          |
| `exposure`          | enum     | `ready` `needs_input` `unsupported`                           |
| `evidence`          | enum     | `needs`                                                       |
| `riskMin` `riskMax` | int      | Exposure range ($)                                            |
| `daysMin` `daysMax` | int      | Days-until-due range                                          |
| `sort`              | enum     | `smart_priority` `due_asc/desc` `due_asc/desc` `updated_desc` |
| `view`              | uuid     | Active saved view                                             |
| `obligation`        | uuid     | (deprecated; see `id`)                                        |
| `id`                | uuid     | Active row in drawer                                          |
| `drawer`            | enum     | `obligation`                                                  |
| `tab`               | enum     | `readiness` `timeline` `extension` `risk` `evidence` `audit`  |
| `row`               | uuid     | Currently-focused row (keyboard nav anchor)                   |
| `density`           | enum     | `comfortable` `compact`                                       |
| `hide`              | string[] | Hidden column ids                                             |
| `lifecycle`         | enum     | `v1` `v2` (feature flag; defaults to v2)                      |
| `asOf`              | iso date | Historical view (back-tests exposure)                         |

### 4.2 What's NOT in the URL

- Row selection (`rowSelection` state — local only; resets on nav)
- Penalty modal open state
- Drawer header expansion state
- HMR / dev flags

---

## 5. API contract surface

All under `orpc.obligations.*`. Source: [packages/contracts/src/obligation-queue.ts](../../packages/contracts/src/obligation-queue.ts), [packages/contracts/src/obligations.ts](../../packages/contracts/src/obligations.ts).

### 5.1 Read endpoints

| RPC              | Input                                                | Output                                                              | Purpose                   |
| ---------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| `list`           | `ObligationQueueListInput` (filters + sort + cursor) | `{ rows: ObligationQueueRow[], nextCursor }`                        | Paginated queue (50/page) |
| `getDetail`      | `{ obligationId, asOfDate? }`                        | `ObligationQueueDetail` (row + rule + evidence + audit + readiness) | Drawer payload            |
| `facets`         | none                                                 | `{ clients, states, counties, taxTypes, assigneeNames, statuses }`  | Filter options + counts   |
| `listSavedViews` | none                                                 | `ObligationQueueSavedView[]`                                        | Saved-view dropdown       |
| `listByClient`   | `{ clientId }`                                       | `ObligationInstancePublic[]`                                        | Client detail page        |

### 5.2 Mutation endpoints

| RPC                                                       | Effect                                                     | Audit row written?                                    |
| --------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `updateStatus`                                            | Single row status change                                   | Yes                                                   |
| `bulkUpdateStatus`                                        | Multi-row status change (constrained transitions)          | Yes per row                                           |
| `updateDueDate`                                           | Mutate `currentDueDate`                                    | Yes (tagged `extended_by: ...` when extension-driven) |
| `updateTaxYearProfile`                                    | Mutate client filing profile from drawer                   | Yes                                                   |
| `decideExtension`                                         | Set extension decision + memo + source + expected new date | Yes                                                   |
| `createBatch`                                             | Manually create obligations for a client                   | Yes                                                   |
| `previewAnnualRollover` / `createAnnualRollover`          | Yearly rollover from prior year                            | Yes                                                   |
| `exportSelected`                                          | CSV / PDF zip; emits audit row with download link          | Yes                                                   |
| `createSavedView` / `updateSavedView` / `deleteSavedView` | Saved view CRUD                                            | No (view is local UX state)                           |
| `requestDeadlineTipRefresh` / `getDeadlineTip`            | AI-generated tip for drawer header                         | No (cached)                                           |

### 5.3 Missing endpoints (v1.next gaps)

- **`updateBlockedBy`** — to wire the K-1 dependency UI
- **`addMilestoneNote` / `listMilestoneNotes`** — to back the Timeline tab
- **`markAccepted`** — explicit `filed → completed` transition (today reuses `updateStatus`)
- **`generatePaymentObligations`** — to materialize payment-type rows from rule catalog

---

## 6. Permissions surface

The 7-role model from PDF §7 (current product has 5). Each row action checks against the user's role:

| Role             | Read queue      | Change status     | Decide extension | Mark accepted | Bulk action           | Edit rules | Manage users |
| ---------------- | --------------- | ----------------- | ---------------- | ------------- | --------------------- | ---------- | ------------ |
| `firm_owner`     | ✓               | ✓                 | ✓                | ✓             | ✓                     | ✓          | ✓            |
| `partner`        | ✓               | ✓                 | ✓                | ✓             | ✓                     | ✓          | ✓            |
| `manager`        | ✓               | ✓                 | ✓                | ✓             | ✓                     | partial    | —            |
| `preparer`       | ✓               | own assigned only | —                | —             | own only              | —          | —            |
| `coordinator`    | ✓               | —                 | —                | —             | bulk owner/assignment | —          | —            |
| `read_only`      | ✓               | —                 | —                | —             | —                     | —          | —            |
| `client_contact` | NO QUEUE ACCESS | —                 | —                | —             | —                     | —          | —            |

Today's product enforces `firm_owner` + `partner` (same permissions) + `manager` + `preparer` + `read_only`. Coordinator and client_contact are aspirational.

---

## 7. State persistence + caching

| State                            | Where                                         | TTL                                         |
| -------------------------------- | --------------------------------------------- | ------------------------------------------- |
| Queue rows                       | TanStack Query · `orpc.obligations.list`      | Invalidated on any mutation                 |
| Drawer detail                    | TanStack Query · `orpc.obligations.getDetail` | Invalidated on mutation for that obligation |
| Facets (filter options + counts) | TanStack Query · `orpc.obligations.facets`    | Invalidated on mutation; 5min stale         |
| Saved views                      | DB · `obligation_saved_view` table            | Persistent                                  |
| URL state                        | browser URL + history                         | Persistent across reloads                   |
| Row selection                    | local React state                             | Cleared on filter/sort change               |
| Open drawer + tab                | URL (`drawer`, `id`, `tab`)                   | Persistent                                  |
| Column visibility                | URL (`hide` array)                            | Persistent                                  |
| Lifecycle v2 flag                | URL (`lifecycle`)                             | Defaults to `v2`; `?lifecycle=v1` overrides |

---

## 8. Notification surface (per row event)

Per PDF §5 — different events route to different recipients. Today only some are wired.

| Event                                                | Route to                            | Channel                     |
| ---------------------------------------------------- | ----------------------------------- | --------------------------- |
| Status `not_started → waiting_on_client`             | Client contact                      | Email (templated)           |
| Status `waiting_on_client → blocked` (auto)          | Owner + Preparer                    | In-app bell                 |
| Parent `completed` → child unblocked                 | Preparer (assigned to child)        | In-app bell                 |
| `filed → rejected` (e-file)                          | Owner + Preparer + Manager          | In-app bell + email         |
| `filed → completed`                                  | Owner + Client contact              | Email (filing confirmation) |
| Statutory deadline date changed (state announcement) | All affected obligations' assignees | In-app bell + Pulse alert   |
| Days-until-due crosses T-7 / T-1 thresholds          | Owner + Preparer                    | Morning digest email        |
| Deadline readiness grows >20%                        | Owner                               | In-app bell                 |

---

## 9. Cross-page flows the row participates in

```
Pulse alert "NY extended Form CT-3-S due date"
       │
       ▼
Click "Apply to 6 affected clients"
       │
       ▼
Obligations queue · filter pre-applied · bulk-action bar visible
       │
       ▼
Confirm bulk extension → 6 rows mutate · 6 audit events · 6 email notifications
```

```
Client detail page · /clients/:id
       │
       ▼
Obligation list (same shape as queue rows, scoped to one client)
       │
       ▼
Click row → drawer opens · same drawer as the queue
       │
       ▼
Take action · client detail refreshes
```

```
Rule library · /rules/library · click rule
       │
       ▼
See: obligations generated by this rule (read-only list)
       │
       ▼
Click obligation → navigate to /obligations?id=...
```

```
Calendar view · /calendar (read-only ICS feed)
       │
       ▼
External calendar (Google / Outlook) shows obligations as events
       │
       ▼
Click event → opens /obligations?id=... in a browser tab
```

---

## 10. What this IA does NOT specify

- Detailed wireframes for the drawer (see [docs/Design/](../Design/))
- Exact pixel sizes, color tokens, spacing (see [DESIGN.md](../../DESIGN.md))
- Backend storage schema (see [packages/db/src/schema/obligations.ts](../../packages/db/src/schema/obligations.ts))
- Pulse / Radar product logic (see separate PRD when written)
- Onboarding / migration wizard for first-time firms

---

## 11. State / local rule taxonomy (PDF §6.5)

State and local rules can never be assumed equal to federal. PDF §6.5 enumerates 9 distinct state/local rule types that need independent rule entries:

```
1. State income tax
2. State extension
3. State estimated tax
4. State franchise tax
5. State annual report
6. State payroll withholding
7. Local business tax
8. City gross receipts tax
9. Sales tax
```

**Coverage strategy** (PDF §6.5 recommendation):

```
Federal verified rules
+ firm custom state/local deadlines      ← lets the firm add what we haven't verified
+ selected verified states               ← pre-built packs for high-volume states (CA, NY, TX, FL)
+ 50 states + DC + local jurisdictions   ← long-tail, future
```

Each rule entry in the catalog binds to one obligation type per jurisdiction. So "NY state income tax for 1120-S filer" is ONE rule that generates ONE obligation row per matching client per tax year.

---

## 12. Implementation map

For each PRD §7 requirement, the IA implications:

| PRD requirement                               | IA artifacts needed                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6-state taxonomy                              | URL `status` enum updated · facets `statuses` field · status pill component                                                                                                                 |
| K-1 dependency                                | `Obligation.blocked_by` schema field · `updateBlockedBy` RPC · BlockedBy chip on row · parent navigation flow                                                                               |
| Rejection sub-flag                            | E-file event handler · `Rejected` chip on row · audit event subtype                                                                                                                         |
| Type-aware rendering                          | Row component branches on `obligationType`; drawer tabs conditionally render                                                                                                                |
| Generate payment/deposit/info obligations     | Rule catalog → obligation factory · new test fixtures · scope tab count includes them                                                                                                       |
| Three-class deadline display                  | Schema field for firm-internal deadline (currently overloaded into `currentDueDate`)                                                                                                        |
| Timeline tab + milestone notes                | `MilestoneNote` schema · `addMilestoneNote` / `listMilestoneNotes` RPCs · Timeline tab component                                                                                            |
| Smart-priority as implicit sort               | Drop "Priority" column · default sort = `smart_priority` · keep current behavior                                                                                                            |
| Source-backed deadlines (PDF anti-pattern #6) | Rule carries `source_url` + `source_excerpt` + `verified_by_user_id` + `verified_at`; row's audit row links to the rule version that produced the deadline                                  |
| Form 8879 workflow (PDF §3.6)                 | `EfileAuthorization` entity (`form_type: 8879\|8879-PE\|8879-S\|8879-CORP`, `signed_at`, `signed_by_client_email`, `evidence_file_id`); blocks `in_review → filed` transition until present |
| State / local 9-type coverage (PDF §6.5)      | Rule catalog filterable by `rule_kind: state_income\|state_extension\|state_estimated\|state_franchise\|state_annual_report\|state_payroll\|local_business\|city_gross_receipts\|sales`     |
| Due-date rule formula (PDF §6.1)              | Rule stores `due_date_rule` as `{months_after_year_end: 3, day_of_month: 15}` rather than a hard-coded date; calculator applies weekend/holiday rollover (PDF §6.2)                         |

---

## References

- PRD: [docs/PRD/obligation-row-PRD.md](../PRD/obligation-row-PRD.md)
- Design brief: [docs/Design/obligation-lifecycle-design-brief.md](../Design/obligation-lifecycle-design-brief.md)
- Current contracts: [packages/contracts/src/obligation-instance.ts](../../packages/contracts/src/obligation-instance.ts), [packages/contracts/src/obligation-queue.ts](../../packages/contracts/src/obligation-queue.ts)
- Page implementation: [apps/app/src/routes/obligations.tsx](../../apps/app/src/routes/obligations.tsx)
- Previous product IA reference: `/Users/yuqi/Documents/_GitHub/DueDateHQ/files/duedatehq-ia-flows.md`
- Canonical product spec: `/Users/yuqi/Desktop/desktop/DueDateHQ_dashboard/files/美国小型会计事务所报税种类、流程与规则产品指南.pdf`

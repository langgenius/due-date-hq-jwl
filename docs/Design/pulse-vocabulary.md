# Pulse alert vocabulary — single source of truth

**Date:** 2026-05-21 (revised 2026-05-22)
**Status:** Canonical. Every Pulse mount must conform to this doc.

> **2026-05-30 — superseded for the user/frontend split.** The product now uses
> **one word everywhere a person reads it: "Alerts"** — user-facing copy _and_
> the frontend code layer (`apps/app/src/features/alerts/`, components, hooks,
> route `/alerts`). `pulse` survives only as the **engine name at the boundary
> users never see**: DB tables (`pulse_*`), contract schemas (`Pulse*`), the
> `orpc.pulse` RPC namespace, ports, and server jobs. The engine/dev-side tables
> below still apply to that layer; the "surface label" guidance below is now
> simply "Alerts." See `docs/dev-log/2026-05-30-alerts-rename-and-action-trim.md`.
> Note: the **Dismiss / Snooze / Archive** actions described below were removed
> from the UI on 2026-05-30 — `Mark reviewed` is the single clear-without-apply path.

## 2026-05-22 revision — engine name vs surface label

The "Always 'Pulse alert' (singular noun)" rule below was written before
the sidebar IA settled on **"Alerts"** as the primary nav label. Both
are correct in their own scope:

- **"Pulse"** = the **internal engine name**. Used in code paths
  (`apps/server/src/jobs/pulse-ingest/`), ports (`packages/ports/pulse.ts`),
  contract schemas, server logs, dev fixtures, and developer-facing
  docs. Devs see this. Users do not.
- **"Alerts"** = the **only user-facing surface label**. Used in the
  sidebar nav, page title (`/rules/pulse` → `<title>Alerts</title>`),
  breadcrumb, the bell popover header, command-palette entries, and
  any user-visible button copy.

The "Pulse alert" noun form ("3 unread Pulse alerts") is now reserved
for cases where ambiguity is real — e.g. a long-form email that has to
distinguish Pulse-engine alerts from other notification types. In
ordinary chrome, just say "Alerts."

This doc's tables below are kept for the engine/dev side. When in
doubt: sidebar = "Alerts", code = "pulse".

## The problem this solves

Pulse alerts appear on 7+ surfaces today, each using slightly different
vocabulary, icons, severity scales, and dismissal verbs. A junior preparer
cannot tell whether "Pulse alert" (Inbox), "Pulse Changes" (`/rules/pulse`),
"Pulse updates" (email preferences), and the unlabeled warning strip
(Dashboard banner) refer to the same thing. They do.

This doc fixes the words, the icons, the severity scale, and the actions.
Every Pulse surface refactor lands by conforming to this table.

## The name

**Always "Pulse alert" (singular noun).** Plural "Pulse alerts."

Banned synonyms — every occurrence below must be renamed:

- ❌ "Pulse Changes" → ✅ "Pulse alerts" _(AlertsListPage.tsx H1)_
- ❌ "Pulse updates" → ✅ "Pulse alerts" _(notifications-page email prefs)_
- ❌ "Pulse change" → ✅ "Pulse alert"
- ❌ "Heartbeat strip" → ✅ "Pulse banner" (internal-only term, never user-visible)

The word "Pulse" by itself is the **system name** (like "Inbox," "Audit log").
"Pulse alert" is the **artifact** the system produces. Don't conflate them.

## The identity icon

**`PulsingDot`** is the visual marker of "this is a Pulse alert."

It carries tone via the `tone` prop:

| tone      | when                                             | semantic                          |
| --------- | ------------------------------------------------ | --------------------------------- |
| `warning` | open alert with practice impact                  | "act on this"                     |
| `info`    | open alert, no practice impact OR low confidence | "FYI — review when you have time" |
| `success` | dismissed / applied / no longer open             | "this is settled"                 |
| `error`   | malformed alert / parsing failed (rare)          | "investigate; not actionable yet" |

**Do not use** generic `AlertTriangleIcon`, `AlertCircleIcon`, or `InfoIcon`
to label a Pulse alert. Those are for non-Pulse alerts (system errors,
form validation, etc.). The `PulsingDot` is what makes a Pulse alert
visually identifiable across surfaces.

Source watcher diagnostics are not Pulse alert severity. Do not label fetch or
parser failures as "Source needs attention" in CPA-facing Pulse surfaces; only
successful regulatory changes belong in Pulse review.

## The severity scale

**Three levels. Map all conditional rendering to these.**

| level           | display tone  | source-of-truth predicate                                                   | example                                                                        |
| --------------- | ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `urgent`        | warning       | `open && matchedCount + needsReviewCount > 0 && confidence ≥ LOW_THRESHOLD` | "Texas raised the franchise tax filing threshold; 12 clients may be affected." |
| `informational` | normal / info | `open && (impacted === 0 OR confidence < LOW_THRESHOLD)`                    | "California announced new e-file mandate; 0 clients impacted."                 |
| `resolved`      | success       | dismissed, snoozed-and-not-yet-due, or applied                              | "Applied to 12 clients · undo within 24h"                                      |

**Do not invent a fourth level** ("critical," "high," "medium"). The
predicate above captures what matters.

Confidence label ("Low AI confidence · Review before applying") is a
**sub-label** on the card body, not a severity. It can appear on either
`urgent` or `informational` alerts.

### Canonical implementation: `pulseAlertTone()`

> File: `apps/app/src/features/pulse/pulse-alert-tone.ts`

Every site that renders a `<PulsingDot>` for a Pulse alert MUST go
through this helper so the same alert produces the same colour
across surfaces. The function takes the alert (only `confidence`,
`matchedCount`, `needsReviewCount`, and `firmStatus` are read) and
returns one of the `PulsingDotTone` literals.

It maps the table above onto the `PulsingDot` tone palette:

- `urgent` → `warning`
- `informational` → `normal`
- `resolved` → `success`
- (parse failures / malformed → caller passes `error` directly)

A companion `pulseAlertToneLabel(tone)` returns the one-sentence
explanation rendered as both the dot's `title` (hover tooltip) and
`aria-label` (screen reader). Pair the two so colour and copy
always agree.

#### History

`pulseAlertTone()` was introduced 2026-05-25 (Phase 1 of Yuqi's
89-item review) after the FL DOR alert showed a green dot on the
dashboard's `NeedsAttentionCard` but a red dot in the
`PulseDetailDrawer` for the **same alert**. Three render sites had
each computed their own tone from slightly different signals. The
helper now collapses them onto one formula and one label.

The first revision of this helper escalated low-confidence alerts
to `error` (red) — that preserved a bug in the old `drawerTone()`
that contradicted this severity scale. Corrected the same day to
match the doc: **low confidence demotes urgent to informational**,
not the other way around. The accompanying "AI 46%" badge already
flags AI quality; the dot's job is alert urgency.

## PulseDetailDrawer layout

> File: `apps/app/src/features/pulse/PulseDetailDrawer.tsx`

The drawer is the one place the CPA spends real reading time on a
Pulse alert (1–3 minutes per alert). Its layout is the source of
truth for what we surface and what order.

### Why a right-slide panel, not a full route

Pulse review is **list-driven**: the CPA sweeps through a list,
drills into each card, decides, moves on. A right-slide drawer
keeps the list visible during the decision, matching the
obligation drawer and client drawer patterns. A dedicated route
would interrupt the sweep. If alerts ever grow a multi-tab editor
or a long timeline we'll re-evaluate.

### Information order (top → bottom)

1. **Header** — pulsing dot (tone via `pulseAlertTone()`) + h1
   title at `text-xl`. The summary line is rendered only when it
   adds information beyond the title; otherwise dropped. Badge row
   sits BELOW the title at `text-sm`: source · status · source
   status · confidence (only when confidence is healthy — see #2).
2. **Affected clients** — moved to the FIRST body section. This
   is the question CPAs bring to the drawer ("does this hit my
   clients?"). When the list is empty, render an explicit message
   ("No clients matched this alert's scope. You can dismiss it or
   wait…") instead of silently hiding the section.
3. **AI confidence alert** (only when confidence < LOW_THRESHOLD)
   — single block that names the confidence percent AND explains
   what to do. The small `PulseConfidenceBadge` in the header is
   suppressed when this alert is showing so the same concept isn't
   shown twice.
4. **Structured fields** — `<PulseStructuredFields>` renders two
   `FactCard`s ("Source", "Scope") + a source-excerpt card. Each
   FactCard has a real `text-sm font-semibold` heading; facts inside
   live in a 3-column grid with labels stacked above values so the
   eye scans top-to-bottom within a column.
5. **Permission / source alerts** — Read-only view + Source
   revoked (when applicable).
6. **Suggested next step** — single contextual card whose copy
   tracks selection state. Used to show two cards (Apply + Copy
   draft); the Copy + Request review actions live in the persistent
   footer so we don't render them twice.
7. **Apply safety checklist** — only for `due_date_overlay` alerts.

### Footer — always-available actions

The persistent action bar carries: Copy email draft · Request
review · Undo (24h) · Reactivate · Dismiss · Snooze · Apply.
Selection-dependent actions (Apply) sit on the right; reversible
verbs (Snooze / Dismiss) sit middle; the persistent communication
helper (Copy email draft) sits left.

### History

This layout shipped as Phase 2 of Yuqi's 2026-05-25 89-item
review. The previous shape buried Affected clients under structured
fields, duplicated AI-confidence signals, used invisible section
labels (`text-xs uppercase` against same-sized body copy), and
rendered Copy / Request review actions in two places at once. Bug
inventory at the top of the dev-log entry for that commit.

## The action verbs

| verb              | meaning                                    | side effect                              | reversible?        | requires reason?                |
| ----------------- | ------------------------------------------ | ---------------------------------------- | ------------------ | ------------------------------- |
| **Review**        | open the detail drawer                     | none                                     | yes (close drawer) | no                              |
| **Apply**         | push the change to affected obligations    | mutation + audit + evidence              | yes via Undo (24h) | no                              |
| **Undo**          | reverse a recently applied Pulse           | mutation reverse + audit                 | no (after 24h)     | no                              |
| **Snooze**        | hide until a chosen time                   | sets snooze timestamp, audit row written | yes (Unsnooze)     | yes (reason captured for audit) |
| **Dismiss**       | hide as "doesn't apply to this practice"   | sets dismissed flag, audit row written   | yes (Reactivate)   | yes (reason captured for audit) |
| **Reactivate**    | restore a dismissed alert                  | clears dismissed flag, audit row written | yes                | no                              |
| **Mark resolved** | record that out-of-system action completed | sets resolved flag, audit                | yes                | no                              |

**Banned verbs** — refactor every callsite away from these:

- ❌ **"Hide"** — ambiguous between UI-only collapse and the audit-logged
  Dismiss. Replace with one of two specific verbs:
  - "Collapse" when the action only hides the local UI (banner minimize)
  - "Dismiss" when the action is audit-logged
- ❌ **"Acknowledge"** — implies a checkmark action without state change.
  If you mean "I've seen it," that's `Mark read` (and lives in the Inbox,
  not on the alert itself).

## Affordance ordering

When a Pulse alert surface exposes actions inline, render them in this
canonical order, left-to-right:

1. **Snooze** _(secondary, softer dismissal — requires reason)_
2. **Dismiss** _(secondary, destructive-ish — requires reason)_
3. **Review** _(primary, rightmost)_

`Apply` belongs in the detail drawer (it's a workspace action, not a
glance one).
`Undo` is **never** in the primary affordance list — it lives in the
post-Apply toast and in the audit log row.

**Intentional exception — dashboard "scan-and-act" tile** (`NeedsAttentionCard`).
The whole card _is_ the Review target — clicking anywhere opens the drawer
where the full action set lives. Surfacing extra buttons would conflict
with this whole-card-as-button pattern and add clutter to a glance
surface. The drawer remains the canonical workspace for all four verbs.

## Surface-by-surface mapping

| Surface                             | Name                                            | Icon                            | Severity scale                                | Dismissal                         | Notes                                                   |
| ----------------------------------- | ----------------------------------------------- | ------------------------------- | --------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| Sidebar entry                       | "Inbox" (not Pulse-specific)                    | InboxIcon                       | numeric count                                 | n/a                               | The Inbox aggregates Pulse + reminders + system updates |
| Dashboard banner                    | (no title; PulsingDot + meta)                   | PulsingDot                      | warning/info/success                          | Collapse (UI-only)                | Inline summary; "Review" jumps to drawer                |
| Dashboard section                   | "Pulse alerts"                                  | PulsingDot                      | warning/info/success                          | Collapse + per-card actions       | Section header; cards inside use canonical actions      |
| Dashboard tile (card)               | (alert.title)                                   | PulsingDot + alert source label | per `urgent/informational/resolved` predicate | Review + Snooze + Dismiss         | Tile = standalone interactive                           |
| /rules/pulse page                   | "Pulse alerts"                                  | PulsingDot in page eyebrow      | filter by status (open/snoozed/dismissed)     | per-row actions                   | List page; sortable, filterable                         |
| Pulse alert card (shared component) | (alert.title)                                   | PulsingDot + source label       | `urgent/informational/resolved`               | Review + Apply + Snooze + Dismiss | Used by dashboard tile + list page                      |
| Detail drawer                       | (alert.title in drawer header)                  | (drawer chrome)                 | severity badge from card                      | Same 4 actions in toolbar         | Workspace for one alert                                 |
| Inbox notification                  | "Pulse alert" (type label)                      | (Inbox row icon)                | unread / read                                 | Mark read + Open                  | Aggregated; clicking opens drawer                       |
| Audit log row                       | "Pulse alert dismissed" / "applied" / "snoozed" | (audit row chrome)              | action-typed                                  | n/a (already an audit event)      | Past tense — these are completed events                 |
| Email digest                        | "Pulse alerts"                                  | (email template)                | bucket count                                  | (email-only)                      | Same name everywhere                                    |

## Implementation plan

Each surface listed above needs to conform. Refactor order (least risky to
most risky):

1. **Rename strings.** "Pulse Changes" → "Pulse alerts" on
   `AlertsListPage.tsx`. "Pulse updates" → "Pulse alerts" on
   `notifications-page.tsx`. One commit. No behavioral change.
2. **Replace "Hide" with "Collapse" or "Dismiss"** based on whether the
   action is UI-only or audit-logged. Audit each callsite individually.
3. **Standardize severity icon usage.** Replace standalone
   `AlertCircleIcon` / `AlertTriangleIcon` / `InfoIcon` on Pulse surfaces
   with `PulsingDot tone={…}` per the severity scale.
4. **Surface Snooze as a first-class action** everywhere Dismiss appears.
   Right now Snooze exists only in the detail drawer; the card and the
   banner skip it, forcing users to open the drawer for the most common
   action.
5. **Unify the "no practice impact" rendering.** Today some surfaces
   render `impacted === 0` as `tone="success"` (Dashboard banner) and
   others as `tone="warning"` (list page). Per the scale, this case is
   `informational` (info tone) — change both.

## Don't break

- The `PulsingDot` primitive itself is good — keep its API surface.
- The 24h Undo affordance on Apply is good — keep it. Don't fold it into
  Dismiss.
- The reason-required-on-Dismiss-and-Snooze pattern is good (audit hygiene)
  — keep it. Just standardize the prompt copy across mounts.
- The sidebar Inbox unread count is correct — leave it alone.

## Open questions (parked, not blocking)

- Should the email digest aggregate by severity or by recency? Today it's
  by recency. Severity-first would surface urgent alerts before
  informational ones. Decide in a follow-up.
- Is "Mark resolved" a needed verb, or does Dismiss-with-reason="resolved"
  cover it? Lean toward dropping Mark resolved unless the audit log needs
  the distinction.

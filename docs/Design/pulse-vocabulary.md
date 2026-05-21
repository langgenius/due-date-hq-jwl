# Pulse alert vocabulary — single source of truth

**Date:** 2026-05-21
**Status:** Canonical. Every Pulse mount must conform to this doc.

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

Exception: `AlertTriangleIcon` may appear _inside_ a Pulse alert card to
label the **severity sub-label** "Source needs attention" — that is, the
icon decorates a sub-claim, not the alert's identity.

## The severity scale

**Three levels. Map all conditional rendering to these.**

| level           | display tone | source-of-truth predicate                                                   | example                                                                        |
| --------------- | ------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `urgent`        | warning      | `open && matchedCount + needsReviewCount > 0 && confidence ≥ LOW_THRESHOLD` | "Texas raised the franchise tax filing threshold; 12 clients may be affected." |
| `informational` | info / muted | `open && (impacted === 0 OR confidence < LOW_THRESHOLD)`                    | "California announced new e-file mandate; 0 clients impacted."                 |
| `resolved`      | success      | dismissed, snoozed-and-not-yet-due, or applied                              | "Applied to 12 clients · undo within 24h"                                      |

**Do not invent a fourth level** ("critical," "high," "medium"). The
predicate above captures what matters.

Confidence label ("Low AI confidence · Review before applying") is a
**sub-label** on the card body, not a severity. It can appear on either
`urgent` or `informational` alerts.

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

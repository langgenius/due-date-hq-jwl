# Alerts vocabulary - surface/engine split

**Date:** 2026-05-21 (revised 2026-05-30)
**Status:** Canonical. Every source-backed regulatory review surface must conform to this
doc.

This file keeps its historical name because older notes link to it. The vocabulary inside is
current: the product says **Alerts** everywhere a person reads it. The engine may still say
`pulse` at boundaries users never see.

## Boundary

- **Alerts** = the user-facing and frontend product concept. Use this in sidebar nav, page
  titles, command-palette entries, dashboard sections, drawer copy, email/digest copy,
  marketing pages, and current design docs.
- **alert** = one source-backed regulatory item a CPA can review, apply, mark reviewed, or
  revisit in history.
- **`pulse`** = internal engine name only. It remains valid for DB tables (`pulse_*`),
  contract schemas (`Pulse*`), `orpc.pulse`, permission keys (`pulse.apply` /
  `pulse.revert`), ports, server jobs, raw error strings, dev fixtures, and legacy
  compatibility flags such as `mockPulse`.
- **`/rules/pulse`** = legacy URL only. It redirects to `/alerts` and should not be linked
  from new UI.

When in doubt: user-facing copy = **Alerts**; engine/API/code boundary = `pulse`.

## Banned Visible Names

Do not use these in app copy or marketing copy:

- "Pulse"
- "Pulse alert"
- "Pulse Changes"
- "Pulse updates"
- "Radar"
- "signal" or "notification" when the user-facing object is really an alert

Allowed exceptions:

- Dev comments that explicitly describe the engine boundary.
- Contract/type names imported from packages, such as `PulseAlertPublic`.
- Historical dev logs and dated audit notes.

## Identity

`PulsingDot` is still the visual marker for source-backed alerts. The component name is a
generic motion word, not a product noun.

It carries tone via the `tone` prop:

| tone      | when                                             | semantic                          |
| --------- | ------------------------------------------------ | --------------------------------- |
| `warning` | open alert with practice impact                  | "act on this"                     |
| `info`    | open alert, no practice impact OR low confidence | "FYI - review when you have time" |
| `success` | reviewed, applied, reverted, or no longer open   | "this is settled"                 |
| `error`   | malformed alert / parsing failed (rare)          | "investigate; not actionable yet" |

Do not use generic `AlertTriangleIcon`, `AlertCircleIcon`, or `InfoIcon` as the main alert
identity marker. Those are for system errors, form validation, and non-alert notices.

Source watcher diagnostics are not alert severity. Do not expose degraded or failing source
health as CPA attention unless there is a reviewable alert.

## Severity

Map conditional rendering to these levels:

| level           | display tone  | source-of-truth predicate                                                    | example                                                                        |
| --------------- | ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `urgent`        | warning       | `open && matchedCount + needsReviewCount > 0 && confidence >= LOW_THRESHOLD` | "Texas raised the franchise tax filing threshold; 12 clients may be affected." |
| `informational` | normal / info | `open && (impacted === 0 OR confidence < LOW_THRESHOLD)`                     | "California announced a new e-file mandate; 0 clients impacted."               |
| `resolved`      | success       | reviewed, applied, reverted, or otherwise closed                             | "Applied to 12 clients - undo within 24h."                                     |

Do not invent a fourth level ("critical," "high," "medium"). Confidence is a sub-label on
the card body, not severity. Low confidence can appear on either urgent or informational
alerts.

The canonical helper is `alertTone()` in `apps/app/src/features/alerts/alert-tone.ts`.
It still consumes `Pulse*` contract types because the API boundary remains `pulse`.

## Drawer

The alert drawer is the one place the CPA spends real reading time on a source-backed alert
(1-3 minutes per alert). It is list-driven: the CPA sweeps through a list, drills into each
card, decides, and moves on. A right-side drawer keeps the list visible during the decision,
matching the deadline and client drawer patterns.

Information order:

1. Header - pulsing dot + title + badges.
2. Affected clients - first body section; this is the CPA's primary question.
3. AI confidence warning - only when confidence is below the threshold.
4. Structured fields - Source, Scope, and source excerpt.
5. Permission / source notices - read-only and revoked-source states.
6. Suggested next step - one contextual card.
7. Apply safety checklist - only for due-date overlay alerts.

Footer actions:

- Copy email draft
- Request review
- Mark reviewed
- Undo, when available
- Reactivate, for historical dismissed alerts
- Apply

`Dismiss`, `Snooze 24h`, and `Archive` were removed from the active UI on 2026-05-30.
Historical dismissed/snoozed records may still render in history because the backend and old
audit rows remain.

## Actions

| verb               | meaning                                      | side effect                  | reversible?     |
| ------------------ | -------------------------------------------- | ---------------------------- | --------------- |
| **Review**         | open the alert drawer                        | none                         | yes             |
| **Apply**          | push the reviewed change to matched work     | mutation + audit + evidence  | yes via Undo    |
| **Mark reviewed**  | clear without applying                       | audit row / handled state    | yes if reopened |
| **Request review** | ask an owner/manager to review               | notification + audit context | n/a             |
| **Undo**           | reverse a recently applied alert             | mutation reverse + audit     | no after 24h    |
| **Reactivate**     | restore a historical dismissed/reviewed item | clears handled state + audit | yes             |

Do not reintroduce "Hide" as a generic action. If the action only collapses local UI, call it
**Collapse**. If it changes the alert record, use a concrete audited verb.

## Surface Mapping

| Surface           | Name / label       | Primary affordance             | Notes                                      |
| ----------------- | ------------------ | ------------------------------ | ------------------------------------------ |
| Sidebar entry     | "Alerts"           | open `/alerts`                 | Badge counts active alerts only            |
| Dashboard section | "Alerts"           | card click opens drawer        | Shows reviewable alerts, not source health |
| `/alerts` page    | "Alerts"           | list + inline drawer           | `/rules/pulse` redirects here              |
| Alert card        | alert title        | Review / Apply when eligible   | Uses `PulsingDot` and source label         |
| Alert drawer      | alert title        | Apply / Mark reviewed / review | Primary reading and decision surface       |
| Bell notification | "Alert" type label | open drawer or mark read       | Bell still aggregates non-alert items too  |
| Audit log row     | "Alert applied"    | n/a                            | Past-tense event labels                    |
| Email digest      | "Alerts"           | email-only                     | Same name as the app                       |

## Implementation Guardrails

- Do not rename engine tables, contracts, RPC namespaces, permission keys, or raw error
  codes just to match surface copy.
- New UI routes and links should use `/alerts`; legacy `/rules/pulse` exists only for
  redirects and old deep links.
- New app copy should be extracted through Lingui and translated in `zh-CN`.
- Current marketing pages should say Alerts. Historical docs can keep old terms when they
  describe a past state.

# 2026-05-20 · Timestamped chevron + per-task mailbox + forms-catalog wiring + client tabs

## Summary

Three follow-ups to the prior client/drawer redesign, all landing in one
batch of three commits:

1. **e2aec09** — Path-to-filing milestones now show stage timestamps mined
   from audit events; per-task forwarding email panel added to the drawer.
2. **36e0424** — `SuggestedFormsCatalogPanel` wired to the real rule
   catalog (`rules.listRules`); `+ Add deadline` button calls
   `obligations.createBatch` with the rule's identifiers.
3. **(this commit)** — Client detail page restructured into
   **Work / Mailbox / Notes** tabs.

Together these complete the four follow-ups from the prior PR's deferred
list (only Form 8879 / Signature stage remains deferred to its own PR
with PRD update).

## Shipped in this commit (client page tabs)

The `ClientDetailWorkspace` body now wraps its panels in a 3-tab nav:

```
Lakeview Medical Partners  [PARTNERSHIP] [MA]
1 open filing · next due 2026-05-01 · 1 late

[ Work ] [ Mailbox ] [ Notes ]
─────────────────────────────────────────────────────
WORK (default)
- Filing plan (per tax-year groups)
- Forms catalog (gap analysis with Add deadline)
- Filing jurisdictions
- Risk inputs
- Fact readiness
- Future business cues

MAILBOX
- ClientMailboxPanel (per-client forwarding address)
- "Inbound messages — Phase 2" placeholder explaining what will live
  here when SMTP routing + AI threading lands

NOTES
- Client summary (AI) with Refresh
- Free-text notes section
- Activity log (audit events for this client)
```

Why split this way:
- **Work** holds everything that drives day-to-day execution. Default
  tab because that's what users open the client page to do.
- **Mailbox** is forward-looking — the address is here today; the
  inbound feed lands here in Phase 2.
- **Notes** consolidates narrative + audit — the "what is the story of
  this client?" surface.

State is plain React `defaultValue="work"` for now. Not URL-encoded; if
deep links to a specific tab matter later we can add a query param.

## Type-check + verify

- `npx tsgo --noEmit` → exit 0
- Verified all three tabs render in `/clients/<id>`: Work shows the
  filing plan + catalog + jurisdictions, Mailbox shows the address with
  Copy and Phase 2 placeholder, Notes shows summary + notes + audit
- `<Tabs>` primitive from `@duedatehq/ui/components/ui/tabs` — same
  component used by the obligation drawer

## Still deferred

- **Form 8879 e-file authorization / Signature stage in chevron** — adds
  a new status (`awaiting_signature` or extends `efileState`) and a new
  audit-event subtype. Substantial enough to warrant its own PR with a
  PRD §7.2 Should update. Until then the Signature milestone in the
  chevron always renders as "Done" once Preparing has been passed
  (because the lifecycle index goes pending → waiting → review →
  done without a dedicated Signature anchor).
- URL-persistent tab state on the client page (Phase 2 nice-to-have).
- Wider rule-applicability matching (the current filter only covers
  federal + matching states; doesn't yet consider tax_classification
  for LLCs that have elected partnership / s-corp / c-corp).

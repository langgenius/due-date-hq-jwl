# Clients — full-flow polish sweep (2026-06-16)

Yuqi: "continue to work on clients — all of the clients page." Picking up
after the /critique pass, this sweep covers the dialogs/panels/secondary
surfaces I hadn't deep-polished, driven by a focused inventory.

## Shipped
1. **Empty-state fiction removed** (`ClientsEmptyState`). Dropped the
   OutcomeStat band — "4 min average import" (no telemetry backs it) and
   "SOC 2 compliant" (a compliance/legal claim) were fiction on an app
   surface; "11 tools supported" duplicated the body copy (which already
   enumerates the tools + "6 more") and the logo strip. The logos + headline
   + copy carry the reassurance honestly. Removed the now-unused
   `OutcomeStat` component + Timer/Layers/ShieldCheck/ReactNode/useLingui
   imports.
2. **Empty-state DD tile back on scale** — `size-[52px]` → `size-12` (48,
   still a touch larger than the 44px source tiles), `shadow-md` →
   `shadow-sm` (restrained-shadows; the dark tile already pops on contrast).
3. **Compliance-posture chips off freelance radius** (`ClientCompliance
   PosturePanel`) — tax-attribute chips `rounded-md` (6, off-scale) →
   `rounded-full` (pill).
4. **Fix-needs-facts badge tone** (`FixNeedsFactsSheet`) — "Needs state" /
   "Needs entity" `variant="destructive"` (red = error/alarm) →
   `variant="warning"`, matching the readiness taxonomy elsewhere
   (`ClientPeekHoverCard` treats needs_facts as warning). These are
   setup-incomplete prompts, not errors.
5. **Double tooltip removed** (`ClientFactPanels` RiskProfileSmartPriorityHelp)
   — dropped the native `title={helpText}` that fired alongside the
   `TooltipContent` (same text, two tooltips on hover).
6. **Tax-classification progressive disclosure** (`ClientFactPanels`
   ClientClassificationPanel) — the audit Reason / effective-year / Note
   fields and the Review-impact / Cancel buttons now appear only once the
   entity type actually changes (gated on the existing `hasChanges`). At
   rest the panel is just the Entity-type selector + a one-line hint
   explaining the flow. The Setup tab reads far calmer; nothing to reason
   about or note until there's a change to audit.

## Verified-then-left-alone
- **EmailComposeDialog** is fully dead code — not mounted, not imported (only
  a comment in `ClientDetailWorkspace` documents it as an intentional stub
  for when `messages.send` lands). Not on canvas, so left as the documented
  stub rather than polishing a non-rendered 1120px modal.
- **CreateClientDialog / ClassificationImpactDialog / ClientCombobox** —
  clean (real RPCs, correct primitives, honest counters). No changes.

## Notes
- tsgo clean; Setup tab verified live (classification at-rest now just the
  selector + hint; posture chips are pills). Empty state not visually
  verifiable in the seeded demo (needs a zero-client firm) — change is a
  straight removal + scale fix.
- Source-only commit; i18n catalog regen deferred to the end of the sweep.

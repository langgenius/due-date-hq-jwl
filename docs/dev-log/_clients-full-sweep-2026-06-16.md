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

## Empty-state fidelity to Pencil jQFBx / T4eNmw
Yuqi: /design-critique + /critique the clients flow against Node IDs
T4eNmw, jQFBx.

Both nodes are the /clients empty state — `jQFBx` ("empty state", the
canonical/primary) and `T4eNmw` ("empty (skipped import)", a variant).
Pulled both from Pencil and compared to the live `ClientsEmptyState`.

Findings that mattered:
- The live state already matches `jQFBx`'s headline/body/CTA/sample-chip
  copy verbatim, and `jQFBx` has **no stat band** — so removing the
  "4 min / SOC 2 / 11 tools" stats (earlier this sweep) was correct, not a
  regression. `T4eNmw`'s strip is actually a **3-step process** ("Export →
  AI maps & confirm → Done"), i.e. teaching, not metrics — the live code's
  stats had drifted from that into fiction.
- Two real fidelity gaps closed (to `jQFBx`):
  1. **"● Get started" eyebrow** pill above the integration strip (accent
     dot + 11/600 secondary, bordered 999-radius).
  2. **Subtle top brand wash** — `from-state-accent-hover-alt/45` →
     transparent over the card top (a theme token, so it adapts to dark
     mode; the mock's #eff4ff hardcode would not). Card wrapped
     `relative overflow-hidden`; content sits in a `relative` inner column.
  3. DD destination tile shadow `sm`→`md` so it pops as the import endpoint
     (canonical intent).
- Kept real logos on neutral tiles (better than the mock's tinted
  placeholders); left the 3-step teaching strip out of the primary state
  (it belongs to the `T4eNmw` variant, which the live code doesn't split).
- Card radius stays `rounded-xl` (12) — the mocks freelance 18/14, so the
  live token scale is the more consistent choice; not matched.
- Verified live via a throwaway `/preview` specimen (the empty state needs a
  zero-client firm to render normally); specimen reverted. tsgo clean.

## Notes
- tsgo clean; Setup tab verified live (classification at-rest now just the
  selector + hint; posture chips are pills). Empty state not visually
  verifiable in the seeded demo (needs a zero-client firm) — change is a
  straight removal + scale fix.
- Source-only commit; i18n catalog regen deferred to the end of the sweep.

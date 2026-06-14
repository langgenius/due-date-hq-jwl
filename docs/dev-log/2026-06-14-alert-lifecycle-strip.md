# 2026-06-14 — Alert detail: lifecycle strip in the hero

Yuqi: "put the strip in the hero" + "make the process clear" + "my eyes don't
know where to go."

New `AlertLifecycleStrip` (AlertDetailDrawer.tsx) — a one-line stepper in the
hero, below the key fact, above a hairline + the tabs:

✓ Monitored · ✓ AI parsed 94% · ✓ Matched 1 · ◉ Your decision · ○ Applied

- First three nodes: auto + done (check, tertiary ink). They show the system
  did the work (parse confidence %, matched client count).
- "Your decision": the ONE human step — accent dot + accent label = where the
  eye should land. This doubles as the answer to the Confirm/Exclude→Apply
  confusion (the decision node IS that step).
- Final node: a future ring ("Applied") while open; flips to a check and
  relabels for terminal states (Applied / Dismissed / Reverted / Reviewed).
- Connectors: solid hairline between done steps, lighter before the future
  step. Wraps gracefully; hides when the header collapses on scroll.

Drives the real pipeline (per the code trace): monitor sources → AI extract +
confidence → match firm obligations → firm review & apply → audit.

Verify: tsgo clean; live on 5173 — nodes render in order, "Your decision"
accent, sits in the SheetHeader hero.

# 2026-06-12 — /alerts: layering by line + type + color, not fills

Yuqi: "grayish, flat hierarchies, no focus, no highlights, nothing strong…
instead of using gray to separate things, try other design methods to organise
and add layering — but definitely not shadows" + "the right panel is white,
gray, white, gray — so bad UI."

Diagnosis: layering was built with FILLS (gray wash → white card → gray box →
white grid → gray quote). Two alternating mid-tones give no figure/ground —
everything reads equally important. Ink contrast was timid and the restraint
passes had removed every chromatic anchor.

## The replacement system (no shadows, no fill-separation)

- **One white surface.** Detail body wash, spy-nav bg, pending banner, card
  header bands — all white. Structure comes from hairlines + the spacing
  rhythm.
- **DetailSectionCard** (shared component): the gray header band → title over a
  bottom hairline. Cards are hairline-outlined regions on white, not white
  islands on gray.
- **Callouts = left rules.** Action-deadline (2px warning rule), legal
  uncertainty + threshold note (neutral rule), source quote (classic
  bar-quote). Zero filled slabs; the deadline-change hero sits flat — its BIG
  mono date pair carries the emphasis through type.
- **Hierarchy = ink contrast.** List-row titles 500 → 600 (the one big jump
  per row); support text stays tertiary/muted.
- **Focus = one accent per unit.** The suggested-action VERB is the row's
  single chromatic anchor (accent = do-this, the app-wide semantic); the
  detail keeps the countdown as its one hot cue + the accent spy nav.

## Verify

tsgo clean (other session's in-flight /today files excluded). Verified on a
separate preview instance (5189 — the shared tab is driven by the /today
session): row title weight 600, verb rgb(21,90,239); detail body + banner
white; card header transparent + 1px hairline-bottom; deadline callout 2px
left rule (warning), quote 2px rule — all fills transparent.

# Marketing home — hero proof-list entrance (2026-06-26)

Yuqi on the hero proof `ul`: "what can you design for this? like scroll interaction to
appear or something."

The list sits right at the bottom of the fold (fully visible on load at 1512×861), so a
scroll trigger would never fire. Designed an **in-view assemble** instead: the four proof
ticks rise + fade up in reading order (~80ms apart) and each icon scale-pops a beat behind
its row — reads like the monitor ticking each proof off, tying the motion to the section's
meaning ("we watch / you see / every date / 3 months").

Pure CSS in `Hero.astro` (`heroTickIn` row + `heroTickIcon` icon keyframes, nth-child
delays). Deliberately:

- **No-JS safe** — CSS animations run without scripts.
- **Flash-free** — `animation-fill-mode: both` holds each tick hidden until its delay, so
  nothing paints visible then jumps away.
- **Reduced-motion safe** — the whole hidden-then-animate block is gated behind
  `@media (prefers-reduced-motion: no-preference)`, so reduced-motion users get it at rest.

Plays on first load and on every View-Transition return to home (fresh DOM re-triggers it).
Build clean. No new console errors (the only dev-console noise is the Agentation overlay
failing to fetch from esm.sh — dev-only, unrelated).

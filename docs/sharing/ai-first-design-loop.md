# Designing in the real product: an AI-first loop

_A short writeup of how I actually work — shareable beyond this team._

Most design tools optimize the wrong thing. They make it easy to draw a picture
of a product. But a picture isn't the product, and the gap between the two —
handing a static comp to engineering and hoping it survives contact with real
data, real constraints, and real edge cases — is where most of the quality leaks
out.

My working belief: **the more tools you stack into a design workflow, the more it
costs you.** Every handoff — sketch to comp to prototype to redline to code —
loses time and fidelity. So I collapsed the loop, and I start and end in the real
codebase.

## The loop

1. **First version in Claude Code.** I generate a working first cut _in the app_ —
   real components, real data, real backend constraints — not a static mock. In
   minutes I have something I can click, not just look at.
2. **Research.** I ground it: the product model, the domain (for us, CPA tax &
   compliance), competitors, and — critically — what the backend can actually
   support today versus what I'd be inventing.
3. **Refine in Pencil.** I take it into a design tool for the _one_ step where a
   design tool earns its place: pushing visual and interaction craft, exploring
   alternatives, raising fidelity without code friction.
4. **Back to Claude Code.** I bring the refined design home and ship it as
   production code.

The loop is tight on purpose. There's no comp to hand off and lose, because the
comp and the build are the same artifact.

## Why it works

**It kills fiction.** The moment you design against the real backend, you find out
what's actually there. On this product, that's how I caught that a whole tab was
mostly placeholder — you can't draw an honest empty state from inside a mock,
because the mock will happily show you data that doesn't exist. It became a rule
we enforce at the data layer: _no provenance, no render_ — if the system can't
cite a fact, it says "not verified yet" rather than showing a confident guess.

**It closes the design↔code gap by construction.** Decisions that are
_simultaneously_ design and architecture — "status is observed from events, not
chosen from a dropdown," "this count must be identical on every surface" — don't
get lost in translation, because there's no translation step. One person holds
both ends, so the nuance survives.

**It changes what the scarce skill is.** When building gets this cheap, the
bottleneck stops being "can I make it" and becomes "_should_ this exist." Taste,
restraint, and systems thinking become the constraint — which is exactly where a
designer's judgment should be spent. Most of my design system is written as rules
that _resist_ the temptation cheap building creates: a fixed type scale, one
canonical primitive per pattern, gray-not-green for the calm state.

## What it demands of you

- **Documentation discipline.** Moving this fast means the _why_ evaporates unless
  you capture it. A dev-log entry per change isn't bureaucracy; it's memory.
- **Knowing when to stop.** Cheap iteration tempts infinite iteration. The
  discipline is to lock a decision, write down the reason, and stop reopening it —
  and to run periodic drift audits that re-converge everything to canon. The
  signal I use: _when an edit stops making a decision clearer and just moves
  pixels, I'm done._
- **A seatbelt.** Fast + AI-paired means real git hygiene: scoped conventional
  commits, a linear history, and a backup branch before anything risky.

## The one-line version

A designer who works in code, using AI to go from idea → working software → refined
craft → shipped — so the design _is_ the build, and nothing on the canvas is
fiction.

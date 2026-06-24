# Marketing landing — 33-point feedback pass (2026-06-23)

A full-landing polish pass against a 33-item feedback batch (the Agentation
page-feedback widget), worked component by component. All changes land on the
`apps/marketing` `--m-*` token tier; EN + zh-CN kept in parity.

## Nav (TopNav.astro)

- Collapsed pill **holds total header height at 70px** end-to-end: the float-gap
  `padding-top` (0→14px) and the inner `height` (70→56px) now share the same
  0.45s timing, so 14+56 stays 70 through the whole morph — no bulge, no shift.
- Collapsed inner inset evened to `8px` all round; nav-link padding `8px 14px`.
- The CTA becomes a **ghost button** when collapsed (transparent fill, accent
  border/text; white-outline variant over the dark villain band).

## Hero (Hero.astro)

- Lede rewritten in a CPA's register ("monitors the IRS, all 50 states, and FEMA
  disaster postponements… the official notice behind it").
- Four bullet icons now **meaning-matched** (eye=watch · users=clients ·
  link=source · gift=free beta) instead of four identical checks.
- Primary CTA → pill radius, slightly shorter; secondary CTA gains an open-book
  icon and points at the real `/how-it-works` page.

## Villain (Villain.astro) + How-it-works merge

- The dark band is now a **problem→answer pivot**: left states the dread
  (stronger tagline, the three pains condensed into one line); right turns it
  with the three capabilities (import · monitor · match) + a link to the
  how-it-works page. This **absorbs the standalone HowItWorks section**, which is
  removed from both home routes (the component file is now orphaned).

## Spyrail (ScrollRail.astro)

- Dash-collapse pattern: inactive items show only a short dash; the active item
  shows its label; hovering the rail reveals every label (inactive in gray).
  Smooth dash-grow + label-open transitions. Labels now echo the real on-page
  section names; the dead "The loop" (→ removed #how) entry is gone.

## Surfaces (Surfaces.astro) — now interactive

- **Spotlight tour**: auto-advances through the four panels (others recede),
  syncing the caption rail, then hands control to hover/focus — making "four
  surfaces, one workbench" tangible. Pauses on interaction; off under reduced-motion.
- **Jurisdiction tabs** (Federal/Texas/CA/FL) are real controls that swap the
  lead alert; variants are stacked in one cell so the panel height is constant
  (verified 384px across all four) — no jump.

## Notice (Notice.astro)

- Dropped the excessive "See another example" cue; tabs are now discrete
  **bordered pill buttons** (accent-tinted when active). "Posted · source" moved
  beneath the org name. Fields top-align (beam stays centered); tighter padding.

## Sources (Sources.astro)

- The map now reads as **watched live**: a faint cyan scan-pulse sweeps the
  country diagonally (staggered by row+col), matching the "around the clock"
  caption. Bolder tile hover (lift) + selection spotlight (others recede). Map
  column **stretches to fill** the feed's height. The random agency-chip list is
  removed (the lead + live feed already prove coverage).

## Compare (Compare.astro)

- Removed the H2 that repeated the lead; the lead is now a serif **deck**. Cut a
  redundant matrix row; removed all "by design" framing — DueDateHQ's
  practice-management cells are honest dashes, not a preachy pill.

## FAQ (Faq.astro)

- Full-width **editorial split**: title left, accordion right (was capped 760px).

## Close (Close.astro)

- Stronger, grammatical finale headline ("…you'll _know exactly who_", bookending
  the hero). Fixed the awkward "finding out from your client" line → "Never the
  last to know." The audit **receipt moved into the navy card's right side**,
  redesigned as a white paper receipt (perforated tear edge).

## Global motion (ScrollMotion.astro + marketing.css)

- New opt-in `[data-reveal-stagger]`: a container's direct children rise in with
  a stagger (villain capabilities, Surfaces caption rail). Fail-safe — children
  stay visible without JS / under reduced-motion; the on-load sweep covers
  in-view containers.

## Verification

- Build clean (200). Every point DOM-verified (nav height invariance, hero
  icons/radius, villain answer, spyrail dash, notice bordered tabs + posted
  placement, sources scan + stretch + no chips, compare deck + 0 narrow marks,
  FAQ 12-col, close 2-col card + receipt). Surfaces interactions tested live:
  jurisdiction tab swaps the alert (no jump), spotlight follows. Screenshot tool
  was unreliable this session; DOM measurement used as source of truth.

## Follow-up round (same day)

Five further asks after reviewing the pass:

- **Home active** — `current` now accepts `'home'`; both home routes pass
  `current="home"` so the Home nav link reads active (it's the current page).
- **Nav glider** — a single pill (`.nav__glider`) slides under the hovered link
  and rests at the active one, so moving across the nav is one continuous
  left↔right glide. Progressive enhancement (`.has-glider` drops the static
  active/hover backgrounds once JS runs; without JS the static bg shows).
  Repositions on hover, pill-leave, resize, collapse `transitionend`, and
  `fonts.ready`. Verified: rests on Home (w65@x4), slides to Coverage on hover
  (w87@x179), returns on leave. On-dark variant for the villain band.
- **Spyrail dash** — shortened (inactive 12→6px, active 22→13px); it was reading
  as a ruler, now a quiet hint.
- **Hero strengthened** — copy column reordered (CSS `order`, bullets carry no
  focusable elements so tab order is unaffected): hook → value → **CTA** →
  reassure → proof. The CTA rises above the bullets; the four bullets demote to
  a compact hairline-topped proof strip; headline pushed bigger + tighter
  (ceiling 76→84px, line-height 1, tracking -0.025em). Verified CTA(554) <
  reassure(612) < points(688).
- **Sitemap** — answered in chat (no code change): home, /how-it-works,
  /state-coverage, /pricing, /security, /compare/_, /rules + /rules/_,
  /guides/_, /states/_ + zh-CN mirror; `@astrojs/sitemap` already generates
  sitemap.xml (home is noindex/excluded).

### Nav-on-dark collapsed pill fix

The collapsed pill over the villain band had two bugs (caught in a screenshot):
the translucent fill let the villain's "How we keep you sure" eyebrow bleed
through (we run blur-free), and a CSS specificity collision rendered the CTA as
white-text-on-white-fill (invisible). Fixed: the on-dark collapsed `.nav__inner`
is now an **opaque** navy (`accent 56% / ink`, a touch lighter than the band, with
a soft elevation shadow), and `.nav--on-dark.nav--scrolled .nav__cta` explicitly
sets `background: transparent` so it's a white-outline ghost, not the inherited
white fill. (The expanded-on-dark pill is unreachable — the villain is always
below the collapse threshold — so no change needed there.)

### Calm-down round (simplify + de-noise)

Standing note: text on the dark band was too complex — keep it simple.

- **Villain text simplified** — tagline "A deadline moves — you find out when your
  client does."; painline cut to one line; cap subs shortened. The "See how it
  works" link is now a grounded ghost **button** (was a floating underline).
- **Bench interaction removed** — the auto-spotlight tour read as a useless
  gimmick; deleted it (JS + CSS). Kept only the purposeful jurisdiction filter
  (tabs still swap the lead alert, no jump — verified).
- **Map roaming scan removed** — the diagonal cyan scan-pulse was ugly; gone
  (animation, keyframes, stagger var, is-selecting spotlight all removed). The
  active tile is now a calm **cyan** fill — no shadow, no size change.
- **Compare lead** back to **Instrument Sans** (the serif deck wasn't as
  professional); emphasis by weight, not italic.
- **Security** — `.tstat` border was `--m-ink` (a near-black line) → hairline;
  tightened the stat/card/boundary rhythm so the section stops wasting space.
- **Nav** — removed the collapsed-pill shadow (both light + on-dark); lighter
  ghost-CTA border + quieter trailing arrow (0.6 opacity); more link padding
  (`8px 18px`, pill max-width 640→700).
- **Spyrail** — items closer (gap 14→11px), dash thinner (2→1.5px).
- **Close** — "Get a guided setup" → "Book a demo call".
- **Hero** — the secondary CTA's ugly inset-underline hover → a soft pill fill.
- **Compare claims (#6)** — reviewed each cell for defensibility (they hold by
  product category: competitors don't do regulatory-change monitoring; TaxDome
  owns practice/billing/docs; File In Time = partial workflow). Flagged for a
  human spot-check against the competitors' current sites before public launch.

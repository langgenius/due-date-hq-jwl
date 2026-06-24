# Marketing — nav focus/a11y pass + /get-started split + dev-tool fix (2026-06-24)

Three marketing-chrome refinements, all verified live against the dev server.

## 1. Nav — keyboard focus + collapsed-pill focus order (navigation-patterns pass)

Audited `components/home/TopNav.astro` against the navigation-patterns brief. The
nav was already strong (top bar · 5 destinations · `current` active-state wired on
every page incl. state-detail · `aria-current` · accessible mobile sheet with focus
trap/Esc/scrim/restore-focus · reduced-motion). Two real gaps, both fixed:

- **Keyboard focus.** The global `:focus-visible` ring is scoped to
  `.m-section`/`.m-btn`/`.close` — the `<header class="nav">` lives outside all of
  them, so the logo, links, Sign in, CTA, burger and every sheet item had **no
  proper focus ring** (UA default only). Added one `:focus-visible` treatment for
  every nav control (`2px solid var(--m-focus-ring)`, follows each pill's radius),
  with a **cyan variant on `.nav--on-dark`** (a navy ring vanishes on the villain
  band). The logo got a `.brand__lockup` wrapper so its ring hugs the mark instead
  of the full-width flex column the `<a>` grows into to centre the pill.
- **Collapsed-pill focus order.** When scrolled into the pill, `Sign in` faded to
  `opacity:0` but stayed in the tab order — an invisible focus stop. It now flips
  to `visibility:hidden` after the fade (directional transition delay; restored
  instantly on expand), so keyboard users never land on an invisible control.

Verified (transitions killed for deterministic reads): collapse intact —
`max-width 700 · height 56 · radius 999`, brand `flex-grow:0`, lockup `gap:0`;
collapsed Sign-in `visibility:hidden` → `visible` on expand; header holds ~70px.
Also corrected two stale comments (header doc; "four nav links" → five).

_Caveat:_ the focus ring's live rendering couldn't be screenshotted — the headless
preview never holds window focus (`document.hasFocus() === false`), so browsers
won't paint `:focus-visible` there. Rules are present/correct and mirror the proven
site-wide `.m-section` pattern.

## 2. /get-started — left↔right split

`components/GetStartedPage.astro` went from two stacked sections to a conversion
split: **left** = the offer (back-link, `LAUNCH OFFER`, serif title, lede, the three
checks) — **sticky** on desktop so it holds while a long form scrolls; **right** =
the form as one white card with its header inside it. One section grid
(`minmax(0,.84fr) minmax(0,1fr)`, gap clamp) that stacks to a single column below
920px (offer first). The form/success cards fill the column (dropped the old
`max-width`/`margin-top`). JS success selector `.gs-formsec` → `.gs-panel`.
Verified: desktop two-col (475 / 565), mobile stacks, selection `:has(:checked)`
tint intact (accent border `#22488c` + tint `#eaeff7`), no console errors, EN + zh.

## 3. Agentation dev overlay — survives view-transition nav (dev-only)

`layouts/BaseLayout.astro`. The feedback devtool's runtime-injected root was torn
out when `<ClientRouter />` swaps `<body>` on a tab switch and never re-mounted
(its bootstrap ran once) — so it looked broken until a manual refresh. Now caches
the lib, unmounts on `astro:before-swap`, and re-mounts on every `astro:page-load`
(idempotent guard). Dev + localhost gated; **zero change to the production build**
(verified: built HTML has 0 Agentation/importmap occurrences; CSS ships as real
`<link>`s that the router preserves — no FOUC on real navigation).

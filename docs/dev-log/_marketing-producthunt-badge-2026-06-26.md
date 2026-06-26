# Marketing — Product Hunt "Featured" badge (2026-06-26)

Yuqi supplied the official Product Hunt embed and asked to add it to the landing page.
Placed it in the **footer brand column** (`home/Footer.astro`), below the audience line —
the conventional "featured on" spot, and since the footer is shared it appears on the home
+ every page.

- Official embed, img **hot-linked** from `api.producthunt.com/widgets/embed-image/...`
  (`post_id=1181780`, neutral theme) so the badge stays current; link opens the PH page in a
  new tab with `rel="noopener noreferrer"`.
- Displayed at **180px wide** (scaled down from the native 250×54 — Yuqi: "too big");
  intrinsic `width/height 250×54` kept on the img for aspect-ratio/CLS, CSS `width:180px;
  height:auto`. `loading="lazy"` + `decoding="async"` (below the fold), localized `alt` (EN/zh).
  (Briefly tried the hero for prominence, but Yuqi confirmed the footer.)
- CSP already permits it: `img-src 'self' data: https:` covers the https PH image — no
  `_headers` change needed.
- `.footer__ph` style: hover dim + a `:focus-visible` ring (keyboard).

Verified live: badge renders 250×54 in the footer, image loads from PH's CDN, link/target/rel
correct. Build 191 pages clean.

Note: it's site-wide (footer). Easy to scope to the home only (a `showProductHunt` prop from
index.astro) or to also place a louder copy near the hero for launch day, if wanted.

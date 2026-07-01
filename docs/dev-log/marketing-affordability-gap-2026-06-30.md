# Marketing "Who it's for" — the affordability/access gap

**Date:** 2026-06-30.

A new homepage positioning band on the Astro marketing site (`apps/marketing`),
slotted between `Sources` and `Compare`. It names the gap the product is built
for: the enterprise tax platforms that watch for regulatory change run thousands
a seat, so only large & regional firms can justify them — leaving solo-to-small
firms with the same exposure to a moved deadline and no affordable tool, so they
watch by hand and things slip.

This is a **distinct beat from `Compare`**: Compare pits us against all-in-one
practice suites (TaxDome / File In Time) on the monitoring _job_; this band is the
affordability/access angle against the enterprise _research platforms_ (Bloomberg
Tax, Checkpoint, CCH).

## Component (`components/home/Gap.astro`)

- **Eyebrow → heading → lead → figure.** Heading: "Big firms pay thousands a seat
  to stay ahead of every change. Everyone else does it _by hand_." Lead names the
  three platforms, then resolves with a callback — "no affordable tool" → "**is
  that tool** — built to catch those changes for the firm the big platforms leave
  out."
- **The divide figure:** three quiet bordered enterprise-platform rows tagged
  `thousands / seat` (mono) → a labelled vertical gap (dashed rule + "the gap") →
  the accent-tinted DueDateHQ bar ("The same watch, built for small firms"). Chroma
  lives only in the us-tier container; copy stays neutral.
- EN + zh-CN in parity; both homepages updated (`index.astro`, `zh-CN/index.astro`).

## Framing guardrails (deliberate)

- **Accessibility, not cheapness** — "built for the firm they leave out", never
  "we're the cheap one".
- **No price figure for us** (pricing is still coming soon, `PRICING_COMING_SOON`);
  competitor cost stays directional (`thousands / seat`) — verified-real market fact
  (Checkpoint ~$4.5k, CCH ~$1.2–1.5k/seat), kept un-pinned so nothing goes stale or
  needs a citation on the page.
- The resolve clause avoids claiming those research libraries "sell monitoring" (an
  earlier draft did — they're research libraries with alert feeds, so the claim was
  a stretch). It now states _our_ value directly.

## Verify

- `pnpm -F @duedatehq/marketing dev` → desktop: 3-column figure (`them · gap · us`),
  us-tier carries the navy accent border on the soft tint. Mobile (375px): collapses
  to a single column, divider flips to a horizontal dashed break.
- EN (`/`) and zh-CN (`/zh-CN`) both render the full section; old "monitoring the big
  platforms sell" copy removed from both.

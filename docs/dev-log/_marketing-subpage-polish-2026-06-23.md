# Marketing subpage polish — pricing, coverage, how-it-works, security

**Date:** 2026-06-23
**Surface:** `/pricing`, `/state-coverage`, `/how-it-works` (en + zh), `/security`
(en + zh); new shared `FaqList.astro`; `/about` removed; dead-CSS sweep.
Design canon: `docs/Design/marketing-design-system.md` §4 (subpage accent usage).

A per-element feedback pass across the marketing subpages. Direction confirmed up
front: keep navy the workhorse, add cyan + a green semantic only where they carry
meaning ("navy + cyan + semantics," not a palette — see DESIGN §4).

## Pricing (`Pricing.astro`)

- **Tier cards → 4 equal columns** (dropped the wider-recommended span) so the CTAs
  line up on one row. Alignment needed two fixes: the hidden yearly-savings line is
  now `visibility:hidden` (not `display:none`) so every card reserves it in monthly
  mode too, and the cadence stacks under the price (the yearly "/ mo, billed yearly"
  string was wrapping only on the widest price, `$119`). Pro badge is a straddling
  pill with a navy→cyan gradient.
- **Comparison matrix** re-skinned to match the home `Compare.astro`: hairline ledger
  (killed the `1px solid --m-ink` near-black top rule), grouped rows, recommended
  column tinted, and **all cells left-aligned**.
- **"In every plan" recap** is now one cohesive flush-divider panel with icon chips,
  not four wireframe boxes.
- Green "included" ✓ checks; removed the redundant `POST-BETA PRICING` mono line.

## State coverage (`StateCoveragePage.astro`)

- **Roster tiles are two-tier:** watched-live = navy at 8% opacity (a calm field);
  has-detail-page = solid navy + cyan corner dot + hover arrow (15 of 51 → clearly
  the openable ones). Native `title` tooltips on every tile (added a jurisdiction-
  name map).
- **Source model** reframed from soft cards into a technical "route" pipeline
  (Public signal → Source-backed review → Reviewed client impact, with mono
  telemetry) over flat hairline rows — the "heavy lifting only we do" framing,
  fewer boxes.

## How it works (`how-it-works.astro` + `LoopDeep.astro` + `SurfaceDeep.astro`)

- Hero title widened; worked example rebuilt as an engaging 4-stage numbered flow
  with the Apply outcome lit (accent + cyan). Removed the placeholder `<Figure>`.
- LoopDeep: removed the left rail connector line, **big bold 01–04 numbers**, copy
  tightened, hover lift on each move, and a green live-scan pulse on Watch.
- SurfaceDeep "Why it matters to a CPA" de-eyebrowed (person icon + sentence case)
  so it no longer reads as a second section eyebrow.
- The zh page (`zh-CN/how-it-works.astro`) mirrors all of the above for parity.

## Security (`TrustPage.astro` + `trust-pages.ts`)

Was thin (2 sections + a placeholder "Architecture diagram"). Now:

- A **real architecture diagram** (`.secdiag`): Public site │ "no shared surface" │
  Authenticated app behind `session · firm access · tenant · rate limit` → an
  isolated "Tenant data" strip; then the evidence chain Source → Approval → Audit.
- **Two new boundary sections** (Data, Account) → 4 total, en + zh. All claims trace
  to real product behaviour (Google sign-in, owner-only billing / no stored cards,
  per-firm scoping, layers-on-your-tools) — no invented certifications or infra.

## Shared FAQ + cleanup

- New `FaqList.astro` — the one sub-page FAQ pattern (native `<details>` accordion,
  matching the landing). Applied to pricing, state-coverage, the geo resource/rule/
  guide pages, and the per-state pages, so every sub-page FAQ is identical.
- **`/about` removed** entirely: both `trustPages` entries + the `'about'` slug, the
  `TrustPage` figure/`heroFigureLabel` branch, and every link (footer, i18n footers,
  `llms.txt`). Verified absent from the production build, sitemap, and llms outputs.
- Dead-CSS sweep: `.geo-qa*` + unused `qPrefix`/`aPrefix`/`answersLabel`,
  `.std__grid2`, `.trustpg__figure`. `Figure.astro` is now unused but left in place.

`astro check` clean (only 5 pre-existing baseline errors, none in touched files).
`astro build` succeeds — 74 pages.

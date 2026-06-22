# Marketing site — information architecture & page audit

**Status:** Audit + IA plan · 2026-06-22
**Scope:** the whole `apps/marketing` site, not just the homepage. Companion to [`landing-page-structure.md`](landing-page-structure.md) (which covers the home only) and [`homepage-migration-spec.md`](homepage-migration-spec.md) (the home redesign).

**The brief, in one line:** make the **core site** strong, concise, and cohesive; let the **long-tail** be a broad, consistent, well-linked surface that exists for **SEO / AEO / GEO** (search engines, answer engines, generative engines). Two tiers, one design language, one story.

---

## 1 · The two-tier model

| Tier           | Job                                                | Audience                      | Bar                                                                       | Pages                                                                           |
| -------------- | -------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Core spine** | convert a CPA who arrives ready to evaluate        | humans in the funnel          | _high craft_ — every section earns its scroll                             | Home · Pricing · Security · (How-it-works lives on Home) · About                |
| **Long-tail**  | get found, get cited, route intent into the funnel | searchers + AI answer engines | _consistent + structured + fast + linked_ — not individually "hero" pages | state pages · rule references · comparisons · guides · trust/legal · `llms.txt` |

The core is small on purpose. The long-tail is large on purpose. They share one nav, one footer, one design system, and one positioning sentence — that shared chrome is what makes a 100-page site feel like one product.

---

## 2 · Current inventory (what exists today)

**Routes** (`src/pages`), each mirrored under `zh-CN/`:

| Route                         | Renders via                     | Design          | Tier                                |
| ----------------------------- | ------------------------------- | --------------- | ----------------------------------- |
| `/`                           | `components/home/*`             | **NEW `--m-*`** | core                                |
| `/legacy`                     | old `Hero/Problem/Workflow/...` | old · noindex   | — (archive)                         |
| `/pricing`                    | `components/Pricing`            | old             | core                                |
| `/state-coverage`             | `StateCoveragePage`             | old             | long-tail hub                       |
| `/states/[state]`             | `StateDetailPage`               | old             | long-tail leaf                      |
| `/rules`                      | `GeoResourcePage`               | old             | long-tail hub                       |
| `/rules/[rule]`               | `GeoResourcePage`               | old             | long-tail leaf                      |
| `/compare/[comparison]`       | `GeoResourcePage`               | old             | long-tail leaf                      |
| `/guides/[guide]`             | `GeoResourcePage`               | old             | long-tail leaf                      |
| `/[trustPage]`                | `TrustPage`                     | old             | about/security/privacy/terms/status |
| `/llms.txt`, `/llms-full.txt` | `*.txt.ts`                      | machine         | **GEO/AEO feed**                    |
| `/robots.txt`, `/404`         | —                               | —               | utility                             |

**Content sets today** (driven by `lib/seo-content.ts`, `lib/trust-pages.ts`):

- States: ~6 deep (CA NY TX FL WA MA) + ~10 spec'd — **hub claims "50 + DC"; leaf pages are still a subset** → expansion target.
- Rules: 3 (form-7004-extension · s-corp · partnership-1065).
- Comparisons: 3 (file-in-time-alternative · taxdome · karbon).
- Guides: ~6 (cpa-deadline-risk · evidence-backed-tax-deadline-software · weekly-triage · migrate-from-excel · extension-vs-payment · multi-state).
- Trust: 5 (about · security · privacy · terms · status).

**Key structural fact:** the long-tail is **template-driven**. Five renderers cover everything below the core — `GeoResourcePage` (rules + comparisons + guides, hubs _and_ leaves), `StateCoveragePage`, `StateDetailPage`, `TrustPage`, `Pricing`. Restyling those five brings the _entire_ long-tail to the new look. The visual unification is bounded, not per-page.

---

## 3 · Audit findings (cohesion gaps), ranked

1. **Pricing contradiction (P0 — strategic, not cosmetic).** Home + Close say _"free during the beta · pricing coming soon."_ But `/pricing` renders four live tiers (Solo $39 / Pro $79 / Team $149 / Enterprise from $399, yearly prices, `checkoutPlan` ids) **and `llms.txt` advertises those tiers to AI answer engines.** The machine-readable GEO layer is telling LLMs a different story than the homepage. Must pick one truth and propagate. _(Decision needed — see §7.)_

2. **Two design systems (P0 — cohesion).** `/` is the only route on the new `--m-*` design. All 9 other templates use the old `components/TopNav` + `Footer` + old page components. The site fractures visually the instant you leave home.

3. **Dead on-ramp to the long-tail (P1 — SEO + cohesion).** The new home footer's links are all `href="#"`. No internal-link equity flows from the core into the SEO/GEO pages, and a human can't reach the rule library / state coverage / guides from the new home. The footer is the canonical internal-linking spine for programmatic SEO — right now it's severed. (Also missing Guides + Comparisons entries.)

4. **Positioning drift (P1 — AEO/GEO).** Home hero = _"catch every tax-deadline change — and see who it affects."_ `llms.txt` home line = _"the deadline-risk workbench."_ Meta/structured-data descriptions vary again. One canonical sentence should propagate to `llms.txt`, meta descriptions, and `StructuredData`.

5. **Duplicate chrome to maintain (P2).** Two `TopNav` + two `Footer` implementations now exist. Every nav/footer change has to be made twice and will drift.

---

## 4 · Target IA

### Navigation (core spine — keep current, it's right)

`How it works` (`/#how`) · `Coverage` (`/state-coverage`) · `Pricing` (`/pricing`) · `Security` (`/security`) — plus `Sign in` · `Start free`.

- "Coverage" is the deliberate **bridge** from core into the long-tail (it's both a buyer scope-promise and the state-pages hub). Good — keep it.
- Floating-pill design, centered. On non-home pages the nav switches to **page mode**: solid background, no scroll-spy rail, a breadcrumb-back affordance.

### Footer (the SEO/GEO spine — fix the dead links)

- **Product:** How it works · Coverage · Pricing · Security
- **Resources** _(the long-tail on-ramp — real hrefs):_ Rule library (`/rules`) · State coverage (`/state-coverage`) · Guides (`/guides/...`) · Compare: File In Time (`/compare/file-in-time-alternative`) · Status (`/status`)
- **Company:** About (`/about`) · Security (`/security`) · Privacy (`/privacy`) · Terms (`/terms`) · Contact
- Locale switcher (EN · 中文) — wired in the i18n pass.

### Internal-linking contract

- **Core → long-tail:** nav "Coverage" + footer Resources + in-content links (FAQ → comparison; Trust → rule library; Coverage stat → state hub).
- **Long-tail → core:** every leaf carries the shared nav + a single CTA back into the funnel (`Start free`).
- **Long-tail ↔ long-tail:** state ↔ neighboring states; rule ↔ related guide; comparison ↔ comparison. (`GeoResourcePage` should expose a "related" block.)

### Canonical URLs / dedupe

- Security is reachable as a core nav item; keep one canonical URL (`/security` via the trust-page renderer) — don't also mint a second core Security page.
- `/state-coverage` is the hub; `/states/[state]` are leaves — hub links all leaves, leaves link hub + neighbors.

### AEO / GEO layer (`llms.txt`)

- `llms.txt` `corePages` list = the curated answer-engine map. Keep it **in sync** with the canonical positioning sentence and with whatever pricing truth we land on (§7).
- Each long-tail template already targets an **answer-shaped** query ("what is the Form 7004 deadline", "File In Time alternative"). Preserve that — AEO/GEO rewards pages that directly answer a question with structured, sourced content. Keep `StructuredData` (FAQPage / Article schema) on every leaf.

---

## 5 · Phased plan

- **Phase A — Cohesion-breakers (cheap, high-impact, do first):**
  1. Resolve pricing (§7) and propagate to `/pricing`, `llms.txt`, `llms-full.txt`, meta.
  2. Wire the home footer's real hrefs (Resources + Company) → restores the SEO on-ramp.
  3. Lock one positioning sentence; align `llms.txt` + meta + structured data.
- **Phase B — Unify the chrome:** promote `home/TopNav` + `home/Footer` to the single shared nav/footer; add a `pageMode` prop (solid nav, breadcrumb, no rail); repoint all 9 templates; retire the old `TopNav`/`Footer`.
- **Phase C — Restyle the 5 long-tail templates to `--m-*`:** `GeoResourcePage`, `StateCoveragePage`, `StateDetailPage`, `TrustPage`, `Pricing`. The whole long-tail inherits the new look from these five.
- **Phase D — Home interactions** (hero filter/apply, nav-on-dark over the villain band, map click-to-jump) — deferred from the migration; independent of IA.
- **Phase E — Coverage expansion (growth):** states → full 50 + DC; add rule / guide / comparison topics; keep `llms.txt` synced.
- **Phase F — i18n:** wrap the new components in `t`; the `zh-CN/` route mirror already exists.

Phases A–C are the "make the site cohesive" arc. D–F are growth/feature, not cohesion.

---

## 6 · Templates → effort map

| Template                      | Powers                                       | Restyle effort                   |
| ----------------------------- | -------------------------------------------- | -------------------------------- |
| `home/TopNav` + `home/Footer` | site-wide chrome                             | add `pageMode`, repoint 9 routes |
| `GeoResourcePage`             | rules + comparisons + guides (hubs + leaves) | 1 template, ~12+ pages           |
| `StateCoveragePage`           | `/state-coverage`                            | 1                                |
| `StateDetailPage`             | `/states/[state]`                            | 1 template, 50+ pages            |
| `TrustPage`                   | about/security/privacy/terms/status          | 1 template, 5 pages              |
| `Pricing`                     | `/pricing`                                   | 1 (gated on §7)                  |

---

## 7 · Open decisions (need the owner)

1. **Pricing truth.** Is the launch posture **"free during beta, pricing coming soon"** (then strip tiers from `/pricing` + `llms.txt`, make `/pricing` a coming-soon page), **or** are the **four tiers real and live** (then bring the home into line and surface pricing there)? Home currently says beta-free; the rest says paid. _They cannot both ship._
2. **How far to push the core.** Minimum cohesive core = Home + Pricing + Security + About. Anything else promoted into the high-craft tier (e.g., a dedicated `/how-it-works`, a `/security` deep page)?
3. **Coverage ambition.** Ship the long-tail at today's depth (~16 states) and grow later, or expand to full 50 + DC before the new style goes live?

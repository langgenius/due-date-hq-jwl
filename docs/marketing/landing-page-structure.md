# Landing Page Structure — built from scratch

**Status:** Structure / IA for the GA landing page · 2026-06-17
**Method:** positioning → angle → architecture (marketing-campaign). Positioning lives in `.claude/product-marketing-context.md`. Final strings live in `landing-page-copy.md`. This doc is the **skeleton and the why** — what each section is for, in what order, and the conversion logic that orders them.

---

## 1 · Positioning, in one breath

- **Core benefit:** DueDateHQ watches the IRS, the major state tax agencies, and FEMA disaster relief so a CPA doesn't have to — and when a rule changes, it shows exactly who's affected and applies the fix in one click, sourced and reversible. The daily payoff: a five-minute, risk-ranked Monday.
- **Positioning formula:** *DueDateHQ helps solo and small US CPA practices stay ahead of every filing-rule change — by monitoring the official sources around the clock, finding which clients each change affects, and applying the fix in one click, with the source attached.*
- **The 5-second test the hero must pass:** a CPA who lands cold should know within five seconds — *who it's for* (US CPA practices), *what it does* (ranks this week's deadline risk), and *why now* (so nothing slips, and you can trust it).

## 2 · Campaign angle

The whole page lives in **one moment: Monday morning.** That's where the pain is felt and where the product wins.

> **Angle (chosen): "It watches the law for you — and fixes what changed in one click."**
> The moat is the *active loop*: 24/7 source monitoring → AI reads the change → who's affected → one-click apply (sourced, reversible). Speed-of-triage and glass-box trust are the supporting beats, not the headline. Every section either shows the loop or makes it trustworthy.

**Alternates considered** (keep in the bank for ads / A-B):
- *"Every deadline, traced back to its source."* — leads with the un-copyable moat; best for the skeptic burned by a wrong date.
- *"Stop tracking dates. Start seeing risk."* — reframes the category (calendar → risk console); boldest, slightly more abstract.

The chosen angle is the safest high-converter because it opens in a scene the buyer already lives in, then pays off both their desire (fast) and their doubt (trustworthy).

## 3 · The narrative arc

> **Hook** the Monday scene → **Qualify** the right reader → **Agitate** why it's hard → **Resolve** with the 5-minute how → **Differentiate** with glass-box trust → **Show breadth** (real product) → **De-risk** (security + boundary) → **Answer** the specific objection → **Set expectations** (coverage + price) → **Ask** → Footer.

Each section does exactly one job. If a section can't name its single job, it's cut or merged.

## 4 · Page skeleton — LEAN (recommended)

Concise by design: **6 content sections.** Each one earns its scroll. Cuts are merges, not deletions — the full-length version is preserved in §5b and the cut copy sits in `landing-page-copy.md` under **Deferred**.

```
0  Sticky nav ............... orient + persistent CTA
1  Hero ⭐ ................... hook + real product + CTA   [absorbs Built-for + Promise bar]   [above fold]
1b Sound familiar ........... villain beat — make them feel the "did I miss one?" not-knowing
2  How it works ⭐ .......... Watch · Match · Apply — the 24/7 monitor→apply loop (the moat)
3  Why you can trust it ⭐ .. sources on every date + your data + boundary   [merges Glass-box + Security]
   └ [reserved] proof band .. logos / # firms / testimonials — when real
4  What's inside ............ 6 compact feature tiles (it's a real product)
5  FAQ ...................... 4 objections (File In Time · leave TaxDome · trust AI dates · data safety)
6  Close ⭐ ................. early-access ask, ends on relief   [no pricing on the page]
7  Footer ................... nav · resources (SEO) · legal boundary
```

⭐ = load-bearing for conversion. Coverage folds into the nav pill + the Source-monitoring feature tile. **Pricing is intentionally off the landing page** (early-access framing; `/pricing` still exists, unlinked). The Close ends on the relief line, not a price ladder.

**The four merges that make it lean:**
- **Built-for + Promise bar → Hero.** The subhead names the audience; a thin strip carries the three numbers (30 sec · 30 min · 24 hrs).
- **Problem → How it works.** Each of the three steps opens by naming the pain it kills, so agitation and resolution share the same breath. One intro sentence carries the "math underneath."
- **Glass-box + Security → "Why you can trust it."** Top half = every date shows its source (3 stats); bottom half = isolation · audit · email-first + the honest boundary.
- **Pricing + Final CTA → Close.** One price line above the final ask, so the CTA isn't a leap of faith.

## 5 · Section-by-section (lean page)

| # | Section | The one job | What's in it | CTA |
|---|---|---|---|---|
| 0 | Nav | orient + persistent CTA | brand · audience · 4 links · status pill · **Open the workbench** | primary |
| 1 | Hero | pass the 5-sec test, show the real product | eyebrow · headline · subhead · 4 trust chips · promise strip · real product surface | Open the workbench / Try it live |
| 1b | Sound familiar (villain beat) | make them feel the not-knowing | short agitation — 50 state sites, the inbox, the rule that changed in March, the not-knowing | — |
| 2 | How it works | show the active loop | Watch (24/7 monitoring) · Match (who's affected) · Apply (one click, sourced, undo) — real surfaces; one-time setup folded into the intro | — |
| 3 | Why you can trust it | the moat + de-risk, in one block | glass-box paragraph · 3 stats (100% · 50+DC · 0) · trust row (isolation · audit · email-first) · boundary line · [reserved proof band] | — |
| 4 | What's inside | prove it's a whole product | 6 one-line tiles + supporting line | — |
| 5 | FAQ | kill the specific objection | 4 Q&As (incl. data safety) | — |
| 6 | Close | one clean ask, ends on relief | title (payoff) · short early-access body · relief line last · reassurance | Open the workbench / Get a guided setup |
| 7 | Footer | catch the non-converter | product · resources (SEO) · company · legal boundary | — |

The detailed per-section rationale from the original full-length structure is kept below in §5b for reference, but the **lean page above is the recommended build.**

## 5b · Section-by-section (full-length reference — superseded by §5)

### 0 · Sticky nav
- **Job:** orient + keep the primary CTA one click away at all scroll depths.
- **Holds:** brand · "For US CPA practices" · anchor links (Product · How it works · Evidence · Coverage · Pricing · Resources) · status pill `Live · FED + 50 states + DC` · **Open the workbench**.
- **Why here:** a self-serve GA buyer decides at unpredictable scroll depths — the CTA must always be reachable.

### 1 · Hero ⭐ (above the fold)
- **Job:** pass the 5-second test and show the real thing.
- **Holds:** eyebrow (GLASS-BOX DEADLINE INTELLIGENCE) · headline (the chosen angle) · subhead · **Open the workbench** (primary) · **Try it live (interactive module)** (secondary) · 4 trust chips · the **real Deadline Radar surface** with the `live preview · not your data` caption.
- **Why here / from scratch:** the single most important change from a generic SaaS hero — the visual is the *actual product console*, not an abstract illustration. For a "show, don't claim" product with no testimonials yet, the product shot *is* the proof. Headline and subhead must split the work: one carries the scene, the other carries the mechanism — never both arguing the same point.

### 2 · Built-for strip
- **Job:** qualify in one sentence — the right reader leans in, the wrong one leaves (a feature, not a bug).
- **Holds:** one line naming the ICP (solo/1–10-person, 20–100 clients, multi-state, on Excel + Outlook + 50 state sites). No CTA.
- **Why here:** immediately after the hook, before any investment of attention. Filters out 1040-only / single-state / happy-on-a-platform readers so the rest of the page talks to one person.

### 3 · Promise bar
- **Job:** three concrete, falsifiable numbers that frame the whole value prop before the argument starts.
- **Holds:** `30 sec` triage · `30 min` migrate · `24 hrs` alerts — one line each.
- **Why here:** specificity beats adjectives. Three numbers do more than a paragraph of claims, and they pre-load the three acts of "How it works" (§5). Reuses the existing `SlaStrip` component.

### 4 · Problem
- **Job:** agitate — make them feel the Monday triage chaos *and* the trust gap, so the solution lands with relief.
- **Holds:** title (Excel + Outlook + 50 sites) · the "math underneath" paragraph (`clients × states × entity × …`) · **3 problem cards**: State Watch (which changes hit me?) · Trust Gap (extension ≠ payment) · Migration Drag (4 hours of typing).
- **Why here / from scratch:** the 3 cards are deliberately authored to **mirror the 3 solution steps** in §5 (State Watch → Verify/Alerts · Trust Gap → Verify · Migration Drag → Migrate). Problem and solution rhyme, so the resolution feels earned.
- **Optional module — "Your Monday, before vs after":** a compact two-column before/after right at the §4→§5 seam is a strong conversion device (and a natural lift of the File-In-Time/Excel comparison angle). Recommended if design has room; cut-able without breaking the arc.

### 5 · How it works ⭐
- **Job:** resolve the problem by showing the *mechanism* in three concrete moves, each on a real surface.
- **Holds:** intro (the three product rules) · **Step 01 Triage · 30s** (the Monday console) · **Step 02 Migrate · 30 min** (paste, map, normalize, generate) · **Step 03 Verify · every claim** (no source, no claim) — each with a real screenshot and its keyboard hints.
- **Why here:** this is the heart. It converts the agitation into "oh, *that's* how" and proves the promise-bar numbers are real. Keep it show-don't-tell — surfaces over prose.

### 6 · Glass-Box Guarantee ⭐
- **Job:** plant the un-copyable moat, and — critically — **stand in for social proof** that doesn't exist yet.
- **Holds:** title (every number clicks back to its source) · the AI-may/never paragraph · **4 proof stats** (100% verified citations · 50 + DC monitored · 24h alert turnaround · 0 black-box auto-applies) · the Glass-Box Guard footnote.
- **Why here:** the buyer's deepest doubt is *"can I trust software dates?"* — answer it right after showing how it works, before asking them to evaluate features. This is also the section that most separates DueDateHQ from File In Time and from generic "AI tax" tools.
- **[Reserved] proof band:** the moment real proof exists (firm count, "N deadlines tracked," a named testimonial, a logo), insert a dedicated proof band *here*, between the moat and the feature list. Until then, mechanism-as-proof carries it — do **not** fabricate.

### 7 · What's inside
- **Job:** show breadth — convince the evaluator it's a real, whole product, not a one-trick demo.
- **Holds:** 6 tiles (Deadline Radar · Smart Priority · Migration Copilot · Alerts · Evidence drawer · Reminders & morning digest) · one supporting line for the team-scale extras.
- **Why here:** breadth matters *after* the core promise and trust land — lead with features and you sound like everyone else; trail with them and they read as substance.

### 8 · Why CPAs trust it
- **Job:** de-risk the buy (data, audit, fit) and build trust through candor.
- **Holds:** 4 proofs (per-practice isolation · evidence on every claim · full audit trail · email-first) · the honest **boundary line** (not tax advice, not a filing system).
- **Why here / from scratch:** the boundary statement is placed as an *asset*, not fine print — for this audience, the tool that's careful about what it doesn't do is the one they trust to do the rest.

### 9 · FAQ
- **Job:** kill the specific, predictable objection that's keeping a qualified reader from clicking.
- **Holds:** 6 Q&As (vs File In Time · do I leave TaxDome · trust AI dates · time-to-value · is this tax advice · where does my data live).
- **Why here:** late page = late-stage doubt. Each answer is a switching-force lever (attacks Habit/Anxiety from the PMM context), positioned right before the final ask.

### 10 · Coverage
- **Job:** set scope honestly so expectations match reality (and feed SEO).
- **Holds:** FED + 50 states + DC, with CA/NY/TX/FL/WA deepest; the review-gated caveat; `See state coverage →`.
- **Why here:** a risk-reducer before the ask — and the on-ramp to the programmatic state pages.

### 11 · Pricing teaser
- **Job:** show price transparently so the CTA isn't a leap of faith.
- **Holds:** the four plans in one line ($39 · $79 · $149 · Enterprise), yearly ≈ 20% off, owner-billed; `See full pricing →`.
- **Why here:** transparent pricing near the decision point removes the "what'll it cost me?" hesitation that kills self-serve signups.

### 12 · Final CTA ⭐
- **Job:** one clean ask at the moment of highest intent.
- **Holds:** pill · title (stop spending Monday making sure nobody slipped) · body · **Open the workbench** (primary) · **Get a guided setup** (secondary → waitlist/onboarding page) · reassurance line (no card to start · data stays in your practice · cancel anytime).
- **Why here:** the page has earned the ask. Give the ready buyer the primary action and the hesitant one a lower-commitment path — without letting the two compete for emphasis.

### 13 · Footer
- **Job:** catch the non-converter with navigation, resources, and trust.
- **Holds:** product links · resources (rule library, state coverage, guides, File-In-Time comparison, status — the SEO surface) · company · legal/boundary line.

## 6 · CTA system (one spine, never competing)

| Placement | Primary | Secondary |
|---|---|---|
| Nav | Open the workbench | — |
| Hero | Open the workbench | Try it live (interactive module) |
| Section sub-links | — | See the workflow · See state coverage → · See full pricing → |
| Final CTA | Open the workbench | Get a guided setup |

Rules: **one primary action per viewport**; the secondary is always lower-emphasis; the no-form demo path survives everywhere so a skeptic can self-qualify without committing.

## 7 · Proof strategy when you have no proof yet

This is the one structural risk at launch — no logos, counts, or testimonials. The architecture compensates on purpose:
1. **Show the real product** (hero + step surfaces) — credibility by demonstration.
2. **Mechanism-as-proof** (§6 glass-box + the 4 stats) — specific, supportable claims instead of vanity metrics.
3. **Candor-as-proof** (§8 boundary) — the honest "not tax advice" line reads as trustworthy.
4. **Comparison-as-proof** (optional §4 before/after, footer File-In-Time compare) — relative credibility.
- **The moment real proof exists, fill the reserved band in §6** — that's the single highest-leverage future addition to this page.

## 8 · What's "from scratch" here (vs the live `apps/marketing` order)

Live order today: `Hero → SlaStrip → Problem → Workflow → Proof → Security → Pricing → FinalCta`.

Changes in the lean structure:
- **Merged** Built-for + Promise bar into the **Hero**; Problem into **How it works**; Glass-box + Security into **Why you can trust it**; Pricing + Final CTA into **Close**.
- **Cut** the standalone Coverage section (folded into the nav pill + the "50 + DC" stat) and trimmed FAQ to three.
- **Net result:** the live site's `Hero → SlaStrip → Problem → Workflow → Proof → Security → Pricing → FinalCta` collapses to **Hero → How it works → Why you can trust it → What's inside → FAQ → Close** — fewer sections, same arc.

**Build delta (lean):**
- **Reused, re-pointed:** Hero (now carries the promise strip) · Workflow (→ How it works) · Proof + Security (→ one Why-you-can-trust-it block) · Pricing + FinalCta (→ Close) · Footer · TopNav.
- **Net-new components:** the compact Features grid (What's inside) and the FAQ. Everything else is a merge/re-order of existing blocks.
- All copy is already written in `landing-page-copy.md` (lean), with the cut blocks held under **Deferred** there.

## 9 · Marketing-ideas hooks (campaign layer, not page structure)

Surfaced from the marketing-ideas library; these wrap *around* the page rather than living in it:
- **#11 Comparison page** — `/compare/file-in-time-alternative` already exists; link it from the FAQ answer and footer. Highest-intent capture for this category.
- **#15 Engineering-as-marketing (free tool)** — a "extension-vs-payment / Form 7004 reference" or "deadline calendar by entity + state" free tool is a strong top-of-funnel lead magnet for this exact ICP. Note as a future module + footer resource; not part of v1 page.
- **#4 Programmatic SEO** — the state and rule pages already exist; the Coverage section (§10) and footer are their on-ramp from the landing page.
- **#79 / #81 Waitlist & early-access** — superseded by GA, but the §12 secondary "Get a guided setup" preserves a lead-capture path for high-touch firms.

---

*Next, if you want it: lock the hero headline, then I can turn this skeleton into a wireframe-level section spec (block order, hierarchy, and which `apps/marketing` component renders each block), or take it into the rest of the campaign suite (email sequence → social → ads → calendar) per the marketing-campaign workflow.*

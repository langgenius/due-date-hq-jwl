# Integration Recommendation & Light-Integration Scoping

**For:** DueDateHQ · **Date:** 2026-07-06 · **Status:** scoping (Part 2 of 2; landscape in [landscape.md](landscape.md)). Research + scoping only — no code, nothing outward-facing.

**The question this doc answers** (not "what's our integration roadmap"): _What is the single lightest integration that could put DueDateHQ in front of real CPA users to validate demand?_ DueDateHQ is pre-validation — nobody has yet proven they want it. So the goal is **reaching validators fast and cheap**, not building distribution scale. Integration/marketplace is normally a _scaling_ channel that pays off _after_ validation; almost all of it belongs in the "later" bucket. This doc names the one thing worth doing now.

---

## Ranking the ecosystem

### (a) Best cheap distribution bets — open, relevant, reach validators fast

These are the only integrations worth touching pre-validation. All are near-zero or light effort with no gatekeeper.

1. **Private Zapier trigger connector** — one build reaches every practice-management tool (Karbon, Canopy, TaxDome, Financial Cents, Jetpack, Keeper, Firm360, Pixie); no public review; a design-partner firm can use it this week. **← the single best first integration (scoped below).**
2. **Slack / email digest with deep-link** — near-zero; carries the "who's affected" narrative _and_ a link back to the one-click apply. Best effort-to-value. Ship alongside #1.
3. **Tokenized `.ics` calendar feed** — near-zero, gets DueDateHQ into the calendar CPAs live in. But one-way, dumb, and 12–24h stale, so it can't carry the moat. A retention nicety, not a validation instrument. Ship if trivial; don't count on it to prove anything.

### (b) High value, but heavy — do _after_ validation

Real audiences or real depth, but each is a multi-week, security-audited, or partner-gated commitment. None should start before demand is proven.

- **QuickBooks App Store listing** — the 500k-ProAdvisor prize, but a 3-part review incl. pen-test-grade security audit + annual re-review. The eventual scaling play. [Review process](https://developer.intuit.com/app/developer/qbo/docs/go-live/list-on-the-app-store/what-to-expect-during-the-review)
- **Xero App Store certification** — smaller US base than QBO but a more generous pre-certification runway (25 orgs uncertified) if a Xero-heavy segment emerges.
- **Direct PM-tool APIs (TaxDome / Karbon / Financial Cents)** — near-self-serve and worth a _native_ (non-Zapier) integration once a specific tool clusters among paying users. Two-way, richer than Zapier, but per-tool build cost.
- **CCH Axcess Vendor Program** — the only real tax-prep-layer API; unlocks live roster + e-file status for mid/large firms. Partner agreement + tiered access. Relevant only if DueDateHQ moves upmarket.
- **Public Zapier listing** — the graduation of #1 above, once you clear 50 active users. Free to pursue _because_ traction, not to create it.

### (c) Skip (pre-validation, and mostly period)

- **Aiwyn** — enterprise, partner-gated, weak fit (revenue-cycle, not tasks).
- **Make (Integromat)** — redundant with Zapier, smaller CPA base, 2–4-week QA. Do only if a partner specifically lives in Make.
- **Google Calendar / Outlook AppSource _API_ apps** — OAuth-verification / certification gauntlets for two-way sync you don't need yet; the `.ics` feed covers the calendar use for free.
- **Firm360 / Pixie / Keeper direct** — no real API; already covered by the one Zapier build.
- **Sage** — fragmented APIs, weak deadline fit, mostly non-US.
- **Rebuilding tax-prep ingestion as an API** (Drake/Lacerte/ProSeries/UltraTax/ProConnect/ATX) — **already solved by Migration Copilot's CSV presets.** No live-API work here pre-validation. Watch ProConnect's "under review" public API as a future signal, nothing more.

---

## The single best first integration: a **private Zapier "deadline changed" trigger**

**One line:** expose one Zapier trigger — _"A monitored deadline changed for one of your clients"_ — as a **private/unlisted** app, so a design-partner firm can wire DueDateHQ's unique signal into whatever practice-management tool they already use, and we can watch whether they act on it.

### Why this one

- **One build → the whole open layer.** Every Layer-1 PM tool speaks Zapier (`landscape.md` §Layer 1). We build _one_ trigger; the CPA's own Zap turns it into a Karbon Work Item, a TaxDome pipeline job, a Canopy custom-field flag, a Financial Cents task — whatever they live in. We never build or maintain a per-tool connector.
- **No gatekeeper, this week.** A private Zapier app bypasses public review; you share an invite link with a specific firm. Contrast with QBO's pen-test audit or Xero certification (weeks). [Private apps](https://help.zapier.com/hc/en-us/articles/8496312360461-Use-private-apps-with-Zapier)
- **It tests the actual moat, in situ.** The validation question isn't "will they import a client list" (Migration Copilot already answers that) — it's _"when DueDateHQ says a filing date moved and names who it hits, does a CPA want that to become work in the tool they already use?"_ A Zap that fires a real task in their live workflow answers exactly that. If nobody connects it, or connects it and ignores the tasks, that's a real (cheap) demand signal.
- **It's outbound-only and glass-box-safe.** The trigger just _emits an event that already exists_ in the product (see model check below). DueDateHQ doesn't reach into the firm's PM tool or write anything on its own — the CPA's Zap decides what to create. That respects the product's "AI does the work, the human keeps the click" red line.
- **Days, not quarters.** The event, the source URL, the affected-client match, and outbound send infrastructure (Resend) already exist. The net-new is a webhook emitter + a Zapier app definition (visual builder). Light.

**Why not the alternatives as "first":**

- _Read a PM tool's client list to auto-match_ — heavier (per-tool API, Canopy approval, etc.) and **duplicative**: Migration Copilot CSV already ingests rosters. Rebuilding ingestion as an API is a post-validation optimization.
- _`.ics` feed alone_ — near-zero but strips the who's-affected interactivity and is too stale (12–24h) for the "moment a date moves" pitch. It can't validate the moat; at best it validates "CPAs like deadlines in their calendar," which isn't the question.
- _Slack/email digest alone_ — genuinely the cheapest, and you **should ship it in the same sprint** (below). But a digest lands in a _notification_ surface; the Zapier trigger lands the signal in the firm's _system of work_. The Zap is the sharper validation instrument because acting on it means the CPA restructured real workflow around DueDateHQ. Pair them.

### Minimum viable version (smallest thing that delivers value and demos)

**One trigger. Outbound only. No inbound writes in v1.**

**Data flow (one direction, DueDateHQ → Zapier → the firm's tool):**

```
DueDateHQ                          Zapier                    Firm's PM tool
─────────                          ──────                    ──────────────
monitored deadline change   ─────▶ "New deadline change"  ─▶ (their Zap)
recorded for an affected            trigger fires with         e.g. create
client (the audit event                payload  ─────────────▶ Karbon Work
that already exists)                                            Item / TaxDome
                                                               job / Canopy
                                                               flagged client
```

**Trigger payload** (all fields already exist in the product's data model — nothing invented):

- Client name + external client ID (the ID carried over from the CSV import, so it re-matches the firm's PM records)
- Affected filing: jurisdiction · form · entity type
- Old due date → new due date
- Change type (e.g. disaster-relief postponement, deadline shift)
- Official source URL + the exact source quote/date (glass-box)
- Deep link back into DueDateHQ for the one-click apply

**Scope discipline — what v1 does NOT do:** no writing back into the PM tool from DueDateHQ; no reading the firm's PM data; no two-way sync; no public listing; one trigger only (not a full action set). Each of those is a later increment, gated on this one proving people connect it.

**The demo** (what makes it real and shows the moat in 60 seconds): in the Zap editor, connect the private DueDateHQ app to "Create Work Item" in Karbon. Fire a real change already in the system — e.g. **GA-2026-03 wildfire relief** (Georgia didn't conform to the IRS Aug 20 postponement; hits clients in Clinch, Echols & Brantley counties). The trigger fires → a Karbon Work Item appears: _"3 clients' Georgia deadlines moved — review."_ That's the entire pitch — watch the law → who's affected → land it as work — demonstrated inside the tool the CPA already opens every morning.

### Real effort & fastest path to a working demo

- **Effort:** light — days of build, not a quarter. Two pieces: (1) a webhook emitter fired on the existing deadline-change / apply audit event; (2) a Zapier app definition (visual builder — one trigger, subscribe/unsubscribe hooks, sample payload). Both are within a small team's reach.
- **Fastest demo:** you don't even need the Zapier app to _prove the concept internally_ — a raw outbound webhook + a "Webhooks by Zapier → Create Karbon Work Item" Zap demonstrates the full flow before the branded connector exists. Build the branded private app once the raw flow looks right.

### Prerequisites & timing gates

- **Private Zapier app:** none — no review, invite-link distribution. This is why it's the pick.
- **Public Zapier listing (later):** needs ≥10 Zap templates **and 50 active users** before Zapier auto-launches it — so it's demand-gated, not a timing risk for validation. [Publish public](https://docs.zapier.com/platform/publish/public-integration)
- **Karbon "Webhooks by Zapier":** the demo target needs a **paid Zapier plan** on the firm's side to POST into Karbon's full API — fine for a design partner, worth noting. [Karbon Webhooks-by-Zapier](https://help.karbonhq.com/en/articles/6637771-accessing-karbon-webhooks-through-zapier)
- **No partner applications** are on the critical path (Canopy approval, CCH Vendor Program, QBO/Xero certification all belong to bucket (b)).

---

## Sanity-check against DueDateHQ's actual shipped model

The recommendation must not propose flows the product can't back. Checked against the real model (`docs/marketing/unique-selling-points.md`, `.claude/product-marketing-context.md`):

| Assumption in the MVP                        | Shipped reality                                                                                                                                                                                 | OK? |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| A deadline-change event exists to trigger on | Alerts pipeline records changes; apply writes an audit event; 24h undo exists                                                                                                                   | ✅  |
| We can name _which clients_ a change hits    | Deterministic impact match by jurisdiction × form × entity type; affected-client count reconciled live                                                                                          | ✅  |
| Every payload carries an official source     | Glass-box: source URL + exact quote + verified date on every AI line, or it's suppressed                                                                                                        | ✅  |
| Outbound-only; human keeps the click         | AI never auto-applies; apply traces to the human who approved it. A read-only _trigger_ fits this exactly — it emits, the CPA's Zap and DueDateHQ's own one-click apply keep the decision human | ✅  |
| External client ID to re-match PM records    | Migration Copilot imports an external client ID field (per the CSV presets work)                                                                                                                | ✅  |
| We already send outbound messages            | Reminders + morning digest ship via Resend                                                                                                                                                      | ✅  |

**One correction the model forces on the framing:** DueDateHQ tracks **readiness per-filing (per-obligation), not per-client** (memory: auto-unblock/readiness is per-filing). So the trigger's unit is _"a filing/obligation changed"_, surfaced grouped by client for the CPA's convenience — **not** "a client's status changed." The payload above is written that way (affected _filing_: jurisdiction/form/entity, grouped under the client). Don't let the connector imply per-client state the product doesn't model.

**Nothing in the MVP requires a capability the product lacks.** It exposes existing events; it invents no new product surface. That's the point of choosing it.

---

## Recommended sequence (so it's unambiguous)

1. **Now (this sprint):** private Zapier "deadline changed" trigger **+** Slack/email digest deep-link. Both light/near-zero, no gatekeeper, both put the moat in front of a design-partner CPA in the tools they already use. Ship the `.ics` feed too if it's genuinely trivial — as ambient reach, not a validation bet.
2. **On a demand signal** (firms connect it and act): promote the winning PM tool to a **native direct-API integration** (TaxDome/Karbon/Financial Cents are near-self-serve), and start the **public Zapier listing** once the 50-user bar is in reach.
3. **On validated demand + a scaling decision:** the **QuickBooks App Store** listing for the 500k-ProAdvisor channel, and **CCH Axcess Vendor Program** if moving upmarket. These are the heavy, security-audited builds that only make sense once people have proven they'll pay.

The whole point of the pre-validation lens: do exactly one light thing that tests the moat inside a real firm's workflow, and hold every heavy, gated, scale-oriented build until someone has proven they want this.

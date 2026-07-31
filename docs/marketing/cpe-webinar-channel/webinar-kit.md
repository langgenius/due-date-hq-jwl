# DueDateHQ — CPE / State-Society Webinar Kit

**Status:** Draft v1 · 2026-07-06 · marketing/growth workstream
**Pairs with:** [`research.md`](./research.md) (channel research + target list)
**Voice source:** `outreach-kit/send-outreach.mjs` (v11 touch-1) + `outreach-kit/newsletter-outreach-pack.md`

> **Integrity red line (non-negotiable):** every claim in this kit maps to a shipped feature or a verifiable fact. No invented stats, no readership numbers, no fabricated personalization, no capabilities that aren't live. Feature claims are grounded in `docs/marketing/unique-selling-points.md` (file-cited against shipped code). When a claim is close to the line, it's flagged inline. See **§7 Honesty ledger** for the exact do/don't wording.

---

## 0 · The 80/20 rule (read this first)

This is **an education session, not a product demo.** ~80% is genuinely useful to a CPA whether or not they ever touch DueDateHQ; ~20% is an honest "here's a tool that does this automatically." State societies and CPE platforms reject vendor pitches dressed as education — and CPAs tune them out. The moat sells itself _if_ the teaching is real. Lead with the problem (deadline changes are a silent liability), teach the manual defense, then show the tool as one way to automate it.

---

## 1 · Topic + hook

**Working title:**

> **When the IRS Moves a Deadline and the State Doesn't: A Firm's Playbook for Non-Conforming Relief**

**Alternate titles (pick per audience):**

- _The Deadline You Didn't Know Moved: Catching Filing-Date Changes Before They Cost a Client_ (broad, plain)
- _Disaster Relief, State Non-Conformity, and the 50-State Deadline Problem_ (technical/tax-nerd audiences — NATP/NAEA)
- _Never the Last to Know: Building a Deadline-Change Early-Warning System for Your Firm_ (process/firm-owner framing)

**One-paragraph abstract (for submission + landing page):**

> Every filing season, tax authorities move deadlines mid-stream — disaster postponements, emergency relief, quiet administrative shifts. The dangerous part isn't the change itself; it's that the IRS and the states don't move together. When the IRS pushes a date, a state often doesn't conform — so the "relief" you relied on doesn't exist for that client, in that county, on that form. This session breaks down how deadline changes actually propagate across the IRS, state agencies, and FEMA disaster declarations; why conformity gaps are the ones that bite; and how a small firm can build a practical early-warning system so a moved date never becomes a missed one. We'll work through a live 2026 example — IRS wildfire relief in Georgia where the federal postponement to August 20 did **not** carry to the state — and end with an honest look at tools (including our own) that automate the monitoring so you're not refreshing agency websites by hand.

**Why this hook works:** it's a real, current, specific pain (`IRS GA-2026-03`, Clinch/Echols/Brantley counties) that maps 1:1 to the product's only un-copyable claim — _watch → AI-reads → who's-affected → one-click apply_ — without being a demo. The teaching stands on its own; the tool is the payoff, not the premise.

---

## 2 · Session outline (40 min + 5 min Q&A)

Designed for a 45-minute slot (the common state-society / CPA Academy length). A 50-minute version = one CPE credit hour if run under an approved sponsor (see [`research.md`](./research.md) §1). Timings assume a single presenter (Gigi) + optional co-host from the society.

| #   | Segment                                      | Time      | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cold open: a deadline that already moved** | 0:00–0:04 | Open on the live GA-2026-03 example. "The IRS pushed everything to Aug 20. Georgia didn't. Who in your book is in Clinch, Echols, or Brantley county?" Sets stakes in 90 seconds.                                                                                                                                                                                                                                                                                |
| 2   | **How deadline changes actually happen**     | 0:04–0:12 | The mechanics: IRS disaster postponements (§7508A), FEMA declarations as the trigger, state emergency relief, routine administrative shifts. Where each is published. Why they're easy to miss (scattered sources, no push notification, mid-season).                                                                                                                                                                                                            |
| 3   | **The conformity trap**                      | 0:12–0:22 | The core teaching. Federal relief ≠ state relief. Rolling vs. static conformity, selective conformity, why "the IRS extended it" is not a safe answer for a state return. Walk the GA table (Estimates / Payroll / Extended returns — IRS Aug 20 vs. GA Oct 13 / Oct 28 / Feb 12). Generalize to a checklist.                                                                                                                                                    |
| 4   | **Building a manual early-warning system**   | 0:22–0:30 | Genuinely useful even if they never buy anything: which sources to watch, how to set a cadence, how to map a change to _your_ affected clients (jurisdiction + form + entity type + due date), how to document the source so the change is defensible on review. This is the "give away the method" segment.                                                                                                                                                     |
| 5   | **The honest tool segment**                  | 0:30–0:37 | "Here's what it looks like to automate that." Live/recorded walkthrough of the real loop: monitor → AI reads the official notice and classifies the change → matched list of _which of your clients_ it hits → one-click apply across all of them, each linked to the source, audited, undo within 24h. Explicitly: _the AI never changes a client's deadline on its own — you approve._ Free during beta. **Cap this at ~7 min.** (See §3 for the demo script.) |
| 6   | **Q&A**                                      | 0:37–0:45 | Take live questions. Seed 2–3 in case the room is quiet (see §6).                                                                                                                                                                                                                                                                                                                                                                                                |

**Speaker-note guardrails:**

- Segments 1–4 must be usable by someone who closes the tab before segment 5. If they're not, it's a pitch, not a session.
- Segment 5 shows only shipped features (§7). If a question probes a roadmap item, say "not yet — here's what's live today."
- No competitor bashing by name. Contrast the _category_ ("a tool you type dates into vs. one that watches the sources") not vendors.

---

## 3 · The tool segment — demo script (7 min, honest)

Every step below is a shipped capability (`docs/marketing/unique-selling-points.md`). Do not show anything not on this list.

1. **The alert exists because a source changed** (~1 min). Show a real alert generated from an official notice. "We watch the IRS, the major state tax agencies, and FEMA disaster declarations around the clock. This alert exists because one of them published something — not because I typed it in."
2. **AI read the notice, you read the AI's work** (~1.5 min). Show the AI-classified change type + the linked official source. "Claude parses the notice into a structured change — a postponement, a new requirement, a threshold shift. If the dates aren't grounded in the source text, we hold the alert back rather than show a guess."
3. **Who's affected** (~1.5 min). Show the matched client list — by jurisdiction, form, entity type, due date, with the eligible / needs-review split. "This is the part you can't Google: not _what_ changed, but _which of your clients_ it hits."
4. **One-click apply, sourced + reversible** (~1.5 min). Apply across affected obligations; show the exception rule linked to the source, the audit event, and the 24-hour undo. "Every applied change traces to the person who approved it, the AI that read the source, and the official notice URL. You keep the click."
5. **Close** (~0.5 min). "It's free while we're in beta. It's a new product from Dify. If you want to see whether it catches something in your own book, the link's on the last slide — but honestly, the checklist from segment 4 is yours to keep either way."

**If the demo can't be live** (platform limits, stability): use a short recorded screen capture with voiceover. Never fake data live.

---

## 4 · Registration / landing copy

Honest, no fabricated stats. Two variants depending on the credit path settled in [`research.md`](./research.md) §1 — a **CPE-credit line only appears if credit is actually secured** through a co-host sponsor.

**Headline:**

> When the IRS Moves a Deadline and the State Doesn't

**Subhead:**

> A free 45-minute working session for CPAs and firm owners on catching filing-date changes — disaster relief, state non-conformity, and the deadlines that quietly move mid-season — before they cost a client.

**What you'll walk away with (bullets):**

- How IRS, state, and FEMA deadline changes actually propagate — and why they rarely move together
- The **conformity trap**: when "the IRS extended it" is the wrong answer for a state return
- A practical, tool-agnostic early-warning checklist you can run at your own firm
- A live 2026 case: IRS wildfire relief that Georgia didn't conform to — and who it hit
- An honest look at automating the monitoring (including how our own tool does it)

**Presenter line:**

> Presented by Gigi, Co-Founder of DueDateHQ — a deadline-change monitoring tool for US firms, and a new product from Dify (dify.ai).

**CPE line (INCLUDE ONLY IF CREDIT IS SECURED via co-host — otherwise delete):**

> _Eligible for 1 hour of CPE credit ([field of study], live/group-internet-based) through [host society/platform]. [Delivery + attendance requirements per host.]_

**If NOT offering credit, use instead:**

> _This is a non-credit educational session. No CPE is awarded. Bring your questions — we'll leave time for them._

**CTA button:** `Save my seat` (or the host platform's default). **Secondary:** `Can't make it? Register and we'll send the recording.`

**Fine print:** honest data handling — "We'll email you the recording and a one-page summary. That's it — no sales calls unless you ask." (Matches the cold-email posture of _try before deciding_.)

---

## 5 · Follow-up email sequence

Voice matches `send-outreach.mjs` v11 and the newsletter pack: warm, plain, factual, short. Sign-off is always:

```
Gigi
Co-Founder of DueDateHQ
A new product from Dify (dify.ai) · duedatehq.com
```

No fabricated stats, no "as seen in," no invented urgency. Links should be UTM-tagged per host (e.g. `?utm_source=calcpa_webinar`) so signups are attributable.

---

### Email 1 — Confirmation (on registration, both attendees + no-shows-to-be)

**Subject:** You're in — [date], "When the IRS Moves a Deadline and the State Doesn't"

> Hi {{first_name}},
>
> You're registered. Here's the one thing to bring: a filing deadline you weren't 100% sure about this year. We'll work through why those happen and how to catch them early.
>
> **When:** {{date}} · {{time}} {{tz}}
> **Where:** {{join_link}} (add to calendar: {{cal_link}})
>
> It's a working session, not a webinar you can half-listen to — we'll spend most of it on the conformity gaps that actually bite, then I'll show how our own tool automates the monitoring. Either way you'll leave with a checklist you can run at your firm.
>
> See you there.
>
> Gigi
> Co-Founder of DueDateHQ
> A new product from Dify (dify.ai) · duedatehq.com

---

### Email 2A — Thank-you + recap (to ATTENDEES, within 24h)

**Subject:** The checklist + recording from today's session

> Hi {{first_name}},
>
> Thanks for spending 45 minutes on deadline changes with me. As promised:
>
> - **Recording:** {{recording_link}}
> - **The early-warning checklist** (one page, tool-agnostic): {{checklist_link}}
> - **The Georgia example** we walked through — IRS pushed to Aug 20, Georgia ran its own dates (Oct 13 / Oct 28 / Feb 12), hitting clients in Clinch, Echols, and Brantley counties.
>
> If you want to see whether DueDateHQ catches something moving in your own book, it's free while we're in beta: {{app_link}}. No sales call — poke at it whenever's useful.
>
> And if a state quietly moves a date this season, you'll know how to spot it either way. That was the point.
>
> Gigi
> Co-Founder of DueDateHQ
> A new product from Dify (dify.ai) · duedatehq.com

---

### Email 2B — Sorry we missed you (to NO-SHOWS, within 24h)

**Subject:** Missed you — here's the recording anyway

> Hi {{first_name}},
>
> You registered for today's session on catching moved deadlines but couldn't make it — no worries, that's most of tax season. Here's what you missed, on your own time:
>
> - **Recording:** {{recording_link}}
> - **The one-page checklist:** {{checklist_link}}
>
> The short version: when the IRS moves a deadline, the states often don't follow — and that gap is where clients get missed. The recording walks through a live 2026 example and how to build an early-warning system for it.
>
> If you'd rather have something watch the sources for you, that's what we built — free while we're in beta: {{app_link}}.
>
> Gigi
> Co-Founder of DueDateHQ
> A new product from Dify (dify.ai) · duedatehq.com

---

### Email 3 — Soft follow-up (to engaged non-signups, ~5–7 days later, ONE only)

**Subject:** One thing worth trying before next deadline

> Hi {{first_name}},
>
> Quick follow-up on the deadline-change session — no pitch. The next time a state moves a date mid-season, the firms that catch it early are the ones watching the sources, not the ones refreshing them by hand.
>
> If you want to see what that looks like automated, the beta's free to try: {{app_link}}. It'll tell you which of your clients a change hits, with the official notice attached — or nothing, if nothing moved.
>
> That's the last you'll hear from me on this. Thanks for the time.
>
> Gigi
> Co-Founder of DueDateHQ
> A new product from Dify (dify.ai) · duedatehq.com

**Sequence rule:** stop after Email 3. If someone replies or signs up, suppress them from further sends (mirror `outreach-suppress.txt` discipline).

---

## 6 · Seeded Q&A (in case the room is quiet)

Honest answers only; each maps to a shipped fact or an explicit "not yet."

- **"Does it cover my state?"** — Live monitoring runs against the IRS, the major state tax agencies, and FEMA declarations nationwide; the deadline-_rule_ library covers all 50 states + DC. (Be precise — see §7. If asked whether a _specific smaller state's agency_ is polled live, say which sources are live rather than implying all 50 agencies are.)
- **"Is the AI making tax decisions for me?"** — No. It reads the official notice and classifies what changed; you decide applicability and you approve every change. If the dates aren't in the source, it holds the alert back.
- **"What does it cost?"** — Free while we're in beta. It's a new product from Dify.
- **"Can it auto-apply changes so I don't have to?"** — No, by design. Every change is a human click, traced to you, the AI, and the source. That's what makes it defensible on review.
- **"Where do the deadlines come from — do I have to type them in?"** — You can bring an existing list (CSV / File In Time export) and we build a sourced year in about 30 minutes; from then on we watch for changes.

---

## 7 · Honesty ledger (do / don't) — grounded in `unique-selling-points.md`

**✅ Say (all shipped):**

- "We watch the IRS, the major state tax agencies, and FEMA disaster relief around the clock."
- "The deadline-rule library covers all 50 states and DC" — _as rule coverage, kept distinct from live monitoring._
- "AI reads the official notice and classifies what changed; ungrounded dates are held back, not shown."
- "See exactly which clients a change hits — matched by jurisdiction, form, and entity type."
- "Apply the fix to every affected client at once — sourced, audited, undo within 24h."
- "The AI never changes a client's deadline on its own — you approve."
- "Free while we're in beta." · "A new product from Dify (dify.ai)."

**⛔ Don't say:**

- ⚠️ **"We watch all 50 states" (live monitoring).** The cold-email template phrases it "the IRS, all 50 states, and FEMA," but `unique-selling-points.md` explicitly flags this: live _monitoring_ = IRS + major state tax agencies (CA, NY, TX, FL, WA, MA) + FEMA nationwide; 50 states + DC is the _rule library_, review-gated. **A public CPE audience is exactly where this distinction gets challenged.** Use the precise framing above and **get Gigi's ruling on the "all 50 states" wording before the session goes live.** (Flagged, not silently changed.)
- "Every change within 24 hours" — no all-source SLA.
- "AI writes a recommended action plan per alert" — only a suggested-next-step card exists.
- "Auto-applies / auto-cascades" — false by design.
- The word **"Radar"** — banned (`docs/Design/pulse-vocabulary.md`); the monitoring product is **Alerts**.
- Any attendee/readership/customer count we can't verify. No "trusted by N firms."

---

## 8 · Asset checklist + timeline

**Assets needed:**

| Asset                                  | Owner         | Notes                                                                                                                                           |
| -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Slide deck (~15–20 slides)             | Gigi / design | Segments 1–6. Brand: navy `#2E368C` + cyan `#14C5F6` (`project_brand_identity_radar_d`). GA example as the centerpiece slide.                   |
| One-page early-warning checklist (PDF) | Gigi          | The giveaway. Tool-agnostic. Doubles as the follow-up lead magnet.                                                                              |
| Demo — live env or recorded fallback   | Gigi          | Real alert + real matched-client list. Recorded backup in case of platform limits. Never fake data.                                             |
| Speaker (Gigi)                         | —             | Sole presenter; optional society co-host for intro + Q&A moderation.                                                                            |
| Landing / registration page            | Growth        | §4 copy. UTM per host. Recording-opt-in for no-shows.                                                                                           |
| Email sequence set up                  | Growth        | §5, in Resend or the host platform. Suppress on reply/signup.                                                                                   |
| Platform                               | Host          | Usually the society's / CPA Academy's own (Zoom / BigMarker / GoToWebinar). For credit, attendance monitoring + polling handled by the sponsor. |

**Realistic timeline (from a "go"):**

- **Week 0–1:** Lock target + submit (see [`research.md`](./research.md) §4). Decide credit vs. non-credit.
- **Week 1–3:** Society/platform review + scheduling (varies widely — some CPE platforms slot in ~2–4 weeks, state societies often want a season of lead time; see `research.md`).
- **Week 2–4:** Build deck + checklist + demo recording. Dry-run once, timed.
- **Week 4–6:** Registration page live, promotion via host's channels + our list. Send Email 1 on registration.
- **Session day.** Then Emails 2A/2B within 24h, Email 3 at day 5–7.

**Minimum viable first run:** a non-credit session co-hosted on a CPE platform or a receptive smaller society — deck + checklist + recorded demo — provable in ~3–4 weeks. Credit-bearing runs come after the format is proven (see `research.md` recommendation).

---

_Next: see [`research.md`](./research.md) for the CPE-credit mechanics, the ranked society/platform target list, and the exact next action per target._

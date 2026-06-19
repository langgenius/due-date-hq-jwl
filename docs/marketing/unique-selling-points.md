# DueDateHQ — Unique Selling Points (grounded)

**Status:** USP brief for marketing · 2026-06-17. Every claim below is verified against shipped code (file-cited) so we don't overclaim. Pairs with `.claude/product-marketing-context.md`.

---

## The one-sentence wedge

> **Every other CPA deadline tool is a filing cabinet for dates you type in. DueDateHQ is the analyst that watches the law for you** — it monitors the IRS, the major state tax agencies, and FEMA disaster relief around the clock, reads each change, finds exactly which of your clients are affected, and lets you apply the fix to all of them in one click — sourced, audited, and reversible.

The differentiator is **active vs. passive.** File In Time records dates and rolls them forward. TaxDome/Canopy/Karbon manage your practice. **None of them watch the regulatory sources and turn a change into applied, sourced work.** That's the whole game.

## The loop (the highlight)

```
WATCH (24/7)  →  READ (AI)  →  MATCH (who's affected)  →  APPLY (one click)  →  AUDIT / UNDO
```

This is the product's spine and its only un-copyable claim. Marketing should lead with it.

## The five USPs, with what's real

**1 · Around-the-clock regulatory monitoring — SHIPPED**
Monitors ~14 official sources, polled continuously (cron every 30 min): the IRS (4 feeds), **6 state tax agencies — CA, NY, TX, FL, WA, MA**, and **FEMA disaster declarations nationwide** (any state). ETag/content-hash dedup, health canary if extraction stalls.

- ✅ Say: "monitors the IRS, the major state tax agencies, and FEMA disaster relief around the clock," "you stop refreshing state tax sites."
- ⛔ Don't say: "watches all 50 states" (live monitoring is the IRS + 6 state agencies + FEMA, NOT 50 state agencies — that's the _rule-library_ coverage). Don't say "every change within 24 hours" (cadences vary; no all-source SLA).
- **Two different axes, keep them separate:** live source _monitoring_ = IRS + 6 states + FEMA nationwide. Deadline-_rule coverage_ = FED + 50 states + DC (candidate rules, review-gated).
- Files: `apps/server/wrangler.toml` (cron `/30`), `packages/ingest/src/adapters/index.ts`, `apps/server/src/jobs/cron.ts`.

**2 · AI change detection, grounded in the source — SHIPPED**
AI (Claude) parses each official notice into 9 structured change types (deadline shift, disaster-relief postponement, new filing requirement, threshold advisory, protective-claim window, rule-source drift, …), confidence-gated, and **suppresses any alert whose dates aren't grounded in the source text.**

- ✅ Say: "AI reads the official notice and classifies what changed," "no hallucinated deadlines — ungrounded dates are held back, not shown."
- ⛔ Don't say: AI gives tax conclusions or decides applicability.
- Files: `apps/server/src/jobs/pulse/extract.ts`, `packages/ai/src/pulse.ts`, `packages/db/src/schema/pulse.ts`.

**3 · Instant impact analysis (who's affected) — SHIPPED**
For each change, a deterministic match finds the affected obligations by jurisdiction + form + entity type + due date, with an `eligible` / `needs_review` status, and the affected-client count is reconciled live if your clients change.

- ✅ Say: "see exactly which clients a change hits — matched by jurisdiction, form, and entity type, before you even open the alert," "12 clients may be affected."
- Files: `packages/db/src/repo/pulse/scoped.ts` (impact join + live reconcile).

**4 · One-click apply across all affected clients — SHIPPED**
Apply a change to up to 100 obligations in a single action; each gets an exception rule linked to the official source, a full audit event, and a **24-hour undo**. Also: mark reviewed, request review (ask an owner), reactivate.

- ✅ Say: "apply the fix to every affected client at once — sourced, audited, undo within 24h," "Apply to 18."
- Files: `packages/db/src/repo/pulse/scoped.ts` (apply / revert / dismiss).

**5 · Glass-box: AI does the work, you keep the click — SHIPPED**
AI never auto-applies. Every application traces to the human who approved it, the AI that read the source, and the official source URL (`actorType = 'ai_assisted'`). Missing source → no render.

- ✅ Say: "AI never changes a client's deadline on its own — you approve," "every change traces to a person, the AI, and the official source."
- This is the trust that makes #1–#4 _usable_ by a compliance professional. It's a USP, not a disclaimer.
- Files: `apps/server/src/jobs/pulse/extract.ts` (approval gates), `scoped.ts` (apply validation).

## Supporting differentiators (real, secondary)

- **Smart triage / risk ranking** — the daily worklist ranks open work by days remaining, evidence completeness, readiness, and alerts (explainable, auditable — no black box). Severity is `urgent / informational / resolved`, never invented "critical/high."
- **One-paste migration** — a CSV or File In Time export → a full sourced year of deadlines in ~30 minutes.
- **Reminders + morning digest** — 30/7/1-day reminders and a daily briefing that only emails you when something needs you.
- **Protective-claim-window + rule-source-drift alerts** — niche change types competitors don't watch for at all.

## What NOT to claim (stubbed / false)

- ⛔ "AI writes you a recommended action plan per alert" — only a _suggested next step_ card + apply-readiness exists; rich per-alert AI recommendations are roadmap, not shipped.
- ⛔ "Auto-applies / auto-cascades changes" — false, and we don't want it to (glass-box).
- ⛔ "Every change within 24 hours" — no all-source SLA.
- ⛔ The word **"Radar"** in any user-facing or marketing copy — banned by `docs/Design/pulse-vocabulary.md`. The monitoring product is named **Alerts**.

## Competitor contrast (for comparison copy / sales)

|                                              | File In Time | TaxDome / Canopy / Karbon | Excel + Outlook | **DueDateHQ**           |
| -------------------------------------------- | ------------ | ------------------------- | --------------- | ----------------------- |
| Tracks deadlines                             | ✅           | ✅                        | manual          | ✅                      |
| **Watches official sources for changes**     | ❌           | ❌                        | ❌              | **✅ 24/7, 14 sources** |
| **AI reads a change + finds who's affected** | ❌           | ❌                        | ❌              | **✅**                  |
| **One-click apply across affected clients**  | ❌           | manual override           | ❌              | **✅ + 24h undo**       |
| Source on every date                         | ❌           | ❌                        | ❌              | **✅**                  |
| Practice management breadth                  | ❌           | ✅                        | ❌              | narrow by design        |

**The line for sales:** _"They tell you a date. We tell you when the date changed, who it hits, and fix it in one click — with the IRS notice attached."_

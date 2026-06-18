# Onboarding design audit + proposal

> The first-run experience from sign-up to first value, audited against the
> onboarding goals (get to value fast · orient don't educate · build confidence ·
> reduce friction). Grounded in the shipped flow (file:line); proposals ranked by
> impact on time-to-value. _2026-06-18._

## The flow today (grounded)

**Auth** — [`routes/login.tsx`](../../apps/app/src/routes/login.tsx): passwordless.
Email OTP + Google + Microsoft Entra. Collects **only an email**; display name is
derived (`displayNameFromEmail`). No password, no firm details here. Good — this
is minimal-friction sign-up done right.

**Routing** — `protectedLoader` ([router.tsx](../../apps/app/src/routes/router.tsx)):
no firm → `/onboarding`; has firm → `/today`.

**Setup (3 steps, with progress dots "STEP 1 OF 3")** —
[`routes/onboarding.tsx`](../../apps/app/src/routes/onboarding.tsx):

1. **Practice setup** — only the practice _name_ is true friction; monitoring
   start date, internal-deadline offset, timezone, and state rules all have smart
   defaults. Copy reassures "you can change any of this later."
2. **Rule review** (conditional) — only if activated jurisdictions need
   source-calendar review. Skippable.
3. **Import** → [`routes/migration.new.tsx`](../../apps/app/src/routes/migration.new.tsx):
   a 4-step wizard (Upload → Match columns → Check values → Confirm), 11 source
   integrations (TaxDome, Drake, Karbon…). Skippable via `OnboardingSkipModal`
   (a genuinely good compare card: "if you skip" vs "if you import now ~5 min").

**Aha moment** — clients imported → rules activated → deadlines auto-generated →
the Daily Brief AI sentence + Priorities table on `/today`. Best path ≈ 8–10 min.

**Returning users** — [`routes/splash.tsx`](../../apps/app/src/routes/splash.tsx):
a once-a-day "welcome back" recap (deadlines synced / new alerts / reminders
sent / clients added). Backward-looking only.

## What's working

- Passwordless, single-field sign-up — friction is genuinely low.
- Smart defaults everywhere in practice setup; the only required field is the name.
- The skip modal frames the trade-off honestly instead of trapping the user.
- `/clients` has a real, designed empty state
  ([`ClientsEmptyState.tsx`](../../apps/app/src/features/clients/ClientsEmptyState.tsx)):
  integration logos, a clear headline, Import / Add-manually CTAs, and a sample-
  data tour chip. This is the model the other surfaces should follow.

## Gaps, ranked by time-to-value impact

| #   | Gap                                                                                                                                                                                                                                                | Where                                                  | Impact   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| 1   | **Empty `/today` has no first-action CTA.** Skip the importer → next day you land on an empty dashboard (collapsed brief, empty Needs-attention, empty Priorities) with **no visible "import clients"** — you must already know `/clients` exists. | dashboard renders sections regardless of `clientCount` | **High** |
| 2   | **Rule→deadline causality is invisible.** If you skip rule activation, no deadlines generate and the product reads as broken — nothing explains "rules are what create your deadlines."                                                            | onboarding step 1 + empty `/today`                     | Med      |
| 3   | **Sample-data path is ambiguous.** `/clients` has a "try with sample data" chip but it's unclear whether it loads real sample clients or a demo mode — risks showing fiction the user thinks is theirs (violates no-fiction).                      | `ClientsEmptyState` `onSampleData`                     | Med      |
| 4   | **Splash is backward-looking + once-a-day.** It recaps what happened, never "here's your next step," and doesn't help a user who skipped setup mid-session.                                                                                        | `splash.tsx`                                           | Med      |
| 5   | **Daily Brief is conditional.** A new account with clients but no rules = no obligations = no brief, so the one surface that says "here's what to do" is silent exactly when a new user needs it.                                                  | `daily-brief-card.tsx`                                 | Low–Med  |
| 6   | `/deadlines`, `/alerts` first-run = bare text ("No deadlines yet" / "No alerts right now"), not designed empty states.                                                                                                                             | obligations / AlertsListPage                           | Low      |

## Proposals (apply the onboarding patterns)

**A — First-run dashboard empty state (fixes 1, 2, 5). ✅ BUILT 2026-06-18.**
When the clients probe resolves to zero rows, `/today` now leads with the same
designed `ClientsEmptyState` hero `/clients` shows (primary "Import clients" CTA →
`openWizard`), instead of three silent sections. Reused the existing dashboard
`clientsProbeQuery` signal (the derived flag was parked-unused) — no new backend.
The sample-data chip was deliberately omitted here (gap #3 below). See
`docs/dev-log/2026-06-18-first-run-dashboard.md`.

**B — Persistent setup checklist (fixes 1, 2, 4).** A small, dismissible "Finish
setting up" checklist on `/today` for accounts that skipped steps: ☐ Activate
rules → ☐ Import clients → ☐ Review your first alert. This is the
setup-wizard-as-persistent-checklist pattern — it re-orients users who skipped
the linear flow and makes the rule→deadline causality explicit ("Activate rules
to start generating deadlines"). Drives the activation funnel directly.

**C — Forward-looking splash line (fixes 4).** When setup is incomplete, the
splash recap gains one next-step line ("Finish setup: import your clients →")
instead of only looking backward.

**D — Honest sample data (fixes 3).** Make the sample-tour explicitly labeled
demo data with a one-click "clear & start fresh," or drop the chip until it's
real. Never let sample rows masquerade as the user's own clients.

## Measurement (instrument the funnel)

The `ANALYTICS_EVENTS.onboardingSkipped` event already fires with `from_step`.
Extend to a real activation funnel:

- **Activation rate** — % of new firms that reach first value (first obligation
  viewed, or first import completed). Define the event and pick one.
- **Time-to-activation** — sign-up → that event.
- **Drop-off by step** — onboarding step 1/2/3 + the 4 import sub-steps.
- **Day-7 / Day-30 retention** split by "imported vs skipped" — validates whether
  the skip path needs the checklist nudge.

## Recommended first build

**Proposal A (first-run dashboard empty state)** is the highest-leverage, lowest-
risk fix — it closes the worst dead-end (skip → empty `/today` → confusion) and
reuses the already-designed `ClientsEmptyState` content/CTAs, so it's not net-new
design fiction. It needs the `clientCount === 0` signal wired into the `/today`
loader and a first-run branch on the dashboard. Pending the design owner's call
on exactly what the brand-new dashboard should say.

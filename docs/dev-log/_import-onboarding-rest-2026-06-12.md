# Import + onboarding critique — remaining items (2026-06-12)

Follow-up to the priority-5 pass (\_import-onboarding-priority-fixes). Worked
through the rest of the critique, splitting into clear wins (done) and
judgment calls (flagged, deliberately not churned).

## Done

- **WizardShell — drop the persistent "Esc Close" KbdHint** (header
  clutter): the ✕ already affords close and Esc still works via
  onRequestClose. Removed the now-unused `KbdHint` import and the orphaned
  `closeShortcutLabel` prop (no external callers).
- **OnboardingSkipModal**
  - "Personalised digest tomorrow morning" → "A morning summary of what's
    due, starting tomorrow" (no "digest" jargon on day zero).
  - Balanced the cards: the neutral "If you skip" eyebrow now carries a
    same-size gray SkipForwardIcon square so it no longer looks broken next
    to the green success card. Tone still differentiates the nudge.
- **Step 1 — SSN-blocked alert** rewritten: leads with the reassurance,
  names the columns, frames EIN recovery as the next step using its renamed
  label ("Match columns"). Tighter, less dense.
- **Step 1 — "Use Generic CSV instead"** → "Read it as a plain CSV instead"
  (drops the "Generic CSV" format-name jargon).
- **SuccessModal — demote the batch ID**: "Batch #BAT-XXXX · countdown: …"
  → "{countdown} left · you can also undo a single client…". Batch
  reference lives in Import History where recovery happens; removed the now
  dead `shortBatchId` helper.

## Verified, not a bug

- `rule-review-prompt` `<Plural>` uses only `#` (no interpolated var), so the
  known lingui plural+var footgun does not apply.

## Judgment calls — flagged, NOT churned (need a product/scope decision)

- **Tool-chip block → disclosure** (Step 1): collapsing the 11 supported-tool
  chips into a disclosure would de-clutter the empty state, BUT those logos
  are conversion reassurance ("they support my stack"). Hiding them is a
  product call, not a pure polish fix — left as-is.
- **Reassurance line repeats** (Step 2 "Nothing applies until step 4…" and
  Step 3): each step is self-contained (a user can resume directly onto
  step 3) and they say slightly different things (audit vs 24h-reversible).
  Kept — removing per-step reassurance on a data-import flow is riskier than
  the mild repetition.
- **DetectionReadout impl gap**: the readout shows "product · N clients" but
  the design intends entity-type/state counts too. That needs the manifest
  counts wired through the backend — a feature task, not a copy pass. Left
  for a separate ticket.

## Verification

tsgo clean (excl. parallel session's AlertDetailDrawer + router WIP); zh-CN
filled (14, ~5 mine); strict compile green. Per-file diffstats confirm only
my hunks. Live-verify deferred — the wizard isn't reachable in the seeded
env (route redirects once a firm exists); changes are copy/markup with no
behavioral risk.

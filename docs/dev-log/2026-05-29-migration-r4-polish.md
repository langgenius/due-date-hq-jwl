# /migration/new R4 polish

## Context

Round-4 design pass on `/migration/new` (the Migration Copilot wizard route
that lands first-run users from `/onboarding?source=onboarding` and from
in-app "Import clients" CTAs elsewhere). Ten items from agentation feedback
at 1512×861. Touches three files: `apps/app/src/routes/migration.new.tsx`,
`apps/app/src/features/migration/Stepper.tsx`, and
`apps/app/src/features/migration/Step1Intake.tsx`.

## Changes

### Route + intro (`migration.new.tsx`)

1. **Activation chips removed (#1 + #5).** The three `ActivationOutcome`
   chips (Import / Deadlines / Risk view) used to sit next to the eyebrow
   pill in a horizontal small-pill row. With the 4-step Stepper rendering
   identical small pills a few rows below, the chips read as steps competing
   with the wizard's actual progress indicator (#1). They also duplicated
   the H1's verbs ("Import + generate deadlines") and the description's
   noun list ("deadlines, evidence, Today risk view") — three surfaces
   carrying the same payload (#5). Removed. The `ActivationOutcome` helper
   and its three icon imports (`FileSpreadsheetIcon`, `CheckCircle2Icon`,
   `GaugeIcon`) went with it.
2. **"Skip for now" → ghost variant (#2).** Was `variant="outline"` —
   bordered, filled, weight equal to Continue inside the wizard frame
   below. That weight encouraged users to read it as a primary action
   competing with Continue. Dropped to `variant="ghost"` so it reads as
   a quiet lateral exit. Tooltip kept — it still carries the
   "import later from Today / Clients / ⌘K" reassurance.
3. **H1 + description tightened (#3 + #4 + #5).** Old H1:
   "Import your clients and generate deadlines." (`text-xl`). New H1:
   "Activate your practice." (`text-2xl`). Mirrors the eyebrow's framing,
   and matches the entry-shell family — `/login` is `text-[26px]`,
   `/onboarding` is `text-2xl`; this page was stuck a notch smaller (#4).
   Description compressed from three sentences (workspace ready / import
   the spreadsheet / skip and import later) into one declarative naming
   the outcomes once: "Import your client list to generate deadlines and
   unlock the first Today risk view." Trailing period on H1 kept — the
   entry-shell family (login "Welcome to DueDateHQ.", onboarding "We
   pre-filled a name from your account.") all end H1s with a period as
   part of the declarative voice. (`PageHeader` titles for in-app pages
   like `/settings` and `/today` remain noun-phrases without a period —
   different family, different rule.)
4. **"← Back" affordance (#10).** Surfaces on the leading edge of the
   intro when there's a real previous surface. Suppressed when
   `source=onboarding` — the logical chain there is
   signup → onboarding (one-shot, now complete) → migration, so
   `navigate(-1)` would hit `/onboarding` and bounce right back. For
   other entry points (e.g. "Import clients" CTA from `/today`),
   `navigate(-1)` works and the button shows. The button is styled as a
   quiet text link (`text-caption text-text-tertiary` → hover accent),
   so it reads as page-level navigation and doesn't compete with the
   eyebrow pill.

### Stepper (`Stepper.tsx`)

5. **Full-width track (#7).** Stepper was `justify-center gap-2` with
   `w-6` fixed connector lines — the four step pills clustered in the
   middle of the wizard frame and the connectors became decorative ticks
   rather than a real progress rail. Switched to `justify-between gap-3`
   on the `<ol>`; each `<li>` (except the last) takes `flex-1` so the
   step pill sits at the leading edge of its column and the connector
   `<span>` (now `flex-1 h-px`) fills the remaining space. The track now
   reads as one continuous path across the full width of the wizard
   frame, which is what the user expected from a "stepper."

### Step 1 (`Step1Intake.tsx`)

6. **Empty-state title block removed (#6).** "Drop your client file." h2
   + "Any shape works. We'll figure out the columns." sub-headline were
   a third title in the orientation zone — the wizard frame's `<header>`
   already says "Import clients" and the Stepper says "Intake". The
   dropzone label below ("Drop a file or click to browse" + the
   format/limit line) is the actual affordance and already covers the
   action. The "any shape works" promise lives downstream: Step 2
   (Mapping) is where the AI's column-detection result shows up, which
   is where the reassurance becomes observable rather than just promised.
7. **SSN-blocked privacy line gets a chip (#8).** The line "SSN-like
   columns are blocked before anything goes to the AI." used to render
   as plain tertiary text + a tiny lock icon — it disappeared visually
   next to the large dropzone above. Privacy reassurance is exactly the
   line a first-time user needs to see before uploading client data, so
   it now reads as a discrete privacy chip: subtle accent-tint surface
   (`bg-state-accent-hover-alt`) with a matching ring
   (`ring-1 ring-state-accent-active-alt/50`), centered. Still small in
   scale (text-sm), but anchored so it doesn't run into the next section.
8. **"Coming from a specific tool?" clarified (#9).** Added "we auto-detect
   from uploaded files" inline so users understand the picker isn't a
   second step after upload — the source-manifest pipeline already
   detects Drake / Lacerte / TaxDome / etc. from a dropped file. The
   picker is only useful for the paste path or when auto-detect misses.
   Prevents the "did I already say Drake?" double-step.

## i18n

3 new en-source strings; zh-CN translations added in the same commit so
the catalog still reports 0 missing:

- "Activate your practice." → "启用您的事务所。"
- "Import your client list to generate deadlines and unlock the first Today risk view." → "导入您的客户列表以生成截止事项，并解锁首个 Today 风险视图。"
- "Coming from a specific tool? (Optional — we auto-detect from uploaded files.)" → "来自特定工具？（可选 — 已上传的文件会自动识别。）"

Strings dropped (extract --clean):
- "Import" / "Deadlines" / "Risk view" (chip labels — chip removed)
- "Import your clients and generate deadlines." (old H1)
- "Your practice workspace is ready. Import a spreadsheet now to turn client facts into deadlines, evidence, and the first Today risk view. You can skip and import later from Today, Clients, or Command Palette." (old description)
- "Drop your client file." / "Any shape works. We'll figure out the columns." (Step 1 empty-state h2 + sub-headline)
- "Coming from a specific tool? (Optional)" (old phrasing of the picker label)

## Verification

- `pnpm vp check` — 0 errors / 8 unchanged warnings.
- `pnpm i18n:extract` — 2902 / 0 missing (zh-CN).
- `pnpm -F @duedatehq/app test -- features/migration` — 61/61 pass
  (9 test files: Wizard, WizardShell, Step1Intake, Step2Mapping,
  Step3Normalize, Step4Preview, state, continue-rules,
  mapping-target-labels).
- Visual verification deferred to the next browser pass; the changes
  are mechanical (chip removal, copy swap, ghost variant, full-width
  stepper geometry, chip-styled privacy line) and small enough that
  this dev-log description is sufficient to review.

## Design / Docs

This round's chip-removal contradicts the F6-02 rationale that
introduced the chips (ordering them to the user's mental model
act → see → assess). The F6-02 framing was right in isolation; it
just didn't account for the chips visually colliding with the
Stepper below. The Stepper is the canonical step-progress surface
in this product; small horizontal chips elsewhere on the same page
read as a competing stepper unless they're explicitly disambiguated
(e.g. with leading "Includes:" copy or a different visual scale).
Removing the chips was cheaper than redesigning them; the H1 +
description now carry the activation outcomes once, in prose.

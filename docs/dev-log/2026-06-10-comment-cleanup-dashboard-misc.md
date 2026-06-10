# Comment cleanup — dashboard + misc features, 2026-06-10

**Who/why:** Automated comment-hygiene pass (Claude) trimming verbose dated
change-history comments from source files across the dashboard, migration,
calendar, audit, concepts, settings, members, firm, evidence, onboarding,
notifications, reminders, workload, and _surface-vocabulary feature dirs.
Pure dated narration (`// 2026-05-23: dropped X`) was deleted; mixed comments
had their date/attribution/"changed-from-X" prose stripped while the WHY
(constraints, footguns, non-obvious rationale) was kept and rewritten to
present tense. Comments only — no code, JSX, props, className, or logic
changed. Tests excluded.

## Touched files (approx deleted-vs-trimmed counts)

- `features/dashboard/needs-attention-card.tsx` — 2 trimmed
- `features/dashboard/needs-attention-section.tsx` — 2 trimmed
- `features/dashboard/actions-list.tsx` — 3 trimmed
- `features/dashboard/daily-brief-card.tsx` — 3 trimmed
- `features/migration/Step1Intake.tsx` — ~11 trimmed, 2 deleted
- `features/migration/Step2Mapping.tsx` — ~9 trimmed
- `features/migration/Step3Normalize.tsx` — ~9 trimmed
- `features/migration/Step4Preview.tsx` — ~5 trimmed, 4 deleted
- `features/migration/Stepper.tsx` — 2 trimmed
- `features/migration/Wizard.tsx` — ~8 trimmed
- `features/migration/ImportHistoryDrawer.tsx` — ~5 trimmed
- `features/calendar/calendar-page.tsx` — ~6 trimmed, 1 deleted
- `features/audit/audit-event-drawer.tsx` — 2 deleted
- `features/audit/audit-log-page.tsx` — ~9 trimmed
- `features/concepts/concept-help.tsx` — 3 trimmed
- `features/settings/settings-sub-nav.tsx` — 2 trimmed
- `features/members/member-model.ts` — 2 trimmed
- `features/members/members-page.tsx` — ~20 trimmed
- `features/firm/use-firm-as-of-date.ts` — 1 trimmed
- `features/evidence/EvidenceDrawerProvider.tsx` — ~9 trimmed
- `features/onboarding/state-rule-activation-selector.tsx` — 3 trimmed
- `features/notifications/notifications-page.tsx` — ~10 trimmed
- `features/reminders/reminders-page.tsx` — ~6 trimmed
- `features/workload/workload-page.tsx` — ~10 trimmed
- `features/_surface-vocabulary/ai-confidence.ts` — 1 trimmed
- `features/_surface-vocabulary/SurfaceSummaryStrip.tsx` — 1 trimmed

Counts are approximate. Files in scope but already clean from the prior
partial pass were left untouched. Formatted with `vp fmt --write`.

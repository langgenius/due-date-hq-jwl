# 2026-05-26 Rule-generated readiness materials

## Context

Rule-backed deadlines already carried `taxType` and `formName`, and the
readiness catalog already had form-aware templates for 1040, 1065, 1120,
1120-S, 1041, 941, 1099, FBAR, 990, sales tax, and estimated tax. The gap was
timing: materials could be reconciled lazily when the drawer opened, but a
deadline generated from rules did not create its form-specific materials at the
same time.

## Changes

- Rule-generated deadlines now reconcile readiness checklist rows immediately
  after the obligation rows are created.
- Manual create-from-rule and accepted-rule generation both use the same helper,
  so `Form 1040` creates the 1040 organizer, `Form 1120-S` creates the S-corp
  organizer, and generic extension rules can fall back to the client's tax
  classification when the form itself is broad (`Form 7004`).
- The existing drawer-time reconciliation remains in place as an idempotent
  backstop for older rows and template catalog updates.

## Validation

- Core template tests cover selected `formName` and client `taxClassification`
  matching.
- Server tests cover create-from-rule and accepted-rule generation reconciling
  form-specific readiness templates.
- `pnpm --filter @duedatehq/core test -- src/readiness-documents/index.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/_obligation-generation.test.ts src/procedures/obligations/index.test.ts src/procedures/readiness/index.test.ts`
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
- `pnpm --filter @duedatehq/core exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @duedatehq/server exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @duedatehq/app exec tsc -p tsconfig.json --noEmit`
- `git diff --check`

## Follow-up: visible checklist form reference

Browser feedback on a manually added CA individual deadline showed that the generated Materials
checklist used the 1040 individual organizer but did not visibly say `1040`. The checklist header now
shows a compact form-reference badge such as `Form 1040` for individual-return organizers, including
state individual income deadlines. The Add deadline dialog keeps the matched rule form internal; that
matching detail is implementation context and should not be shown to practice users.

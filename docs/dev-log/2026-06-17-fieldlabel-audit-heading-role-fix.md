# FieldLabel — restore heading role on audit-drawer section headers

_2026-06-17_

Hotfix for a regression introduced in
[batch 3](2026-06-17-fieldlabel-migration-batch3.md). Caught by checking CI on the
pushed commits (the `E2E` job was red).

## The regression

Batch 3 migrated the audit detail drawer's two section headers
(`features/audit/audit-event-drawer.tsx`: "AI trace", "What changed") from `<h3>`
to `<FieldLabel as="div">`, following the "heading-labels demote to `as="div"`"
rule. But `e2e/tests/audit-log.spec.ts:46` asserts:

```ts
auditPage.detailDrawer.getByRole('heading', { name: 'What changed', level: 3 })
```

A `<div>` has no heading role, so the test failed (`element(s) not found`). The
demotion also removed real a11y heading structure from a dialog — screen-reader
users lose section navigation.

> Note: the other red e2e items were the `visual` job (no committed baselines —
> "snapshot doesn't exist, writing actual" — plus a seeded-env click timeout),
> which is `continue-on-error` and also fails on unrelated commits. Not from this
> work. The CI `vp run ci` failure is `packages/core/src/rules/index.test.ts`
> (rule-evidence backfill), also unrelated.

## Fix

These two are genuine **section headings**, not label-only eyebrows — so they
should keep the heading role. Rather than revert to a hand-rolled `<h3>` (drift the
sweep removed) or weaken the test (abandon the a11y contract), FieldLabel now
supports heading tags:

- `components/primitives/field-label.tsx` — `as` widened to
  `'div' | 'dt' | 'span' | 'label' | 'h2' | 'h3' | 'h4'`. Runtime already rendered
  any tag; this is a type-only widening. The caps styling is unchanged.
- `audit-event-drawer.tsx` — "AI trace" + "What changed" → `as="h3"` (heading
  role, level 3 restored; still on the primitive, still canonical caps styling).

The `as="div"` demote remains the default for caps labels that are NOT structural
headings. Canon refined in `section-header-style.md`.

## Not changed (flagged for a possible later a11y pass)

Other batch-3/4 heading→div demotions with the SAME section-heading character but
no test/contract — `ShortcutHelpDialog` group headers, dashboard `actions-list` —
are left as `div` for now (the demote default stands). If we want consistent
heading a11y for dialog/section headers, that's a separate, deliberate pass.

## Verification

- `tsgo --noEmit` → 0 errors (`as="h3"` typechecks).
- `vp fmt` clean on the two files.
- `as="h3"` → `<h3>` → role `heading` level 3 (deterministic) satisfies the
  `getByRole('heading', { level: 3 })` assertion; confirmed by CI's E2E job (the
  audit drawer needs a seeded Worker env, not reachable in local preview).

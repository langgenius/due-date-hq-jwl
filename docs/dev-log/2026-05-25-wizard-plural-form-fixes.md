# 2026-05-25 — Wizard #40 plural-form fixes

## Why

Follow-up to the wizard copy + i18n audit
(`docs/Design/wizard-copy-audit-2026-05-25.md`). The audit
flagged **5 baked-in English plurals** where the count is
interpolated into a string that hard-codes `"clients"` /
`"obligations"` / `"values"`. At `n=1` these render
"1 clients", "1 obligations", "1 values" — wrong in any
language, even English.

Lingui can't extract plural variants from `t\`${n} clients\``because the template literal collapses to one ICU message
with the count as a placeholder. The fix routes each count
through the`plural()`macro (for`t\`...\``interpolation)
or wraps the whole sentence in`<Plural>` (for JSX).

## Shipped

### 4 fixes in `apps/app/src/features/migration/Wizard.tsx`

- **Line 404 — Import complete toast** description
  - Before: `t\`${clientCount} clients, ${obligationCount} obligations created\``
  - After: pluralise each count via `plural()` macro, then
    interpolate the resulting strings:
    ```ts
    const clientPart = i18n._(plural(clientCount, { one: '# client', other: '# clients' }))
    const obligationPart = i18n._(
      plural(obligationCount, { one: '# obligation', other: '# obligations' }),
    )
    // description: t`${clientPart}, ${obligationPart} created`
    ```
- **Line 538 — Import undone toast** description — same
  shape with `undoClientPart` / `undoObligationPart`
- **Line 671 — Genesis overlay "obligations created"**
  - Before: `<Trans>obligations created</Trans>` (always plural)
  - After: `<Plural value={obligationCount} one="obligation created" other="obligations created" />`
- **Line 674 — Genesis overlay "{n} clients imported"**
  - Before: `<Trans>{clientCount} clients imported</Trans>`
  - After: `<Plural value={clientCount} one="# client imported" other="# clients imported" />`

### 1 fix in `apps/app/src/features/migration/Step3Normalize.tsx`

- **Line 56 — "We organized N values" h2**
  - Before: `<Trans>We organized {rows.length} values — review if needed</Trans>`
  - After: `<Plural value={rows.length} one="We organized # value — review if needed" other="We organized # values — review if needed" />`

## Why `plural()` not just `<Plural>` in Wizard.tsx

Two of the four Wizard.tsx fixes live inside `toast.success(t\`...\`, { description: t\`...\` })`. Toast options
take strings, not JSX, so `<Plural>`can't be used directly.
The`plural()`macro from`@lingui/core/macro`is the
string-returning twin of`<Plural>`. Combined with
`i18n.\_()`from`useLingui()`, it resolves to a final
locale-aware string that the `t\`\`` template literal
happily interpolates.

The two genesis-overlay fixes ARE in JSX, so they use the
simpler `<Plural>` JSX form.

## Imports added to Wizard.tsx

```diff
- import { Trans, useLingui } from '@lingui/react/macro'
+ import { plural } from '@lingui/core/macro'
+ import { Plural, Trans, useLingui } from '@lingui/react/macro'
```

And destructured `i18n` out of `useLingui()` so the macro
output can be rendered.

## Files touched

- `apps/app/src/features/migration/Wizard.tsx`
- `apps/app/src/features/migration/Step3Normalize.tsx`

## Verification

- `vp check` → 0 lint/type errors across 669 files
- Manual spot-check at n=1: each toast / overlay reads
  "1 client" / "1 obligation" / "1 value" instead of the
  ungrammatical plural form.

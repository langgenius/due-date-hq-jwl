---
title: 'Clients pass A: plurals + section renames + grammar + currency'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: clients
---

# Clients pass A: plurals + section renames + grammar + currency

## Why

Critique of `/clients` (list) and `/clients/[id]` (detail) surfaced a
cluster of small UX bugs that all read as "this isn't quite the right
language." None individually serious, all together undermining
polish. This commit fixes the cross-cutting ones in one pass.

## What changed

### Plural-singular bugs

Three places had English plural-only strings that read broken when
the count was 1:

| Before                                                                            | After                                                                                         |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "1 clients are missing state or entity type — the rule library is skipping them." | `<Plural>` with `# client is missing… skipping it.` / `# clients are missing… skipping them.` |
| "1 late filings in 12mo"                                                          | `<Plural>` with `# late filing in 12mo` / `# late filings in 12mo`                            |

Switching to `<Plural>` is the project's standard pattern (existing
catalog has ~40 of them) and lets Lingui pick the right form per
count + locale.

### Section labels renamed

The detail page used internal-model names that read as database
tables rather than user tasks:

| Before                                             | After                                      | Why                                                                            |
| -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| RISK INPUTS                                        | Risk profile                               | "inputs" reads as raw data plumbing; "profile" reads as the CPA's mental model |
| FACT READINESS                                     | Onboarding state                           | "fact readiness" is jargon; "onboarding state" is what the CPA actually checks |
| (summary) "Penalty inputs and tax-attribute flags" | "Penalty exposure and tax-attribute flags" | "exposure" reads as the risk a CPA cares about                                 |

Companion strings updated for consistency:

- Toast: "Risk inputs saved" → "Risk profile saved"
- Toast error: "Couldn't save risk inputs" → "Couldn't save risk profile"
- Button: "Save risk inputs" → "Save risk profile"
- Audit log empty-state copy: "...facts, risk inputs..." → "...facts, risk profile..."

### Grammar fix — "OWNERS: 4 equity"

The compliance posture's OWNERS field rendered "4 equity" when only
the equity owner count was set. `equity` is an adjective here, not a
noun. Now renders "4 equity owners" or "4 owners (3 equity)"
depending on which counts are populated.

### "SUGGESTED — APPLICABLE BUT NO DEADLINE YET" verbosity

The Forms-catalog sub-section header was dense uppercase prose. Split:

```
SUGGESTED · 2 rules
Applicable rules with no deadline scheduled yet.
```

Top line stays the small-caps section header; the qualifier becomes
a one-line caption below in normal case + text-secondary.

### Currency: drop `.00` for whole dollars

`formatCents()` now uses `trailingZeroDisplay: 'stripIfInteger'`
(an Intl.NumberFormat option). `$88,000.00` → `$88,000`. Fractional
amounts retain decimals (`$1,234.56` unchanged).

The change is global — every surface that uses `formatCents` benefits
(filing plan rows, obligations queue money column if shown, audit
exports). Existing test updated.

## i18n

15 new strings added to the catalog (Plural variants + renamed
sections + grammar). All translated into Simplified Chinese in the
same pass — strict compile passes.

## Test plan

- `/clients` (list): banner with `needsFactsCount=1` reads
  "1 client is missing state or entity type — the rule library is
  skipping it." Same banner with `needsFactsCount=3` reads "3 clients
  are missing… skipping them."
- `/clients/[id]` with the Northstar Dental Group demo:
  - COMPLIANCE POSTURE → OWNERS reads "4 equity owners" (was "4 equity")
  - RISK INPUTS section label now reads "Risk profile"
  - FACT READINESS section label now reads "Onboarding state"
  - Filing plan dollar amounts read "$88,000" (was "$88,000.00")
  - Forms catalog sub-section reads "Suggested · 1 rule" + caption
- `apps/app/src/lib/utils.test.ts` passes (6/6 green).
- `pnpm run i18n:compile` (strict) passes.

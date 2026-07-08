# CPA Field Guide CI formatting and secret-scan repair

**Date:** 2026-07-08 - docs/integrations CI

GitHub Actions showed `CI` failing on the CPA Field Guide docs-only pushes while
`E2E` and `Lingui Catalog Drift` were green. Local reproduction on
`9fa785188` showed the main blocker was `vp check`: the generated
`docs/integrations/cpa-tools` HTML output and `deploy/build.mjs` were not in the
repo formatter/linter shape expected by CI.

## What changed

- Ran the repo formatter over the CPA Field Guide generated HTML output.
- Cleaned `docs/integrations/cpa-tools/deploy/build.mjs` lint blockers:
  removed unused lookup maps, renamed underscore-prefixed helpers, and lifted
  the comparison-row renderer out of `vsPage`.
- Removed tracked gitleaks false positives:
  `.agents/skills/playwright-best-practices/advanced/authentication-flows.md`
  now uses a low-entropy mock token, and the exported `docs/html` files no
  longer carry the Cloudflare beacon `token` field.

## Verification

- `pnpm check:fix`
- `pnpm run ci`
- CI-shaped `gitleaks detect --source <clean tracked checkout> --no-git --redact`

No DESIGN.md or dev-file update was needed: this was a CI hygiene repair for
generated/static docs artifacts and tracked example content, not a product or
architecture behavior change.

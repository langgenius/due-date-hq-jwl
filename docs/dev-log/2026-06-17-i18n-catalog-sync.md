# Sync the Lingui catalog (drift surfaced by the batch push)

_2026-06-17_

After pushing the 13-commit batch, an audit found the **`Lingui Catalog Drift`**
CI job (`.github/workflows/i18n-catalog-drift.yml`: `i18n:extract` + `i18n:compile`
+ `git diff --exit-code`) would fail. Two causes, both products of the batch:

1. **Stale catalog** — the dead-code cascade removed ~3,800 lines whose ~168
   strings were now orphaned, and the refactors (cascade + FieldLabel migration)
   shifted line numbers across many files, so a fresh `extract --clean` produced a
   large diff (−2,402 / +245, mostly `#:` location comments + the orphaned msgids).
2. **29 untranslated zh-CN strings** — English strings that accrued across the
   batch (terminology convergence, the deadline-detail page, members / workload /
   notifications / rules tabs, the brand commits) had no zh-CN translation, so
   `compile --strict` hard-failed.

## Fix
Ran `i18n:extract` (cleans orphans + refreshes locations) and added zh-CN
translations for all 29 missing strings, matching the catalog's established terms
(截止日期 deadline · 成员 member · 负责人 owner · 申报 filing · 通知 notification ·
来源 source · 事务所设置 practice settings · 提醒邮件 reminder emails · 临时规则
temporary rule). These are generic product-UI strings (e.g. "Back to deadlines",
"Deadline not found", "Needs an owner"), not brand copy.

Verified the catalog is **idempotent** under the CI sequence — running
`extract` + `compile` twice produces no further diff, so `git diff --exit-code`
passes — and `compile --strict` now exits 0. Typecheck 0; full suite 544 pass.

> The 29 zh-CN translations are machine-authored (terminology-matched) and worth a
> native review pass as part of the broader zh-CN follow-up.

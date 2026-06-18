# Search verb discipline (audit batch 5a)

_2026-06-18_

Batch 5 of the [full-app audit](../Design/full-app-audit-2026-06-18.md). The
shipped search strategy (`search-strategy-2026-05-26.md` §40-58, `search-prd`)
locks **page-level list filters to the verb "Filter"** (⌘K = "Search"). Three
page placeholders had drifted to "Search …"; reconciled them:

- `/deadlines` (`obligations.tsx:3729`): "Search client, form, or assignee" → "Filter …"
- `/alerts` (`AlertsListPage.tsx:889-890`): "Search alerts" → "Filter alerts" (placeholder + ariaLabel)
- `/audit` (`audit-log-page.tsx:840`): "Search by person, item, action, or reason" → "Filter …"
  (also resolves the in-control conflict: its hotkeyMeta already said "Filter audit events")

In-dropdown typeaheads (`Search clients…/forms…/assignees…` inside comboboxes /
⌘K) correctly stay "Search" — you ARE searching within a picker there.

The audit-page Hick's-law filter grouping (the other half of batch 5) is tracked
separately.

## Verification

- `tsgo` 0; `vp check` clean; 3 zh-CN strings translated
  (筛选提醒 / 按人员、对象、操作或原因筛选 / 筛选客户、表单或负责人); `compile --strict` passes.

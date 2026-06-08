# Critique fixes — IA / navigation unification

Date: 2026-06-08

From the `/critique` audit.

- **Sources in the sidebar** (`app-shell-nav.tsx`): added a "Sources" nav item →
  `/rules/sources` (monitored alert-source health) in the Rule group, so source
  status is reachable from the rail (Yuqi: "remote source status into sidebar").
- **Redundant group label:** dropped the "Clients" `NavGroupSection` label that
  wrapped the single "Clients" item (duplicate eyebrow over a same-named row).
- **Unified the two divergent Settings navs:** `/settings` (card hub) and the
  settings sub-nav rail previously linked to non-overlapping destination sets —
  Profile/Permissions were unreachable from `/settings`. Introduced a single
  `useSettingsNavSections()` registry (every destination verified against the
  router); both the rail and the `/settings` hub now render from it, and
  `/settings` renders inside the rail shell so Profile/Permissions/Practice/
  Workload/Audit/Calendar are all reachable from one consistent nav.

Verify: tsgo clean; `/settings` shows the unified rail + grouped hub; Sources
appears in the sidebar.

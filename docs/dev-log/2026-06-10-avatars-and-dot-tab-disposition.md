# Avatars → AssigneeAvatar; dots/tabs left (rationale)

Date: 2026-06-10

Last bucket from the unification pass (dots / avatars / tabs).

## Avatars — migrated onto the existing primitive

`AssigneeAvatar` is already a _consolidated_ avatar primitive (size/type/shape/
image/initials). Migrated the remaining hand-rolled initials-circles onto it:

- command-palette client result (size-7 → `sm`)
- reminder email-preview recipient ("JR" → `name` + `md`)
- obligations queue assignee picker + the owner column (size-5 → `xs`, accent via
  `isMine`)
- obligations recipient chip + dialogs recipient (size-5 → `xs`)
- **/settings/profile** hero avatar — added a new **`xl`** size (size-16) to the
  primitive and migrated the one-off `size-[72px]` circle (`isMine` keeps its
  accent tint).

Removed the now-dead local `initials()` / `initialsFromName` usages.

## Dots — left as-is (would degrade)

The ~11 hand-rolled `size-1.5/2 rounded-full bg-state-*` dots are **not** a clean
fit for the existing `BadgeStatusDot`: they're mixed sizes and use _vivid_
`state-X-solid` / `text-X` fills, whereas `BadgeStatusDot` is fixed `size-2` with
a deliberately _muted_ `badge-status-light-*` palette. They're contextual
data-viz / decorative dots — the materials legend (received/outstanding/waived),
"live" checklist dots on auth/splash, a status legend. Forcing them through the
muted primitive would change their size AND wash out the vivid legend colors.
Left intentionally.

## Tabs — left as-is (sensitive)

The hand-rolled `aria-pressed` "tabs" are the obligations/deadline **detail-drawer
tabs** (Status · Materials · Record · Audit — tab count is explicitly locked, see
project memory) and sortable table headers. Moving them onto the `Tabs` primitive
is a real refactor in the most sensitive area for marginal gain. Deferred.

## Verify

tsgo: no errors in touched files (the 4 remaining errors are the in-progress
`ClientDetailWorkspace` client-header rebuild — not this pass). `vp check` clean
on all 7 avatar files.

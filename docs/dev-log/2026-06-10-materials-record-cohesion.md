# 2026-06-10 — Materials + Record tabs → DetailSectionCard chrome (honest Record)

Two focused cohesion passes on the deadline-detail drawer
(`apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`) so the
**Materials** and **Record** tabs read with the same gray-header card chrome
(`DetailSectionCard`) already used on the alert / deadline / rule detail pages.
Chrome-only — no behavior changes, no new data, no fiction.

## Pass 1 — Materials tab (`value="readiness"`)

Wrapped the **"Materials checklist"** section in `<DetailSectionCard>`:

- Title `Materials checklist` now renders in the gray header band (it was a bare
  `h3 text-base font-semibold`). DetailSectionCard renders its title as an `<h3>`,
  so the heading-role specs still pass.
- The `checklistReference` badge stays inline next to the title.
- `headerRight` = the existing **select-all** checkbox + **Add item** ghost button
  cluster (still only rendered when `checklist.length > 0`).
- The terminal-state ("filed / completed") italic description sub-line moved from
  the old two-line title column into the **card body** — the header band is a single
  row and can't hold a stacked title block.
- Body = the empty states + the Outstanding / Received / Waived checklist groups +
  the Send-to-client / batch-action CTA, all unchanged.
- `ReadinessOverview` + `MaterialsProgressLegend` (the summary) stay **above** the card.

Every interaction preserved: select-all, add-item, per-row status / label / note
mutations, correction mode, batch mark-received / mark-needs-correction, send-to-client.

## Pass 2 — Record tab (`value="evidence"`, labelled "Record" in page mode)

⚠ Honest-only re-chrome per the `record-tab-storage-gap` memory + the hard
no-fiction-on-canvas rule. The Pencil `g8Bna2` (E-file confirmation / Materials
receipt log / Sign-offs ledger with fake file storage) was **NOT** built. There is
no file storage, no workpaper schema, and no e-sign backend, so none was implied.

What shipped — only the data that already exists on the obligation detail:

- **Backend-honesty info bar** at the top of the tab: a rounded-lg
  `bg-background-section` strip with an `info` lucide icon and `12/500 text-tertiary`
  copy — "Record tab is currently audit-trail + timestamps only. File storage for
  workpapers and signed documents is on the roadmap."
- **"Evidence to close out filing"** (the 1/4 artefact-check hero) → `DetailSectionCard`,
  with the `complete / total` count moved to `headerRight`. Copy clarified that the
  four checks are _derived from the e-file pipeline state + workpaper count, not from
  stored files_. (`EvidenceArtifactStatusGrid` data is unchanged — already derive-only.)
- **Workpapers** → `DetailSectionCard`. Count + the existing "Add workpaper" CTA
  (still a coming-soon `toast.info` stub — upload ingest isn't wired) moved to
  `headerRight`. Body renders the **real** `detail.evidence` list, or the honest
  "No workpapers attached to this deadline yet." empty panel.
- **Authority** → `DetailSectionCard` wrapping the real `AuthorityFactStrip` +
  the folded "Authority citation" `<details>` (real `detail.matchedRule` /
  `row.authority` data). The "Prior year" fact stays a `—` placeholder — no
  prior-year filing record exists yet and one was deliberately not faked.

No fake rows, no invented sections. Anything not backed by real data is either an
honest empty state or an explicit placeholder, both inside a card.

## Verify

- `tsgo --noEmit -p apps/app/tsconfig.json` → **0 errors** (worktree deps installed
  first so the `extends` config + `@duedatehq/*` workspace packages resolve).
- Added `InfoIcon` to the existing `lucide-react` import for the honesty bar.

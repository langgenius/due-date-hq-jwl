# FieldLabel migration — handoff for the remaining work

_Written 2026-06-17 for a fresh session to pick up. Self-contained: you do not
need any prior conversation context._

This document hands off the **remaining** parts of the Register-B label migration
onto the `FieldLabel` primitive. The bulk (65 sites / 23 files across the "safe"
surfaces) is **done and on `main`**. Three things are left; this guide is the
spec for each, plus the verification gauntlet that WILL fail your push if you skip
it (it bit us — read §6 before you commit).

---

## 0 · Orient yourself first (read these)

- **The canon:** [`docs/Design/section-header-style.md`](section-header-style.md) —
  Register A/B/C system. The "Register-B home (2026-06-16)" note + the
  "Sweep status (2026-06-17)" block are the law for this work.
- **The primitive:** `apps/app/src/components/primitives/field-label.tsx`. API:
  ```tsx
  <FieldLabel as={'div'|'dt'|'span'|'label'} variant={'group'|'field'} className={…}>…</FieldLabel>
  ```
  Defaults: `as='div'`, `variant='field'`. Baked in (never repeat in className):
  `uppercase text-text-tertiary`. `group` (B1) = `text-caption-xs` (11px)
  `font-semibold` `tracking-eyebrow-tight`. `field` (B2) = `text-xs` (12px)
  `font-medium` `tracking-wide`.
- **What's already done** (read the dev-logs for the exact decisions):
  - `docs/dev-log/2026-06-17-fieldlabel-migration-batch1.md`
  - `docs/dev-log/2026-06-17-fieldlabel-migration-batch2.md`
  - `docs/dev-log/2026-06-17-i18n-catalog-sync.md` (why §6 matters)
  - `docs/dev-log/2026-06-17-ci-format-lint-cleanup.md` (why §6 matters)
- **Live specimen gallery:** the `/preview` route renders the primitives — sanity-check
  there.

---

## 1 · The migration rule-set (apply verbatim)

A "Register-B label" is a JSX element whose className has `uppercase` **plus** a
small-label look: a small size (`text-caption-xs` / `text-xs` / `text-caption` /
`text-[11px]`) + a tracking (`tracking-eyebrow` / `tracking-eyebrow-tight` /
`tracking-wide` / `tracking-wider` / `tracking-[0.5px]` / `tracking-[0.3px]`) + a
weight (`font-medium` / `font-semibold`) + a muted color (`text-text-tertiary` /
`text-text-secondary` / `text-text-muted`). Its job is to classify the content
below/beside it (field label, group band, or column header).

**Variant:**

- `variant="group"` when the source is ~11px (`text-caption-xs` / `text-[11px]`)
  OR is a column / table / group-band header. ALSO `group` for 13px
  `text-caption` column/group headers (we intentionally shrink those to 11px).
- `variant="field"` when the source is `text-xs` (12px) and labels ONE value.
- Unsure → `group` for column/table/group headers; `field` for single-value labels.

**Color (preserve, do NOT normalize):**

- source `text-text-tertiary` → OMIT it (FieldLabel's default).
- source `text-text-secondary` / `text-text-muted` / other → pass it via `className`.

**Layout / other classes (preserve via `className`):** widths (`w-[150px]`,
`flex-1`), flex/grid (`flex items-center gap-2`, `grid grid-cols-[…]`), spacing
(`px-*`, `py-*`, `pb-*`, `mt-*`), `text-center`, `border-*`, `bg-*`, `shrink-0`,
`truncate`, `min-w-0`, etc. Drop ONLY what FieldLabel owns: `uppercase`, the
text-size, the font-weight, the tracking-\*, and `text-text-tertiary` (when it was
the color).

**Element (the `as` prop):** `span→as="span"`, `dt→as="dt"`, `div→as="div"`,
`label→as="label"`, `p→as="div"` (a label is not a paragraph), `h2/h3/h4` used as
an uppercase tracked-caps LABEL → `as="div"` (intentionally demote heading-labels;
only if it's genuinely a small-caps label, not a prose title).

**Table heads** — `<TableHead className="…label classes…[maybe width/align]">Text</TableHead>`:
keep the `<TableHead>` (+ its width/align), wrap the content:
`<TableHead className={layout-or-omit}><FieldLabel as="span" variant="group" className={colorIfNotTertiary}>Text</FieldLabel></TableHead>`.
If the th had ONLY label classes, drop its className entirely.

**Import + the alias gotcha:** add
`import { FieldLabel } from '@/components/primitives/field-label'` once per file.
⚠️ **If the file already imports a different `FieldLabel` from
`@duedatehq/ui/components/ui/field`** (the form-control label used with `htmlFor`
inside `<Field>`), import the caps primitive **aliased** to avoid a name clash and
use the alias at the converted sites, leaving the form-control `FieldLabel`
untouched:

```tsx
import { FieldLabel as CapsFieldLabel } from '@/components/primitives/field-label'
```

(Batch 2 did this in `obligations.tsx`, `queue/dialogs.tsx`, `routes/practice.tsx`.)

---

## 2 · TASK 1 — Detail-drawer labels (~43 sites)

The three detail-drawer files were deferred. **Counts (verify with grep before you
start, they may shift):**
| File | ~sites |
|---|---|
| `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx` | 25 |
| `apps/app/src/features/obligations/queue/components/panels.tsx` | 12 |
| `apps/app/src/features/alerts/AlertDetailDrawer.tsx` | 6 |

**Why they were deferred & what to check first:** at the time they were churned by
(a) an unpushed remote CI commit — **now merged to `main`, so that risk is gone** —
and (b) a **parallel Claude session** actively editing them. **Before you touch
these files, confirm no parallel session is mid-edit:** `git status` clean on them,
`git log --oneline -5` shows no in-flight work, and ideally coordinate. If a
parallel session owns them right now, wait or take one file at a time.

**How:** for each file, `grep -nE "uppercase" <file>` to find candidates, inspect
each with surrounding context, apply §1. The drawers are "calm document" surfaces
(per `detail_pane_surface_model`) — they are deliberately ALL Register B, so most
sites are real field labels (`field`) or section bands (`group`). Watch for the
skip categories in §4 (these files have plenty of badges + a `Sheet`-title or two).

**Verify** per §6, then commit per §7 (one commit, e.g.
`refactor(labels): FieldLabel migration batch 3 — detail drawers`).

---

## 3 · TASK 2 — FieldLabel primitive improvements

Two one-shot changes to `apps/app/src/components/primitives/field-label.tsx`,
flagged as open follow-ups in the canon.

### 2a · Reconcile `field` tracking to the §3.3 canon

`field` currently renders `tracking-wide` (0.025em) to avoid shifting its early
consumers mid-sweep. The §3.3 canon for uppercase phrases is **`tracking-eyebrow`
(0.08em)** (`tracking-eyebrow-tight` is 0.06em, used by `group`). Change `field`
from `tracking-wide` → `tracking-eyebrow`:

```diff
- : 'text-xs font-medium tracking-wide',
+ : 'text-xs font-medium tracking-eyebrow',
```

This is a deliberate visual change (wider tracking on every `field` label). It's a
designer call — confirm with Yuqi it's wanted, then update the canon note in
`section-header-style.md` (the "(`field` keeps `tracking-wide`…)" parenthetical)
and the §3.3 / Register-B note in `DueDateHQ-DESIGN.md`. Then re-screenshot any
`field`-heavy surface to confirm.

### 2b · Add `htmlFor` (and `...rest`) passthrough

Today FieldLabel takes only `as / variant / children / className`, so it can't
carry `htmlFor` — which is why form-control labels were skipped (§4). Add a
forwarded-rest so `as="label"` works for real form labels:

```tsx
export function FieldLabel({
  as: Tag = 'div',
  variant = 'field',
  children,
  className,
  ...rest                       // ← add
}: {
  as?: 'div' | 'dt' | 'span' | 'label'
  variant?: 'field' | 'group'
  children: ReactNode
  className?: string
} & Omit<ComponentProps<'div'>, 'className' | 'children'>) {   // ← widen the type
  return (
    <Tag className={cn(/* … */, className)} {...rest}>
      {children}
    </Tag>
  )
}
```

Note: `htmlFor` is only valid on `<label>`. Typing it cleanly across all `as`
values is fiddly — simplest is to spread `...rest` and rely on callers passing
`htmlFor` only with `as="label"`. Verify typecheck. Once this lands, the
`<label htmlFor>` sites in §4 become migratable.

---

## 4 · TASK 3 — The skipped categories (disposition)

These were correctly **skipped** in batches 1–2. Here's what to do with each:

| Category                             | What it is                                                                            | Disposition                                                                                                                                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Badges / pills / chips**           | `<Badge>`, or `rounded-* + px-* + bg-*` chips (often `inline-flex`, `tracking-wider`) | **Keep as-is.** A different primitive (`Badge` / chip). NOT FieldLabel. Do not convert.                                                                                                                                                                               |
| **`<label htmlFor>` form labels**    | control labels inside `<Field>`                                                       | **Migrate ONLY after Task 2b** (htmlFor passthrough). Then `as="label"` + carry `htmlFor`. Until then, skip.                                                                                                                                                          |
| **`<DropdownMenuLabel>`**            | menu section headers                                                                  | **Decision needed.** It's its own menu primitive (like `TableHead`). Either leave it, or wrap its CONTENT: `<DropdownMenuLabel><FieldLabel as="span" variant="group">…</FieldLabel></DropdownMenuLabel>`. Recommend leaving unless Yuqi wants menu labels normalized. |
| **`text-sm` (14px) header bands**    | larger uppercase bands                                                                | **Leave / escalate.** 14px is outside Register B (11/12px). If it's really a section title it may be Register A — a separate decision, not a FieldLabel target.                                                                                                       |
| **`tabular-nums` count values**      | numbers (e.g. `<Plural>` counts) next to a label                                      | **Keep as-is.** These are values, not labels.                                                                                                                                                                                                                         |
| **`text-column-label`-token labels** | already use the semantic token                                                        | **Keep as-is.** Already canonical (not hand-rolled drift) — no migration needed.                                                                                                                                                                                      |

Find remaining candidates app-wide with:

```bash
grep -rnE "uppercase" apps/app/src --include="*.tsx" | grep -E "tracking-eyebrow|tracking-wide|tracking-wider|tracking-\[0\.5px\]"
```

…then bucket each into "real label → migrate" vs one of the skip rows above. When
unsure label-vs-chip, **skip and note it** rather than guess.

---

## 5 · How to parallelize (optional)

The safe-surface sweep was done by fanning out one subagent per file-group with
the §1 rule-set as the prompt, then verifying centrally. That worked well. If you
do the same: **partition by file (no two agents touch one file)**, tell each agent
to make edits only and NOT run git/typecheck/tests (you verify centrally per §6),
and review the diffs (variant choice, color preserved, no badge converted, table-
head layout kept, alias used where needed).

---

## 6 · ⚠️ Verification gauntlet — run ALL of it before pushing

Every gate below is enforced by CI (`.github/workflows/`). Two of them bit us and
are easy to forget — **the i18n catalog and formatting**.

1. **Typecheck:** `pnpm exec tsgo --noEmit -p apps/app/tsconfig.json` → 0 errors.
2. **Format + lint (CI: `ci.yml` → `vp check`):**
   `pnpm exec vp fmt <changed files>` then `pnpm exec vp check <changed files>`.
   Must be **0 errors**. Common traps: a now-unused import after you remove the old
   classes; `no-unused-vars`. Note: repo-wide `vp check` will also flag the parallel
   session's **untracked** `docs/sharing/*` — ignore those (CI never checks out
   untracked files); only **tracked** files matter.
3. **Tests (CI: `ci.yml` → `vp run -r test`):** `pnpm exec vp test run` (in
   `apps/app`) → all pass. Full repo: `pnpm exec vp run -r test`.
4. **Build (CI: `ci.yml` → `vp run build`):**
   `pnpm exec vp run @duedatehq/app#build` → EXIT 0.
5. **🚨 i18n catalog drift (CI: `i18n-catalog-drift.yml`).** This is the sneaky one.
   The job runs `i18n:extract` + `i18n:compile` + `git diff --exit-code` on
   `apps/app/src/i18n/locales`. Pure label migration _preserves_ `<Trans>` so it
   usually adds no strings — BUT Task 2b (migrating form labels) or any new copy
   WILL. After your changes:
   ```bash
   pnpm -F @duedatehq/app i18n:extract     # refreshes .po (cleans orphans, updates #: locations)
   pnpm -F @duedatehq/app i18n:compile     # lingui compile --strict — FAILS on missing zh-CN
   ```
   If `compile --strict` reports "Missing N translation(s)", you introduced
   untranslated zh-CN strings: fill them in `apps/app/src/i18n/locales/zh-CN/messages.po`
   matching existing terms (截止日期 deadline · 成员 member · 负责人 owner · 申报
   filing · 通知 notification · 来源 source · 事务所设置 practice settings · 提醒邮件
   reminder emails · 临时规则 temporary rule), then compile again. **Confirm
   idempotency:** run extract+compile twice; the second run must produce no further
   diff, else `git diff --exit-code` fails in CI. Commit the resulting `.po` AND
   `.ts` files.
6. **e2e (CI: `e2e.yml`).** Functional Playwright suite — can't run without a local
   Worker env; label migration preserves tags (`as`) + text so selectors should
   hold, but be careful if you change DOM structure. The **visual-regression** job
   is `continue-on-error: true` with no committed baselines, so it can't block —
   ignore it.
7. **Live sanity:** use the preview server (`/deadlines`, `/preview`, the drawer
   you changed) — confirm labels render uppercase, correct size/color, no console
   errors.

---

## 7 · Git protocol (this repo)

- **Commit directly to `main`** (small team; no branch+PR per change).
- **Linear history is enforced — NO merge commits.** If `origin/main` has moved,
  **rebase** (`git pull --rebase` / `git rebase origin/main`), never merge. A merge
  commit is rejected by the push rule.
- **One `docs/dev-log/YYYY-MM-DD-*.md` entry per commit** describing the change
  (what + why + verification). Required before committing.
- **Selective staging.** A parallel session may have **untracked** files that are
  NOT yours — currently `.claude/skills/design-critique/` and `docs/sharing/`.
  **Never `git add -A` / `git add -u`.** Stage only your files explicitly.
- **Update the canon on design change:** if you change registers/tokens (Task 2a),
  update `docs/Design/section-header-style.md` + `docs/Design/DueDateHQ-DESIGN.md`.
- **Commit message trailer:**
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## 8 · Definition of done

- All ~43 detail-drawer labels on `FieldLabel` (Task 1).
- `FieldLabel` `field` tracking reconciled + `htmlFor` passthrough added, canon
  updated (Task 2) — pending Yuqi's OK on the tracking change.
- Form-control labels migrated (after 2b); other skip categories dispositioned per
  §4 (most stay as-is).
- The full §6 gauntlet green (especially i18n catalog idempotent + `vp check`
  clean on tracked files); pushed to `main` as a linear history with dev-logs.
- A closing dev-log noting the sweep is complete and updating the "Sweep status"
  block in `section-header-style.md`.

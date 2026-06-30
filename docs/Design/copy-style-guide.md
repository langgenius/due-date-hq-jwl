# Copy & content style guide

Canonical UI-copy conventions, inferred from the dominant existing usage (波6 audit, 2026-06-30) so adoption is least-disruptive. Use this when writing new UI strings or reviewing copy. The app is Lingui-based — wrap user-facing strings in `<Trans>` / `t\`\``.

## Verbs & labels

| Intent | Canonical form | Notes |
|---|---|---|
| Save / persist | `Save [object]` | "Save notes", "Save client details". Prefer the object over bare "Save" when space allows. |
| State changed (toast) | `[Noun] [past-verb]` | "Status updated", "Alert dismissed" — passive, past tense. |
| Add to a list | `Add [object]` | append to an existing collection. |
| Create new entity | `Create [object]` | initialize a new object ("Create client"). |
| Delete (confirm) | `Delete [object]?` | full removal; dialog title, sentence case. |
| Remove (row/list) | `Remove` / `Remove [object]?` | de-associate a row, not a hard delete. |
| Dismiss / hide | `Dismiss` | alerts, notifications. |
| Close panel/drawer | `Close` | |
| Cancel a dialog | `Cancel` | |

Delete vs Remove and Add vs Create are **semantic, not stylistic** — keep the distinction.

## Casing

| Element | Convention | Example |
|---|---|---|
| Button labels | Title Case | "Save notes", "Create client" |
| Section / tab / page titles | Title Case | "Rule library", "Members" |
| Field labels | Title Case | "Tax year", "Jurisdiction" |
| Dialog title — **statement** | Title Case | "Review classification impact" |
| Dialog title — **question** | sentence case | "Delete {name}?", "Remove member?" |
| Empty-state titles | sentence case | "No notes yet" |
| Loading / error messages | sentence case | "Loading clients…", "Couldn't save notes" |

The statement-vs-question dialog-title split is intentional — keep it (this guide is its documentation; see findings F-016).

## Empty states

Use the shared `EmptyState` primitive (icon + title + description + optional action). Title form: `No [X] yet` or `No [X] [condition]`. Widen primitive adoption — many surfaces still hand-roll the string (findings F-015).

## Messages

- **Toast success:** passive, no period — "Notes saved", "Alert dismissed".
- **Toast error:** `Couldn't [verb]…` — "Couldn't save notes".
- **Validation error:** imperative, **no terminal period** — "Use 2-letter state codes", "Pick a client".

## Punctuation & format

- **Ellipsis:** the `…` character (not `...`) for loading/in-progress — "Saving…".
- **Trailing periods:** multi-sentence descriptions end with a period; single-line labels/helpers do not. Pick one rule per element type (findings F-017).
- **Counts/format:** "X of Y", "{count} / 5,000 characters", "Position {n} of {total}".

---

_Source: 波6 copy audit, design-consistency review. Living doc — refine as conventions are ratified._

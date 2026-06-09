# Cursor affordance convention

Canonical rule for which mouse cursor each element shows. The cursor is one of
the oldest affordance signals in UI: **its shape must communicate what happens
if you interact at that spot.** Get it wrong and the interface either lies
(pointer on dead text) or feels broken (arrow on a button).

## Why this needs to be written down

We run **Tailwind CSS v4**. v4's Preflight no longer resets `<button>` to
`cursor: pointer` (v3 did) — bare buttons follow the browser default, which is
the **arrow** (`cursor: default`). So in this codebase a raw `<button>` shows
the wrong cursor unless we say otherwise. Base UI primitives that render a
`<button>` under the hood (`Checkbox`, `Switch`, `Select.Trigger`, combobox and
popover triggers, `Collapsible.Trigger`, …) inherit the same gotcha.

## The rule

| Element                                                                                             | Cursor     | Tailwind                                                            |
| --------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| Anything that triggers an action on click — button, clickable row/card, toggle, tab, custom trigger | hand       | `cursor-pointer`                                                    |
| Hyperlink / router `<Link>`                                                                         | hand       | _(browser default — leave it)_                                      |
| Disabled interactive control                                                                        | blocked    | `cursor-not-allowed` (rest pointer + `disabled:cursor-not-allowed`) |
| Informational tooltip trigger (reveals an explanation, no click action)                             | help caret | `cursor-help`                                                       |
| Selectable / editable text, inputs, textareas                                                       | I-beam     | _(browser default — leave it)_                                      |
| Drag handle                                                                                         | grab       | `cursor-grab` → `cursor-grabbing`                                   |
| Non-interactive text / containers                                                                   | arrow      | _(nothing — never add a cursor)_                                    |

## What is already handled for you

Don't re-add cursors to these — they bake it in centrally:

- **Shared `<Button>`** (`packages/ui/.../button.tsx`) — `cursor-pointer` +
  `disabled:cursor-not-allowed`. Use it and you're done.
- **`<a href>` / React Router `<Link>`** — browser default pointer.
- **Shared primitives**: `TextLink`, `Tabs`/`TabsTrigger`, `Segmented`,
  `Checkbox`, `Switch`, `Select`/`SelectTrigger`, `SearchableCombobox`,
  `CollapsibleTrigger`, `DropdownMenu`/`Select`/`Command` items (via
  `overlayRowClassName`), `Card` (`data-interactive`), `Sidebar` menu/trigger.

## When you hand-roll a control

If you write a raw `<button>`, a `role="button"`, an `onClick` on a
`div`/`tr`/`li`/`span`, or render a Base UI trigger as a bare `<button>`, **you
own the cursor** — add `cursor-pointer` (and `disabled:cursor-not-allowed` if it
can be disabled). Prefer the shared `<Button>`/primitives so you never have to.

## Hard rules

1. **Never** put `cursor-pointer` on non-interactive text or layout containers —
   it promises an action that doesn't exist.
2. **Never** leave an interactive control on the default arrow.
3. Disabled ≠ pointer. Disabled controls get `cursor-not-allowed`.
4. Info tooltips get `cursor-help`, not `cursor-pointer` (nothing happens on
   click) and not `cursor-default`.
5. A `<label>` wrapping a checkbox/radio gets `cursor-pointer` (clicking the
   label toggles the control). A `<label>` over a text input does **not**.

## Checking your work

A computed-cursor scan in the browser finds regressions fast — anything
interactive still on the arrow is a bug:

```js
;[
  ...document.querySelectorAll(
    'button:not([disabled]),[role="button"]:not([aria-disabled="true"]),[role="checkbox"],[role="switch"],[role="tab"],[role="radio"],[role="combobox"]',
  ),
].filter((el) => ['default', 'auto'].includes(getComputedStyle(el).cursor))
```

It should return an empty array on every page.

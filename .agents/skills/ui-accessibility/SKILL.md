---
name: ui-accessibility
description: Build or review accessible React UI. Use when implementing UI components, reviewing UI code, checking accessibility, choosing Base UI React primitives, or validating forms, overlays, keyboard behavior, focus management, accessible names, and Testing Library queries.
---

# UI Accessibility

Use this skill to produce or review React UI that is semantic, keyboard usable,
screen-reader understandable, and touch reachable. Prefer the app's existing
design-system primitives. If no wrapper exists, compose mature headless
accessible primitives such as Base UI React instead of hand-writing complex ARIA
behavior.

## Workflow

1. Identify the real user task and semantic control before choosing visuals.
2. Read the local component wrapper and type definitions before using a primitive.
3. Check official Base UI docs when an API, selector, or replacement element is
   uncertain.
4. Implement through public primitives and behavior-level contracts.
5. Test with user-perceivable queries and real interaction paths.

## Core Rules

- Prefer native semantics: use `button type="button"` for actions, `a href` for
  navigation, `button type="submit"` for form submission, and real form fields.
- Do not use `div` or `span` as interactive controls unless a headless primitive
  requires it and already provides role, keyboard, focus, and naming behavior.
- Give every interactive control a clear accessible name through visible text,
  label, `aria-label`, `aria-labelledby`, `alt`, or equivalent semantics.
- Treat decorative icons as `aria-hidden="true"`. Put accessible names on
  icon-only buttons, not on the icon.
- Do not make a tooltip the only source of information.
- Preserve controlled and uncontrolled contracts. If a component receives
  `value`, it must receive the matching change handler. Otherwise use
  `defaultValue`.
- Style primitive state with exposed data attributes such as `data-open`,
  `data-popup-open`, `data-disabled`, `data-invalid`, `data-side`, and
  `data-align`; do not mirror primitive state just to add classes.
- Keep focus-visible styling obvious. Never remove outline without an equivalent
  replacement.
- Use true disabled semantics for disabled controls and prevent disabled actions
  from firing handlers.

## Primitive Boundaries

- Use wrapped design-system primitives first. Compose Base UI parts directly only
  when no local wrapper exists.
- Do not bypass primitives for portals, focus traps, dismissal, keyboard
  navigation, typeahead, or roving tabindex.
- When using a Base UI `render` prop, keep the replacement element semantically
  correct. Button-like triggers must render a real `button type="button"`.
- If a trigger must be non-button, confirm the primitive supports it and apply
  the required `nativeButton={false}` or equivalent API.

## Overlay Selection

- Use Dialog for modal focus management, scroll lock, Escape close, and outside
  press dismissal.
- Use AlertDialog only for destructive, irreversible, must-confirm decisions.
- Use Drawer for side panels and editor panels. Provide title semantics and a
  reachable close path.
- Use Popover for click- and touch-reachable explanations, long text, rich
  layout, interactive content, and infotips.
- Use Tooltip only for short, plain, non-interactive supplemental labels on a
  trigger that already has an accessible name.
- Use PreviewCard only for hover/focus previews; its popup content must not be
  the only way touch or screen-reader users can access the information.
- Use Menu or ContextMenu only for action menus, not ordinary form selection.
- Choose Select for closed sets, Combobox for searchable closed sets, and
  Autocomplete for free input with suggestions.
- Use the primitive's Portal, Positioner, and Popup structure. Fix clipping and
  stacking context structurally before adding large z-index values.

## Forms And Fields

- Use a real `form` or Base UI Form for submit flows so Enter submit and submit
  button behavior remain intact.
- Represent each standalone field with Field.Root or equivalent semantics and a
  stable `name`.
- Prefer visible labels. Use visually hidden labels or control-level
  `aria-label` only when surrounding context already provides visible meaning.
- Attach helper text through Description and errors through Error. Pass invalid
  state to the field/control so `aria-invalid`, relationships, and styles agree.
- Use Fieldset only for grouped controls that form one field, such as checkbox
  groups, radio groups, multi-thumb sliders, or compound inputs. Every Fieldset
  needs a Legend.
- Give every checkbox and radio option its own label.
- Let the real group primitive own `value`, `defaultValue`, and
  `onValueChange`; Fieldset provides grouping semantics, not state.
- Pass external form-library state into primitives explicitly: `name`, `value`,
  `onValueChange`, `onBlur`, `invalid`, dirty/touched state, and error message.
- Mark every non-submit button as `type="button"`.

## Control Choice

- Input: free single-line text.
- Textarea: free multi-line text.
- NumberField: numeric input. Use its parsing, clamping, and stepper behavior
  instead of hand-written parse and clamp logic.
- Checkbox: independent boolean or one option in a multi-select group.
- Switch: immediate on/off setting with a clear label, not a submit-time choice.
- RadioGroup: mutually exclusive choice.
- CheckboxGroup: multi-select choice.
- Slider: continuous or range values with a label. Give each thumb a distinct
  accessible name when there are multiple thumbs.
- Tabs: tablist, tab, and tabpanel content switching.
- ToggleGroup or segmented control: mode, filter, or view switching, not tabs.
- Pagination: navigation semantics. Current page, previous, next, and page jump
  controls must be keyboard usable and clearly named.
- Progress: task progress. Meter: a known-range measurement.

## Testing

- Prefer user-perceivable queries: `getByRole(..., { name })`, then
  `getByLabelText`, `getByPlaceholderText`, and `getByText`.
- Avoid `getByTestId` unless the target has no user semantics, such as canvas,
  virtualization shims, or third-party boundaries.
- Do not mock design-system primitives for business behavior unless the mock
  preserves real semantics and the primitive itself is not under test.
- Test interactions through realistic user paths: click, keyboard, tab, hover,
  and type.
- For overlays, assert role/name, open and close behavior, focus behavior, or
  visible content instead of internal classes.
- Prefer focused integration tests for accessibility regressions over snapshots.

## Final Checklist

- Every interactive control has an accessible name.
- The primitive matches the real task, not only the visual shape.
- Tooltip content is short, non-interactive, and non-essential.
- Overlay, select, combobox, and menu behavior is owned by a primitive.
- Form fields have `name`, label, description/error relationships, and invalid
  state.
- Icons are either decorative with `aria-hidden` or represented by a named
  control.
- Non-submit buttons explicitly set `type="button"`.
- Controlled and uncontrolled APIs are not mixed.
- State styling uses primitive data attributes.
- Tests find core UI by role, name, label, or visible text.

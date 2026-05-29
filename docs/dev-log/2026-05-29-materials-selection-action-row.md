# Materials Selection Action Row

## Context

The readiness drawer rendered selected-count, Deselect, and Mark client docs received in
a sticky bar near the drawer footer while Send to client stayed below the checklist. With
selected items, the footer-level bar made the batch status update look connected to the
client-send action.

## Change

- Moved the selected-count, Deselect, and batch status button into the checklist action
  row that also contains Send to client.
- Kept Send to client on the left and selected-item actions on the right.
- Made Mark client docs received a primary action while Deselect stays secondary.
- Removed the bottom floating materials-selection bar.

## Design / Docs

No DESIGN.md token or component change is needed. This is a local layout correction using
existing buttons and checklist row semantics.

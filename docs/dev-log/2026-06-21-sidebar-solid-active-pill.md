# Sidebar active route → solid accent pill

_2026-06-21 · Yuqi: "switch to solid pill" (overrides the §1.2/§4.9 bg-tint canon)_

The active nav row was a calm `bg-accent-tint` + accent text/icon (DESIGN §1.2/§4.9).
Yuqi chose the Acme-reference register: the active row is now a **solid accent pill**
(`bg-state-accent-solid` + `text-text-inverted` label/icon) in the shared
`SidebarMenuButton` variant — so it flips app-wide. The inventory count badge now
goes white on the active pill (was `text-text-tertiary`, invisible on the fill); the
urgent badge keeps its active red pill.

Canon updated: DESIGN.md selected-state spec now records the solid-pill supersede.
Verified: tsgo 0, build green.

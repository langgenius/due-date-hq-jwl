# Deadline drawer — fiction check + comment cleanup (2026-06-10)

Two janitorial passes over `ObligationQueueDetailDrawer.tsx`. No code, JSX,
className, or logic changed — comments only. Verified clean with
`tsgo --noEmit` and `vp fmt`.

## 1 — Extension "history" fiction (already gone)

Re-audited the panel/sheet `<TabsContent value="extension">` (used by
/clients) for the fictional "Extension history" table — a static placeholder
with hardcoded prior-year rows that violated the no-fiction-on-canvas rule
(there's no cross-year filing-history field on the obligation payload). It had
already been removed in an earlier commit; the extension tab now contains only
the matched-rule reference card (IIFE) and the apply-extension `<section>`. No
change needed. The real extension flow lives folded into the Status tab and was
left untouched.

## 2 — Trimmed dated change-history comments

The file had accumulated dozens of dated/authored change-log comments
(`// 2026-05-26 (Yuqi feedback #3): badge subtler. Was solid red…`,
`{/* 2026-06-08 (… parity #1): … */}`, Pencil/Qn4nX/rzzww codename
narration, etc.). That history belongs in git, not the source.

- Deleted comments that were pure "changed X to Y on DATE per feedback"
  narration (padding tweaks, gap bumps, avatar size, removed banners, stale
  TabsList styling notes).
- Distilled comments that still teach a timeless WHY down to just that WHY,
  dropping the date / author / "feedback #N" / Pencil-codename framing
  (mode-prop semantics, tab-set filtering, status-banner rationale, sticky
  strip / bleed reasons, terminal-state Materials framing, no-fiction Record
  bar, derived-artefact Evidence hero, etc.).
- Kept the footgun / workaround explanations intact (distilled): the
  `<Plural>`/`<Trans>` lingui macro crash, why `transition-all` was dropped on
  the collapsing title, `scrollbar-gutter:stable`, the `contents` fallback,
  the sticky-bar opaque-fill bleed reason, the rule-chip `stopPropagation`
  inside `<summary>`, and the restrained lift-shadow.

Net: ~40 comment blocks removed or distilled; ~700 lines of comment prose
deleted, ~290 rewritten shorter.

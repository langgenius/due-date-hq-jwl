# Before / After gallery

The most persuasive proof of design value is _visual_ — and every pairing below
is a real moment from the commit history, not a staged demo. Each shows a
principle in action, not just "made it prettier."

**How to use this:** drop a before + after screenshot under each entry. To grab a
"before," check out the commit just before the one cited (`git show <sha>^`) or
pull it from an earlier Pencil frame / dev-log screenshot. The one-liner under
each is what you'd say next to the pair.

---

## 1. Honest numbers under load

**Principle:** No fiction on canvas.

- **Before:** the summary strip showed `0` everywhere while data was still loading
  — fake zeros that read as real facts.
- **After:** truthful empty states; no slashed/placeholder zeros pretending to be
  counts.
  > _Commit: `fix(clients): summary strip truthful under load (no fake zeros)`._
  > The product never lies, even for a few hundred milliseconds.

## 2. De-densifying the Daily Brief

**Principle:** Demote, don't delete.

- **Before:** a dense brief competing for attention with everything around it.
- **After:** de-densified, with action pills clarified — the information stayed,
  the noise left.
  > _Commit: `design(today): de-densify Daily Brief + clarify action pills`._

## 3. Killing redundancy on the client page

**Principle:** One purpose per panel.

- **Before:** a filing table and a summary strip restating the same facts.
- **After:** redundancy removed, the strip calmed — each fact has one home.
  > _Commit: `design(clients): kill filing-table redundancy + calm the summary strip`._

## 4. "Too big and bold" → restraint

**Principle:** Type-weight restraint.

- **Before:** the alerts list title was oversized and heavy.
- **After:** dialed back to 14px / 500 — a list title, not a headline.
  > _Commit: `design(alerts): dial list title back to 14/500 (Yuqi 'too big and bold')`._
  > A real note-to-self that became a rule.

## 5. Consistent numbers, one accent

**Principle:** Type-weight restraint + one accent color.

- **Before:** summary-strip numbers at mixed sizes (24px) and multiple accents.
- **After:** uniform 16px, a single accent — the canonical StatBand value style.
  > _Commits: `summary-strip numbers 24px -> 16px`; `make summary-strip numbers
consistent (uniform size + one accent)`._

## 6. Tabs → scroll-spy

**Principle:** A detail is one story, not a filing cabinet.

- **Before:** the deadline detail split across tabs.
- **After:** scroll-spy sections with the shared "NrQaI" section grammar — matches
  the alert detail (cross-surface parity).
  > _Commit: `design(deadlines): detail tabs -> scroll-spy + NrQaI section grammar
(alert parity)`._

## 7. Two detail panes, one surface

**Principle:** Cross-surface consistency.

- **Before:** alert detail and deadline detail were different surfaces (white vs
  warm-gray — we'd wrongly assumed they shouldn't match).
- **After:** both converged to one model — gray body + white bordered cards.
  > _Commits: `unify alert+deadline to NrQaI surface — gray body + white cards`;
  > `lighter gray body + white hero + consistent carded sections`._

## 8. The whole Review tab goes red

**Principle:** Urgency by a clear, shared signal — and unify across surfaces.

- **Before:** only a small count badge carried the warning tone, inconsistently
  between /rules and /alerts.
- **After:** the entire Review tab reads red, identically on both surfaces.
  > _Commits: `make the whole Review tab red (unify with rules)`; same on rules._

## 9. A real checkbox, not a mystery dot

**Principle:** Use the canonical primitive; clarity over cleverness.

- **Before:** a "review dot" stood in for selection — ambiguous.
- **After:** a real checkbox per selectable row; the header checkbox owns
  select-all.
  > _Commits: `show a real checkbox per selectable row (drop the review dot)`;
  > `drop the bulk-bar 'Select all' — header checkbox owns it`._

## 10. Side-stripe → leading dot

**Principle:** No side border on rounded corners; restrained signals.

- **Before:** unread/overdue state shown with a side stripe on the card (which
  renders broken on rounded corners).
- **After:** a quiet leading dot instead.
  > _Commits: `replace Card unread side-stripe with a leading dot`; `drop the
overdue side-stripe from DeadlineRow`._

---

## Bonus: two "judgment" pairings (great for the when-to-stop story)

## 11. The tab count that wouldn't settle

- **The arc:** 6 → 4 → 3 → 4 → 3 → 4 tabs on the deadline detail.
- **The lock:** Status · Materials · Record · Audit, canonical, 2026-06-09.
  > The point isn't the final number — it's that oscillation only stopped once the
  > decision had a written home to point at.

## 12. Type-scale drift, audited back to canon

- **Before:** tile values drifting — a `text-2xl` that "felt thin," a `text-lg`
  that "competed with h1."
- **After:** one canonical commodity scale (`text-xl`), strays retired in a drift
  audit.
  > Convergence is the finish line; "a little more polish" isn't.

---

_Curation tip:_ for a leadership audience, lead with **#1 (honest numbers)**,
**#3 (kill redundancy)**, and **#11 (when to stop)** — they read as judgment, not
decoration. For a design/eng audience, **#6, #7, #10** show systems thinking.

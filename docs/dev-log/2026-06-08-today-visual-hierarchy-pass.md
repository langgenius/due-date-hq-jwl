# /today — visual-hierarchy pass (Pencil qYrr3 + ErW76 follow-up)

Date: 2026-06-08

Yuqi feedback: "padding, margin, style, texts are all so rough and coarse …
too much of semibold and medium weight used … everything is so strong and
dominant, I don't know where to look." Three targeted fixes.

## 1. Daily Brief rebuilt to Pencil qYrr3 (`daily-brief-card.tsx`)

The card was "so random" vs the design. Rebuilt 1:1 against `qYrr3`:

- **Shell**: white (`bg-background-default`) with a single hairline border
  (`border-divider-subtle`, no shadow), `rounded-2xl`, padding `py-4 px-[18px]`,
  `gap-2.5`. Was a gray `Card` with `shadow-xs`.
- **Title row**: sparkles (accent) + **"Daily Brief"** 18/600 (was "Your daily
  brief" 14/600) + a single **status dot** (green fresh / amber outdated / red
  failed) + a mono uppercase **age label** ("4M AGO" / "OUTDATED"). The dot is the
  only freshness cue, so the row stays neutral.
- **Toggle**: Firm/Me pill track in `bg-background-section`; active = white pill +
  hairline border + 600, inactive = borderless 500. Was an accent-fill pill.
- **Refresh**: icon-only ghost (`refresh-cw`); dropped the "Regenerate" label.
- **Body**: 14/normal in **primary ink** (was 14/secondary) — the prose is the one
  thing meant to be read.
- **Citation chips**: tight accent pills (`bg-state-accent-hover`, mono 11/600
  accent) per `qYrr3 Cite`.

## 2. Alert card → two colors (`needs-attention-card.tsx`)

Feedback #1: "reduce the colour variety here to two." The card carried red + blue +
green + a 3-tone avatar rainbow. Reduced to **neutral + red**, red reserved for the
one urgent cue:

- Client avatars: 3 rotating tones → a single neutral (`bg-background-subtle` /
  `text-text-secondary`). Removed the `AVATAR_TONES` table.
- Change-kind label ("DEADLINE SHIFTED"): accent blue → neutral `text-text-tertiary`
  (it's a category, not a signal).
- Confidence ("conf 94%"): success green → `text-text-secondary`; 600 → 500.
- **High impact** pill keeps red — the single signal, and only on high-impact
  alerts, so a typical card now reads fully neutral and recedes.

## 3. Quiet the section chrome (`needs-attention-section.tsx`, `actions-list.tsx`)

Feedback #3: nothing to anchor the eye. The two section headers ("Alerts",
"Actions this week") were `text-xl` (20px) semibold — competing with the page H1.
Stepped down to `text-base` (16px), leaving "Today" as the single dominant element.
Right-sized the Monitoring chip `lg → sm` to match.

## Verify

- tsgo 0; dashboard feature tests 10/10 (+1 skip); `vp check` 0 errors; verified in
  preview at 1512px — clear hierarchy, calm palette, qYrr3-matched brief.
- i18n: 4 new brief strings ("Daily Brief", "Daily brief", "Generating", "Live")
  left to fall back to English; catalog extraction deferred because it is currently
  entangled with in-progress alerts/rules work in the tree.

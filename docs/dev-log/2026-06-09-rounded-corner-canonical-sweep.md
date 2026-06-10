# Dev log — rounded-corner canonical sweep (2026-06-09)

Yuqi: "i need a full sweep of rounded corner audit."

Enforced the canonical corner-radius scale (per `no_random_rounded_corners`):
**0 / 4 (compact) / 8 (button·input·table) / 12 (wrapper) / 999 (pill·avatar)**.
className-only — no logic/type impact (`tsgo` clean after).

## Mapping applied across `apps/app/src` + `packages/ui/src`

| Freelance (before)                                                   | → Canonical       |
| -------------------------------------------------------------------- | ----------------- |
| `rounded-md` (6)                                                     | `rounded-lg` (8)  |
| `rounded-2xl` (16), `rounded-3xl` (24), `[14px]`, `[10px]`, `[20px]` | `rounded-xl` (12) |
| `[6px]`                                                              | `rounded-lg` (8)  |
| `[5px]`, `[3px]`                                                     | `rounded-sm` (4)  |

Includes the core primitives (Button, Input, Select, Card, Tabs, Segmented,
Textarea, Command, Skeleton, Tooltip), so it's an app-wide pass — every
button/input is now 8px (was 6px).

## Audit result

Full-repo re-audit (app + all packages, incl. tests): **zero freelance radii
remain**. Only one intentional `rounded-[1px]` hairline + the already-canonical
`[4px]/[8px]/[12px]` bracket values are left.

Note: the find/replace also rewrote the literal `rounded-2xl`/etc. inside a few
code COMMENTS, so a couple of comments now carry a stale px annotation
(e.g. "rounded-xl (16px)") — cosmetic only; the classes are correct.

# /today — Import "+" button: true circle (corner-shape fix)

Date: 2026-06-08

Correction. A prior note claimed the Import "+" button was already a full circle
because `rounded-full` was applied and `border-radius` computed to a huge value.
That was wrong: the Button base sets `[corner-shape:squircle]`, so the corners
stay a superellipse even at full radius — it rendered as a rounded square, not a
circle. Yuqi correctly flagged it.

## Fix (`routes/dashboard.tsx`)

Added `[corner-shape:round]` to the button so the full radius produces a true
circle. Verified in preview: computed `corner-shape: round`, and the button reads
as a circle.

Lesson: when checking "is it round," check `corner-shape` too, not just
`border-radius` — this design system uses squircle corners by default.

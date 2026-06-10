# Fix — tailwind-merge silently dropped custom caption font-size tokens (2026-06-10)

Yuqi (pointing at the DeadlineNavigatorRail status filter rendering "Not started"
far too large): "怎么这么大的字？token呢".

## Root cause
`cn` (`packages/ui/src/lib/utils.ts`) was a bare `twMerge(clsx(...))` with no
config. The design system defines two CUSTOM font-size tokens — `text-caption`
(11px) and `text-caption-xs` (10px) — that stock tailwind-merge doesn't recognize.
So a call like:

    cn('… text-caption-xs font-medium …', cond ? 'text-text-accent' : 'text-text-tertiary')

made tailwind-merge treat `text-caption-xs` (custom size) and `text-text-accent`
(custom color) as two conflicting `text-*` utilities and KEEP ONLY THE LAST one —
dropping the font-size. The element then fell back to the 16px browser default.
(Static className strings like the "28 active" badge were unaffected — they don't
go through tailwind-merge — which is why the badge was 10px but the adjacent
filter trigger was 16px.)

## Fix
`extendTailwindMerge` to register both tokens in the `font-size` class group:

    const twMerge = extendTailwindMerge({
      extend: { classGroups: { 'font-size': [{ text: ['caption', 'caption-xs'] }] } },
    })

Now the size and the color resolve as distinct properties and the token always
survives. Verified: the rail "Filter by status" trigger went 16px → **10px**.

Systemic: this silently affected every `cn(text-caption*, colorConditional)` site
across the app (they were all falling back to 16px) — all corrected at once.

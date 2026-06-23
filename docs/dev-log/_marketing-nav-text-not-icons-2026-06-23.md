# Marketing — nav: text labels, not icons

**Date:** 2026-06-23. Reverted the collapse-to-icons behaviour per user: the nav
items stay **text** at all times, including when the bar collapses into the centred
pill on scroll. Removed `NAV_ICONS`, the per-link `icon` field, the icon/label spans,
and all the icon + collapse-to-glyph CSS. The collapsed pill now just floats the same
text labels. Build 76 pages clean.

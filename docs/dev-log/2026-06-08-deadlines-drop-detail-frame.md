# /deadlines — drop the recessed master-detail frame

Date: 2026-06-08

Yuqi: "why is deadline detail encapsulated in a frame?" — it shouldn't be.
Removed the `rounded-xl bg-[#f2f2f2] p-3` tray that wrapped the rail + detail in
the master-detail state. It was a third nested surface (gray tray around two
white panes), inconsistent with /alerts (no tray) and with the restraint-on-
nested-surfaces rule. The rail + detail now sit directly on the white page,
separated by the rail's `border-r` hairline.

# Founding-user recruitment banner + modal lead form

**Date:** 2026-07-07 · marketing / GTM

Site-wide top bar recruiting founding users, opening a modal lead form. Captures
name / work email / firm / (optional) client count + "what would you want it to
solve", and POSTs to a **dedicated Formspree form** (`f/mjgnrnpj`) — separate
inbox from the deadline-alert opt-in (`f/xojgdvrp`).

## What shipped

- `components/FoundingBanner.astro` — the bar + modal + AJAX submit + success
  state, bilingual (EN/zh), dismissible (localStorage). Rendered once in
  `layouts/BaseLayout.astro` (above the sticky nav, so it scrolls away while the
  nav pins below — no nav offset coupling needed). The modal opens from the bar
  OR any `[data-founding-open]` trigger.
- `layouts/BaseLayout.astro` — renders `<FoundingBanner>`; endpoint from
  `PUBLIC_FOUNDING_FORM_ACTION`, **hardcoded default `f/mjgnrnpj`** so it works on
  deploy with zero env (same pattern as the alert form's `f/xojgdvrp`).
- `components/WorksWithStackPage.astro` — added a contact line to the CTA
  (`hello@duedatehq.com` + a "become a founding user" trigger). This is the
  "contact info on the page" ask.

## Connected — verified end-to-end

Submitted one labeled test to the live `f/mjgnrnpj` endpoint from the modal:
Formspree returned **200**, the success panel rendered, form hid. (First
submission on a new Formspree form triggers an owner-confirmation email + one test
entry to delete.) zh-CN mirror wired to the same endpoint. Zero console errors;
`astro check` clean for these files (the 9 errors it reports are pre-existing in
`StateDetailPage.astro`, another track).

## Notes

- AJAX submit (fetch + `Accept: application/json`) → inline success, no redirect.
  Honeypot `_gotcha` field for spam. Hidden `source=founding-user` tag.
- The bar uses `--m-brand` navy; modal uses `--m-*` tokens + `.m-btn`,
  `.m-display-2` for the title. Dismiss persists per browser.

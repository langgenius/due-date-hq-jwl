# duedatehq: de-orphan the two category pillar pages (footer inbound links)

2026-07-28

## Why

Live-data check: `/what-is-deadline-monitoring` and `/what-is-rule-change-monitoring` had **zero
inbound internal links** — every major page (`/`, how-it-works, pricing, state-coverage,
irs-disaster-relief, works-with-your-stack) returned 0 links to them. They were reachable only via
sitemap + llms.txt. Orphan pages crawl and rank poorly; their own launch dev-log had flagged this
("no existing page links in yet — add to footer / resources / nav") as not-done.

## What

Added both pillars to the Footer `Resources` column (the designated SEO on-ramp), EN + zh. Now all
211 marketing pages link to the two pillars. Build verified: 1 inbound link each on index /
how-it-works / pricing / state-coverage / irs-disaster-relief and the zh footer.

## Note

Ships to production only on the next marketing deploy (production is manual — see
[[reference_prod_deploy_staging_gap]]). Broader lever remains authority + a data-driven page
cluster, not raw page count.

# Rule Library blank page → worker hang

**Date:** 2026-05-21
**Branch:** `design/preview-integration`

## Symptom

`/rules/library` loaded into an indefinite skeleton: a centered placeholder
card with three rounded rectangles and no real content. Every other route
behaved the same way once the user navigated to it. Hard reloads did not help.

## Diagnosis

The page render itself was healthy — `RulesLibraryRoute` mounts the
`<RulesPageShell>` immediately, and the inner Coverage / Sources strips
render their own loading skeletons while `useQuery` resolves.

The blocker sat one layer up: the **auth bootstrap** in `<AppShell>` waits
for `orpc.auth.getSession` before rendering anything else. Every RPC call
went out and never returned. `curl --max-time 5 http://localhost:8787/`
also timed out after eight seconds with zero bytes received — the TCP
connection accepted, the request flushed, then silence.

`ps` showed the workerd process had accumulated **105 minutes of CPU time**
over a 5h32m uptime. The wrangler dev stack rooted at PID 44830 had drifted
into an unresponsive state (probably a stuck event loop / module reload
cycle from days of HMR churn on this worktree). Both Vite dev servers
(5183 and 5188) proxy `/rpc` to this same worker, so both pages stalled in
the same skeleton.

## Fix

```bash
kill 44830 44850 44852 44862 44865 44874 45339 45342 45343 45344 76159 76160
pnpm -F @duedatehq/server dev
```

After restart, `curl http://localhost:8787/` returned `404` in <100 ms and
`/rpc/auth/get-session` returned `401 UNAUTHORIZED` (the expected
"no session cookie" response). Reloading the browser at
`/rules/library` then rendered the new layout end-to-end: Coverage summary
strip, Sources summary strip, "View all rules →" toggle, and the Coverage
matrix below.

## Takeaway

When the Rule Library page (or any route) stalls on its bootstrap
skeleton with no console error, **first check whether the worker is
actually responding**, not whether the React code is correct. A long-lived
wrangler dev process can wedge silently; the symptom looks like a frontend
bug because the auth gate hides everything else.

Quick check:

```bash
curl --max-time 3 -o /dev/null -w "%{http_code}\n" http://localhost:8787/
```

If this hangs, restart `pnpm -F @duedatehq/server dev` before touching any
client code.

## Second gotcha — multiple Vite dev servers across worktrees

After the worker restart, the user still saw an apparently empty page
because they were looking at `localhost:5183`. That port is served by a
Vite dev process rooted in a _different_ worktree
(`nervous-proskuriakova-523360`), not the worktree we were editing. The
ports running at the time:

| Port | Worktree                         |
| ---- | -------------------------------- |
| 5177 | `cranky-blackburn-5a3c7c`        |
| 5183 | `nervous-proskuriakova-523360`   |
| 5188 | `jolly-hopper-46479d` (this one) |

All three proxy `/rpc` to the same worker on `:8787`, so they all
recovered when the worker restart fixed the hang — but only 5188 has
the new Coverage / Sources / matrix layout. Any edits in this worktree
are invisible on the other ports.

Diagnostic:

```bash
ps -ef | grep "port [0-9]" | grep -v grep
# Each row's path tells you which worktree owns that port.
```

When the user reports "the page is empty," confirm which port their
browser is on before assuming the React render is broken.

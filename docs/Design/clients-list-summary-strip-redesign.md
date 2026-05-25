# Design spec: `/clients` list summary strip — replace configuration metrics with action tiles

> Authored 2026-05-21 by Yuqi (with Claude) after a critique of the
> current 4-tile read-out. Locks the design direction for the next
> iteration of the `/clients` list header so the other session can pick
> this up cleanly.
>
> **Anchor docs**
>
> - List-vs-detail IA: [client-page-information-architecture.md](./client-page-information-architecture.md)
> - UX audit (Client list scored within the same band as Detail): [ux-audit-2026-05-21.md](./ux-audit-2026-05-21.md)
> - Pulse vocabulary: [pulse-vocabulary.md](./pulse-vocabulary.md)

## 1. The problem

Today's `/clients` list page opens with a four-tile read-out:

```
[Ready for rules · 38] [Needs facts · 12] [Imported · 40] [States covered · 5]
```

Source: [`ClientFactsWorkspace.tsx:355-387`](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx) /
[`client-readiness.ts:110-145`](../../apps/app/src/features/clients/client-readiness.ts).

Run each tile through the test **"if this number is non-zero, would a
CPA click in and act?"**:

| Tile            | Passes?                    | Why                                                                                                                 |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Ready for rules | No                         | "38 of my clients are configured correctly" is a non-event. You don't reward yourself for absence of a problem.     |
| Needs facts     | **Yes — but conditional.** | Useful during onboarding, sits at 0 forever afterward. A tile that lives at 0 is visual noise. Promote to a banner. |
| Imported        | No                         | Provenance trivia. Matters for ~24 hours after a Migration Copilot run, then goes stale.                            |
| States covered  | No                         | The "for Pulse matching" rationale is thin; the number doesn't drive any action.                                    |

The strip reads as configuration-health metrics dressed up as a
dashboard. CPAs look at it once during setup and never again. Meanwhile,
the questions a CPA actually asks the list page — "who's at risk?",
"who's been hit by a Pulse change?", "who's waiting on me?" — go
unsurfaced.

## 2. Primary user action

A CPA opens `/clients` and answers, in under 5 seconds:

1. **"Is there anything I need to chase across my book right now?"**
2. If yes, drill into the filtered list of those clients.
3. If no, fall through to the table to find a specific client by name.

Today the strip answers neither question. The fix puts the action signals where the cosmetic ones used to be.

## 3. The replacement strip

Three action tiles, ordered by urgency. Each tile is a filter link into
the existing list. Tone reflects severity. Hidden when count is 0.

```
[At risk · N]   [Waiting on client · N]   [Pulse hits · N]
```

Above the strip, render the **Needs facts** signal as a conditional
banner — distinct treatment because it's a pre-deadline-pressure setup
gap, not an in-flight workload signal.

```
⚠️ 12 clients are missing state or entity type — the rule library is skipping them. [Fix now →]

[At risk · 7]   [Waiting on client · 14]   [Pulse hits · 3]
```

### 3.1 Each tile in detail

**At risk** — clients with at least one obligation that's blocked OR overdue.

- Tone: `destructive` when `N > 0`, hidden when `N === 0`.
- Click: navigates to `/clients?status=blocked` (filter chip + table scrolls).
  Reuses the existing `status` query-param plumbing.
- Data source: roll up `obligationSummariesByClient` (already computed in [`routes/clients.tsx:113`](../../apps/app/src/routes/clients.tsx)) — count clients where the summary has any blocked / overdue row.

**Waiting on client** — clients with at least one obligation in `waiting_on_client` status.

- Tone: `warning` when `N > 0`, hidden when `N === 0`.
- Click: navigates to `/clients` with a new client-level filter (add `waiting=1` to the existing query parser).
- Data source: same `obligationSummariesByClient` roll-up, predicate `status === 'waiting_on_client'`.

**Pulse hits** — clients matched by a recent Pulse alert.

- Tone: `review` (status-review token, same blue used everywhere Pulse appears) when `N > 0`, hidden when `N === 0`.
- Click: navigates to `/clients?pulse=affected` (filter already exists at [`routes/clients.tsx:159`](../../apps/app/src/routes/clients.tsx)).
- Data source: `affectedClientIds.size` ([`routes/clients.tsx:146-149`](../../apps/app/src/routes/clients.tsx)) — already computed, just unused on the strip today.

### 3.2 Needs facts banner

- Renders **only when `factsModel.summary.needsFacts > 0`**.
- Single-row alert pattern, not a tile.
- Copy: `"{N} clients are missing state or entity type — the rule library is skipping them."`
- CTA: secondary button **"Fix now"** that navigates to `/clients?readiness=needs_facts`.
- Tone: attention / amber (the same `bg-state-warning-tint` used elsewhere).
- Dismissible? **No.** It's the rule-library pipeline talking; you can't dismiss the fact that some clients are skipping. Resolve by filling in the missing facts.

### 3.3 Empty state

If all four signals (`needsFacts`, `atRisk`, `waitingOnClient`, `pulseHits`) are 0:

- Render nothing. The list jumps straight under the page title.
- Don't render a "Nice work — nothing to chase!" placeholder. Quiet is the reward.

## 4. What to delete

In [`ClientFactsWorkspace.tsx`](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx):

- The `metrics` array (lines 355-387) and the four `<ClientMetric>` tile renders that consume it.
- The `ClipboardCheckIcon`, `FileInputIcon`, `MapPinnedIcon` imports if they're not used elsewhere on the page after the deletion.

In [`client-readiness.ts`](../../apps/app/src/features/clients/client-readiness.ts):

- Keep `summary.readyForRules`, `summary.needsFacts`, `summary.statesCovered`, `summary.imported`, `summary.manual` for now — they're computed cheaply in `buildClientFactsModel` and may be useful for audit/telemetry. Remove only if no consumer is left after the strip swap.

## 5. What to add

In [`ClientFactsWorkspace.tsx`](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx):

- A new `<ClientsActionStrip>` component (local file or co-located) that:
  - Takes `obligationSummariesByClient`, `affectedClientIds`, `needsFactsCount` as props.
  - Computes the three counts inline (cheap reductions).
  - Renders the three tiles + the conditional Needs facts banner.
  - Each tile is a `<Link>` to the appropriate `/clients?…` URL.
  - Hidden entirely when all four counts are 0.

In [`routes/clients.tsx`](../../apps/app/src/routes/clients.tsx):

- Pass `obligationSummariesByClient`, `affectedClientIds`, `factsModel.summary.needsFacts` into the workspace so the strip can read them.
- If the `waiting_on_client` filter doesn't exist on the list page yet, add it to the query-param parsers and the filter pipeline. Mirror `pulse=affected` / `readiness=needs_facts` plumbing.

## 6. Visual / token rules

Per [`DESIGN.md`](../../DESIGN.md) §6 (Level 1 surfaces):

- Tile container: `bg-background-default`, hairline border `border-divider-regular`, `rounded-md`, no shadow.
- Layout: `flex h-12 items-center gap-3 px-4 py-2` per tile; row wraps responsively.
- Number: `font-mono font-semibold tabular-nums text-sm`, tone class drives color.
- Label: `text-xs text-text-secondary`, no uppercase.
- Tile is a `<Link>`; hover state = subtle background lift (`hover:bg-background-subtle`), focus ring per `focus-visible:ring-2`.
- Tone tokens:
  - `destructive` → `text-text-destructive`
  - `warning` → `text-severity-medium`
  - `review` (Pulse) → `text-status-review`
- **Do not** introduce new colors. Pull from existing tokens.

The Needs facts banner uses the canonical `<Alert>` primitive with `variant="warning"`. No bespoke styling.

## 7. Acceptance

- All four old tiles gone.
- New strip shows only tiles with `N > 0`, in the order: At risk → Waiting on client → Pulse hits.
- Needs facts banner shows only when `N > 0`, above the strip.
- Each tile and the banner CTA navigate to the correctly-filtered list (URL contains the matching filter param, and the table reflects it).
- When everything is 0, the page renders the title + the table only — no empty strip, no empty banner.
- No new ORPC calls; everything reads from data already fetched on the list route.
- `pnpm check` clean.

## 8. Non-goals

- **No "Unassigned clients" tile** for now. It's operational hygiene, not deadline-pressure. Surface it as a chip on the affected rows in the table body instead.
- **No "Active opportunities" tile.** That's the Opportunities surface's job.
- **No engagement-age tile** ("haven't touched in 60 days"). Schema doesn't carry `lastTouchedAt` today; pick this up if/when the field lands.
- **No bulk-action affordances on the strip.** It's a navigation/scan surface, not an editing surface.

## 9. Open questions

- **Does the `status=blocked` filter on `/clients` already exist?** If not, mirror the pattern used elsewhere — the queue's filter shape is the reference.
- **Should "At risk" merge blocked + overdue + rejected into one count, or separate them?** Recommend merged for the tile (one number, one action). Detail-level breakdown is the responsibility of the destination list, not the strip.
- **Default sort of the destination list when arriving from a tile?** Recommend sorting by the relevant urgency signal (e.g., arriving from "At risk" sorts by most-overdue-first). Confirm with whoever owns the list sort.

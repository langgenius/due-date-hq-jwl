# X Draft Buffer and Three-Day Cadence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep three valid X drafts available for approval after every daily scheduler pass and
publish normal automatic X Posts no more often than once every three ET calendar days.

**Architecture:** Extract the existing operator seed loop into one shared server-side buffer helper
backed by `createDraftIfBufferBelow`, then call it from both Social Ops and the daily scheduler. Use
one exported cadence constant for scheduler guards and read-only queue projection, and remove the
obsolete one-draft-per-day repository path.

**Tech Stack:** TypeScript ESM, Cloudflare Workers, Hono, Drizzle/D1, Vitest, pnpm, Vite+.

## Global Constraints

- Run automatic reconciliation only during 09:00-09:29 `America/New_York`.
- Count only runtime-eligible Posts whose current status is `draft` toward the target of `3`.
- Automatic candidates must remain at or after `X_SOCIAL_START_AT`; operator seed may use
  `new Date(0)` and a requested target from `1` through `14`.
- A normal automatic publish is blocked when either of the preceding two ET calendar dates has an
  occupied X `social_publish_run`.
- Do not reserve future run rows, auto-approve drafts, change `publish-now`, or change newest-Pulse-
  first ordering.
- Draft replenishment failure must not prevent an already claimed live Post from being enqueued.
- Do not add a migration or credential; do not mutate remote D1 or call the real X API.
- Preserve the link-free main Post plus tracked first-reply format.
- Do not stage or modify unrelated user work.

---

## File Map

- Create `apps/server/src/jobs/social/draft-buffer.ts`: shared, bounded review-buffer orchestration.
- Create `apps/server/src/jobs/social/draft-buffer.test.ts`: behavior tests for buffer filling,
  validation skips, pagination, candidate conflicts, and concurrent fullness.
- Modify `apps/server/src/routes/ops.ts`: delegate `/social/drafts/seed` to the shared helper.
- Modify `apps/server/src/routes/ops-social.test.ts`: retain route-boundary coverage after delegation.
- Modify `apps/server/src/jobs/social/scheduler.ts`: replenish to three every day and enforce the
  two-previous-days cadence guard.
- Modify `apps/server/src/jobs/social/scheduler.test.ts`: scheduler outcomes, call ordering, paused
  replenishment, and non-blocking failure coverage.
- Modify `apps/server/src/jobs/social/queue-preview.ts`: project three-day automatic slots.
- Modify `apps/server/src/jobs/social/queue-preview.test.ts`: literal three-day date expectations.
- Modify `packages/db/src/repo/social.ts`: remove the unused daily-one-draft type and method.
- Modify `packages/db/src/repo/social.test.ts`: remove obsolete daily-window tests and retain atomic
  buffer tests.
- Modify `packages/db/src/index.ts`: stop exporting `SocialDraftCreateResult`.
- Modify `docs/dev-file/02-System-Architecture.md`, `docs/dev-file/03-Data-Model.md`,
  `docs/dev-file/06-Security-Compliance.md`, and `docs/ops/x-daily-alert-publishing.md`: current
  architecture and operations truth.
- Create `docs/dev-log/2026-08-12-x-three-draft-buffer.md`: dated implementation record.

---

### Task 1: Extract the shared X draft-buffer helper

**Files:**

- Create: `apps/server/src/jobs/social/draft-buffer.ts`
- Create: `apps/server/src/jobs/social/draft-buffer.test.ts`
- Modify: `apps/server/src/routes/ops.ts`
- Test: `apps/server/src/routes/ops-social.test.ts`

**Interfaces:**

- Consumes: `makeSocialOpsRepo`, `buildXAlertPost`, `validateSocialCandidate`, and the existing
  `createDraftIfBufferBelow` atomic repository method.
- Produces:

```ts
export interface FillXDraftBufferInput {
  repo: XDraftBufferRepo
  appUrl: string
  since: Date
  now: Date
  bufferSize: number
  randomRefToken?: () => string
  priorityForCandidate?: (candidate: SocialAlertCandidate) => SocialAlertPriority
}

export interface XDraftBufferFillResult {
  requested: number
  existing: number
  created: number
  total: number
  targetReached: boolean
  bufferFull: boolean
  skipped: number
  posts: SocialAlertPost[]
}

export async function fillXDraftBuffer(
  input: FillXDraftBufferInput,
): Promise<XDraftBufferFillResult>
```

- `export type XDraftBufferRepo` is a `Pick<ReturnType<typeof makeSocialOpsRepo>,
'listEligibleCandidates' | 'listDraftPostsForQueuePreview' | 'createDraftIfBufferBelow'>`.
- `priorityForCandidate` defaults to `normal`; the scheduler supplies its existing urgent-window
  classifier so extraction does not change automatic priority metadata.

- [ ] **Step 1: Write the failing partial-buffer test**

Create `draft-buffer.test.ts` with complete candidate fixtures and a controlled repository. The
break this test catches is returning after one insert instead of filling the requested buffer.

```ts
it('fills a partial valid draft buffer to the requested target', async () => {
  const repo = draftBufferRepo({
    existingDrafts: [{ ...draftPost('existing'), pulseCreatedAt: NOW }],
    candidates: [candidate('newest'), candidate('older')],
  })

  await expect(
    fillXDraftBuffer({
      repo,
      appUrl: 'https://app.duedatehq.com',
      since: new Date('2026-07-21T00:00:00.000Z'),
      now: NOW,
      bufferSize: 3,
      randomRefToken: sequentialRefToken(),
    }),
  ).resolves.toMatchObject({
    requested: 3,
    existing: 1,
    created: 2,
    total: 3,
    targetReached: true,
    posts: [{ pulseId: 'newest' }, { pulseId: 'older' }],
  })
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
pnpm --filter @duedatehq/server test --run src/jobs/social/draft-buffer.test.ts
```

Expected: FAIL because `./draft-buffer` and `fillXDraftBuffer` do not exist.

- [ ] **Step 3: Implement the minimal shared helper**

Move the bounded loop from `/social/drafts/seed` into `draft-buffer.ts`. Validate `bufferSize` as an
integer from 1 through 14, read the initial eligible drafts, page candidates in batches of 100,
sort each page by `createdAt DESC, pulseId DESC`, validate each candidate, build deterministic copy,
and call `createDraftIfBufferBelow` sequentially.

Use the literal repository call shape:

```ts
const result = await input.repo.createDraftIfBufferBelow({
  channel: 'x',
  pulseId: candidate.pulseId,
  refToken,
  postText: built.text,
  targetUrl: built.targetUrl,
  teaser: built.teaser,
  agency: built.agency,
  priority: 'normal',
  since: input.since,
  bufferSize: input.bufferSize,
  now: input.now,
})
```

Always perform a final `listDraftPostsForQueuePreview({ channel: 'x', limit: bufferSize })` and
derive `total`, `targetReached`, and `bufferFull` from durable state.

- [ ] **Step 4: Run the helper test and verify GREEN**

Run the command from Step 2. Expected: the partial-buffer test passes.

- [ ] **Step 5: Add failing edge-case tests**

Add separate tests with literal outcomes for:

```ts
it('returns a full buffer without reading candidates')
it('returns the available prefix when fewer than three eligible Alerts exist')
it('skips invalid candidates and continues onto the next keyset page')
it('continues after a candidate conflict')
it('stops when a concurrent insert reports buffer_full')
it('rejects a buffer target outside 1 through 14')
```

The pagination test must supply 100 invalid candidates, then one valid older candidate, and assert
the hand-derived `before` cursor equals the 100th candidate's `createdAt` and `pulseId`.

- [ ] **Step 6: Run edge cases and verify RED, then complete the minimal helper**

Run the focused helper test after adding each behavior. Confirm each new test fails for the named
missing branch before updating the helper, then rerun until all helper tests pass.

- [ ] **Step 7: Delegate the Social Ops route to the helper**

Keep request parsing, authorization, cancellation, the pre-cutover operator policy, and HTTP status
selection in `ops.ts`. Replace the inline loop with:

```ts
const result = await fillXDraftBuffer({
  repo,
  appUrl: c.env.APP_URL,
  since: new Date(0),
  now,
  bufferSize: count,
})
return result.created > 0 ? c.json(result, 201) : c.json(result)
```

Remove route-only imports/constants that the helper now owns, including `SocialAlertPost`,
`buildXAlertPost`, `validateSocialCandidate`, and the seed candidate page-size constant.

- [ ] **Step 8: Run helper and route tests**

Run:

```bash
pnpm --filter @duedatehq/server test --run \
  src/jobs/social/draft-buffer.test.ts src/routes/ops-social.test.ts
```

Expected: both files pass, including existing default-3 and explicit-1..14 route behavior.

- [ ] **Step 9: Commit the shared helper**

```bash
git add apps/server/src/jobs/social/draft-buffer.ts \
  apps/server/src/jobs/social/draft-buffer.test.ts \
  apps/server/src/routes/ops.ts apps/server/src/routes/ops-social.test.ts
git commit -m "refactor(social): share X draft buffer fill"
```

---

### Task 2: Replenish three drafts daily and enforce a three-day scheduler cadence

**Files:**

- Modify: `apps/server/src/jobs/social/scheduler.ts`
- Modify: `apps/server/src/jobs/social/scheduler.test.ts`

**Interfaces:**

- Consumes: `fillXDraftBuffer`, `X_AUTOMATIC_PUBLISH_INTERVAL_DAYS`, and a scheduler repository
  containing `cancelIneligiblePosts`, `listOccupiedPublishDates`, `claimDailyReadyPost`,
  `markFailed`, plus the three `XDraftBufferRepo` methods.
- Produces: `cadence_pause` results containing `draftsCreated`:

```ts
{
  status: 'cadence_pause'
  localDate: string
  draftsCreated: number
}
```

- [ ] **Step 1: Write failing paused-day replenishment tests**

Replace the current previous-day-only test with two behaviors. The production mutation these tests
catch is returning from `cadence_pause` before replenishment or checking only yesterday.

```ts
it.each(['2026-07-19', '2026-07-20'])(
  'fills the review buffer but does not claim when %s occupied one of the preceding two ET days',
  async (occupiedDate) => {
    const repo = schedulerRepo({ candidates: [candidate('pulse-1')] })
    repo.listOccupiedPublishDates.mockResolvedValue([occupiedDate])

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({
      status: 'cadence_pause',
      localDate: '2026-07-21',
      draftsCreated: 1,
    })
    expect(repo.claimDailyReadyPost).not.toHaveBeenCalled()
  },
)
```

The stub's durable final buffer read must return the created draft so `draftsCreated` is observable
through real helper behavior, not asserted only through a mock call.

- [ ] **Step 2: Run scheduler tests and verify RED**

```bash
pnpm --filter @duedatehq/server test --run src/jobs/social/scheduler.test.ts
```

Expected: FAIL because a day-two run is not considered and paused results have no `draftsCreated`.

- [ ] **Step 3: Implement the three-day guard and paused replenishment**

Import `X_AUTOMATIC_PUBLISH_INTERVAL_DAYS` from `queue-preview`. Calculate the oldest guarded date
with:

```ts
const cadenceLookbackDays = X_AUTOMATIC_PUBLISH_INTERVAL_DAYS - 1
const cadenceStartLocalDate = addLocalCalendarDays(localDate, -cadenceLookbackDays)
```

Read occupied dates from `cadenceStartLocalDate`, and treat only the two exact previous local dates
as cadence blockers. Query with `limit: X_AUTOMATIC_PUBLISH_INTERVAL_DAYS`, build a set containing
`localDate - 1` and `localDate - 2`, and ignore an existing row for today when deciding cadence. On a
blocked day, cancel ineligible Posts, call the alert-wrapped buffer helper with target `3`, and return
`cadence_pause` without claiming.

- [ ] **Step 4: Verify the guard is GREEN**

Run the focused scheduler test. Expected: both preceding-date cases pass.

- [ ] **Step 5: Write failing eligible-day and shadow-count ordering tests**

Add literal behaviors:

```ts
it('allows an automatic claim when the most recent occupied date is three ET days old')
it('fills to three after a live claim and before enqueue')
it('counts a shadowed ready Post toward the three-draft target')
it('does not create when three valid drafts already exist')
it('keeps a cadence pause and reports zero created when replenishment fails')
```

For shadow mode, initialize two drafts plus one ready claim. The repository's claim fake must expose
the claimed Post as a draft to the following final buffer read; expect zero new drafts and a final
target of three. This catches moving replenishment before the shadow claim and accidentally creating
a fourth draft.

- [ ] **Step 6: Run and verify RED, then consolidate scheduler replenishment**

Replace `replenishReviewBuffer` with a scheduler wrapper around `fillXDraftBuffer`. Keep one
`tryFillReviewBuffer` that catches failures, emits `social.x.draft_replenish_failed`, dispatches the
ops alert, and returns `0`. Call it:

- after cancellation and before returning from `cadence_pause`;
- after an idle, shadow, or live claim transition;
- before the live queue send, preserving the current non-blocking enqueue order.

The wrapper returns `result.created`, not `result.total`.

- [ ] **Step 7: Run scheduler and helper tests**

```bash
pnpm --filter @duedatehq/server test --run \
  src/jobs/social/draft-buffer.test.ts src/jobs/social/scheduler.test.ts
```

Expected: all tests pass, including error alerting and live enqueue after replenishment failure.

- [ ] **Step 8: Commit scheduler behavior**

```bash
git add apps/server/src/jobs/social/scheduler.ts apps/server/src/jobs/social/scheduler.test.ts
git commit -m "feat(social): keep three X drafts ready for review"
```

---

### Task 3: Project the same three-day cadence in queue previews

**Files:**

- Modify: `apps/server/src/jobs/social/queue-preview.ts`
- Modify: `apps/server/src/jobs/social/queue-preview.test.ts`

**Interfaces:**

- Produces: `X_AUTOMATIC_PUBLISH_INTERVAL_DAYS = 3` and queue responses with `cadenceDays: 3`.
- Preserves: drafts have no projected date; ready order remains newest-Pulse-first.

- [ ] **Step 1: Change tests to literal three-day outcomes**

Update the first projection test to use a six-day horizon and expect:

```ts
expect(preview.ready.map((item) => [item.post.id, item.projectedLocalDate])).toEqual([
  ['post-3', '2026-07-24'],
  ['post-2', '2026-07-27'],
])
expect(preview).toMatchObject({ cadenceDays: 3 })
```

Update the occupied-date test so any projected Post stays two complete dates away from occupied
runs. Update today's-occupied case so `2026-07-21` makes `2026-07-24` the next automatic date.

- [ ] **Step 2: Run preview tests and verify RED**

```bash
pnpm --filter @duedatehq/server test --run src/jobs/social/queue-preview.test.ts
```

Expected: FAIL with two-day dates and `cadenceDays: 2`.

- [ ] **Step 3: Implement distance-based projection**

Set the constant to `3`. Add a focused helper that rejects a local date when any occupied or
projected date exists at offsets `-2`, `-1`, `+1`, or `+2`:

```ts
function isAutomaticDateAvailable(localDate: string, occupied: ReadonlySet<string>): boolean {
  for (let distance = 1; distance < X_AUTOMATIC_PUBLISH_INTERVAL_DAYS; distance += 1) {
    if (
      occupied.has(addLocalCalendarDays(localDate, -distance)) ||
      occupied.has(addLocalCalendarDays(localDate, distance))
    ) {
      return false
    }
  }
  return !occupied.has(localDate)
}
```

Use it in both the projection loop and `nextAvailableAutomaticLocalDate`. Size the bounded search as
`occupied.size * X_AUTOMATIC_PUBLISH_INTERVAL_DAYS + X_AUTOMATIC_PUBLISH_INTERVAL_DAYS`.

- [ ] **Step 4: Run preview tests and verify GREEN**

Run the command from Step 2. Expected: all queue preview tests pass.

- [ ] **Step 5: Run Social Ops queue route coverage**

```bash
pnpm --filter @duedatehq/server test --run \
  src/jobs/social/queue-preview.test.ts src/routes/ops-social.test.ts
```

Expected: route payloads expose cadence `3` and retain draft/ready/published allowlists.

- [ ] **Step 6: Commit projection behavior**

```bash
git add apps/server/src/jobs/social/queue-preview.ts \
  apps/server/src/jobs/social/queue-preview.test.ts apps/server/src/routes/ops-social.test.ts
git commit -m "feat(social): project X posts every three days"
```

---

### Task 4: Remove the obsolete one-draft-per-day repository API

**Files:**

- Modify: `packages/db/src/repo/social.ts`
- Modify: `packages/db/src/repo/social.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**

- Removes: `SocialDraftCreateResult` and `createDailyDraft`.
- Retains: `SocialDraftBufferCreateResult` and `createDraftIfBufferBelow`.

- [ ] **Step 1: Prove no runtime caller remains**

```bash
rg -n "createDailyDraft|SocialDraftCreateResult|daily_slot_filled" \
  apps packages scripts --glob '!packages/db/src/repo/social.ts' \
  --glob '!packages/db/src/repo/social.test.ts' --glob '!packages/db/src/index.ts'
```

Expected: no matches. If a match remains, update that caller to the shared buffer before deleting the
API.

- [ ] **Step 2: Remove obsolete tests and implementation**

Delete repository tests that assert exact daily UTC creation windows, same-day `daily_slot_filled`,
or `createDailyDraft` conflicts. Delete the method and type export. Do not change
`createDraftIfBufferBelow`, whose SQL count and candidate uniqueness are the active concurrency
contract.

- [ ] **Step 3: Run database tests**

```bash
pnpm --filter @duedatehq/db test --run src/repo/social.test.ts src/social-schema.test.ts
```

Expected: all remaining repository/schema tests pass.

- [ ] **Step 4: Run type-aware checks for DB and server consumers**

```bash
pnpm check
```

Expected: zero errors. Existing repository warnings may remain but no new warning may originate from
the changed social files.

- [ ] **Step 5: Commit the cleanup**

```bash
git add packages/db/src/repo/social.ts packages/db/src/repo/social.test.ts packages/db/src/index.ts
git commit -m "refactor(db): remove daily X draft insert"
```

---

### Task 5: Align current-truth documentation and operations guidance

**Files:**

- Modify: `docs/dev-file/02-System-Architecture.md`
- Modify: `docs/dev-file/03-Data-Model.md`
- Modify: `docs/dev-file/06-Security-Compliance.md`
- Modify: `docs/ops/x-daily-alert-publishing.md`
- Create: `docs/dev-log/2026-08-12-x-three-draft-buffer.md`

**Interfaces:**

- Documents the already-tested code contract; introduces no runtime interface.

- [ ] **Step 1: Update architecture truth**

In `02-System-Architecture.md`, replace every-other-day / previous-day / single-daily-draft claims
with:

- automatic publish blocked by either of the preceding two ET dates;
- cadence `3` with two empty dates;
- daily target buffer `3`, including cadence-pause days;
- shared atomic buffer helper and no future run reservation;
- queue preview `cadenceDays=3`.

Rename section 4.4 to `X three-day Alert acquisition loop` and update the text diagram from “at most
one deterministic review draft for this ET day” to “atomically fill the valid review buffer to
three.”

- [ ] **Step 2: Update data/security truth**

In `03-Data-Model.md`, document that `(channel, local_date)` still caps one run per ET date, the
scheduler inspects two previous dates, and automatic/operator paths both use the same buffer-below-
target conditional insert with different cutovers.

In `06-Security-Compliance.md`, state that exposing up to three review drafts does not expand fields
or approval authority: all three use the same deterministic public-copy allowlist and only Social
Ops can transition `draft -> ready`.

- [ ] **Step 3: Update the runbook and dev log**

In the runbook, replace commands/diagnostics that expect one newest daily draft with a valid buffer
target of three. Include this operator example:

```text
Monday automatic Post -> Tuesday pause -> Wednesday pause -> Thursday next eligible automatic Post
```

Document that pause days still replenish drafts and that fewer than three drafts is healthy only when
the eligible candidate pool is exhausted or replenishment emitted an alert.

The dev log must record the motivation, shared-helper boundary, exact cadence semantics, no-migration
decision, validation commands, and the explicit fact that no real X request or remote D1 mutation was
performed.

- [ ] **Step 4: Scan for stale current-truth claims**

```bash
rg -n "every-other-day|every other day|cadenceDays=2|前一 ET|后天|at most one eligible draft|至多一条" \
  docs/dev-file/02-System-Architecture.md docs/dev-file/03-Data-Model.md \
  docs/dev-file/06-Security-Compliance.md docs/ops/x-daily-alert-publishing.md
```

Expected: no stale automatic-X cadence or one-draft claims. Historical dev logs and ADR context may
retain their dated statements.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/dev-file/02-System-Architecture.md docs/dev-file/03-Data-Model.md \
  docs/dev-file/06-Security-Compliance.md docs/ops/x-daily-alert-publishing.md \
  docs/dev-log/2026-08-12-x-three-draft-buffer.md
git commit -m "docs: describe three-day X review buffer"
```

---

### Task 6: Full verification and handoff

**Files:**

- Verify all files changed in Tasks 1-5.

**Interfaces:**

- Produces: evidence that the committed implementation matches the approved spec.

- [ ] **Step 1: Run focused social and database suites**

```bash
pnpm --filter @duedatehq/server test --run \
  src/jobs/social/draft-buffer.test.ts \
  src/jobs/social/scheduler.test.ts \
  src/jobs/social/queue-preview.test.ts \
  src/routes/ops-social.test.ts
pnpm --filter @duedatehq/db test --run src/repo/social.test.ts src/social-schema.test.ts
```

Expected: all listed files pass with zero failed tests.

- [ ] **Step 2: Run the repository handoff gate**

```bash
pnpm ready
```

Expected: exit code `0`; format, lint/type, i18n, generated-artifact, automation, all workspace tests,
and builds pass. Report existing warnings separately from errors.

- [ ] **Step 3: Inspect the final diff and repository state**

```bash
git diff --check
git status --short --branch
git log --oneline --decorate --max-count=8
```

Expected: `git diff --check` is empty; only intentional feature files are changed/committed; no
credential, generated build output, remote D1 mutation, X request, deployment, or push occurred.

- [ ] **Step 4: Compare implementation against the approved spec**

Confirm all of these from code plus tests:

- paused days replenish to three and never claim;
- an occupied run one or two ET dates ago blocks, while three dates ago does not;
- shadow claims count toward the target and cannot produce a fourth draft;
- queue preview dates match the same cadence constant;
- operator seed still supports targets 1..14 and may bypass the cutover;
- live enqueue survives replenishment failure;
- old one-draft-per-day API is absent;
- docs state no migration and no automatic approval.

- [ ] **Step 5: Report the result**

Provide commit hashes, validation commands and counts, the fact that local `main` is not pushed unless
the user separately requests it, and any remaining unrelated worktree changes.

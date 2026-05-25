# Practice Workspace Entitlement and Pricing Closure

Date: 2026-05-02
Owner: Product
Status: accepted and implemented in app/server entitlement paths

## Product Thesis

DueDateHQ sells a practice workspace, not an unlimited collection of included practice workspaces. A `firm`
is the internal billable workspace boundary: it owns clients, obligations, evidence, audit logs,
members, timezone, billing state, and practice data isolation. Customer-facing pricing calls this a
practice workspace, while the implementation continues to count active firms internally.

This follows the common SaaS workspace model used by products such as Notion, Slack,
and Linear: the workspace is the collaboration and billing container; members are seats
inside that container; advanced multi-workspace needs belong to the Enterprise tier.

## Pricing Shape

| Plan       | Monthly price         | Annual offer                        | Customer-facing practice limit        | Included seats        | AI capability                   | Primary buyer                                  | Product promise                                                                               |
| ---------- | --------------------- | ----------------------------------- | ------------------------------------- | --------------------- | ------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Solo       | $39/mo                | $31/mo billed yearly ($372/year)    | 1 active practice                     | 1 owner seat          | Basic AI                        | Solo CPA or single-owner practice              | Run one live practice workspace with source-backed deadline evidence.                         |
| Pro        | $79/mo                | $63/mo billed yearly ($756/year)    | 1 active practice                     | 3 seats               | Practice AI                     | Small CPA practice                             | Run one production practice with shared deadline operations.                                  |
| Team       | $149/mo               | $119/mo billed yearly ($1,428/year) | 1 active practice                     | 10 seats              | Same Practice AI as Pro         | Larger single-practice operations team         | Coordinate a larger team inside one production practice workspace.                            |
| Enterprise | from $399/mo / custom | from $319/mo equivalent annually    | Multiple active practices by contract | 10+ seats by contract | Custom AI and coverage contract | Multi-office or operationally complex practice | Manage multiple practices/offices, API/SSO, audit exports, coverage planning, and onboarding. |

Annual self-serve offers use an approximately 20% discount versus paying monthly for 12 months:
Solo saves $96/year, Pro saves $192/year, and Team saves $360/year. Enterprise remains
sales-assisted; annual pricing is quoted by contract rather than exposed as self-serve checkout.

`active firm` means `firm_profile.status = 'active'` and `deleted_at IS NULL`. Deleted practices that can still be restored
do not count toward the entitlement. Suspended firms are inaccessible and should not be marketed as
usable entitlement.

## Non-Goals

- Do not make client count the first pricing limiter in this closure. Clients are managed objects
  inside a practice workspace; practice count is the customer-facing workspace limiter.
- Do not sell "unlimited Solo practices." That lets a free user simulate many independent workspaces
  and breaks the meaning of Solo.
- Do not turn Pro into a multi-practice plan by default. A second production practice usually represents
  another office, brand, legal entity, or demo/production split; that is Enterprise-plan territory.
- Do not expose internal nouns like Better Auth organization or `organizationLimit` in customer copy.

## Entitlement Rules

1. Solo users may create or keep one active practice and one owner seat.
2. Pro subscriptions apply to one active practice and unlock 3 seats plus paid operations surfaces
   for that practice.
3. Team subscriptions apply to one active practice and unlock 10 seats plus larger-team operations
   affordances for that practice.
4. Enterprise subscriptions are sales-assisted and may include multiple active practices. The
   allowed count is part of the contract, not a public self-serve slider in v1.
5. Owners can always view existing practices they belong to, but creating a new practice past entitlement
   opens an upgrade/contact-sales gate instead of creating a included Solo practice workspace.
6. Members cannot create practices on behalf of a paid practice unless they are creating a separate
   practice they will own. That separate practice still counts against their own entitlement state.
7. Invitations and member management remain seat-limited per active practice.
8. Pro and Team expose the same Practice AI functionality. Team can have higher aggregate production
   fair-use protection because it includes more seats, but it must not be marketed as a stronger AI
   model. Development/staging environments are uncapped for testing and are not plan promises.
9. Enterprise may use custom AI controls, custom coverage, and audit-grade AI terms by contract.

## Product Surfaces

### Public Pricing

Pricing cards must show both seats and practice/workspace limits:

- Solo: `$39/mo` or `$31/mo billed yearly · Save $96/year · 1 practice workspace · 1 owner seat`
- Pro: `$79/mo` or `$63/mo billed yearly · Save $192/year · 1 production practice · 3 seats included`
- Team: `$149/mo` or `$119/mo billed yearly · Save $360/year · 1 production practice · 10 seats included`
- Enterprise: `from $399/mo` or `from $319/mo equivalent annually · multiple practices/offices · 10+ seats`

Pricing cards must also show the AI capability:

- Solo: `Basic AI`
- Pro: `Practice AI included`
- Team: `Same Practice AI as Pro · built for 10-seat operations`
- Enterprise: `Custom AI and coverage by contract`

Runtime gates must match that copy:

- Solo can use basic Migration Mapper / Normalizer AI for the activation import flow, plus
  deterministic previews and cached/fallback summaries. Solo migration gets an onboarding credit:
  30 migration AI requests per firm per day for the first 7 days before the first successful import,
  then 15 migration AI requests per firm per day. Other manual practice AI refresh/generation actions
  open a Pro upgrade path instead of starting AI work.
- Pro unlocks Dashboard brief refresh, client risk summary refresh, deadline tip refresh,
  readiness checklist generation, production Pulse actions including needs-review confirmation and
  review requests, and guided import AI for live client data.
- Team keeps the same Practice AI functionality as Pro, and adds Team-only operations such as
  guided integration migration review, audit export, and larger team workload protection. Team
  value is operational control and review closure, not a stronger AI model.

FAQ must include "Can I create multiple practices?" with the answer:

> Solo, Pro, and Team include one active practice workspace. Additional practices, offices, or
> demo/production separation are available on the Enterprise plan.

### App Billing

The Billing page must show current entitlement usage:

- Plan: Solo / Pro / Team / Enterprise
- Seats: `used / limit`
- Practices: `active / included` for Solo, Pro, and Team; `active / contract` for Enterprise
- Subscription status remains payment-provider backed, but quota display is app-owned.

Plan cards in the app must mirror public pricing. They should not only list seats.
The Billing page defaults to monthly, offers a Monthly/Yearly toggle, and allows an owner to switch
the same self-serve plan between monthly and yearly intervals when the current subscription interval
does not already match the selected option.

### Practice Switcher

The practice switcher remains the place where users see and switch active practices. `Add practice` stays
visible because the action is discoverable, but it has two outcomes:

- Within entitlement: open the create-practice dialog.
- Past entitlement: open a plan gate explaining the practice limit and linking to Billing or Contact
  sales.

Suggested gate copy:

> Your current plan includes one active practice. Additional practices are available on the
> Enterprise plan.

## Implementation State

The current implementation has per-firm plan, seat, billing, audit, practice data isolation, and active
firm count enforcement. In product language, that enforcement is the active practice workspace
limit. `organizationLimit` remains open for the multi-firm identity foundation, but `firms.create`
and Better Auth `allowUserToCreateOrganization` enforce owned active firm entitlement before a new
practice workspace can be created.

The visible app copy uses Practice for customer-facing workspace identity and Enterprise as the
sales-assisted plan name while keeping `firm` as the internal persistence/RPC noun and stored plan
enum value. `team` is now a real stored self-serve plan value; `firm` continues to mean
Enterprise and is not renamed in persisted data.

## Options Considered

| Option                                  | Decision        | Reason                                                                                                                      |
| --------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Unlimited Solo practices                | Rejected        | It weakens the free plan boundary and lets users bypass paid workspace value.                                               |
| Pro includes multiple practices         | Rejected for v1 | It makes the Enterprise plan harder to justify and blurs the line between one growing practice and multi-office operations. |
| Enterprise plan owns multiple practices | Accepted        | It matches SaaS workspace pricing patterns and keeps Solo/Pro easy to understand.                                           |

## Success Criteria

- A customer can understand from pricing alone how many practices and seats each plan includes.
- A Solo or Pro owner cannot accidentally create unpaid extra active practices.
- Billing and practice switcher explain the same entitlement in customer language.
- Technical docs distinguish current implementation from target product closure until enforcement lands.

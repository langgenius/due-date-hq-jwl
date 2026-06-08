# Critique fixes — stop showing fabricated data as real

Date: 2026-06-08

From the `/critique` audit. On a compliance tool, invented figures shown as real
client data are a trust/correctness bug. All fabricated values removed; honest
empty states where no real data backs them (TODO(data) comments mark each for
restoration once the contract field ships).

- **Clients KPI strip** (`ClientFactsWorkspace.tsx`): removed fake "$284K YTD
  revenue / +18% YoY" and "onboarding 2 docs pending" tiles; kept the real
  Total / Active obligations / At-risk metrics.
- **Client detail rail** (`ClientDetailWorkspace.tsx`): removed fabricated
  Snapshot rows (Filed YTD, Outstanding tasks, Last filed) and the entire fake
  Engagement card (retainer/letter/renews); kept the real open-count.
- **Contacts:** the fake-contacts fallback (invented people + emails) → a real
  "No contacts yet" empty state. Removed the per-contact Compose entry points
  (the email composer has no send backend — no dialog that can never send).
- **Deadline drawer** (`ObligationQueueDetailDrawer.tsx`): removed the hardcoded
  "4 attached" + fake source PDFs → "No files attached yet" empty state. Also
  fixed the client kicker to navigate via the canonical `clientDetailPath`
  (was raw id → extra redirect).
- **Feedback + mono:** "Copy obligation ID" now toasts (`ClientWorkPlanPanel.tsx`);
  dropped `font-mono` from KPI labels and the contact email.

Verify: tsgo clean; `/clients` shows only real metrics.

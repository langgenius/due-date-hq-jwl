/**
 * penalty-facts.ts — the ONE source of truth for the /penalty-calculator tool.
 *
 * DATA INTEGRITY — hard red line (same contract as disaster-notices.ts): every
 * number below is transcribed from the official irs.gov page cited next to it,
 * verified 2026-07-31. Re-verify against the cited URL before editing. The
 * dollar amounts are the inflation-adjusted figures for returns REQUIRED TO BE
 * FILED after 12/31/2025 (the 2026 filing season); they change annually.
 */

export const PENALTY_FACTS = {
  /** Verification date shown on the page. */
  verifiedOn: '2026-07-31',

  // Failure-to-file (IRC §6651(a)(1)) — irs.gov/payments/failure-to-file-penalty
  ftfMonthlyRate: 0.05, // 5% of unpaid tax per month or part-month
  ftfCap: 0.25, // total FTF caps at 25% of unpaid tax
  /** When FTF and FTP apply in the same month, FTF is reduced by that month's
   *  FTP (5% − 0.5% = 4.5%); FTF maxes out after 5 such months. */
  ftfConcurrentMonthlyRate: 0.045,
  ftfConcurrentMaxMonths: 5,
  /** Minimum FTF penalty when the return is more than 60 days late: the LESSER
   *  of this amount or 100% of the tax required to be shown — for returns due
   *  after 12/31/2025. */
  ftfMinimumOver60DaysLate: 525,

  // Failure-to-pay (IRC §6651(a)(2)) — irs.gov/payments/failure-to-pay-penalty
  ftpMonthlyRate: 0.005, // 0.5% of unpaid tax per month or part-month
  ftpCap: 0.25, // total FTP caps at 25% of unpaid tax
  ftpInstallmentRate: 0.0025, // 0.25%/mo during an approved installment agreement (timely-filed return)
  ftpAfterLevyNoticeRate: 0.01, // 1%/mo starting 10 days after an intent-to-levy notice

  // Pass-through late filing (Forms 1065 / 1120-S) — irs.gov/payments/failure-to-file-penalty
  passThroughPerPersonPerMonth: 255, // per partner or shareholder, per month or part-month
  passThroughMaxMonths: 12,

  sources: [
    {
      label: 'IRS — Failure to file penalty',
      href: 'https://www.irs.gov/payments/failure-to-file-penalty',
    },
    {
      label: 'IRS — Failure to pay penalty',
      href: 'https://www.irs.gov/payments/failure-to-pay-penalty',
    },
    {
      label: 'IRS — Penalty relief (reasonable cause & First Time Abate)',
      href: 'https://www.irs.gov/payments/penalty-relief',
    },
    {
      label: 'IRS — Interest on underpayments (accrues separately, quarterly rates)',
      href: 'https://www.irs.gov/payments/interest',
    },
  ],
} as const

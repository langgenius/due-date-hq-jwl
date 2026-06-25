import type { Locale } from '@duedatehq/i18n/locales'
import type { FaqItemCopy } from '../i18n/types'

// FAQ for /how-it-works, shared by the visible accordion (the page) and the
// FAQPage JSON-LD (howItWorksStructuredData) so the markup always matches what
// renders. Every answer is grounded in the page's own walkthrough — no new claims.
export const howItWorksFaq: Record<Locale, FaqItemCopy[]> = {
  en: [
    {
      question: 'Does DueDateHQ change my client deadlines automatically?',
      answer:
        '<b>No. Nothing moves until you confirm.</b> Each change is queued, you review it against the official source, and only then do you apply it — and every apply, undo, and revert is recorded.',
    },
    {
      question: 'Which sources does it watch?',
      answer:
        'Official IRS, state tax-agency, and FEMA disaster sources across the federal government plus <b>all 50 states and DC</b> — around the clock.',
    },
    {
      question: 'How does it know which clients a change affects?',
      answer:
        'It matches each source-backed change against your client filing profiles, so you see <b>exactly who is hit</b> before the deadline — not a generic alert.',
    },
    {
      question: 'Does it replace my existing software?',
      answer:
        'No. It’s a monitoring layer on top of Drake, UltraTax, TaxDome, or Karbon — it watches the deadlines and rule changes those tools don’t.',
    },
  ],
  'zh-CN': [
    {
      question: 'DueDateHQ 会自动更改我的客户截止日吗？',
      answer:
        '<b>不会，确认之前什么都不会变。</b>每条变化都会进入队列，你对照官方来源复核，然后才应用——而且 apply、undo、revert 都会被记录。',
    },
    {
      question: '它监控哪些来源？',
      answer:
        '官方 IRS、各州税务机关与 FEMA 灾害来源，覆盖联邦加<b>全部 50 个州与 DC</b>——全天候。',
    },
    {
      question: '它怎么知道一条变化影响到哪些客户？',
      answer:
        '它把每条带来源的变化与你的客户申报档案匹配，让你在截止日之前就<b>精确看到谁受影响</b>——而不是一条笼统的提醒。',
    },
    {
      question: '它会替换我现有的软件吗？',
      answer:
        '不会。它是叠加在 Drake、UltraTax、TaxDome 或 Karbon 之上的监控层——盯的是这些工具不盯的截止日与规则变化。',
    },
  ],
}

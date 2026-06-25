import type { Locale } from '@duedatehq/i18n/locales'
import type { FaqItemCopy } from '../i18n/types'

// The landing FAQ copy, lifted out of components/home/Faq.astro so it has ONE
// source of truth shared by the visible accordion AND the home FAQPage JSON-LD
// (lib/structured-data.ts homeStructuredData). The visible text and the schema
// must match — keeping them in one place is what guarantees that. Answers may
// contain <b> (rendered via set:html in the accordion; allowed HTML in FAQPage
// answers), so keep the markup identical in both consumers.
export const homeFaq: Record<Locale, FaqItemCopy[]> = {
  en: [
    {
      question: 'How is this different from File In Time?',
      answer:
        'File In Time records the deadlines you enter. DueDateHQ <b>watches them for changes</b> — and the moment the IRS or a state moves one, shows you which clients it affects, with the official source attached. Monitoring, not a deadline table.',
    },
    {
      question: 'Do I have to leave TaxDome / Karbon / Canopy?',
      answer:
        "No. It's deliberately narrow — the weekly deadline-triage layer, <b>email-first with no portal to configure</b>, so it sits alongside whatever you already run.",
    },
    {
      question: 'How do I know the dates are right?',
      answer:
        "<b>It never invents a date.</b> Anything that can't be grounded in the official text is held back rather than guessed — so a date only appears once it's been read from, and linked to, the source.",
    },
  ],
  'zh-CN': [
    {
      question: 'DueDateHQ 和 File In Time 有什么不同？',
      answer:
        'File In Time 只记录你录入的截止日。DueDateHQ 会<b>替你盯着变化</b>——一旦 IRS 或某个州调整了截止日，它会立刻告诉你受影响的是哪些客户，并附上官方来源。这是监控，而不是一张截止日表格。',
    },
    {
      question: '我需要离开 TaxDome / Karbon / Canopy 吗？',
      answer:
        '不需要。它的定位刻意做得很窄——只做每周的截止日分诊这一层，<b>以邮件为主，不用配置门户</b>，因此可以与你现有的工具并行使用。',
    },
    {
      question: '我怎么知道这些日期是对的？',
      answer:
        '<b>它绝不编造日期。</b>任何无法落实到官方原文的内容都会宁可不显示也不猜——只有当一个日期是从来源读取并链接到来源后，它才会出现。',
    },
  ],
}

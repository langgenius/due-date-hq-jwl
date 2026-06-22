// Marketing landing copy contract. Each locale dictionary must satisfy `LandingCopy`
// so pages and section components stay locale-agnostic.

export interface MetaCopy {
  title: string
  description: string
  /** Public path under /og/, e.g. "/og/home.en.png". 1200x630 PNG. */
  ogImage: string
}

export interface NavCopy {
  brand: string
  audience: string
  links: { label: string; href: string }[]
  statusPill: string
  cta: string
}

export interface HeroTrustItem {
  label: string
}

export type MarketingBadgeTone =
  | 'destructive'
  | 'warning'
  | 'info'
  | 'success'
  | 'secondary'
  | 'outline'

export type MarketingStatusDotTone = 'success' | 'warning' | 'error' | 'normal' | 'disabled'

export interface HeroSurfaceRow {
  priorityScore: string
  priorityRank?: string
  priorityTone: MarketingBadgeTone
  client: string
  ein: string
  form: string
  due: string
  daysLeft: string
  status: string
  statusTone: MarketingBadgeTone
  statusDotTone: MarketingStatusDotTone
  severityLabel: string
  exposure: string
  exposureTone: MarketingBadgeTone
  evidence: string
  evidenceTone: MarketingBadgeTone
  severity: 'critical' | 'high' | 'medium'
}

export interface HeroSurfaceCopy {
  breadcrumb: { workbench: string; dashboard: string; week: string }
  kbdCommand: string
  brief: {
    status: string
    title: string
    text: string
    citation: string
  }
  alert: {
    tag: string
    text: string
    source: string
    cta: string
  }
  metric: {
    eyebrow: string
    range: string
    value: string
    delta: string
    stats: { label: string; value: string }[]
  }
  triageTabs: { label: string; count: string }[]
  table: {
    headers: {
      client: string
      priority: string
      form: string
      due: string
      days: string
      status: string
      severity: string
      exposure: string
      evidence: string
    }
    rows: HeroSurfaceRow[]
  }
  hints: { keys: string; label: string }[]
  liveLabel: string
}

export interface HeroCopy {
  eyebrow: string
  title: string
  description: string
  /** Add-on positioning line rendered under the hero description. */
  positioning: string
  primaryCta: string
  secondaryCta: string
  demoCta: string
  trust: HeroTrustItem[]
  surface: HeroSurfaceCopy
}

export interface SlaItem {
  ruleNumber: string
  ruleLabel: string
  value: string
  unit: string
  description: string
}

export interface SlaStripCopy {
  items: SlaItem[]
}

export interface ProblemRow {
  pill: string
  text: string
  date: string
  pillTone?: MarketingBadgeTone
  dotTone?: MarketingStatusDotTone
  /** Optional row tint matching the app's Dashboard / Deadlines severity rows. */
  severity?: 'critical' | 'high' | 'medium'
}

export interface ProblemCard {
  tag: string
  /** Drives the tag pill color tint. critical=red, high=orange, medium=gray. */
  severity: 'critical' | 'high' | 'medium'
  cadence: string
  headline: string
  body: string
  listTitle: string
  listSummary: string
  rows: ProblemRow[]
}

export interface ProblemCopy {
  eyebrow: string
  index: string
  title: string
  paragraph: string
  footnote: string
  cards: ProblemCard[]
}

export interface WorkflowKbd {
  keys: string
  label: string
}

export interface WorkflowDashboardRow {
  priorityScore: string
  priorityRank?: string
  priorityTone: MarketingBadgeTone
  client: string
  form: string
  due: string
  daysLeft: string
  status: string
  statusTone: MarketingBadgeTone
  statusDotTone: MarketingStatusDotTone
  severityLabel: string
  exposure: string
  exposureTone: MarketingBadgeTone
  evidence: string
  evidenceTone: MarketingBadgeTone
  /** Drives row tint and severity badge tone. */
  severity: 'critical' | 'high' | 'medium'
}

export interface WorkflowDashboardCopy {
  kind: 'dashboard'
  header: { title: string; timestamp: string }
  ranges: string[]
  summary: { label: string; value: string }[]
  tableHeaders: {
    priority: string
    client: string
    form: string
    due: string
    status: string
    severity: string
    exposure: string
    evidence: string
  }
  alert: { tag: string; text: string; cta: string }
  rows: WorkflowDashboardRow[]
}

export interface WorkflowMappingRow {
  source: string
  sample: string
  target: string
  confidenceLabel: string
  confidence: 'HIGH' | 'MED' | 'LOW'
}

export interface WorkflowMappingCopy {
  kind: 'mapping'
  step: string
  steps: { label: string }[]
  headers: { source: string; target: string; sample: string; confidence: string }
  rows: WorkflowMappingRow[]
  footer: { summary: string; cta: string }
}

export interface WorkflowEvidenceField {
  label: string
  value: string
}

export interface WorkflowEvidenceCopy {
  kind: 'evidence'
  drawerTitle: string
  confidence: string
  closeHint: string
  fields: WorkflowEvidenceField[]
  source: { label: string; value: string; verified: string; quoteLabel: string; quote: string }
  meta: { source: string; verifiedBy: string; reviewed: string; status: string }
}

export type WorkflowSurface = WorkflowDashboardCopy | WorkflowMappingCopy | WorkflowEvidenceCopy

export interface WorkflowStepCopy {
  index: string
  tag: string
  headline: string
  body: string
  hints: WorkflowKbd[]
  surface: WorkflowSurface
}

export interface WorkflowCopy {
  eyebrow: string
  index: string
  title: string
  paragraph: string
  steps: WorkflowStepCopy[]
}

export interface ProofStat {
  label: string
  value: string
  unit: string
  body: string
}

export interface ProofCopy {
  eyebrow: string
  index: string
  title: string
  paragraph: string
  footnote: string
  stats: ProofStat[]
}

export interface SecurityItem {
  pill: string
  body: string
}

export interface SecurityCopy {
  title: string
  items: SecurityItem[]
}

export interface FinalCtaCopy {
  pill: string
  pillCaption: string
  title: string
  body: string
  primaryCta: string
  secondaryCta: string
  trust: string
}

export type PricingCheckoutPlan = 'solo' | 'pro' | 'team'
export type PricingBillingInterval = 'monthly' | 'yearly'

export interface PricingPlanCopy {
  name: string
  badge?: string
  price: string
  yearlyPrice?: string
  /** When 'text' the price is rendered with Inter (e.g. "Custom"); 'numeric' uses Geist Mono. */
  priceKind?: 'numeric' | 'text'
  cadence: string
  yearlyCadence?: string
  yearlySavings?: string
  description: string
  /** Headline client allowance, e.g. "Up to 100 clients" / "Unlimited clients". */
  clients: string
  /** Practice-workspace allowance, e.g. "1 production practice". */
  firms: string
  /** Seat allowance, e.g. "3 seats included". */
  seats: string
  cta: string
  hrefKind: 'checkout' | 'app'
  checkoutPlan?: PricingCheckoutPlan
  features: string[]
}

export interface PricingCopy {
  meta: MetaCopy
  navPricingHref: string
  hero: {
    eyebrow: string
    title: string
    description: string
    note: string
  }
  plansHeader: {
    eyebrow: string
    title: string
    note: string
  }
  billingToggle: {
    ariaLabel: string
    monthly: string
    yearly: string
    yearlyBadge: string
  }
  plans: PricingPlanCopy[]
  faqHeader: {
    eyebrow: string
    title: string
  }
  faq: { question: string; answer: string }[]
}

export interface FaqItemCopy {
  question: string
  answer: string
}

export interface GeoCardCopy {
  title: string
  body: string
}

export interface GeoSectionCopy {
  eyebrow: string
  title: string
  body: string
  items: GeoCardCopy[]
}

export interface ResourcePageCopy {
  meta: MetaCopy
  hero: {
    eyebrow: string
    title: string
    description: string
    note: string
  }
  sections: GeoSectionCopy[]
  faqHeader: {
    eyebrow: string
    title: string
  }
  faq: FaqItemCopy[]
  cta: {
    title: string
    body: string
    primary: string
    secondary: string
  }
  /** Optional dated, sourced fact table — used by rule reference pages for GEO. */
  keyDates?: KeyDatesBlock
}

export interface StateCoverageCopy {
  meta: MetaCopy
  hero: {
    eyebrow: string
    title: string
    description: string
    note: string
  }
  statesHeader: {
    eyebrow: string
    title: string
  }
  states: {
    slug: string
    name: string
    abbreviation: string
    status: string
    body: string
    href: string
  }[]
  sourceModel: GeoSectionCopy
  faqHeader: {
    eyebrow: string
    title: string
  }
  faq: FaqItemCopy[]
}

/** A dated, sourced fact table (rule key-dates, state key-deadlines). */
export interface KeyDatesBlock {
  eyebrow: string
  title: string
  note: string
  sourceLabel: string
  sourceHref: string
  rows: { label: string; value: string }[]
}

export interface StatePageCopy {
  slug: string
  name: string
  abbreviation: string
  meta: MetaCopy
  hero: {
    eyebrow: string
    title: string
    description: string
    note: string
  }
  sourceTypes: GeoCardCopy[]
  coveredSignals: GeoCardCopy[]
  limitations: string[]
  faq: FaqItemCopy[]
  /** Optional verified, sourced filing deadline (GEO) — only for states we can confirm. */
  keyDeadlines?: KeyDatesBlock
}

export interface GuidePageCopy extends ResourcePageCopy {
  slug: string
}

export interface StructuredDataCopy {
  organizationName: string
  organizationDescription: string
  websiteName: string
  productName: string
  productDescription: string
  audience: string
}

export interface GeoCopy {
  structuredData: StructuredDataCopy
  rules: ResourcePageCopy
  stateCoverage: StateCoverageCopy
  states: StatePageCopy[]
  guides: GuidePageCopy[]
}

export interface NotFoundCopy {
  meta: MetaCopy
  eyebrow: string
  title: string
  body: string
  primaryCta: string
  secondaryCta: string
  statusLabel: string
  statusValue: string
  routesLabel: string
  routes: { label: string; href: string }[]
}

export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

export interface ThemeSwitcherCopy {
  /** Aria-label for the theme `radiogroup` cluster. */
  label: string
  /** Per-option labels (used as `aria-label` on each icon button). */
  system: string
  light: string
  dark: string
}

export interface LanguageSwitcherCopy {
  /** Aria-label for the language cluster. */
  label: string
  /** Short labels rendered inside the buttons (segmented control). */
  enShort: string
  zhShort: string
  /** Verbose labels used as `aria-label` for screen readers. */
  enLong: string
  zhLong: string
}

export interface FooterCopy {
  brand: string
  tagline: string
  audience: string
  columns: FooterColumn[]
  copyright: string
  theme: ThemeSwitcherCopy
  language: LanguageSwitcherCopy
  status: string
}

export interface LandingCopy {
  meta: MetaCopy
  nav: NavCopy
  hero: HeroCopy
  sla: SlaStripCopy
  problem: ProblemCopy
  workflow: WorkflowCopy
  proof: ProofCopy
  security: SecurityCopy
  finalCta: FinalCtaCopy
  pricing: PricingCopy
  geo: GeoCopy
  notFound: NotFoundCopy
  footer: FooterCopy
}

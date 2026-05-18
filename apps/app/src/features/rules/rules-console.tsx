import { useCallback, useMemo } from 'react'
import { useLingui } from '@lingui/react/macro'
import { useQueryState } from 'nuqs'

import { Tabs, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { cn } from '@duedatehq/ui/lib/utils'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'

import { CoverageTab } from './coverage-tab'
import { GenerationPreviewTab } from './generation-preview-tab'
import { RuleLibraryTab } from './rule-library-tab'
import { RulesPageHeader } from './rules-console-primitives'
import { SourcesTab } from './sources-tab'
import { TemporaryRulesTab } from './temporary-rules-tab'
import {
  isRulesTab,
  rulesConsoleSearchParamsParsers,
  RULES_TABS,
  type RulesTab,
} from './rules-console-model'

/**
 * Rules Console — practice rule governance workbench.
 *
 * Layout invariants (revised 2026-04-28, supersedes the centered 880 px column
 * shipped in the original Figma 214:2 / 219:2 / 224:2 / 225:2 frames):
 *  - SidebarInset is a 100% wide flex column. The tab nav is full width with
 *    24 px left padding so it visually anchors to the same vertical line as
 *    the sidebar's interior content.
 *  - Page content (header + panel) lives in a full-width column with the same
 *    24 px outer padding as the tab nav, so header + tables + tabs all share
 *    a single left anchor at `left = 24` from the SidebarInset edge.
 *    Rationale: Rules Console is a practice rule governance workbench (per
 *    `docs/product-design/rules/02-rules-console-product-design.md` §1) where
 *    every tab is a data table or matrix, not a settings form. The original
 *    "Settings page → max-w 880" rule from `DESIGN.md` §5.2 was tuned for
 *    forms (Profile / Members) and starves the tables here — see the Sources
 *    tab `Show all` horizontal-scroll bug in
 *    `docs/dev-log/2026-04-27-rules-console-shell.md` (§ Sources tab table
 *    widened on Show all).
 *  - The wrapping `<Tabs>` owns the route viewport height. The tab nav is a
 *    non-scrolling top rail; only the content column below it scrolls.
 *  - The wrapping `<Tabs>` defaults to `flex gap-2 data-[orientation=horizontal]:flex-col`
 *    via `@duedatehq/ui`. We override `gap-0` so the tab nav and scroll region
 *    sit flush against the route header rib at y = 56 + 1.
 *  - All user-facing copy is i18n-routed through Lingui (`useLingui` macros);
 *    the underlying `RULES_TABS` table only carries values + counts.
 *  - The active tab is persisted in `?tab=` through the module-level nuqs
 *    parser contract, so invalid URL values fall back to Coverage without
 *    widening the component state type.
 */

function RulesTabPanel({ activeTab }: { activeTab: RulesTab }) {
  if (activeTab === 'coverage') return <CoverageTab />
  if (activeTab === 'sources') return <SourcesTab />
  if (activeTab === 'library') return <RuleLibraryTab />
  if (activeTab === 'pulse') return <PulseChangesTab embedded />
  if (activeTab === 'temporary') return <TemporaryRulesTab />
  return <GenerationPreviewTab />
}

export function RulesConsole() {
  const { t } = useLingui()
  const [activeTab, setActiveTab] = useQueryState('tab', rulesConsoleSearchParamsParsers.tab)
  const handleTabChange = useCallback(
    (value: string) => {
      if (isRulesTab(value)) void setActiveTab(value)
    },
    [setActiveTab],
  )

  const tabLabels = useMemo<Record<RulesTab, string>>(
    () => ({
      coverage: t`Coverage`,
      sources: t`Sources`,
      library: t`Rules`,
      pulse: t`Pulse Changes`,
      temporary: t`Temporary Rules`,
      preview: t`Obligation Preview`,
    }),
    [t],
  )

  const tabDescriptions = useMemo<Record<RulesTab, string>>(
    () => ({
      coverage: t`Sources are official federal, state, and DC materials. Only practice-accepted rules can generate reminder-ready obligations; pending rules remain review-only until an owner or manager accepts them.`,
      sources: t`Official sources watched for rule changes — health, cadence, and acquisition method per source. Click any row to open the official page in a new tab. Source changes create practice review tasks; they never silently update active rules.`,
      library: t`Review pending rules, activate them, and inspect active, rejected, or archived rule evidence in one table. Only active rules can generate client obligations or reminders.`,
      pulse: t`Source-backed government changes that may affect client deadlines. Owners and managers review affected clients, apply temporary exceptions, dismiss noise, or revisit closed changes here.`,
      temporary: t`Applied Pulse exceptions that are currently changing obligation due dates. Review scope, source evidence, active obligation count, and open the Pulse detail when a temporary rule needs revert or follow-up.`,
      preview: t`Input client facts → dry-run rules engine → see which obligations would be created. Reminder-ready obligations fire 30 / 7 / 1-day reminders; requires-review items surface for CPA confirmation, never auto-reminded.`,
    }),
    [t],
  )

  const description = tabDescriptions[activeTab]

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full min-h-0 flex-col gap-0 overflow-hidden"
    >
      {/*
        Tab nav rib + underline accent.

        - cva default `bg-components-segmented-text-active` resolves to the
          dark navy `#101828`. Figma 214:75 / 219:249 explicitly use
          `accent/solid = #296dff`, so we override `after:bg-state-accent-solid`
          (which maps to `--color-util-colors-primary-500 = #296dff`).
        - Underline insets are 8 px each side per Figma (`left:8`, `right:8`
          inside an 89.6 px / 105.6 px tab). The cva default is `inset-x-0`
          (full bleed), hence the explicit `after:left-2 after:right-2`
          overrides.
      */}
      <div className="h-10 shrink-0 overflow-x-auto px-6">
        <TabsList variant="line" className="h-10 gap-0 p-0">
          {RULES_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'h-10 flex-none rounded-none px-4 py-0 text-[13px] text-text-muted first:pl-0',
                'data-active:font-semibold data-active:text-text-primary',
                'after:left-2 after:right-2 after:bg-state-accent-solid group-data-[orientation=horizontal]/tabs:after:bottom-0',
              )}
            >
              <span>{tabLabels[tab.value]}</span>
              {tab.count ? (
                <span className="font-mono text-xs tabular-nums text-text-tertiary data-active:text-text-secondary">
                  {tab.count}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          <RulesPageHeader description={description} />
          <RulesTabPanel activeTab={activeTab} />
        </div>
      </div>
    </Tabs>
  )
}

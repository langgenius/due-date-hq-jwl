import {
  DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  type FirmCreateInput,
  type FirmPublic,
  type RuleGenerationState,
  type RuleOnboardingActivationInput,
  type RuleOnboardingActivationOutput,
} from '@duedatehq/contracts'

const DEFAULT_FIRM_TIMEZONE = 'America/New_York'
export const ONBOARDING_MIGRATION_TARGET = '/migration/new?source=onboarding'

export interface OnboardingFirmGateway {
  listMine: () => Promise<FirmPublic[]>
  switchActive: (input: { firmId: string }) => Promise<FirmPublic>
  create: (input: FirmCreateInput) => Promise<FirmPublic>
  activateOnboardingJurisdictions: (
    input: RuleOnboardingActivationInput,
  ) => Promise<RuleOnboardingActivationOutput>
}

export type OnboardingFirmActivationResult =
  | { kind: 'reused'; firm: FirmPublic }
  | {
      kind: 'created'
      firm: FirmPublic
      ruleActivation: RuleOnboardingActivationOutput | null
    }

export async function activateOrCreateOnboardingFirm(input: {
  gateway: OnboardingFirmGateway
  name: string
  internalDeadlineOffsetDays?: number
  selectedRuleStates?: RuleGenerationState[]
}): Promise<OnboardingFirmActivationResult> {
  const firms = await input.gateway.listMine()
  const existing = firms[0]

  if (existing) {
    const firm = await input.gateway.switchActive({ firmId: existing.id })
    return { kind: 'reused', firm }
  }

  const firm = await input.gateway.create({
    name: input.name,
    timezone: DEFAULT_FIRM_TIMEZONE,
    internalDeadlineOffsetDays:
      input.internalDeadlineOffsetDays ?? DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  })
  const selectedRuleStates = input.selectedRuleStates ?? []
  const ruleActivation =
    selectedRuleStates.length > 0
      ? await input.gateway.activateOnboardingJurisdictions({ states: selectedRuleStates })
      : null
  return { kind: 'created', firm, ruleActivation }
}

export function postOnboardingTarget(
  result: OnboardingFirmActivationResult,
  redirectTo: string,
): string {
  if (result.kind === 'created') return ONBOARDING_MIGRATION_TARGET
  return redirectTo
}

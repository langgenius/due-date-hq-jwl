export type SmartPriorityFactorKey = 'urgency' | 'importance' | 'history' | 'readiness'

export interface SmartPriorityProfile {
  version: 'smart-priority-profile-v2'
  weights: Record<SmartPriorityFactorKey, number>
  urgencyWindowDays: number
  historyCapCount: number
}

export interface SmartPriorityFactor {
  key: SmartPriorityFactorKey
  label: string
  weight: number
  rawValue: string
  normalized: number
  contribution: number
  sourceLabel: string
}

export interface SmartPriorityBreakdown {
  version: 'smart-priority-v1'
  score: number
  rank: number | null
  factors: SmartPriorityFactor[]
}

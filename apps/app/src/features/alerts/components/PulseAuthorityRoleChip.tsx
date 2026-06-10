import { Trans } from '@lingui/react/macro'
import { GavelIcon, MegaphoneIcon, ScrollTextIcon } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

// Deferred [方向] item: "authorityRole 维度(正式发文 vs 官方评论 vs 判例)→
// Hawaii 可 Apply / COVID July-10 需复核"
//
// Sources have different authority levels. Treating them all the
// same trains a CPA's eye to apply blog-post commentary as if it
// were a statute. The 3 canonical classes:
//
//   • formal      — official publication (DOR bulletin, IRS Pub,
//                   notice with citation). High trust → CPA can
//                   Apply directly after review.
//   • commentary  — newsroom article, press release, FAQ. Trust
//                   the SUBSTANCE but require cross-verification
//                   before Apply. UI surfaces a "needs review"
//                   nudge on the Apply action.
//   • precedent   — court ruling, IRS Letter Ruling, advisory.
//                   High trust for the specific fact-pattern but
//                   limited generalization. Apply requires
//                   case-by-case review.
//
// Classification today is heuristic from the source string — the
// chip primitive renders the result; the classification function
// `inferAuthorityRole()` lives here so callers can also use the
// raw classification (e.g. to gate Apply UI).
//
// When PulseAlertPublic gains an `authorityRole` field on the
// contract, this primitive reads it directly with no signature
// change.

export type AuthorityRole = 'formal' | 'commentary' | 'precedent'

// Heuristic dictionary mapping common source-name substrings to a
// canonical authority class. Used until the back-end supplies an
// explicit `authorityRole` field on PulseAlertPublic.
const AUTHORITY_HEURISTICS: ReadonlyArray<{
  match: RegExp
  role: AuthorityRole
}> = [
  { match: /\bbulletin\b/i, role: 'formal' },
  { match: /\bpublication\b|\bpub\.?\s?\d+\b/i, role: 'formal' },
  { match: /\bnotice\b/i, role: 'formal' },
  { match: /\bregulation\b|\brevenue procedure\b/i, role: 'formal' },
  { match: /\bnewsroom\b|\bnews(letter)?\b|\bpress\b/i, role: 'commentary' },
  { match: /\bblog\b|\barticle\b|\bcommentary\b|\badvisory\b/i, role: 'commentary' },
  {
    match: /\blletter\s?ruling\b|\bpetition\b|\bopinion\b|\bcourt\b|\bruling\b/i,
    role: 'precedent',
  },
]

function inferAuthorityRole(source: string): AuthorityRole {
  for (const { match, role } of AUTHORITY_HEURISTICS) {
    if (match.test(source)) return role
  }
  // Default to 'formal' — when the heuristic can't classify, lean
  // toward the highest-trust class so a CPA isn't surprised by an
  // unrecognized but legitimate official source falsely flagged
  // as commentary.
  return 'formal'
}

// Role meta renders as plain inline text with a leading icon, no Badge
// frame. Tone is the same secondary-text family as the rest of the meta
// cluster; the icon does the per-class differentiation work.
const ROLE_META: Record<
  AuthorityRole,
  {
    label: React.ReactNode
    explainer: React.ReactNode
    icon: typeof ScrollTextIcon
  }
> = {
  formal: {
    label: <Trans>Formal</Trans>,
    explainer: <Trans>Official source — review and apply directly.</Trans>,
    icon: ScrollTextIcon,
  },
  commentary: {
    label: <Trans>Commentary</Trans>,
    explainer: <Trans>Newsroom or article — cross-verify before applying.</Trans>,
    icon: MegaphoneIcon,
  },
  precedent: {
    label: <Trans>Precedent</Trans>,
    explainer: <Trans>Ruling or opinion — apply case-by-case.</Trans>,
    icon: GavelIcon,
  },
}

function PulseAuthorityRoleChip({
  source,
  role,
}: {
  // Caller passes EITHER an explicit role (when contract has it) OR
  // the source string for heuristic classification.
  source?: string
  role?: AuthorityRole
}) {
  const resolved = role ?? (source ? inferAuthorityRole(source) : 'formal')
  const meta = ROLE_META[resolved]
  const Icon = meta.icon
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <span
            className="inline-flex cursor-help items-center gap-1 text-xs font-medium text-text-secondary"
            {...props}
          >
            <Icon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
            {meta.label}
          </span>
        )}
      />
      <TooltipContent>{meta.explainer}</TooltipContent>
    </Tooltip>
  )
}

export { PulseAuthorityRoleChip, inferAuthorityRole }

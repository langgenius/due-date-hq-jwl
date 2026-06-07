import type { Locale } from '@duedatehq/i18n'

// Minimal per-locale message catalogue for server-rendered content (currently
// just transactional emails). Keep values free of HTML so callers can escape
// inserted variables before concatenation.
type MessageKey =
  | 'invitation.subject'
  | 'invitation.body'
  | 'invitation.cta'
  | 'signInOtp.subject'
  | 'signInOtp.body'
  | 'signInOtp.cta'

type MessageTable = Record<MessageKey, string>

const CATALOGS: Record<Locale, MessageTable> = {
  en: {
    'invitation.subject': 'Join {organizationName} on DueDateHQ',
    'invitation.body': '{inviterName} invited you to join {organizationName} as {role}.',
    'invitation.cta': 'Accept invitation',
    'signInOtp.subject': 'Your DueDateHQ sign-in code',
    'signInOtp.body': 'Enter this code to sign in. It expires in {expiresInMinutes} minutes.',
    'signInOtp.cta': 'Sign in to DueDateHQ',
  },
  'zh-CN': {
    'invitation.subject': '加入 {organizationName} 的 DueDateHQ 工作区',
    'invitation.body': '{inviterName} 邀请您以 {role} 身份加入 {organizationName}。',
    'invitation.cta': '接受邀请',
    'signInOtp.subject': '您的 DueDateHQ 登录验证码',
    'signInOtp.body': '输入此验证码即可登录，验证码将在 {expiresInMinutes} 分钟后过期。',
    'signInOtp.cta': '登录 DueDateHQ',
  },
}

// Replace `{name}` placeholders with the matching variable.
// Unknown placeholders are left as-is so missing values are visible in output.
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = vars[key]
    return value === undefined ? match : value
  })
}

// The `MessageKey` type plus `Record<Locale, MessageTable>` guarantee every
// locale has every key at compile time — no runtime fallback needed.
export function translate(
  locale: Locale,
  key: MessageKey,
  vars: Record<string, string> = {},
): string {
  return interpolate(CATALOGS[locale][key], vars)
}

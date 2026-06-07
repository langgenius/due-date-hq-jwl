import { describe, expect, it } from 'vitest'

import { translate } from './messages'

describe('server i18n messages', () => {
  it('renders localized sign-in OTP email copy', () => {
    // The 6-digit code renders large/separately in the email; the body is just
    // the supporting instruction + expiry (no inlined code).
    expect(translate('en', 'signInOtp.subject')).toBe('Your DueDateHQ sign-in code')
    expect(translate('en', 'signInOtp.body', { expiresInMinutes: '5' })).toBe(
      'Enter this code to sign in. It expires in 5 minutes.',
    )
    expect(translate('en', 'signInOtp.cta')).toBe('Sign in to DueDateHQ')

    expect(translate('zh-CN', 'signInOtp.subject')).toBe('您的 DueDateHQ 登录验证码')
    expect(translate('zh-CN', 'signInOtp.body', { expiresInMinutes: '5' })).toBe(
      '输入此验证码即可登录，验证码将在 5 分钟后过期。',
    )
    expect(translate('zh-CN', 'signInOtp.cta')).toBe('登录 DueDateHQ')
  })
})

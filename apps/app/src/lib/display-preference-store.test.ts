import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DISPLAY_PREFERENCE_STORAGE_KEY,
  clearStoredDisplayPreferencesCache,
  formatDateTimeWithDisplayPreferences,
  getServerDisplayPreferences,
  getStoredDisplayPreferences,
  subscribeToDisplayPreferences,
  switchDateFormatPreference,
  switchTimeFormatPreference,
} from './display-preference-store'

describe('display preference store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearStoredDisplayPreferencesCache()
  })

  it('defaults to month-name dates and 12-hour time', () => {
    expect(getServerDisplayPreferences()).toEqual({
      dateFormat: 'mmm_d_yyyy',
      timeFormat: '12h',
    })
    expect(getStoredDisplayPreferences()).toEqual({
      dateFormat: 'mmm_d_yyyy',
      timeFormat: '12h',
    })
  })

  it('persists date and time format changes', () => {
    switchDateFormatPreference('yyyy_mm_dd')
    switchTimeFormatPreference('24h')

    expect(getStoredDisplayPreferences()).toEqual({
      dateFormat: 'yyyy_mm_dd',
      timeFormat: '24h',
    })
    expect(JSON.parse(window.localStorage.getItem(DISPLAY_PREFERENCE_STORAGE_KEY) ?? '{}')).toEqual(
      {
        dateFormat: 'yyyy_mm_dd',
        timeFormat: '24h',
      },
    )
  })

  it('filters unrelated storage events before refreshing subscribers', () => {
    const onStoreChange = vi.fn()
    const unsubscribe = subscribeToDisplayPreferences(onStoreChange)

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }))

    expect(onStoreChange).not.toHaveBeenCalled()

    window.localStorage.setItem(
      DISPLAY_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ dateFormat: 'mm_dd_yyyy', timeFormat: '24h' }),
    )
    window.dispatchEvent(new StorageEvent('storage', { key: DISPLAY_PREFERENCE_STORAGE_KEY }))

    expect(onStoreChange).toHaveBeenCalledOnce()
    expect(getStoredDisplayPreferences()).toEqual({
      dateFormat: 'mm_dd_yyyy',
      timeFormat: '24h',
    })

    unsubscribe()
  })

  it('formats datetimes with the selected date and time preferences', () => {
    expect(
      formatDateTimeWithDisplayPreferences('2026-04-29T09:14:32.883Z', 'UTC', {
        dateFormat: 'mmm_d_yyyy',
        timeFormat: '12h',
      }),
    ).toBe('Apr 29, 2026 09:14:32 AM UTC')

    expect(
      formatDateTimeWithDisplayPreferences('2026-04-29T09:14:32.883Z', 'UTC', {
        dateFormat: 'yyyy_mm_dd',
        timeFormat: '24h',
      }),
    ).toBe('2026-04-29 09:14:32 UTC')
  })
})

/// <reference types="vite/client" />

// Strongly-type the analytics env knobs so `import.meta.env.VITE_AMPLITUDE_API_KEY`
// reads as `string | undefined` instead of `any`. Merges with vite/client's
// ImportMetaEnv. Unset at build time → analytics is a silent no-op (see
// src/lib/analytics).
interface ImportMetaEnv {
  /** Amplitude Browser SDK API key. Unset → analytics disabled. */
  readonly VITE_AMPLITUDE_API_KEY?: string
  /** Optional build/app version stamped onto every event as `app_version`. */
  readonly VITE_APP_VERSION?: string
}

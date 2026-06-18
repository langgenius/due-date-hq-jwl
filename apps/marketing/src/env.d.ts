interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly PUBLIC_APP_URL?: string
  /** Amplitude Browser SDK key (project 827681). Prod-only; unset → no-op. */
  readonly PUBLIC_AMPLITUDE_API_KEY?: string
  /** Cloudflare Web Analytics beacon token. Unset → beacon not rendered. */
  readonly PUBLIC_CF_BEACON_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

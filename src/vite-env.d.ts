/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_BUILD__: number;

interface ImportMetaEnv {
  /** Canonical public base URL (SEO, structured data). Defaults to the upstream domain. */
  readonly VITE_PUBLIC_BASE_URL?: string;
  readonly VITE_SESSIONS_API?: string;
}
